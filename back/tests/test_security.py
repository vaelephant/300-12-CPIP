from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings
from app.domain.hcc_pathway import HCC_SURGERY_GRAPH, HCC_SURGERY_RULES
from tests.conftest import login
from tests.test_s2_flow import _make_instance


def test_tampered_token_is_rejected(client):
    headers = login(client, "RH0236")
    token = headers["Authorization"].removeprefix("Bearer ")
    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}tampered"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_expired_token_is_rejected(client):
    payload = {"sub": "U-004", "exp": datetime.now(UTC) - timedelta(minutes=1), "iat": datetime.now(UTC) - timedelta(hours=1)}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    response = client.get("/api/v1/patients", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_sql_injection_login_does_not_bypass(client):
    response = client.post("/api/v1/auth/login", json={"employee_no": "RH0236' OR 1=1 --", "password": "x"})
    assert response.status_code == 401
    assert "error" in response.json()


def test_role_escalation_is_denied(client):
    nurse = login(client, "RH0451")
    assert client.post(
        "/api/v1/pathways",
        headers=nurse,
        json={"name": "越权路径", "version": "0.1.0", "graph": HCC_SURGERY_GRAPH, "rules": HCC_SURGERY_RULES},
    ).status_code == 403
    clinician = login(client, "RH0236")
    pathway = client.get("/api/v1/pathways", headers=clinician).json()["items"][0]
    assert client.post(f"/api/v1/pathway-versions/{pathway['version_id']}/publish", headers=clinician).status_code == 403


def test_cross_department_object_is_not_disclosed(client):
    hpb = login(client, "RH0236")
    instance, _ = _make_instance(client, hpb)
    intervention = login(client, "RH0311")
    response = client.post(
        "/api/v1/patients/HCC-DEMO-001/outcomes",
        headers=intervention,
        json={
            "instance_id": instance["instance_id"],
            "treatment_type": "肝段切除术",
            "evaluation_standard": "RECIST",
            "observed_at": "2026-12-24T10:30:00+08:00",
            "recurrence": "NONE",
            "response": "UNKNOWN",
        },
    )
    assert response.status_code == 403
    detail = response.json()["error"]
    assert detail["code"] == "FORBIDDEN"
    assert "陈志远" not in response.text


def test_error_envelope_has_request_id_and_audit_denial(client):
    admin = login(client, "RH0001")
    denied = client.get("/api/v1/patients/HCC-DEMO-001", headers=admin)
    assert denied.status_code == 403
    assert denied.json()["error"]["request_id"].startswith("req-")
    audit = client.get("/api/v1/audit-events", headers=admin)
    assert audit.status_code == 200
    assert any(item["result"] == "DENIED" for item in audit.json()["items"])
