from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import AnalyticsMetric, AnalyticsSummaryOut
from app.db import get_db
from app.domain.models import (
    Followup,
    Outcome,
    PathwayInstance,
    Patient,
    Plan,
    Task,
    User,
    Variation,
)
from app.errors import forbidden
from app.services.audit import record_audit

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary", response_model=AnalyticsSummaryOut)
def analytics_summary(
    request: Request,
    period: str = Query(default="last_30_days"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsSummaryOut:
    if user.role not in {"MEDICAL_AFFAIRS", "EXECUTIVE", "ADMIN"}:
        raise forbidden("当前角色无权查看聚合指标")
    patients = db.scalar(select(func.count()).select_from(Patient)) or 0
    instances = db.scalar(select(func.count()).select_from(PathwayInstance)) or 0
    active_plans = db.scalar(select(func.count()).select_from(Plan).where(Plan.status == "ACTIVE")) or 0
    open_variations = db.scalar(
        select(func.count()).select_from(Variation).where(Variation.status.in_(["OPEN", "ASSESSING", "REPLAN_PENDING"]))
    ) or 0
    high_risk_followups = db.scalar(
        select(func.count()).select_from(Followup).where(Followup.risk_level == "HIGH", Followup.status != "CLOSED")
    ) or 0
    outcomes = db.scalar(select(func.count()).select_from(Outcome)) or 0
    overdue_tasks = db.scalar(
        select(func.count())
        .select_from(Task)
        .where(Task.status.notin_(["COMPLETED", "CANCELLED", "SKIPPED"]), Task.due_at < datetime.now(UTC))
    ) or 0
    metrics = [
        AnalyticsMetric(key="patients", label="HCC 合成患者", value=patients, numerator=patients, denominator=patients, period=period, definition="全部合成患者数；仅聚合，不含身份信息"),
        AnalyticsMetric(key="instances", label="路径实例", value=instances, numerator=instances, denominator=patients, period=period, definition="已创建路径实例数 / 合成患者数"),
        AnalyticsMetric(key="active_plans", label="生效计划", value=active_plans, numerator=active_plans, denominator=instances, period=period, definition="状态为 ACTIVE 的计划 / 路径实例数"),
        AnalyticsMetric(key="open_variations", label="未关闭变异", value=open_variations, numerator=open_variations, denominator=instances, period=period, definition="OPEN/ASSESSING/REPLAN_PENDING 变异 / 路径实例数"),
        AnalyticsMetric(key="high_risk_followups", label="高风险随访", value=high_risk_followups, numerator=high_risk_followups, denominator=patients, period=period, definition="风险 HIGH 且未关闭随访 / 合成患者数"),
        AnalyticsMetric(key="outcomes", label="已记录结局", value=outcomes, numerator=outcomes, denominator=patients, period=period, definition="已记录结局数 / 合成患者数"),
        AnalyticsMetric(key="overdue_tasks", label="超时任务", value=overdue_tasks, numerator=overdue_tasks, denominator=instances, period=period, definition="当前时间已过 due_at 且未完成的任务数"),
    ]
    record_audit(
        request=request,
        actor=user,
        action="ANALYTICS_SUMMARY",
        object_type="ANALYTICS",
        object_id=period,
        result="SUCCESS",
        detail="aggregate only",
    )
    return AnalyticsSummaryOut(
        generated_at=datetime.now(UTC),
        period={"key": period, "timezone": "UTC"},
        metrics=metrics,
        note="聚合指标为合成演示数据；分母为 0 时不做替代计算。",
    )
