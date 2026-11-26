from __future__ import annotations

from app.db import SessionLocal
from app.domain.models import FollowupContactRecord
from tests.conftest import login
from tests.test_s2_flow import _make_instance


def _make_followup(client, headers, instance):
    return client.post(
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
    ).json()


def test_unconfirmed_extraction_is_not_promoted(client):
    headers = login(client, "RH0236")
    instance, _ = _make_instance(client, headers)
    followup = _make_followup(client, headers, instance)
    response = client.post(
        f"/api/v1/followups/{followup['followup_id']}/contacts",
        headers=headers,
        json={
            "channel": "PHONE",
            "outcome": "REACHED",
            "raw_patient_text": "有一点乏力",
            "structured_extract": {"symptoms": ["乏力"]},
            "confirmed_by_human": False,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["structured_record"] == {}
    with SessionLocal() as db:
        contact = db.query(FollowupContactRecord).one()
        assert contact.confirmed_by_human is False
        assert contact.confirmed_by is None


def test_alert_cannot_skip_notification_or_resolution(client):
    headers = login(client, "RH0236")
    instance, _ = _make_instance(client, headers)
    followup = _make_followup(client, headers, instance)
    escalated = client.post(
        f"/api/v1/followups/{followup['followup_id']}/escalate",
        headers=headers,
        json={"reason": "危险信号"},
    )
    alert_id = escalated.json()["escalation"]["alert_id"]
    assert client.post(f"/api/v1/followup-alerts/{alert_id}/close", headers=headers, json={"reason": "x"}).status_code == 409
    assert client.post(f"/api/v1/followup-alerts/{alert_id}/resolve", headers=headers, json={"resolution": "x"}).status_code == 409
    # Duplicate escalation is rejected.
    assert client.post(
        f"/api/v1/followups/{followup['followup_id']}/escalate",
        headers=headers,
        json={"reason": "重复"},
    ).status_code == 409


def test_cross_department_alert_is_denied(client):
    headers = login(client, "RH0236")
    instance, _ = _make_instance(client, headers)
    followup = _make_followup(client, headers, instance)
    escalated = client.post(
        f"/api/v1/followups/{followup['followup_id']}/escalate",
        headers=headers,
        json={"reason": "危险信号"},
    )
    alert_id = escalated.json()["escalation"]["alert_id"]
    intervention = login(client, "RH0311")
    assert client.post(f"/api/v1/followup-alerts/{alert_id}/notify", headers=intervention).status_code == 403
