from __future__ import annotations

from tests.conftest import login


def test_kee_retrieve_degrades_instead_of_faking_success(client):
    headers = login(client, "RH0236")
    response = client.post("/api/v1/knowledge/retrieve", headers=headers, json={"query": "肝癌 ERAS 证据"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "KEE_NOT_CONFIGURED"
    assert "evidence" not in response.json()


def test_prediction_is_research_only_and_unavailable(client):
    clinician = login(client, "RH0236")
    payload = {"patient_snapshot": {"snapshot_id": "x"}, "prediction_target": "术后复发", "horizon_days": 90}
    denied = client.post("/api/v1/predictions", headers=clinician, json=payload)
    assert denied.status_code == 403
    expert = login(client, "RH0218")
    unavailable = client.post("/api/v1/predictions", headers=expert, json=payload)
    assert unavailable.status_code == 503
    assert unavailable.json()["error"]["code"] == "MWM_NOT_CONFIGURED"
    assert "clinical_use=false" in unavailable.json()["error"]["message"]


def test_prediction_payload_validation_precedes_unavailable(client):
    expert = login(client, "RH0218")
    response = client.post("/api/v1/predictions", headers=expert, json={"horizon_days": 0})
    assert response.status_code == 422
