from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s3_serializers import outcome_out
from app.api.schemas import OutcomeCreate, OutcomeOut
from app.db import get_db
from app.domain.models import Outcome, PathwayInstance, User
from app.errors import not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["outcomes"])


@router.get("/patients/{patient_id}/outcomes")
def list_outcomes(
    patient_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    patient = _get_patient_or_404(db, patient_id)
    ensure_patient_access(request, user, patient)
    items = db.scalars(select(Outcome).where(Outcome.patient_id == patient.id).order_by(Outcome.observed_at.desc())).all()
    return {"items": [outcome_out(item).model_dump(mode="json") for item in items]}


@router.post("/patients/{patient_id}/outcomes", response_model=OutcomeOut, status_code=201)
def create_outcome(
    patient_id: str,
    body: OutcomeCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutcomeOut:
    patient = _get_patient_or_404(db, patient_id)
    ensure_patient_access(request, user, patient)
    item = Outcome(
        id=f"OUT-{uuid.uuid4().hex[:12].upper()}",
        patient_id=patient.id,
        instance_id=body.instance_id,
        treatment_type=body.treatment_type,
        evaluation_standard=body.evaluation_standard,
        observed_at=body.observed_at,
        recurrence=body.recurrence,
        progression=body.progression,
        response=body.response,
        adverse_events_json=json.dumps(body.adverse_events or [], ensure_ascii=False),
        lost_to_followup=body.lost_to_followup,
        recorded_by=user.id,
        recorded_at=datetime.now(UTC),
    )
    instance = db.get(PathwayInstance, body.instance_id)
    if instance is None or instance.patient_id != patient.id:
        raise not_found("路径实例不存在或不属于该患者")
    db.add(item)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="OUTCOME_CREATE",
        object_type="OUTCOME",
        object_id=item.id,
        result="SUCCESS",
        detail=f"patient={patient.id}, treatment={body.treatment_type}",
    )
    return outcome_out(item)
