from __future__ import annotations

import os
from pathlib import Path

import pytest

TEST_DB = Path("/tmp/hcc-cip-test.db")
os.environ["HCC_CIP_DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["HCC_CIP_JWT_SECRET"] = "test-only-secret-that-is-at-least-32-bytes"
os.environ["HCC_CIP_AUTO_CREATE_TABLES"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402
from app.services.login_limiter import reset_all  # noqa: E402


@pytest.fixture()
def client():
    reset_all()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    with TestClient(app) as test_client:
        yield test_client


def login(client: TestClient, employee_no: str = "RH0236", password: str = "cpip-demo") -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"employee_no": employee_no, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
