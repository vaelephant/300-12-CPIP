from __future__ import annotations

from tests.conftest import login
from tests.test_s2_flow import _make_active_plan, _make_instance


def _import_state_event(client, headers, key: str):
    return client.post(
        "/api/v1/clinical-events/import",
        headers=headers,
        json={
            "source_system": "SYNTHETIC-HIS",
            "idempotency_key": key,
            "events": [
                {
                    "patient_id": "HCC-DEMO-001",
                    "encounter_id": "ENC-HCC-001",
                    "event_type": "ObservationImported",
                    "occurred_at": "2026-11-26T13:00:00+08:00",
                    "recorded_at": "2026-11-26T13:01:00+08:00",
                    "source_system": "SYNTHETIC-HIS",
                    "payload": {"observation": "new lab"},
                }
            ],
        },
    )


def test_event_import_creates_single_reassessment_and_draft_plan(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    original = _make_active_plan(client, headers, instance, snapshot)

    assert _import_state_event(client, headers, "reassess-1").status_code == 200
    assert _import_state_event(client, headers, "reassess-1").json()["duplicates"] == 1
    listed = client.get(f"/api/v1/reassessments?instance_id={instance['instance_id']}", headers=headers)
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert len(items) == 1
    reassessment = items[0]
    assert reassessment["status"] == "OPEN"
    assert reassessment["event_id"]

    replanned = client.post(f"/api/v1/reassessments/{reassessment['reassessment_id']}/replan", headers=headers)
    assert replanned.status_code == 201, replanned.text
    draft = replanned.json()
    assert draft["status"] == "DRAFT"
    assert draft["execution_blocked"] is False
    # The original ACTIVE plan is untouched until the new plan is approved/activated.
    plans = client.get(f"/api/v1/instances/{instance['instance_id']}/plans", headers=headers).json()
    active = [plan for plan in plans if plan["status"] == "ACTIVE"]
    assert len(active) == 1
    assert active[0]["plan_id"] == original["plan_id"]


def test_activation_supersedes_previous_active_plan(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    first = _make_active_plan(client, headers, instance, snapshot)
    second = client.post(
        f"/api/v1/instances/{instance['instance_id']}/plans",
        headers=headers,
        json={"snapshot_id": snapshot["snapshot_id"], "ruleset_version": "HCC-RULES-0.6.0"},
    ).json()
    client.post(f"/api/v1/plans/{second['plan_id']}/submit", headers=headers)
    expert = login(client, "RH0218")
    client.post(f"/api/v1/plans/{second['plan_id']}/approve", headers=expert, json={"comment": "ok"})
    activated = client.post(f"/api/v1/plans/{second['plan_id']}/activate", headers=headers)
    assert activated.status_code == 200, activated.text
    plans = client.get(f"/api/v1/instances/{instance['instance_id']}/plans", headers=headers).json()
    active = [plan for plan in plans if plan["status"] == "ACTIVE"]
    assert [plan["plan_id"] for plan in active] == [second["plan_id"]]
    superseded = [plan for plan in plans if plan["plan_id"] == first["plan_id"]][0]
    assert superseded["status"] == "SUPERSEDED"


def test_reassessment_dismiss_requires_state(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    _make_active_plan(client, headers, instance, snapshot)
    _import_state_event(client, headers, "reassess-dismiss")
    item = client.get("/api/v1/reassessments?status=OPEN", headers=headers).json()["items"][0]
    dismissed = client.post(
        f"/api/v1/reassessments/{item['reassessment_id']}/dismiss",
        headers=headers,
        json={"reason": "已人工复核，无计划变更"},
    )
    assert dismissed.status_code == 200
    assert dismissed.json()["status"] == "DISMISSED"
    assert client.post(
        f"/api/v1/reassessments/{item['reassessment_id']}/dismiss",
        headers=headers,
        json={"reason": "重复"},
    ).status_code == 409


def test_plan_versions_are_monotonic_per_instance(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    versions = []
    for _ in range(3):
        response = client.post(
            f"/api/v1/instances/{instance['instance_id']}/plans",
            headers=headers,
            json={"snapshot_id": snapshot["snapshot_id"], "ruleset_version": "HCC-RULES-0.6.0"},
        )
        assert response.status_code == 201, response.text
        versions.append(response.json()["version"])
    assert versions == ["P1", "P2", "P3"]
    listed = client.get(f"/api/v1/instances/{instance['instance_id']}/plans", headers=headers).json()
    assert sorted(plan["version"] for plan in listed) == ["P1", "P2", "P3"]


def test_old_plan_tasks_cannot_execute_after_replan_activation(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    first = _make_active_plan(client, headers, instance, snapshot)
    old_task = next(task for task in first["tasks"] if task["status"] == "PENDING")
    second = client.post(
        f"/api/v1/instances/{instance['instance_id']}/plans",
        headers=headers,
        json={"snapshot_id": snapshot["snapshot_id"], "ruleset_version": "HCC-RULES-0.6.0"},
    ).json()
    client.post(f"/api/v1/plans/{second['plan_id']}/submit", headers=headers)
    expert = login(client, "RH0218")
    client.post(f"/api/v1/plans/{second['plan_id']}/approve", headers=expert, json={"comment": "ok"})
    assert client.post(f"/api/v1/plans/{second['plan_id']}/activate", headers=headers).status_code == 200
    blocked = client.post(
        f"/api/v1/tasks/{old_task['task_id']}/transition",
        headers=headers,
        json={"to_status": "READY", "expected_version": old_task["version"]},
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] in {"PLAN_NOT_ACTIVE", "INVALID_PLAN_STATE"}
