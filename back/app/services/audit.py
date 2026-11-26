from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from fastapi import Request

from app.db import SessionLocal
from app.domain.enums import AuditResult
from app.domain.models import AuditEvent, User

logger = logging.getLogger(__name__)


def _request_id(request: Request | None) -> str:
    if request is None:
        return "internal"
    return getattr(request.state, "request_id", "unknown")


def _mask_ip(request: Request | None) -> str | None:
    if request is None or request.client is None:
        return None
    host = request.client.host
    if "." in host:
        parts = host.split(".")
        if len(parts) == 4:
            return ".".join(parts[:3]) + ".x"
    if ":" in host:
        return ":".join(host.split(":")[:4]) + ":x"
    return None


def record_audit(
    *,
    request: Request | None,
    actor: User | None,
    action: str,
    object_type: str,
    object_id: str,
    result: AuditResult | str,
    detail: str | None = None,
    actor_id: str | None = None,
    actor_role: str | None = None,
) -> None:
    """Persist an audit event in its own transaction.

    A denied request or a failed business transaction must still leave an audit
    trail, so this function must not depend on the request-scoped DB session.
    """
    event = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:16]}",
        request_id=_request_id(request),
        actor_id=actor.id if actor else (actor_id or "anonymous"),
        actor_role=actor.role if actor else (actor_role or "ANONYMOUS"),
        action=action,
        object_type=object_type,
        object_id=object_id,
        result=str(result),
        occurred_at=datetime.now(UTC),
        ip_masked=_mask_ip(request),
        detail=detail,
    )
    try:
        with SessionLocal() as db:
            db.add(event)
            db.commit()
    except Exception:  # pragma: no cover - audit must not hide the original failure
        logger.exception("failed to persist audit event %s", {"action": action, "object": object_id})
