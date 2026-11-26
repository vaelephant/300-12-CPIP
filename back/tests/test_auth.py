from __future__ import annotations

from app.db import SessionLocal
from app.domain.models import AuditEvent


def test_health_does_not_fake_external_success(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["database"] == "ok"
    assert body["external_services"]["KEE"] == "NOT_CONFIGURED"


def test_login_success_and_me(client):
    response = client.post("/api/v1/auth/login", json={"employee_no": "RH0236", "password": "cpip-demo"})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "Bearer"
    assert body["user"]["role"] == "CLINICIAN"
    token = body["access_token"]
    me = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user_id"] == "U-004"


def test_login_failure_is_audited(client):
    response = client.post("/api/v1/auth/login", json={"employee_no": "RH0236", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
    with SessionLocal() as db:
        events = db.query(AuditEvent).filter(AuditEvent.action == "AUTH_LOGIN").all()
    assert any(event.result == "DENIED" for event in events)


def test_missing_and_invalid_token(client):
    missing = client.get("/api/v1/patients")
    assert missing.status_code == 401
    invalid = client.get("/api/v1/patients", headers={"Authorization": "Bearer not-a-token"})
    assert invalid.status_code == 401


def test_request_id_header_is_propagated(client):
    response = client.get("/api/v1/health", headers={"X-Request-ID": "req-test-123"})
    assert response.headers["X-Request-ID"] == "req-test-123"
    assert response.status_code == 200


def test_validation_error_envelope(client):
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in response.json()["error"]
