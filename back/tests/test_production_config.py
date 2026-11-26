from __future__ import annotations

import pytest

from app.config import Settings
from tests.conftest import login


def _settings(**kwargs) -> Settings:
    defaults = {
        "env": "prod",
        "database_url": "postgresql+psycopg://user:pass@localhost/hcc",
        "jwt_secret": "x" * 40,
        "cors_origins": "https://hcc.example.org",
        "auto_create_tables": False,
    }
    defaults.update(kwargs)
    return Settings(_env_file=None, **defaults)


def test_production_refuses_default_secret():
    settings = _settings(jwt_secret="dev-only-change-me-please-32-bytes-minimum-secret")
    with pytest.raises(RuntimeError, match="JWT secret"):
        settings.validate_runtime()


def test_production_refuses_sqlite():
    settings = _settings(database_url="sqlite:///./hcc-cip.db")
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        settings.validate_runtime()


def test_production_refuses_wildcard_cors():
    settings = _settings(cors_origins="*")
    with pytest.raises(RuntimeError, match="CORS"):
        settings.validate_runtime()


def test_secure_production_config_passes():
    _settings().validate_runtime()


def test_login_rate_limit_after_repeated_failures(client):
    payload = {"employee_no": "RH0236", "password": "wrong"}
    for _ in range(5):
        response = client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 401
    blocked = client.post("/api/v1/auth/login", json=payload)
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "RATE_LIMITED"
    # A different employee is not blocked by the first account's failures.
    other = client.post("/api/v1/auth/login", json={"employee_no": "RH0218", "password": "cpip-demo"})
    assert other.status_code == 200
