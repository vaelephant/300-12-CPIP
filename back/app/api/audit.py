from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import AuditOut, PageMeta
from app.db import get_db
from app.domain.models import AuditEvent, User
from app.errors import forbidden
from app.services.audit import record_audit

router = APIRouter(tags=["audit"])

AUDIT_ROLES = {"ADMIN", "MEDICAL_AFFAIRS"}


@router.get("/audit-events")
def list_audit_events(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    object_type: str | None = None,
    object_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if user.role not in AUDIT_ROLES:
        record_audit(
            request=request,
            actor=user,
            action="AUDIT_LIST",
            object_type="AUDIT",
            object_id="*",
            result="DENIED",
            detail="当前角色无权查看审计日志",
        )
        raise forbidden("当前角色无权查看审计日志")
    stmt = select(AuditEvent)
    if object_type:
        stmt = stmt.where(AuditEvent.object_type == object_type)
    if object_id:
        stmt = stmt.where(AuditEvent.object_id == object_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(
        stmt.order_by(AuditEvent.occurred_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    data = [
        AuditOut(
            event_id=item.id,
            request_id=item.request_id,
            actor_id=item.actor_id,
            actor_role=item.actor_role,
            action=item.action,
            object_type=item.object_type,
            object_id=item.object_id,
            result=item.result,
            occurred_at=item.occurred_at,
            ip_masked=item.ip_masked,
            detail=item.detail,
        ).model_dump(mode="json")
        for item in items
    ]
    return {"items": data, "meta": PageMeta(page=page, page_size=page_size, total=total).model_dump(mode="json")}
