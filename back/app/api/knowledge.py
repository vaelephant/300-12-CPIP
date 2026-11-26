from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.domain.models import User
from app.errors import ApiError
from app.services.audit import record_audit

router = APIRouter(tags=["knowledge"])


@router.post("/knowledge/retrieve")
def retrieve_knowledge(request: Request, user: User = Depends(get_current_user)) -> dict:
    """KEE adapter is not configured in the local V0.6 development stack.

    Returning a fabricated success would violate the checklist's "no fake sync"
    rule. The endpoint exists so clients receive a deterministic, auditable
    degradation instead of a 404.
    """
    record_audit(
        request=request,
        actor=user,
        action="KEE_RETRIEVE",
        object_type="KNOWLEDGE",
        object_id="KEE",
        result="FAILED",
        detail="KEE adapter not configured",
    )
    raise ApiError(503, "KEE_NOT_CONFIGURED", "KEE 知识适配器未配置，不能返回伪造的证据引用")
