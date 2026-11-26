from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.s2_serializers import approval_out
from app.api.schemas import ApprovalDecisionRequest, ApprovalListOut, PageMeta
from app.db import get_db
from app.domain.enums import Role
from app.domain.models import Approval, PathwayVersion, Plan, User
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit

router = APIRouter(tags=["approvals"])

REVIEWER_ROLES = {Role.EXPERT.value, Role.MEDICAL_AFFAIRS.value}


def decide_approval(
    db: Session,
    approval: Approval,
    reviewer: User,
    *,
    approve: bool,
    comment: str | None,
) -> Approval:
    if reviewer.role not in REVIEWER_ROLES:
        raise forbidden("当前角色无权审核")
    if approval.requested_by == reviewer.id:
        raise forbidden("不能审核自己提交的申请")
    if approval.status != "PENDING":
        raise conflict("APPROVAL_NOT_PENDING", "该申请已处理")
    approval.status = "APPROVED" if approve else "REJECTED"
    approval.reviewer = reviewer.id
    approval.reviewed_at = datetime.now(UTC)
    approval.comment = comment
    if approval.object_type == "PLAN":
        plan = db.get(Plan, approval.object_id)
        if plan is not None:
            if approve:
                if plan.status != "PENDING_APPROVAL":
                    raise conflict("INVALID_PLAN_STATE", "计划不在待审核状态")
                plan.status = "APPROVED"
                plan.approved_by = reviewer.id
                plan.approved_at = datetime.now(UTC)
            else:
                plan.status = "DRAFT"
    elif approval.object_type == "PATHWAY_VERSION":
        version = db.get(PathwayVersion, approval.object_id)
        if version is not None and not approve:
            version.status = "DRAFT"
    return approval


@router.get("/approvals", response_model=ApprovalListOut)
def list_approvals(
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApprovalListOut:
    if user.role not in REVIEWER_ROLES | {Role.ADMIN.value}:
        raise forbidden("当前角色无权查看审批队列")
    stmt = select(Approval)
    if status_filter:
        stmt = stmt.where(Approval.status == status_filter)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(
        stmt.order_by(Approval.requested_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return ApprovalListOut(items=[approval_out(item) for item in items], meta=PageMeta(page=page, page_size=page_size, total=total))


@router.post("/approvals/{approval_id}/approve", response_model=dict)
def approve(
    approval_id: str,
    body: ApprovalDecisionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise not_found("审批申请不存在")
    decide_approval(db, approval, user, approve=True, comment=body.comment)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action=f"APPROVAL_APPROVE_{approval.object_type}",
        object_type=approval.object_type,
        object_id=approval.object_id,
        result="SUCCESS",
        detail=body.comment,
    )
    return approval_out(approval).model_dump(mode="json")


@router.post("/approvals/{approval_id}/reject", response_model=dict)
def reject(
    approval_id: str,
    body: ApprovalDecisionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise not_found("审批申请不存在")
    decide_approval(db, approval, user, approve=False, comment=body.comment)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action=f"APPROVAL_REJECT_{approval.object_type}",
        object_type=approval.object_type,
        object_id=approval.object_id,
        result="SUCCESS",
        detail=body.comment,
    )
    return approval_out(approval).model_dump(mode="json")
