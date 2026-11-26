from __future__ import annotations

from tests.conftest import login
from tests.test_s2_flow import _create_snapshot


def test_clinician_lists_only_own_department(client):
    headers = login(client, "RH0236")
    response = client.get("/api/v1/patients", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] == 3
    assert {item["patient_id"] for item in body["items"]} == {"HCC-DEMO-001", "HCC-DEMO-002", "HCC-DEMO-003"}
    assert all(item["diagnosis_code"] == "C22.0" for item in body["items"])


def test_cross_department_patient_is_denied(client):
    clinician = login(client, "RH0236")
    denied = client.get("/api/v1/patients/HCC-DEMO-INTERV-001", headers=clinician)
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "FORBIDDEN"

    intervention = login(client, "RH0311")
    allowed = client.get("/api/v1/patients/HCC-DEMO-INTERV-001", headers=intervention)
    assert allowed.status_code == 200


def test_admin_has_no_patient_record_access(client):
    headers = login(client, "RH0001")
    assert client.get("/api/v1/patients", headers=headers).status_code == 403
    assert client.get("/api/v1/patients/HCC-DEMO-001", headers=headers).status_code == 403


def test_observations_preserve_unknown(client):
    headers = login(client, "RH0236")
    response = client.get("/api/v1/patients/HCC-DEMO-001/observations", headers=headers)
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 9
    unknown = next(item for item in items if item["observation_id"] == "OBS-NRS-001")
    assert unknown["value_status"] == "UNKNOWN"
    assert unknown["value_num"] is None
    assert unknown["value_text"] is None


def test_encounters_endpoint(client):
    headers = login(client, "RH0236")
    response = client.get("/api/v1/patients/HCC-DEMO-001/encounters", headers=headers)
    assert response.status_code == 200
    assert response.json()[0]["encounter_id"] == "ENC-HCC-001"


def test_create_patient_is_hcc_and_department_scoped(client):
    headers = login(client, "RH0236")
    response = client.post(
        "/api/v1/patients",
        headers=headers,
        json={"display_name": "测试患者", "sex": "F", "birth_date": "1970-01-01", "source_system": "SYNTHETIC"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["diagnosis_code"] == "C22.0"
    assert body["synthetic"] is True
    # New patient is visible to the same department, not to intervention.
    assert client.get(f"/api/v1/patients/{body['patient_id']}", headers=headers).status_code == 200
    intervention = login(client, "RH0311")
    assert client.get(f"/api/v1/patients/{body['patient_id']}", headers=intervention).status_code == 403


def test_patient_overview_aggregates_without_phi_leak(client):
    headers = login(client, "RH0236")
    response = client.get("/api/v1/patients/overview", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["meta"]["total"] == 3
    item = next(entry for entry in body["items"] if entry["patient_id"] == "HCC-DEMO-001")
    assert item["diagnosis_code"] == "C22.0"
    assert item["ward"] == "肝胆外科 3 病区"
    assert item["bed"] == "03-12"
    assert item["attending"] == "张启明"
    assert item["progress"] >= 0
    assert "status" in item and item["risk_level"] in {"LOW", "MEDIUM", "HIGH"}


def test_patient_overview_is_department_scoped(client):
    intervention = login(client, "RH0311")
    response = client.get("/api/v1/patients/overview", headers=intervention)
    assert response.status_code == 200
    ids = {item["patient_id"] for item in response.json()["items"]}
    assert ids == {"HCC-DEMO-INTERV-001"}
    admin = login(client, "RH0001")
    assert client.get("/api/v1/patients/overview", headers=admin).status_code == 403


def test_patient_detail_overview_is_authorized_and_aggregated(client):
    headers = login(client, "RH0236")
    _create_snapshot(client, headers, ["assessment.nrs2002"])
    response = client.get("/api/v1/patients/HCC-DEMO-001/overview", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["patient"]["patient_id"] == "HCC-DEMO-001"
    assert len(body["encounters"]) == 1
    assert len(body["observations"]) == 9
    assert body["assessment"]["staging"]["value"] == "Ⅰb"
    intervention = login(client, "RH0311")
    assert client.get("/api/v1/patients/HCC-DEMO-001/overview", headers=intervention).status_code == 403
    admin = login(client, "RH0001")
    assert client.get("/api/v1/patients/HCC-DEMO-001/overview", headers=admin).status_code == 403
