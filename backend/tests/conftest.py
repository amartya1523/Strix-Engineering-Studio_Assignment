import os

os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL", "postgresql+psycopg://codeatlas_dev:codeatlas_local_only@localhost:5432/codeatlas_test"
)
os.environ["ENCRYPTION_KEY"] = "4cTHlgFE_tRFlpOFxYo6-Xmw1Ae7HvuouUwPgwgMFV8="

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.db import Base, engine
from app.main import app, attempts
from app import models  # noqa: F401


@pytest.fixture(scope="session", autouse=True)
def database():
    if not engine.url.database or not engine.url.database.endswith("_test"):
        raise RuntimeError("Tests require a dedicated database ending in _test")
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def cleanup(database):
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(text(f"DELETE FROM {table.name}"))
    attempts.clear()


@pytest.fixture
def client():
    with TestClient(app, headers={"X-Requested-With": "CodeAtlas"}) as client:
        yield client


@pytest.fixture
def account(client):
    response = client.post(
        "/api/auth/register", json={"name": "Alex", "email": "alex@example.com", "password": "safe-password-123"}
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def project(client, account):
    response = client.post("/api/projects", json={"name": "Portal", "description": "Test project"})
    return response.json()


@pytest.fixture
def provider(client, account):
    response = client.post(
        "/api/providers",
        json={
            "name": "Test model",
            "base_url": "http://localhost:8123/v1",
            "model": "fixture-model",
            "api_key": "test-secret",
        },
    )
    assert response.status_code == 201
    return response.json()
