from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.domain.models import User
from app.errors import ApiError, forbidden
from app.services.audit import record_audit

router = APIRouter(tags=["predictions"])


class PredictionRequest(BaseModel):
    patient_snapshot: dict[str, Any]
    prediction_target: str = Field(min_length=1, max_length=128)
    horizon_days: int = Field(ge=1, le=3650)


@router.post("/predictions")
def create_prediction(body: PredictionRequest, request: Request, user: User = Depends(get_current_user)) -> dict:
    """Research-only MWM endpoint. No model is configured locally."""
    if user.role not in {"EXPERT", "ADMIN"}:
        raise forbidden("仅研究/专家角色可访问预测接口")
    record_audit(
        request=request,
        actor=user,
        action="PREDICTION_REQUEST",
        object_type="PREDICTION",
        object_id=body.prediction_target,
        result="FAILED",
        detail="MWM adapter not configured; clinical_use=false",
    )
    raise ApiError(
        503,
        "MWM_NOT_CONFIGURED",
        "MWM 研究模型未配置；不返回伪造预测，clinical_use=false",
    )
