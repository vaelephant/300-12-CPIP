from __future__ import annotations

from app.db import SessionLocal
from app.domain.models import AuditEvent
from tests.conftest import login


def test_audit_denied_event_is_persisted(client):
    admin = login(client, "RH0001")
    denied = client.get("/api/v1/patients/HCC-DEMO-001", headers={"Authorization": admin["Authorization"]})
    assert denied.status_code == 403
    audit = client.get("/api/v1/audit-events", headers=admin)
    assert audit.status_code == 200
    events = audit.json()["items"]
    assert any(e["result"] == "DENIED" and e["action"] == "PATIENT_VIEW" for e in events)
    with SessionLocal() as db:
        assert db.query(AuditEvent).filter(AuditEvent.result == "DENIED").count() >= 1


def test_clinician_cannot_read_audit_log(client):
    headers = login(client, "RH0236")
    response = client.get("/api/v1/audit-events", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_medical_affairs_can_read_audit_log(client):
    headers = login(client, "RH0102")
    response = client.get("/api/v1/audit-events", headers=headers)
    assert response.status_code == 200
    assert "items" in response.json()
