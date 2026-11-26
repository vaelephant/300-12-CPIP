from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s3_serializers import followup_out
from app.api.schemas import (
    FollowupCloseRequest,
    FollowupContactCreate,
    FollowupCreateRequest,
    FollowupEscalationRequest,
    FollowupOut,
)
from app.db import get_db
from app.domain.models import Followup, PathwayInstance, Patient, User
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["followups"])

CLINICAL_ROLES = {"CLINICIAN", "EXPERT", "NURSE"}


def _followup_or_404(db: Session, followup_id: str) -> Followup:
    item = db.get(Followup, followup_id)
    if item is None:
        raise not_found("随访计划不存在")
    return item


@router.get("/followups")
def list_followups(
    patient_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if user.role not in CLINICAL_ROLES or not user.department_id:
        raise forbidden("当前角色无权查看随访队列")
    stmt = select(Followup).join(Patient, Followup.patient_id == Patient.id).where(Patient.department_id == user.department_id)
    if patient_id:
        stmt = stmt.where(Followup.patient_id == patient_id)
    if status:
        stmt = stmt.where(Followup.status == status)
    if risk:
        stmt = stmt.where(Followup.risk_level == risk)
    items = db.scalars(stmt.order_by(Followup.risk_level.desc(), Followup.window_end)).all()
    return {"items": [followup_out(item).model_dump(mode="json") for item in items]}


@router.post("/followups", response_model=FollowupOut, status_code=201)
def create_followup(
    body: FollowupCreateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupOut:
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权创建随访计划")
    patient = _get_patient_or_404(db, body.patient_id)
    ensure_patient_access(request, user, patient)
    if body.window_end < body.window_start:
        raise conflict("INVALID_WINDOW", "随访窗口结束时间不能早于开始时间")
    if body.instance_id:
        instance = db.get(PathwayInstance, body.instance_id)
        if instance is None or instance.patient_id != patient.id:
            raise not_found("路径实例不存在或不属于该患者")
    item = Followup(
        id=f"FU-{uuid.uuid4().hex[:12].upper()}",
        patient_id=patient.id,
        instance_id=body.instance_id,
        treatment_event_id=body.treatment_event_id,
        window_start=body.window_start,
        window_end=body.window_end,
        channel=body.channel,
        consent_status=body.consent_status,
        status="WAITING_CONTACT" if body.consent_status != "DECLINED" else "DECLINED",
        owner=body.owner,
        risk_level=body.risk_level,
        created_by=user.id,
    )
    db.add(item)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="FOLLOWUP_CREATE",
        object_type="FOLLOWUP",
        object_id=item.id,
        result="SUCCESS",
        detail=f"patient={patient.id}",
    )
    return followup_out(item)


@router.post("/followups/{followup_id}/contacts", response_model=FollowupOut)
def record_contact(
    followup_id: str,
    body: FollowupContactCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupOut:
    item = _followup_or_404(db, followup_id)
    patient = _get_patient_or_404(db, item.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权记录随访")
    if item.status in {"CLOSED", "DECLINED"}:
        raise conflict("FOLLOWUP_CLOSED", "已关闭或拒绝的随访不能继续记录")
    contacts = json.loads(item.contacts_json or "[]")
    contacts.append(
        {
            "contact_id": f"FC-{uuid.uuid4().hex[:10].upper()}",
            "attempted_at": datetime.now(UTC).isoformat(),
            "channel": body.channel,
            "outcome": body.outcome,
            "raw_patient_text": body.raw_patient_text,
            "structured_extract": body.structured_extract,
            "confirmed_by_human": body.confirmed_by_human,
        }
    )
    item.contacts_json = json.dumps(contacts, ensure_ascii=False)
    if body.structured_extract:
        record = json.loads(item.structured_record_json or "{}")
        record.update(body.structured_extract)
        item.structured_record_json = json.dumps(record, ensure_ascii=False)
    if body.outcome == "REACHED":
        item.status = "COLLECTED"
    elif body.outcome == "DECLINED":
        item.status = "DECLINED"
    elif body.outcome == "RESCHEDULED":
        item.status = "RESCHEDULED"
    else:
        item.status = "CONTACTING"
    item.updated_at = datetime.now(UTC)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="FOLLOWUP_CONTACT",
        object_type="FOLLOWUP",
        object_id=item.id,
        result="SUCCESS",
        detail=body.outcome,
    )
    return followup_out(item)


@router.post("/followups/{followup_id}/escalate", response_model=FollowupOut)
def escalate_followup(
    followup_id: str,
    body: FollowupEscalationRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupOut:
    item = _followup_or_404(db, followup_id)
    patient = _get_patient_or_404(db, item.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权升级随访风险")
    if item.status in {"CLOSED", "DECLINED"}:
        raise conflict("FOLLOWUP_CLOSED", "已关闭随访不能升级")
    now = datetime.now(UTC)
    item.risk_level = "HIGH"
    item.status = "PENDING_ACTION"
    item.escalation_json = json.dumps(
        {
            "required": True,
            "reason": body.reason,
            "notified_at": now.isoformat(),
            "acknowledged_at": now.isoformat(),
            "resolved_at": None,
        },
        ensure_ascii=False,
    )
    item.updated_at = now
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="FOLLOWUP_ESCALATE",
        object_type="FOLLOWUP",
        object_id=item.id,
        result="SUCCESS",
        detail=body.reason,
    )
    return followup_out(item)


@router.post("/followups/{followup_id}/close", response_model=FollowupOut)
def close_followup(
    followup_id: str,
    body: FollowupCloseRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowupOut:
    item = _followup_or_404(db, followup_id)
    patient = _get_patient_or_404(db, item.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权关闭随访")
    if item.status == "CLOSED":
        raise conflict("FOLLOWUP_CLOSED", "随访已关闭")
    now = datetime.now(UTC)
    escalation = json.loads(item.escalation_json or "{}")
    if escalation:
        escalation["resolved_at"] = now.isoformat()
        item.escalation_json = json.dumps(escalation, ensure_ascii=False)
    item.status = "CLOSED"
    item.updated_at = now
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="FOLLOWUP_CLOSE",
        object_type="FOLLOWUP",
        object_id=item.id,
        result="SUCCESS",
        detail=body.reason,
    )
    return followup_out(item)
