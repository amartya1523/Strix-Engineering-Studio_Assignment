"""Opt-in live provider verification. Run from backend; uses only bundled sample source.

LIVE_TEST_DATABASE_URL must identify a disposable database ending in _live_e2e.
Reads the server-only DEFAULT_AI_* settings. Never prints credentials or upstream bodies.
"""

import json
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
database_url = os.environ.get("LIVE_TEST_DATABASE_URL", "")
if not database_url.split("?")[0].endswith("_live_e2e"):
    raise SystemExit(
        "Set LIVE_TEST_DATABASE_URL to a disposable database ending in _live_e2e."
    )
os.environ["DATABASE_URL"] = database_url

# Database environment must be set before importing application modules.
sys.path.insert(0, str(root / "backend"))
from app.config import get_settings
from app.db import SessionLocal
from app.main import app
from app.models import User
from fastapi.testclient import TestClient
from sqlalchemy import select

settings = get_settings()
if not settings.default_ai_api_key.get_secret_value():
    raise SystemExit(
        "Configure DEFAULT_AI_* and its owner email in backend/.env first."
    )
subprocess.run([str(root / "backend/.venv/bin/alembic"), "upgrade", "head"], check=True)
# Repeated runs remove only this configured test owner, in the explicitly disposable database.
with SessionLocal() as db:
    old = db.scalar(select(User).where(User.email == settings.default_ai_owner_email))
    if old:
        db.delete(old)
        db.commit()

report = {
    "provider": settings.default_ai_provider_name,
    "model": settings.default_ai_model,
    "checks": [],
}


def check(response, expected, label):
    if response.status_code in {502, 503, 504} and expected in {200, 201}:
        print(
            label + ": temporary upstream failure; retrying once after 30 seconds.",
            flush=True,
        )
        report["checks"].append(
            {
                "check": label + " initial attempt",
                "passed": False,
                "status": response.status_code,
            }
        )
        time.sleep(30)
        response = client.send(response.request)
    passed = response.status_code == expected
    report["checks"].append(
        {"check": label, "passed": passed, "status": response.status_code}
    )
    print(
        label
        + ": "
        + ("PASS" if passed else "FAIL")
        + f" (HTTP {response.status_code})",
        flush=True,
    )
    if not passed:
        # Application errors are sanitized, but omit bodies to prevent accidental future disclosures.
        output = root / "backend/.local/live-ai-report.json"
        output.parent.mkdir(exist_ok=True)
        output.write_text(json.dumps(report, indent=2))
        raise SystemExit(
            "Live verification stopped at the failed check; no success is claimed."
        )
    return response.json() if response.status_code != 204 else None


with TestClient(app, headers={"X-Requested-With": "CodeAtlas"}) as client:
    owner = check(
        client.post(
            "/api/auth/register",
            json={
                "name": "Live verification",
                "email": settings.default_ai_owner_email,
                "password": secrets.token_urlsafe(24),
            },
        ),
        201,
        "Owner registration",
    )
    settings.default_ai_owner_id = owner["id"]
    providers = check(client.get("/api/providers"), 200, "Owner provider visibility")
    assert providers[0]["id"] == "environment"
    assert settings.default_ai_api_key.get_secret_value() not in json.dumps(providers)
    check(client.post("/api/providers/environment/test"), 200, "Live model connection")
    project = check(
        client.post(
            "/api/projects",
            json={
                "name": "Live Groq verification",
                "description": "Bundled samples only",
            },
        ),
        201,
        "Project creation",
    )
    pid = project["id"]
    with (
        (root / "samples/auth.py").open("rb") as auth,
        (root / "samples/dashboard.tsx").open("rb") as dashboard,
    ):
        files = check(
            client.post(
                f"/api/projects/{pid}/files",
                files=[
                    ("files", ("src/auth.py", auth)),
                    ("files", ("src/dashboard.tsx", dashboard)),
                ],
            ),
            201,
            "Source upload",
        )
    for mode in ["security", "performance", "quality", "documentation", "architecture"]:
        selected = (
            [files[0]["id"]]
            if mode == "security"
            else [f["id"] for f in files]
            if mode == "performance"
            else []
        )
        result = check(
            client.post(
                f"/api/projects/{pid}/reviews",
                json={"provider_id": "environment", "mode": mode, "file_ids": selected},
            ),
            201,
            "Live " + mode + " analysis",
        )
        assert result["result"]["summary"]
        if mode in ["documentation", "architecture"]:
            assert result["result"]["artifact"]
        report["checks"][-1]["findings"] = len(result["result"]["issues"])
        report["checks"][-1]["files"] = len(result["file_paths"])
    answer = check(
        client.post(
            f"/api/projects/{pid}/chat",
            json={
                "provider_id": "environment",
                "question": "Explain how login works and identify its security risks. Cite file paths.",
            },
        ),
        200,
        "Live grounded chat",
    )
    assert "src/auth.py" in answer["answer"]
    assert (
        len(
            check(client.get(f"/api/projects/{pid}/chat"), 200, "Chat persistence")[
                "messages"
            ]
        )
        == 2
    )
    assert (
        len(check(client.get("/api/reviews?q=security"), 200, "Review history search"))
        >= 1
    )
    check(client.post("/api/auth/logout"), 204, "Logout")
    check(
        client.post(
            "/api/auth/register",
            json={
                "name": "Unrelated account",
                "email": f"other-{secrets.token_hex(6)}@example.com",
                "password": secrets.token_urlsafe(24),
            },
        ),
        201,
        "Other account registration",
    )
    assert not any(
        p["id"] == "environment"
        for p in check(client.get("/api/providers"), 200, "Other-account provider list")
    )
    check(
        client.post("/api/providers/environment/test"),
        404,
        "Other-account credential isolation",
    )

output = root / "backend/.local/live-ai-report.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(report, indent=2))
print(
    "All live checks passed. Sanitized report saved in ignored backend/.local/live-ai-report.json."
)
