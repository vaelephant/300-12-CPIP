from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s2_serializers import plan_out
from app.api.schemas import (
    PageMeta,
    ReassessmentDismissRequest,
    ReassessmentListOut,
    ReassessmentOut,
)
from app.db import get_db
from app.domain.models import PathwayInstance, Patient, Reassessment, User
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access
from app.services.replan import create_reassessment_plan

router = APIRouter(tags=["reassessments"])

CLINICAL_ROLES = {"CLINICIAN", "EXPERT", "NURSE"}
DOCTOR_ROLES = {"CLINICIAN", "EXPERT"}


def _out(item: Reassessment) -> ReassessmentOut:
    return ReassessmentOut(
        reassessment_id=item.id,
        patient_id=item.patient_id,
        instance_id=item.instance_id,
        event_id=item.event_id,
        trigger_type=item.trigger_type,
        reason=item.reason,
        status=item.status,
        plan_id=item.plan_id,
        created_at=item.created_at,
        resolved_at=item.resolved_at,
    )


@router.get("/reassessments", response_model=ReassessmentListOut)
def list_reassessments(
    status: str | None = Query(default=None),
    instance_id: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReassessmentListOut:
    if user.role not in CLINICAL_ROLES or not user.department_id:
        raise forbidden("当前角色无权查看重评事项")
    stmt = select(Reassessment).join(Patient, Reassessment.patient_id == Patient.id).where(
        Patient.department_id == user.department_id
    )
    if status:
        stmt = stmt.where(Reassessment.status == status)
    if instance_id:
        stmt = stmt.where(Reassessment.instance_id == instance_id)
    items = db.scalars(stmt.order_by(Reassessment.created_at.desc())).all()
    return ReassessmentListOut(items=[_out(item) for item in items], meta=PageMeta(page=1, page_size=len(items) or 1, total=len(items)))


@router.post("/reassessments/{reassessment_id}/dismiss", response_model=ReassessmentOut)
def dismiss_reassessment(
    reassessment_id: str,
    body: ReassessmentDismissRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReassessmentOut:
    item = db.get(Reassessment, reassessment_id)
    if item is None:
        raise not_found("重评事项不存在")
    patient = _get_patient_or_404(db, item.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权处理重评事项")
    if item.status != "OPEN":
        raise conflict("REASSESSMENT_STATE", "仅待处理重评事项可以关闭/忽略")
    item.status = "DISMISSED"
    item.resolved_at = datetime.now(UTC)
    db.commit()
    record_audit(request=request, actor=user, action="REASSESSMENT_DISMISS", object_type="REASSESSMENT", object_id=item.id, result="SUCCESS", detail=body.reason)
    return _out(item)


@router.post("/reassessments/{reassessment_id}/replan", response_model=dict, status_code=201)
def replan_reassessment(
    reassessment_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    item = db.get(Reassessment, reassessment_id)
    if item is None:
        raise not_found("重评事项不存在")
    patient = _get_patient_or_404(db, item.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以生成重评计划")
    if item.status != "OPEN":
        raise conflict("REASSESSMENT_STATE", "仅待处理重评事项可以生成计划")
    instance = db.get(PathwayInstance, item.instance_id)
    if instance is None:
        raise conflict("INSTANCE_MISSING", "路径实例不存在")
    try:
        plan, tasks = create_reassessment_plan(db, instance=instance, patient=patient, reason=item.reason, user=user)
    except ValueError as exc:
        raise conflict("REPLAN_CONTEXT_MISSING", "缺少路径版本或患者快照") from exc
    item.status = "REPLAN_DRAFTED"
    item.plan_id = plan.id
    item.resolved_at = datetime.now(UTC)
    db.commit()
    record_audit(request=request, actor=user, action="REASSESSMENT_REPLAN", object_type="REASSESSMENT", object_id=item.id, result="SUCCESS", detail=f"plan={plan.id}")
    return plan_out(plan, tasks).model_dump(mode="json")
