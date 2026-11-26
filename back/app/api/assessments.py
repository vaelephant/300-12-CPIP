from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s3_serializers import assessment_out
from app.api.schemas import SpecialtyAssessmentOut
from app.db import get_db
from app.domain.models import PatientSnapshot, User
from app.errors import not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["assessments"])


@router.get("/patients/{patient_id}/specialty-assessment", response_model=SpecialtyAssessmentOut)
def latest_assessment(
    patient_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpecialtyAssessmentOut:
    patient = _get_patient_or_404(db, patient_id)
    ensure_patient_access(request, user, patient)
    snapshot = db.scalar(
        select(PatientSnapshot).where(PatientSnapshot.patient_id == patient.id).order_by(PatientSnapshot.as_of.desc())
    )
    if snapshot is None:
        raise not_found("该患者尚无状态快照，不能生成专病评估")
    payload = json.loads(snapshot.payload_json)
    record_audit(
        request=request,
        actor=user,
        action="SPECIALTY_ASSESSMENT_VIEW",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
        detail=f"snapshot={snapshot.id}",
    )
    return assessment_out(snapshot, payload)
