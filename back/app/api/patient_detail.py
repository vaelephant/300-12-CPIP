from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s2_serializers import plan_out
from app.api.s3_serializers import assessment_out, followup_out, outcome_out, variation_out
from app.api.schemas import (
    EncounterOut,
    InstanceOut,
    ObservationOut,
    PatientDetailOut,
    PatientOut,
)
from app.db import get_db
from app.domain.models import (
    Encounter,
    Followup,
    Observation,
    PathwayInstance,
    PathwayVersion,
    Patient,
    PatientSnapshot,
    Plan,
    Task,
    User,
    Variation,
    Outcome,
)
from app.errors import not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["patients"])


@router.get("/patients/{patient_id}/overview", response_model=PatientDetailOut)
def patient_detail_overview(
    patient_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PatientDetailOut:
    patient: Patient = _get_patient_or_404(db, patient_id)
    ensure_patient_access(request, user, patient)
    encounters = db.scalars(
        select(Encounter).where(Encounter.patient_id == patient.id).order_by(Encounter.admitted_at.desc())
    ).all()
    observations = db.scalars(
        select(Observation).where(Observation.patient_id == patient.id).order_by(Observation.occurred_at.desc())
    ).all()
    snapshot = db.scalar(
        select(PatientSnapshot).where(PatientSnapshot.patient_id == patient.id).order_by(PatientSnapshot.as_of.desc())
    )
    assessment = None
    if snapshot is not None:
        assessment = assessment_out(snapshot, json.loads(snapshot.payload_json))
    instance = db.scalar(
        select(PathwayInstance).where(PathwayInstance.patient_id == patient.id).order_by(PathwayInstance.enrolled_at.desc())
    )
    plan = None
    if instance is not None:
        plan = db.get(Plan, instance.active_plan_id) if instance.active_plan_id else None
        if plan is None:
            plan = db.scalar(select(Plan).where(Plan.instance_id == instance.id).order_by(Plan.created_at.desc()))
    plan_body = None
    if plan is not None:
        tasks = db.scalars(select(Task).where(Task.plan_id == plan.id).order_by(Task.earliest_start_at, Task.id)).all()
        plan_body = plan_out(plan, list(tasks))
    variations = db.scalars(
        select(Variation).where(Variation.patient_id == patient.id).order_by(Variation.detected_at.desc())
    ).all()
    followups = db.scalars(
        select(Followup).where(Followup.patient_id == patient.id).order_by(Followup.window_start.desc())
    ).all()
    outcomes = db.scalars(select(Outcome).where(Outcome.patient_id == patient.id).order_by(Outcome.observed_at.desc())).all()
    instance_body = None
    if instance is not None:
        version = db.get(PathwayVersion, instance.pathway_version_id)
        instance_body = InstanceOut(
            instance_id=instance.id,
            patient_id=instance.patient_id,
            pathway_version_id=version.id if version else instance.pathway_version_id,
            status=instance.status,
            enrolled_at=instance.enrolled_at,
            active_plan_id=instance.active_plan_id,
            current_stage=instance.current_stage,
            data_completeness=instance.data_completeness,
        )
    record_audit(
        request=request,
        actor=user,
        action="PATIENT_DETAIL_OVERVIEW",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
    )
    return PatientDetailOut(
        patient=PatientOut.model_validate(patient),
        encounters=[EncounterOut.model_validate(item) for item in encounters],
        observations=[ObservationOut.model_validate(item) for item in observations],
        assessment=assessment,
        instance=instance_body,
        plan=plan_body,
        variations=[variation_out(item) for item in variations],
        followups=[followup_out(item) for item in followups],
        outcomes=[outcome_out(item) for item in outcomes],
    )
