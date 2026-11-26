from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.schemas import (
    FollowupAlertCloseRequest,
    FollowupAlertListOut,
    FollowupAlertOut,
    FollowupAlertResolveRequest,
    PageMeta,
)
from app.db import get_db
from app.domain.models import Followup, FollowupAlert, Patient, User
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["followups"])

CLINICAL_ROLES = {"CLINICIAN", "EXPERT", "NURSE"}
ACTIVE_STATUSES = {"OPEN", "NOTIFICATION_PENDING", "NOTIFIED", "ACKNOWLEDGED", "IN_ACTION"}


def alert_out(alert: FollowupAlert) -> FollowupAlertOut:
    return FollowupAlertOut(
        alert_id=alert.id,
        followup_id=alert.followup_id,
        patient_id=alert.patient_id,
        risk_level=alert.risk_level,
        reason=alert.reason,
        status=alert.status,
        channel=alert.channel,
        created_by=alert.created_by,
        created_at=alert.created_at,
        notified_at=alert.notified_at,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
        resolved_by=alert.resolved_by,
        resolved_at=alert.resolved_at,
        resolution=alert.resolution,
        closed_by=alert.closed_by,
        closed_at=alert.closed_at,
    )


def _alert_or_404(db: Session, alert_id: str) -> FollowupAlert:
    alert = db.get(FollowupAlert, alert_id)
    if alert is None:
        raise not_found("随访预警不存在")
    return alert


@router.get("/followup-alerts", response_model=FollowupAlertListOut)
def list_alerts(
    status: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupAlertListOut:
    if user.role not in CLINICAL_ROLES or not user.department_id:
        raise forbidden("当前角色无权查看随访预警")
    stmt = (
        select(FollowupAlert)
        .join(Patient, FollowupAlert.patient_id == Patient.id)
        .where(Patient.department_id == user.department_id)
    )
    if status:
        stmt = stmt.where(FollowupAlert.status == status)
    if risk:
        stmt = stmt.where(FollowupAlert.risk_level == risk)
    items = db.scalars(stmt.order_by(FollowupAlert.created_at.desc())).all()
    return FollowupAlertListOut(items=[alert_out(item) for item in items], meta=PageMeta(page=1, page_size=len(items) or 1, total=len(items)))


@router.post("/followup-alerts/{alert_id}/notify", response_model=FollowupAlertOut)
def notify_alert(
    alert_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupAlertOut:
    alert = _alert_or_404(db, alert_id)
    patient = _get_patient_or_404(db, alert.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权处理随访预警")
    if alert.status not in {"OPEN", "NOTIFICATION_PENDING"}:
        raise conflict("ALERT_STATE_INVALID", "仅待通知预警可入队通知")
    # 首期为站内队列；不存在外部短信/电话送达，不能伪造“已送达”。
    alert.status = "NOTIFIED"
    alert.notified_at = datetime.now(UTC)
    db.commit()
    record_audit(request=request, actor=user, action="FOLLOWUP_ALERT_NOTIFY", object_type="FOLLOWUP_ALERT", object_id=alert.id, result="SUCCESS", detail="in_app_queue")
    return alert_out(alert)


@router.post("/followup-alerts/{alert_id}/acknowledge", response_model=FollowupAlertOut)
def acknowledge_alert(
    alert_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupAlertOut:
    alert = _alert_or_404(db, alert_id)
    patient = _get_patient_or_404(db, alert.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权签收随访预警")
    if alert.status != "NOTIFIED":
        raise conflict("ALERT_STATE_INVALID", "预警尚未通知，不能签收")
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = user.id
    alert.acknowledged_at = datetime.now(UTC)
    db.commit()
    record_audit(request=request, actor=user, action="FOLLOWUP_ALERT_ACKNOWLEDGE", object_type="FOLLOWUP_ALERT", object_id=alert.id, result="SUCCESS")
    return alert_out(alert)


@router.post("/followup-alerts/{alert_id}/resolve", response_model=FollowupAlertOut)
def resolve_alert(
    alert_id: str,
    body: FollowupAlertResolveRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupAlertOut:
    alert = _alert_or_404(db, alert_id)
    patient = _get_patient_or_404(db, alert.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权处置随访预警")
    if alert.status not in {"ACKNOWLEDGED", "IN_ACTION"}:
        raise conflict("ALERT_STATE_INVALID", "预警未签收，不能直接处置")
    alert.status = "RESOLVED"
    alert.resolved_by = user.id
    alert.resolved_at = datetime.now(UTC)
    alert.resolution = body.resolution
    db.commit()
    record_audit(request=request, actor=user, action="FOLLOWUP_ALERT_RESOLVE", object_type="FOLLOWUP_ALERT", object_id=alert.id, result="SUCCESS", detail=body.resolution)
    return alert_out(alert)


@router.post("/followup-alerts/{alert_id}/close", response_model=FollowupAlertOut)
def close_alert(
    alert_id: str,
    body: FollowupAlertCloseRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupAlertOut:
    alert = _alert_or_404(db, alert_id)
    patient = _get_patient_or_404(db, alert.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权关闭随访预警")
    if alert.status != "RESOLVED":
        raise conflict("ALERT_STATE_INVALID", "预警未处置，不能关闭")
    alert.status = "CLOSED"
    alert.closed_by = user.id
    alert.closed_at = datetime.now(UTC)
    db.commit()
    record_audit(request=request, actor=user, action="FOLLOWUP_ALERT_CLOSE", object_type="FOLLOWUP_ALERT", object_id=alert.id, result="SUCCESS", detail=body.reason)
    return alert_out(alert)
