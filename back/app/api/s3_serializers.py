from __future__ import annotations

import json
from typing import Any

from app.api.schemas import FollowupOut, OutcomeOut, SpecialtyAssessmentOut, VariationOut
from app.domain.models import Followup, Outcome, PatientSnapshot, Variation


def load_json(raw: str, default):
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return default


def variation_out(item: Variation) -> VariationOut:
    return VariationOut(
        variation_id=item.id,
        patient_id=item.patient_id,
        instance_id=item.instance_id,
        type=item.type,
        severity=item.severity,
        title=item.title,
        description=item.description,
        detected_at=item.detected_at,
        source=item.source,
        status=item.status,
        affected_nodes=load_json(item.affected_nodes_json, []),
        rule_ref=item.rule_ref,
        impact=item.impact,
        evidence_refs=load_json(item.evidence_refs_json, []),
        resolution=item.resolution,
        resolved_at=item.resolved_at,
    )


def followup_out(item: Followup) -> FollowupOut:
    return FollowupOut(
        followup_id=item.id,
        patient_id=item.patient_id,
        instance_id=item.instance_id,
        treatment_event_id=item.treatment_event_id,
        window_start=item.window_start,
        window_end=item.window_end,
        channel=item.channel,
        consent_status=item.consent_status,
        status=item.status,
        owner=item.owner,
        risk_level=item.risk_level,
        structured_record=load_json(item.structured_record_json, {}),
        escalation=load_json(item.escalation_json, {}),
        contacts=load_json(item.contacts_json, []),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def outcome_out(item: Outcome) -> OutcomeOut:
    return OutcomeOut(
        outcome_id=item.id,
        patient_id=item.patient_id,
        instance_id=item.instance_id,
        treatment_type=item.treatment_type,
        evaluation_standard=item.evaluation_standard,
        observed_at=item.observed_at,
        recurrence=item.recurrence,
        progression=item.progression,
        response=item.response,
        adverse_events=load_json(item.adverse_events_json, []),
        lost_to_followup=item.lost_to_followup,
        recorded_by=item.recorded_by,
        recorded_at=item.recorded_at,
    )


def assessment_out(snapshot: PatientSnapshot, payload: dict[str, Any]) -> SpecialtyAssessmentOut:
    return SpecialtyAssessmentOut(
        assessment_id=f"ASSESS-{snapshot.id}",
        patient_id=snapshot.patient_id,
        snapshot_id=snapshot.id,
        as_of=snapshot.as_of,
        staging=payload.get("staging") or {},
        liver_reserve=payload.get("liver_reserve") or {},
        performance_status=payload.get("performance_status") or {},
        tumor=payload.get("tumor") or {},
        biomarkers=payload.get("biomarkers") or {},
        hepatitis=payload.get("hepatitis") or {},
        treatment_history=payload.get("treatment_history") or [],
        missing_fields=payload.get("missing_fields") or [],
        ruleset_version=payload.get("ruleset_version") or "",
    )
