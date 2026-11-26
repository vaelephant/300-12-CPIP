from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s2_serializers import task_out
from app.api.schemas import PageMeta, TaskOut, TaskOverviewListOut, TaskOverviewOut, TaskTransitionRequest
from app.db import get_db
from app.domain.models import (
    PathwayInstance,
    PathwayTemplate,
    PathwayVersion,
    Patient,
    Plan,
    Task,
    User,
)
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["tasks"])

ROLE_CAN = {
    "DOCTOR": {"CLINICIAN", "EXPERT"},
    "SURGEON": {"CLINICIAN", "EXPERT"},
    "NURSE": {"NURSE"},
    "ANESTHESIOLOGIST": {"CLINICIAN", "EXPERT"},
    "COORDINATOR": {"CLINICIAN", "EXPERT", "NURSE"},
}
ALLOWED_TRANSITIONS = {
    "PENDING": {"READY", "BLOCKED", "CANCELLED", "SKIPPED"},
    "READY": {"IN_PROGRESS", "BLOCKED", "CANCELLED", "SKIPPED"},
    "IN_PROGRESS": {"COMPLETED", "BLOCKED", "CANCELLED"},
    "BLOCKED": {"PENDING", "CANCELLED"},
}


@router.get("/tasks/overview", response_model=TaskOverviewListOut)
def task_overview(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    overdue_only: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskOverviewListOut:
    if user.role not in {"CLINICIAN", "EXPERT", "NURSE"} or not user.department_id:
        raise forbidden("当前角色不具备任务访问权限")
    stmt = (
        select(Task, Patient.display_name, PathwayTemplate.name)
        .join(Patient, Task.patient_id == Patient.id)
        .join(PathwayInstance, Task.instance_id == PathwayInstance.id)
        .join(PathwayVersion, PathwayInstance.pathway_version_id == PathwayVersion.id)
        .join(PathwayTemplate, PathwayVersion.template_id == PathwayTemplate.id)
        .where(Patient.department_id == user.department_id)
    )
    if status:
        stmt = stmt.where(Task.status == status)
    rows = db.execute(stmt.order_by(Task.due_at, Task.id)).all()
    now = datetime.now(UTC)
    items: list[TaskOverviewOut] = []
    for task, patient_name, pathway_name in rows:
        overdue = bool(task.due_at and task.status not in {"COMPLETED", "CANCELLED", "SKIPPED"} and task.due_at < now)
        if overdue_only and not overdue:
            continue
        dependency_ids = json.loads(task.depends_on_json or "[]")
        dependencies_completed = True
        if dependency_ids:
            statuses = db.scalars(select(Task.status).where(Task.id.in_(dependency_ids))).all()
            dependencies_completed = len(statuses) == len(dependency_ids) and all(status == "COMPLETED" for status in statuses)
        items.append(
            TaskOverviewOut(
                task_id=task.id,
                instance_id=task.instance_id,
                patient_id=task.patient_id,
                patient_name=patient_name,
                pathway_name=pathway_name,
                node_key=task.node_key,
                name=task.name,
                stage=task.stage,
                role=task.role,
                status=task.status,
                required=task.required,
                assignee=task.assignee,
                due_at=task.due_at,
                overdue=overdue,
                version=task.row_version,
                dependencies_completed=dependencies_completed,
            )
        )
    total = len(items)
    paged = items[(page - 1) * page_size : page * page_size]
    record_audit(
        request=request,
        actor=user,
        action="TASK_OVERVIEW",
        object_type="TASK",
        object_id="*",
        result="SUCCESS",
        detail=f"total={total}, overdue_only={overdue_only}",
    )
    return TaskOverviewListOut(items=paged, meta=PageMeta(page=page, page_size=page_size, total=total))


@router.get("/tasks")
def list_tasks(
    instance_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if user.role not in {"CLINICIAN", "EXPERT", "NURSE"} or not user.department_id:
        raise forbidden("当前角色不具备任务访问权限")
    # Authorization is enforced by restricting to patients in the user's department.
    from app.domain.models import Patient

    stmt = select(Task).join(Patient, Task.patient_id == Patient.id).where(Patient.department_id == user.department_id)
    if instance_id:
        stmt = stmt.where(Task.instance_id == instance_id)
    if status:
        stmt = stmt.where(Task.status == status)
    tasks = db.scalars(stmt.order_by(Task.due_at, Task.id)).all()
    return {"items": [task_out(task).model_dump(mode="json") for task in tasks]}


@router.post("/tasks/{task_id}/transition", response_model=TaskOut)
def transition_task(
    task_id: str,
    body: TaskTransitionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskOut:
    task = db.get(Task, task_id)
    if task is None:
        raise not_found("任务不存在")
    patient = _get_patient_or_404(db, task.patient_id)
    ensure_patient_access(request, user, patient)
    plan = db.get(Plan, task.plan_id)
    instance = db.get(PathwayInstance, task.instance_id)
    if plan is None or plan.status != "ACTIVE":
        raise conflict("PLAN_NOT_ACTIVE", "仅生效计划的任可以执行")
    if instance is None or instance.active_plan_id != plan.id:
        raise conflict("INSTANCE_NOT_ACTIVE", "路径实例当前未激活该计划")
    if task.row_version != body.expected_version:
        raise conflict("VERSION_CONFLICT", "任务已被其他操作更新，请刷新后重试")
    if user.role not in ROLE_CAN.get(task.role, set()):
        raise forbidden("当前角色与任务责任角色不匹配")

    allowed = ALLOWED_TRANSITIONS.get(task.status, set())
    if body.to_status not in allowed:
        raise conflict("INVALID_TASK_TRANSITION", f"不允许从 {task.status} 转换到 {body.to_status}")
    if body.to_status == "SKIPPED" and task.required:
        raise conflict("REQUIRED_TASK_CANNOT_SKIP", "必需任务不能跳过")
    if body.to_status in {"READY", "IN_PROGRESS", "COMPLETED"}:
        deps = json.loads(task.depends_on_json or "[]")
        incomplete = [
            dep_id
            for dep_id in deps
            if (dep := db.get(Task, dep_id)) is None or dep.status != "COMPLETED"
        ]
        if incomplete:
            raise conflict("DEPENDENCIES_INCOMPLETE", f"依赖任务未完成：{', '.join(incomplete)}")
    if body.to_status == "COMPLETED" and not (body.result_summary or "").strip():
        raise conflict("RESULT_REQUIRED", "完成任务必须记录结果摘要")

    task.status = body.to_status
    task.row_version += 1
    if task.assignee is None:
        task.assignee = user.id
    if body.to_status == "COMPLETED":
        task.completed_at = datetime.now(UTC)
        task.result_summary = body.result_summary
    if body.to_status == "CANCELLED":
        task.result_summary = body.result_summary or "已取消"
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="TASK_TRANSITION",
        object_type="TASK",
        object_id=task.id,
        result="SUCCESS",
        detail=f"{task.status}, version={task.row_version}",
    )
    return task_out(task)
