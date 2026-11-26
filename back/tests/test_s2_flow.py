from __future__ import annotations

import copy

from app.domain.hcc_pathway import HCC_SURGERY_GRAPH, HCC_SURGERY_RULES
from tests.conftest import login

PATHWAY_VERSION = "PV-HCC-130"


def _snapshot(missing: list[str], observation_refs: list[str] | None = None) -> dict:
    return {
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
        "observation_refs": observation_refs or ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001"],
        "missing_fields": missing,
        "ruleset_version": "HCC-RULES-0.6.0",
    }


def _create_snapshot(client, headers, missing: list[str], refs: list[str] | None = None) -> dict:
    response = client.post(
        f"/api/v1/patients/HCC-DEMO-001/snapshots",
        headers=headers,
        json=_snapshot(missing, refs),
    )
    assert response.status_code == 201, response.text
    return response.json()


def _make_instance(client, headers) -> tuple[dict, dict]:
    pending_snapshot = _create_snapshot(client, headers, ["assessment.nrs2002"])
    pending_eval = client.post(
        "/api/v1/enrollment/evaluate",
        headers=headers,
        json={"patient_id": "HCC-DEMO-001", "snapshot_id": pending_snapshot["snapshot_id"], "pathway_version_id": PATHWAY_VERSION},
    )
    assert pending_eval.status_code == 200, pending_eval.text
    assert pending_eval.json()["decision"] == "PENDING_SUPPLEMENT"
    assert pending_eval.json()["auto_enroll_allowed"] is False

    final_snapshot = _create_snapshot(client, headers, [], ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001", "OBS-NRS-002"])
    final_eval = client.post(
        "/api/v1/enrollment/evaluate",
        headers=headers,
        json={"patient_id": "HCC-DEMO-001", "snapshot_id": final_snapshot["snapshot_id"], "pathway_version_id": PATHWAY_VERSION},
    )
    assert final_eval.status_code == 200, final_eval.text
    assert final_eval.json()["decision"] == "ELIGIBLE", final_eval.json()
    instance = client.post(
        "/api/v1/instances",
        headers=headers,
        json={
            "patient_id": "HCC-DEMO-001",
            "pathway_version_id": PATHWAY_VERSION,
            "enrollment_evaluation_id": final_eval.json()["evaluation_id"],
            "doctor_confirmed": True,
        },
    )
    assert instance.status_code == 201, instance.text
    return instance.json(), final_snapshot


def _make_active_plan(client, headers, instance: dict, snapshot: dict) -> dict:
    plan = client.post(
        f"/api/v1/instances/{instance['instance_id']}/plans",
        headers=headers,
        json={"snapshot_id": snapshot["snapshot_id"], "ruleset_version": "HCC-RULES-0.6.0"},
    )
    assert plan.status_code == 201, plan.text
    plan_body = plan.json()
    assert plan_body["status"] == "DRAFT"
    assert len(plan_body["tasks"]) >= 6
    submitted = client.post(f"/api/v1/plans/{plan_body['plan_id']}/submit", headers=headers)
    assert submitted.status_code == 200, submitted.text
    # A clinician cannot approve their own plan.
    assert client.post(f"/api/v1/plans/{plan_body['plan_id']}/approve", headers=headers, json={}).status_code == 403
    expert = login(client, "RH0218")
    approved = client.post(f"/api/v1/plans/{plan_body['plan_id']}/approve", headers=expert, json={"comment": "同意"})
    assert approved.status_code == 200, approved.text
    activated = client.post(f"/api/v1/plans/{plan_body['plan_id']}/activate", headers=headers)
    assert activated.status_code == 200, activated.text
    assert activated.json()["status"] == "ACTIVE"
    return activated.json()


def test_enrollment_unknown_blocks_and_supplement_allows_instance(client):
    headers = login(client, "RH0236")
    pending = _create_snapshot(client, headers, ["assessment.nrs2002"])
    evaluation = client.post(
        "/api/v1/enrollment/evaluate",
        headers=headers,
        json={"patient_id": "HCC-DEMO-001", "snapshot_id": pending["snapshot_id"], "pathway_version_id": PATHWAY_VERSION},
    )
    assert evaluation.status_code == 200
    body = evaluation.json()
    assert body["decision"] == "PENDING_SUPPLEMENT"
    assert body["admission_tri_state"] == "TRUE"
    assert body["completeness_tri_state"] == "UNKNOWN"
    assert body["auto_enroll_allowed"] is False
    assert "assessment.nrs2002" in body["missing_fields"]
    # The UNKNOWN evaluation cannot create an instance.
    instance = client.post(
        "/api/v1/instances",
        headers=headers,
        json={
            "patient_id": "HCC-DEMO-001",
            "pathway_version_id": PATHWAY_VERSION,
            "enrollment_evaluation_id": body["evaluation_id"],
            "doctor_confirmed": True,
        },
    )
    assert instance.status_code == 409
    final_instance, _ = _make_instance(client, headers)
    assert final_instance["status"] == "ACTIVE"


def test_rule_endpoint_preserves_unknown(client):
    headers = login(client, "RH0236")
    snapshot = _create_snapshot(client, headers, ["assessment.nrs2002"])
    result = client.post(
        "/api/v1/rules/evaluate",
        headers=headers,
        json={"rule_id": "RULE-003", "rule_version": "1.0.3", "patient_id": "HCC-DEMO-001", "snapshot_id": snapshot["snapshot_id"]},
    )
    assert result.status_code == 200
    assert result.json()["result"] == "UNKNOWN"
    assert "assessment.nrs2002" in result.json()["missing_fields"]


def test_pathway_validation_submission_approval_and_publish(client):
    clinician = login(client, "RH0236")
    created = client.post(
        "/api/v1/pathways",
        headers=clinician,
        json={"name": "测试 HCC 路径", "version": "0.1.0", "graph": copy.deepcopy(HCC_SURGERY_GRAPH), "rules": copy.deepcopy(HCC_SURGERY_RULES)},
    )
    assert created.status_code == 201, created.text
    version_id = created.json()["version_id"]
    validated = client.post(f"/api/v1/pathway-versions/{version_id}/validate", headers=clinician)
    assert validated.status_code == 200
    assert validated.json()["valid"] is True
    submitted = client.post(f"/api/v1/pathway-versions/{version_id}/submit", headers=clinician)
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "IN_REVIEW"
    approval_id = submitted.json()["approval"]["approval_id"]
    # Requester cannot approve.
    assert client.post(f"/api/v1/approvals/{approval_id}/approve", headers=clinician, json={}).status_code == 403
    expert = login(client, "RH0218")
    approved = client.post(f"/api/v1/approvals/{approval_id}/approve", headers=expert, json={"comment": "同意发布"})
    assert approved.status_code == 200, approved.text
    medical = login(client, "RH0102")
    published = client.post(f"/api/v1/pathway-versions/{version_id}/publish", headers=medical)
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "PUBLISHED"
    # Published versions are immutable.
    assert client.post(f"/api/v1/pathway-versions/{version_id}/validate", headers=clinician).status_code == 409


def test_invalid_graph_cannot_be_submitted(client):
    clinician = login(client, "RH0236")
    graph = copy.deepcopy(HCC_SURGERY_GRAPH)
    graph["edges"].append({"source": "surgery", "target": "admission", "kind": "SEQUENCE"})
    created = client.post(
        "/api/v1/pathways",
        headers=clinician,
        json={"name": "非法环路径", "version": "0.1.0", "graph": graph, "rules": copy.deepcopy(HCC_SURGERY_RULES)},
    )
    assert created.status_code == 201
    version_id = created.json()["version_id"]
    validated = client.post(f"/api/v1/pathway-versions/{version_id}/validate", headers=clinician)
    assert validated.status_code == 200
    assert validated.json()["valid"] is False
    submitted = client.post(f"/api/v1/pathway-versions/{version_id}/submit", headers=clinician)
    assert submitted.status_code == 409


def test_plan_activation_and_task_state_machine(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    plan = _make_active_plan(client, headers, instance, snapshot)
    tasks = client.get(f"/api/v1/tasks?instance_id={instance['instance_id']}", headers=headers)
    assert tasks.status_code == 200, tasks.text
    items = tasks.json()["items"]
    assert len(items) == len(plan["tasks"])
    admission = next(item for item in items if item["node_key"] == "admission")
    imaging = next(item for item in items if item["node_key"] == "imaging")

    # Dependency incomplete blocks READY.
    blocked = client.post(
        f"/api/v1/tasks/{imaging['task_id']}/transition",
        headers=headers,
        json={"to_status": "READY", "expected_version": imaging["version"]},
    )
    assert blocked.status_code == 409
    # Complete admission first.
    for target in ("READY", "IN_PROGRESS"):
        response = client.post(
            f"/api/v1/tasks/{admission['task_id']}/transition",
            headers=headers,
            json={"to_status": target, "expected_version": admission["version"]},
        )
        assert response.status_code == 200, response.text
        admission = response.json()
    completed = client.post(
        f"/api/v1/tasks/{admission['task_id']}/transition",
        headers=headers,
        json={"to_status": "COMPLETED", "expected_version": admission["version"], "result_summary": "评估完成"},
    )
    assert completed.status_code == 200, completed.text
    # Optimistic version conflict.
    conflict = client.post(
        f"/api/v1/tasks/{admission['task_id']}/transition",
        headers=headers,
        json={"to_status": "READY", "expected_version": admission["version"]},
    )
    assert conflict.status_code == 409


def test_pathway_overview_aggregate(client):
    headers = login(client, "RH0236")
    response = client.get("/api/v1/pathways/overview", headers=headers)
    assert response.status_code == 200, response.text
    item = response.json()["items"][0]
    assert item["template_id"] == "PW-HCC-001"
    assert item["current_version"] == "1.3.0"
    assert item["status"] == "PUBLISHED"
    assert item["node_count"] == 9
    assert item["owner_name"] == "张启明"


def test_task_overview_aggregates_patient_and_pathway(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    _make_active_plan(client, headers, instance, snapshot)
    response = client.get("/api/v1/tasks/overview", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["meta"]["total"] >= 7
    item = body["items"][0]
    assert item["patient_name"] == "陈志远"
    assert item["pathway_name"] == "肝癌手术临床路径"
    assert "overdue" in item and item["version"] >= 1
    assert isinstance(item["dependencies_completed"], bool)
    overdue = client.get("/api/v1/tasks/overview?overdue_only=true", headers=headers)
    assert overdue.status_code == 200
    assert all(task["overdue"] for task in overdue.json()["items"])


def test_plan_list_is_available_for_planning_page(client):
    headers = login(client, "RH0236")
    instance, snapshot = _make_instance(client, headers)
    plan = _make_active_plan(client, headers, instance, snapshot)
    listed = client.get(f"/api/v1/instances/{instance['instance_id']}/plans", headers=headers)
    assert listed.status_code == 200, listed.text
    assert any(item["plan_id"] == plan["plan_id"] for item in listed.json())
