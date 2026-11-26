from __future__ import annotations

from datetime import UTC, datetime

from app.db import SessionLocal
from app.domain.models import Observation
from app.services.rules import Tri, tri_and, tri_not, tri_or
from tests.conftest import login
from tests.test_s2_flow import PATHWAY_VERSION, _create_snapshot, _make_instance, _make_active_plan, _snapshot


def test_three_valued_truth_tables():
    assert tri_and(Tri.TRUE, Tri.TRUE) == Tri.TRUE
    assert tri_and(Tri.TRUE, Tri.UNKNOWN) == Tri.UNKNOWN
    assert tri_and(Tri.FALSE, Tri.UNKNOWN) == Tri.FALSE
    assert tri_or(Tri.FALSE, Tri.UNKNOWN) == Tri.UNKNOWN
    assert tri_or(Tri.TRUE, Tri.UNKNOWN) == Tri.TRUE
    assert tri_not(Tri.UNKNOWN) == Tri.UNKNOWN


def test_future_observation_does_not_leak_into_rules(client):
    headers = login(client, "RH0236")
    payload = _snapshot([], ["OBS-AFP-001", "OBS-ICG-001"])
    payload["as_of"] = "2026-11-24T00:00:00+08:00"  # ICG occurred 2026-11-25
    created = client.post("/api/v1/patients/HCC-DEMO-001/snapshots", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    result = client.post(
        "/api/v1/rules/evaluate",
        headers=headers,
        json={"rule_id": "RULE-004", "rule_version": "1.3.0", "patient_id": "HCC-DEMO-001", "snapshot_id": created.json()["snapshot_id"]},
    )
    assert result.status_code == 200
    assert result.json()["result"] == "UNKNOWN"


def test_unit_mismatch_is_unknown_not_normal(client):
    headers = login(client, "RH0236")
    snapshot = _create_snapshot(client, headers, [], ["OBS-ICG-001"])
    with SessionLocal() as db:
        obs = db.get(Observation, "OBS-ICG-001")
        obs.unit = "mg"
        db.commit()
    result = client.post(
        "/api/v1/rules/evaluate",
        headers=headers,
        json={"rule_id": "RULE-004", "rule_version": "1.3.0", "patient_id": "HCC-DEMO-001", "snapshot_id": snapshot["snapshot_id"]},
    )
    assert result.status_code == 200
    assert result.json()["result"] == "UNKNOWN"


def test_missing_boolean_does_not_become_false(client):
    headers = login(client, "RH0236")
    payload = _snapshot([], ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001", "OBS-NRS-002"])
    payload["missing_fields"] = ["tumor.extrahepatic_metastasis"]
    snapshot = client.post("/api/v1/patients/HCC-DEMO-001/snapshots", headers=headers, json=payload)
    assert snapshot.status_code == 201
    result = client.post(
        "/api/v1/rules/evaluate",
        headers=headers,
        json={"rule_id": "RULE-001", "rule_version": "1.2.0", "patient_id": "HCC-DEMO-001", "snapshot_id": snapshot.json()["snapshot_id"]},
    )
    assert result.status_code == 200
    assert result.json()["result"] == "UNKNOWN"
    assert "tumor.extrahepatic_metastasis" in result.json()["missing_fields"]


def test_explicit_false_boolean_is_negative(client):
    headers = login(client, "RH0236")
    snapshot = _create_snapshot(client, headers, [], ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001", "OBS-NRS-002"])
    result = client.post(
        "/api/v1/rules/evaluate",
        headers=headers,
        json={"rule_id": "RULE-001", "rule_version": "1.2.0", "patient_id": "HCC-DEMO-001", "snapshot_id": snapshot["snapshot_id"]},
    )
    assert result.status_code == 200
    assert result.json()["result"] == "TRUE"


def test_activation_rejects_stale_plan_after_new_snapshot(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    plan = client.post(
        f"/api/v1/instances/{instance['instance_id']}/plans",
        headers=headers,
        json={"snapshot_id": snapshot["snapshot_id"], "ruleset_version": "HCC-RULES-0.6.0"},
    ).json()
    client.post(f"/api/v1/plans/{plan['plan_id']}/submit", headers=headers)
    expert = login(client, "RH0218")
    client.post(f"/api/v1/plans/{plan['plan_id']}/approve", headers=expert, json={"comment": "ok"})
    # A new snapshot arrives after approval; activation must require reassessment.
    _create_snapshot(client, headers, [], ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001", "OBS-NRS-002"])
    blocked = client.post(f"/api/v1/plans/{plan['plan_id']}/activate", headers=headers)
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "PLAN_REASSESSMENT_REQUIRED"
