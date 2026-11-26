from __future__ import annotations

from app.db import SessionLocal
from app.domain.models import ClinicalEvent, PatientSnapshot
from tests.conftest import login

SNAPSHOT = {
    "as_of": "2026-11-26T10:30:00+08:00",
    "staging": {"system": "CNLC", "version": "2024", "value": "Ⅰb"},
    "liver_reserve": {"child_pugh": "A", "albi": -2.41},
    "performance_status": {"ecog": 0},
    "tumor": {
        "max_diameter_mm": 32,
        "number": 1,
        "location": "肝右叶 S6 段",
        "vascular_invasion": False,
        "extrahepatic_metastasis": False,
    },
    "observation_refs": ["OBS-AFP-001", "OBS-INR-001", "OBS-NRS-001"],
    "missing_fields": ["assessment.nrs2002"],
    "ruleset_version": "HCC-RULES-0.6.0",
}


def test_snapshot_creation_keeps_unknown_fields(client):
    headers = login(client, "RH0236")
    response = client.post("/api/v1/patients/HCC-DEMO-001/snapshots", headers=headers, json=SNAPSHOT)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["patient_id"] == "HCC-DEMO-001"
    assert body["missing_fields"] == ["assessment.nrs2002"]
    with SessionLocal() as db:
        stored = db.query(PatientSnapshot).one()
        assert stored.id == body["snapshot_id"]
        assert "OBS-NRS-001" in stored.payload_json


def test_snapshot_rejects_foreign_observation(client):
    headers = login(client, "RH0236")
    bad = {**SNAPSHOT, "observation_refs": ["OBS-NOT-FOUND"]}
    response = client.post("/api/v1/patients/HCC-DEMO-001/snapshots", headers=headers, json=bad)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_snapshot_cross_department_denied(client):
    headers = login(client, "RH0311")
    response = client.post("/api/v1/patients/HCC-DEMO-001/snapshots", headers=headers, json=SNAPSHOT)
    assert response.status_code == 403


def test_event_import_idempotency(client):
    headers = login(client, "RH0236")
    payload = {
        "source_system": "SYNTHETIC-HIS",
        "idempotency_key": "import-test-1",
        "events": [
            {
                "patient_id": "HCC-DEMO-001",
                "encounter_id": "ENC-HCC-001",
                "event_type": "ObservationImported",
                "occurred_at": "2026-11-24T08:00:00+08:00",
                "recorded_at": "2026-11-24T08:05:00+08:00",
                "source_system": "SYNTHETIC-HIS",
                "payload": {"source": "test"},
            }
        ],
    }
    first = client.post("/api/v1/clinical-events/import", headers=headers, json=payload)
    assert first.status_code == 200, first.text
    assert first.json()["imported"] == 1
    second = client.post("/api/v1/clinical-events/import", headers=headers, json=payload)
    assert second.status_code == 200
    assert second.json()["imported"] == 0
    assert second.json()["duplicates"] == 1
    with SessionLocal() as db:
        assert db.query(ClinicalEvent).count() == 1


def test_event_import_cross_department_denied(client):
    headers = login(client, "RH0236")
    response = client.post(
        "/api/v1/clinical-events/import",
        headers=headers,
        json={
            "source_system": "SYNTHETIC-HIS",
            "events": [
                {
                    "patient_id": "HCC-DEMO-INTERV-001",
                    "event_type": "X",
                    "occurred_at": "2026-11-24T08:00:00+08:00",
                    "recorded_at": "2026-11-24T08:05:00+08:00",
                    "source_system": "SYNTHETIC-HIS",
                }
            ],
        },
    )
    assert response.status_code == 403


def test_event_import_requires_authentication(client):
    response = client.post("/api/v1/clinical-events/import", json={"source_system": "X", "events": []})
    assert response.status_code == 401
