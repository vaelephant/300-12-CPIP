from __future__ import annotations

from tests.conftest import login
from tests.test_s2_flow import _make_instance


def test_variation_register_resolve_and_replan(client):
    headers = login(client, "RH0236")
    instance, _ = _make_instance(client, headers)
    registered = client.post(
        "/api/v1/variations",
        headers=headers,
        json={
            "patient_id": "HCC-DEMO-001",
            "instance_id": instance["instance_id"],
            "type": "CLINICAL",
            "severity": "MEDIUM",
            "title": "术后体温轻度升高",
            "description": "体温 37.6°C，需复测",
            "affected_nodes": ["surgery", "discharge"],
        },
    )
    assert registered.status_code == 201, registered.text
    variation = registered.json()
    assert variation["status"] == "OPEN"
    listed = client.get("/api/v1/variations", headers=headers)
    assert listed.status_code == 200
    assert any(item["variation_id"] == variation["variation_id"] for item in listed.json()["items"])
    plan = client.post(f"/api/v1/variations/{variation['variation_id']}/replan", headers=headers)
    assert plan.status_code == 201, plan.text
    body = plan.json()
    assert body["status"] == "DRAFT"
    assert len(body["tasks"]) >= 6
    # A second variation can be resolved without deleting the replan.
    second = client.post(
        "/api/v1/variations",
        headers=headers,
        json={
            "patient_id": "HCC-DEMO-001",
            "instance_id": instance["instance_id"],
            "type": "DATA",
            "severity": "LOW",
            "title": "营养记录待补充",
        },
    )
    assert second.status_code == 201
    resolved = client.post(
        f"/api/v1/variations/{second.json()['variation_id']}/resolve",
        headers=headers,
        json={"resolution": "已补充营养记录", "close": True},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "CLOSED"


def test_followup_contact_escalation_and_close(client):
    headers = login(client, "RH0236")
    instance, _ = _make_instance(client, headers)
    created = client.post(
        "/api/v1/followups",
        headers=headers,
        json={
            "patient_id": "HCC-DEMO-001",
            "instance_id": instance["instance_id"],
            "window_start": "2026-12-20T00:00:00+08:00",
            "window_end": "2026-12-31T23:59:59+08:00",
            "channel": "PHONE",
            "consent_status": "GRANTED",
            "owner": "赵倩",
            "risk_level": "LOW",
        },
    )
    assert created.status_code == 201, created.text
    followup = created.json()
    contacted = client.post(
        f"/api/v1/followups/{followup['followup_id']}/contacts",
        headers=headers,
        json={
            "channel": "PHONE",
            "outcome": "REACHED",
            "raw_patient_text": "最近有点乏力，没有发热。",
            "structured_extract": {"symptoms": ["乏力"], "temperature_c": 37.1},
            "confirmed_by_human": True,
        },
    )
    assert contacted.status_code == 200, contacted.text
    assert contacted.json()["status"] == "COLLECTED"
    assert contacted.json()["structured_record"]["temperature_c"] == 37.1
    escalated = client.post(
        f"/api/v1/followups/{followup['followup_id']}/escalate",
        headers=headers,
        json={"reason": "AFP 较基线升高，需人工复核"},
    )
    assert escalated.status_code == 200, escalated.text
    assert escalated.json()["risk_level"] == "HIGH"
    assert escalated.json()["status"] == "PENDING_ACTION"
    assert escalated.json()["escalation"]["required"] is True
    assert escalated.json()["escalation"]["status"] == "NOTIFICATION_PENDING"
    alert_id = escalated.json()["escalation"]["alert_id"]
    # Cannot close follow-up while alert is open.
    assert client.post(
        f"/api/v1/followups/{followup['followup_id']}/close",
        headers=headers,
        json={"reason": "提前关闭"},
    ).status_code == 409
    # Cannot acknowledge before notification.
    assert client.post(f"/api/v1/followup-alerts/{alert_id}/acknowledge", headers=headers).status_code == 409
    notified = client.post(f"/api/v1/followup-alerts/{alert_id}/notify", headers=headers)
    assert notified.status_code == 200
    assert notified.json()["status"] == "NOTIFIED"
    acknowledged = client.post(f"/api/v1/followup-alerts/{alert_id}/acknowledge", headers=headers)
    assert acknowledged.status_code == 200
    assert acknowledged.json()["acknowledged_by"] is not None
    resolved = client.post(
        f"/api/v1/followup-alerts/{alert_id}/resolve",
        headers=headers,
        json={"resolution": "已联系患者并安排门诊复核"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "RESOLVED"
    closed_alert = client.post(
        f"/api/v1/followup-alerts/{alert_id}/close",
        headers=headers,
        json={"reason": "处置完成"},
    )
    assert closed_alert.status_code == 200
    assert closed_alert.json()["status"] == "CLOSED"
    closed = client.post(
        f"/api/v1/followups/{followup['followup_id']}/close",
        headers=headers,
        json={"reason": "已由随访医生复核并安排门诊"},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"
    # Re-closing is rejected rather than silently duplicating closure.
    assert client.post(
        f"/api/v1/followups/{followup['followup_id']}/close",
        headers=headers,
        json={"reason": "重复关闭"},
    ).status_code == 409


def test_outcome_and_specialty_assessment(client):
    headers = login(client, "RH0236")
    instance, _ = _make_instance(client, headers)
    assessment = client.get("/api/v1/patients/HCC-DEMO-001/specialty-assessment", headers=headers)
    assert assessment.status_code == 200, assessment.text
    assert assessment.json()["staging"]["value"] == "Ⅰb"
    assert assessment.json()["liver_reserve"]["child_pugh"] == "A"
    outcome = client.post(
        "/api/v1/patients/HCC-DEMO-001/outcomes",
        headers=headers,
        json={
            "instance_id": instance["instance_id"],
            "treatment_type": "肝段切除术",
            "evaluation_standard": "RECIST",
            "observed_at": "2026-12-24T10:30:00+08:00",
            "recurrence": "NONE",
            "progression": False,
            "response": "UNKNOWN",
        },
    )
    assert outcome.status_code == 201, outcome.text
    assert outcome.json()["instance_id"] == instance["instance_id"]
    listed = client.get("/api/v1/patients/HCC-DEMO-001/outcomes", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()["items"]) == 1


def test_analytics_role_boundary(client):
    clinician = login(client, "RH0236")
    assert client.get("/api/v1/analytics/summary", headers=clinician).status_code == 403
    medical = login(client, "RH0102")
    response = client.get("/api/v1/analytics/summary", headers=medical)
    assert response.status_code == 200, response.text
    assert response.json()["metrics"]
    assert all("definition" in metric for metric in response.json()["metrics"])


def test_cross_department_followup_denied(client):
    clinician = login(client, "RH0236")
    # Use a hpb instance and attempt creation as the intervention clinician.
    hpb_headers = login(client, "RH0236")
    instance, _ = _make_instance(client, hpb_headers)
    intervention = login(client, "RH0311")
    response = client.post(
        "/api/v1/followups",
        headers=intervention,
        json={
            "patient_id": "HCC-DEMO-001",
            "instance_id": instance["instance_id"],
            "window_start": "2026-12-20T00:00:00+08:00",
            "window_end": "2026-12-31T23:59:59+08:00",
            "channel": "PHONE",
            "consent_status": "GRANTED",
            "owner": "赵倩",
        },
    )
    assert response.status_code == 403
