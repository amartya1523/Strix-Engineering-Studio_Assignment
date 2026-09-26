import io
import json
import zipfile
from datetime import timedelta
from types import SimpleNamespace
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from app.main import app
from app.db import SessionLocal
from app.models import Provider, Session, CodeFile, Review, Message, ChatSession, now
from app.services import ai
from app.services.uploads import parse_upload


def upload(client, project, path="src/auth.py", content=b'password = "unsafe"\nprint(password)\n'):
    response = client.post(f"/api/projects/{project['id']}/files", files=[("files", (path, content))])
    assert response.status_code == 201, response.text
    return response.json()[0]


def fake_ai(monkeypatch, content=None, status=200):
    payload = content or json.dumps(
        {
            "summary": "Review completed",
            "issues": [
                {
                    "severity": "high",
                    "file": "src/auth.py",
                    "line": 1,
                    "title": "Hardcoded password",
                    "description": "Credential in source.",
                    "recommendation": "Use environment configuration.",
                }
            ],
            "recommendations": ["Remove credentials"],
            "artifact": "# Project documentation\n\nSetup guide and API details.",
        }
    )
    requests = []

    def handler(request):
        requests.append(json.loads(request.content))
        return httpx.Response(status, json={"choices": [{"message": {"content": payload}}]})

    original = httpx.AsyncClient
    monkeypatch.setattr(
        ai.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs)
    )
    return requests


def test_auth_logout_revokes_session(client, account):
    assert "password" not in client.get("/api/auth/me").text
    token = client.cookies.get("codeatlas_session")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set("codeatlas_session", token)
    assert client.get("/api/auth/me").status_code == 401
    assert (
        client.post("/api/auth/login", json={"email": "ALEX@EXAMPLE.COM", "password": "safe-password-123"}).status_code
        == 200
    )
    cookie = client.post(
        "/api/auth/login", json={"email": "alex@example.com", "password": "safe-password-123"}
    ).headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie


def test_auth_validation_and_duplicate(client, account):
    assert (
        client.post(
            "/api/auth/register", json={"name": "Alex", "email": "alex@example.com", "password": "safe-password-123"}
        ).status_code
        == 409
    )
    assert (
        client.post("/api/auth/login", json={"email": "alex@example.com", "password": "wrong-password"}).status_code
        == 401
    )
    assert client.post("/api/auth/register", json={"name": " ", "email": "bad", "password": "short"}).status_code == 422


def test_expired_session(client, account):
    with SessionLocal() as db:
        session = db.scalar(select(Session))
        session.expires_at = now() - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_csrf_and_origin(client):
    with TestClient(app) as bare:
        assert bare.post("/api/auth/logout").status_code == 403
    assert client.post("/api/auth/logout", headers={"Origin": "https://evil.example"}).status_code == 403


def test_rate_limit(client):
    for _ in range(20):
        response = client.post("/api/auth/login", json={"email": "bad@example.com", "password": "wrong-password"})
        assert response.status_code == 401
    assert (
        client.post("/api/auth/login", json={"email": "bad@example.com", "password": "wrong-password"}).status_code
        == 429
    )


def test_projects_and_files(client, project):
    file = upload(client, project)
    root = f"/api/projects/{project['id']}"
    assert client.get(root).json()["file_count"] == 1
    assert client.get(root + "/files").json()[0]["path"] == "src/auth.py"
    assert client.get(root + f"/files/{file['id']}").json()["content"].startswith("password")
    upload(client, project, content=b"updated = True\n")
    assert client.get(root).json()["file_count"] == 1
    assert client.get(root + f"/files/{file['id']}").json()["content"] == "updated = True\n"
    assert client.delete(root).status_code == 204
    assert client.get(root).status_code == 404
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(CodeFile)) == 0


def test_cross_user_access(client, project, provider, monkeypatch):
    file = upload(client, project)
    fake_ai(monkeypatch)
    review = client.post(f"/api/projects/{project['id']}/reviews", json={"provider_id": provider["id"]}).json()
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/register", json={"name": "Other", "email": "other@example.com", "password": "different-password"}
    )
    root = f"/api/projects/{project['id']}"
    assert client.get("/api/projects").json() == []
    assert client.get(root).status_code == 404
    assert client.delete(root).status_code == 404
    assert client.get(root + "/files").status_code == 404
    assert client.get(root + f"/files/{file['id']}").status_code == 404
    assert client.post(root + "/files", files={"files": ("new.py", b"code")}).status_code == 404
    assert client.get("/api/reviews").json() == []
    assert client.get("/api/reviews/" + review["id"]).status_code == 404
    assert client.post("/api/providers/" + provider["id"] + "/test").status_code == 404
    assert client.get(root + "/chat").status_code == 404


def archive(entries):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        for name, content in entries.items():
            z.writestr(name, content)
    return buffer.getvalue()


def test_zip_hierarchy_and_secrets(client, project):
    response = client.post(
        f"/api/projects/{project['id']}/files",
        files={
            "files": (
                "code.zip",
                archive(
                    {
                        "src/main.ts": "const x = 1;",
                        "README.md": "# Hi",
                        ".env": "SECRET=abc",
                        "node_modules/a.js": "ignored",
                    }
                ),
            )
        },
    )
    assert response.status_code == 201
    assert {f["path"] for f in response.json()} == {"src/main.ts", "README.md"}


@pytest.mark.parametrize("name", ["../escape.py", "/absolute.py", "C:\\escape.py", "src/../../escape.py"])
def test_traversal_rejected(name):
    with pytest.raises(Exception) as error:
        parse_upload("bad.zip", archive({name: "print(1)"}))
    assert error.value.status_code == 400


def test_upload_validation_and_atomicity(client, project):
    root = f"/api/projects/{project['id']}/files"
    assert client.post(root, files={"files": ("bad.zip", b"invalid")}).status_code == 400
    assert client.post(root, files={"files": ("image.png", b"png")}).status_code == 400
    assert client.post(root, files={"files": ("huge.py", b"a" * (512 * 1024 + 1))}).status_code == 413
    assert client.get(root).json() == []


def test_provider_encryption_and_edit(client, provider, monkeypatch):
    assert provider["has_api_key"] and "api_key" not in provider
    with SessionLocal() as db:
        saved = db.get(Provider, provider["id"])
        assert "test-secret" not in saved.encrypted_key
    fake_ai(monkeypatch, "OK")
    assert client.post("/api/providers/" + provider["id"] + "/test").status_code == 200
    response = client.put(
        "/api/providers/" + provider["id"],
        json={"name": "Local", "base_url": "http://localhost:1234/v1", "model": "local", "api_key": ""},
    )
    assert response.status_code == 200 and response.json()["has_api_key"]
    assert client.delete("/api/providers/" + provider["id"]).status_code == 204


@pytest.mark.parametrize(
    "url",
    [
        "file:///tmp/model",
        "http://169.254.169.254/v1",
        "http://user:pass@localhost:1234/v1",
        "http://localhost:1234/v1?key=secret",
    ],
)
def test_unsafe_provider_urls(client, account, url):
    assert client.post("/api/providers", json={"name": "Bad", "base_url": url, "model": "test"}).status_code == 422


@pytest.mark.parametrize("mode", ["security", "performance", "quality", "documentation", "architecture"])
def test_reviews_all_modes_history_search(client, project, provider, monkeypatch, mode):
    file = upload(client, project)
    requests = fake_ai(monkeypatch)
    response = client.post(
        f"/api/projects/{project['id']}/reviews",
        json={"provider_id": provider["id"], "mode": mode, "file_ids": [file["id"]]},
    )
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["result"]["issues"][0]["severity"] == "high"
    assert client.get("/api/reviews?q=Hardcoded").json()[0]["id"] == result["id"]
    assert client.get("/api/reviews?q=does-not-exist").json() == []
    assert client.get("/api/reviews/" + result["id"]).status_code == 200
    assert "src/auth.py" in requests[0]["messages"][1]["content"]
    assert requests[0]["model"] == "fixture-model"


def test_multiple_and_entire_project(client, project, provider, monkeypatch):
    f1 = upload(client, project)
    f2 = upload(client, project, "src/other.py", b"print(1)\n")
    fake_ai(monkeypatch)
    root = f"/api/projects/{project['id']}/reviews"
    assert (
        len(
            client.post(root, json={"provider_id": provider["id"], "file_ids": [f1["id"], f2["id"]]}).json()[
                "file_paths"
            ]
        )
        == 2
    )
    assert len(client.post(root, json={"provider_id": provider["id"]}).json()["file_paths"]) == 2
    assert client.post(root, json={"provider_id": provider["id"], "file_ids": ["nonexistent"]}).status_code == 404


@pytest.mark.parametrize(
    "content",
    [
        "not json",
        '{"summary":"hello","issues":[{"severity":"extreme"}]}',
        json.dumps(
            {
                "summary": "ok",
                "issues": [
                    {
                        "severity": "high",
                        "file": "invented.py",
                        "line": 1,
                        "title": "Bad",
                        "description": "Bad",
                        "recommendation": "Fix",
                    }
                ],
            }
        ),
    ],
)
def test_invalid_ai_not_saved(client, project, provider, monkeypatch, content):
    upload(client, project)
    fake_ai(monkeypatch, content)
    assert (
        client.post(f"/api/projects/{project['id']}/reviews", json={"provider_id": provider["id"]}).status_code == 502
    )
    assert client.get("/api/reviews").json() == []


def test_ai_failure_and_context_limit(client, project, provider, monkeypatch):
    upload(client, project)
    fake_ai(monkeypatch, status=401)
    assert (
        client.post(f"/api/projects/{project['id']}/reviews", json={"provider_id": provider["id"]}).status_code == 502
    )
    monkeypatch.setattr(ai.get_settings(), "max_context_chars", 10)
    assert (
        client.post(f"/api/projects/{project['id']}/reviews", json={"provider_id": provider["id"]}).status_code == 413
    )


def test_chat_context_persistence_and_cascade(client, project, provider, monkeypatch):
    upload(client, project)
    requests = fake_ai(monkeypatch, "Authentication is in src/auth.py:1.")
    root = f"/api/projects/{project['id']}"
    response = client.post(
        root + "/chat", json={"provider_id": provider["id"], "question": "How does authentication work?"}
    )
    assert response.status_code == 200
    session = response.json()["session_id"]
    assert client.get(root + "/chat").json()["messages"][1]["content"].startswith("Authentication")
    assert "src/auth.py" in requests[0]["messages"][0]["content"]
    response = client.post(
        root + "/chat", json={"provider_id": provider["id"], "question": "Explain more", "session_id": session}
    )
    assert response.status_code == 200
    assert len(requests[-1]["messages"]) == 4
    assert (
        client.post(
            root + "/chat", json={"provider_id": provider["id"], "question": "test", "session_id": "invalid"}
        ).status_code
        == 404
    )
    client.delete(root)
    with SessionLocal() as db:
        for model in [Message, ChatSession, Review, CodeFile]:
            assert db.scalar(select(func.count()).select_from(model)) == 0


def test_json_mode_fallback(client, project, provider, monkeypatch):
    upload(client, project)
    original = httpx.AsyncClient
    calls = []

    def handler(request):
        payload = json.loads(request.content)
        calls.append(payload)
        if "response_format" in payload:
            return httpx.Response(400, json={"error": "unsupported response_format"})
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": json.dumps({"summary": "No issues", "issues": [], "recommendations": []})}}
                ]
            },
        )

    monkeypatch.setattr(
        ai.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs)
    )
    assert (
        client.post(f"/api/projects/{project['id']}/reviews", json={"provider_id": provider["id"]}).status_code == 201
    )
    assert len(calls) == 2


def test_retrieval_prefers_relevant_file():
    files = [
        SimpleNamespace(path="styles.css", content="body {}"),
        SimpleNamespace(path="auth.py", content="def authentication(): pass"),
    ]
    assert ai.retrieve(files, "Explain authentication")[0].path == "auth.py"


def test_upload_request_body_limit(client, project):
    response = client.post(
        f"/api/projects/{project['id']}/files",
        content=b"x",
        headers={"Content-Length": str(12 * 1024 * 1024), "Content-Type": "multipart/form-data; boundary=test"},
    )
    assert response.status_code == 413


def test_environment_provider_is_owner_only_and_secret_free(client, account, monkeypatch):
    from pydantic import SecretStr
    from app.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "default_ai_api_key", SecretStr("environment-test-key"))
    monkeypatch.setattr(settings, "default_ai_provider_name", "Groq test")
    monkeypatch.setattr(settings, "default_ai_base_url", "http://localhost:8123/v1")
    monkeypatch.setattr(settings, "default_ai_model", "fixture-model")
    monkeypatch.setattr(settings, "default_ai_owner_email", "alex@example.com")
    monkeypatch.setattr(settings, "default_ai_owner_id", account["id"])
    response = client.get("/api/providers")
    assert response.status_code == 200
    assert response.json()[0]["id"] == "environment"
    assert response.json()[0]["environment_managed"] is True
    assert "environment-test-key" not in response.text
    fake_ai(monkeypatch, "OK")
    assert client.post("/api/providers/environment/test").status_code == 200
    assert client.delete("/api/providers/environment").status_code == 409
    assert (
        client.put(
            "/api/providers/environment",
            json={"name": "Changed", "base_url": "http://localhost:8123/v1", "model": "test"},
        ).status_code
        == 409
    )
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/register", json={"name": "Other", "email": "other@example.com", "password": "different-password"}
    )
    assert client.get("/api/providers").json() == []
    assert client.post("/api/providers/environment/test").status_code == 404


def test_environment_key_repr_is_redacted():
    from pydantic import SecretStr
    from app.config import Settings

    settings = Settings(
        _env_file=None,
        default_ai_api_key=SecretStr("test-private-key"),
        default_ai_provider_name="Groq",
        default_ai_base_url="https://api.groq.com/openai/v1",
        default_ai_model="test-model",
        default_ai_owner_email="OWNER@example.com",
        default_ai_owner_id="test-owner",
    )
    assert settings.default_ai_owner_email == "owner@example.com"
    assert "test-private-key" not in repr(settings)


def test_environment_provider_requires_owner():
    from pydantic import ValidationError, SecretStr
    from app.config import Settings

    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            default_ai_api_key=SecretStr("test-key"),
            default_ai_provider_name="Groq",
            default_ai_base_url="https://api.groq.com/openai/v1",
            default_ai_model="test",
            default_ai_owner_email="",
        )


def test_environment_validation_error_does_not_echo_secret():
    from pydantic import ValidationError, SecretStr
    from app.config import Settings

    with pytest.raises(ValidationError) as captured:
        Settings(
            _env_file=None,
            default_ai_api_key=SecretStr("must-never-appear-in-error"),
            default_ai_provider_name="",
            default_ai_base_url="",
            default_ai_model="",
            default_ai_owner_email="",
            default_ai_owner_id="",
        )
    assert "must-never-appear-in-error" not in str(captured.value)
