from __future__ import annotations

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import ApprovalOut, PathwayVersionOut, PlanOut, TaskOut
from app.domain.models import Approval, PathwayTemplate, PathwayVersion, Plan, Task


def load_json(raw: str, default):
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return default


def approval_out(approval: Approval) -> ApprovalOut:
    return ApprovalOut(
        approval_id=approval.id,
        object_type=approval.object_type,
        object_id=approval.object_id,
        status=approval.status,
        risk=approval.risk,
        requested_by=approval.requested_by,
        requested_at=approval.requested_at,
        reviewer=approval.reviewer,
        reviewed_at=approval.reviewed_at,
        comment=approval.comment,
    )


def latest_approval(db: Session, object_type: str, object_id: str) -> Approval | None:
    return db.scalar(
        select(Approval)
        .where(Approval.object_type == object_type, Approval.object_id == object_id)
        .order_by(Approval.requested_at.desc())
    )


def version_out(db: Session, version: PathwayVersion) -> PathwayVersionOut:
    template = db.get(PathwayTemplate, version.template_id)
    approval = latest_approval(db, "PATHWAY_VERSION", version.id)
    return PathwayVersionOut(
        version_id=version.id,
        template_id=version.template_id,
        name=template.name if template else "",
        disease_code=template.disease_code if template else "C22.0",
        version=version.version,
        status=version.status,
        graph=load_json(version.graph_json, {}),
        rules=load_json(version.rules_json, []),
        content_hash=version.content_hash,
        created_by=version.created_by,
        created_at=version.created_at,
        submitted_at=version.submitted_at,
        published_at=version.published_at,
        approval=approval_out(approval).model_dump(mode="json") if approval else None,
        validation=load_json(version.validation_json, {}),
    )


def task_out(task: Task) -> TaskOut:
    now = datetime.now(UTC)
    completed = task.status == "COMPLETED" or task.status in {"CANCELLED", "SKIPPED"}
    overdue = bool(task.due_at and not completed and task.due_at < now)
    return TaskOut(
        task_id=task.id,
        plan_id=task.plan_id,
        instance_id=task.instance_id,
        node_key=task.node_key,
        name=task.name,
        stage=task.stage,
        role=task.role,
        required=task.required,
        depends_on=load_json(task.depends_on_json, []),
        earliest_start_at=task.earliest_start_at,
        due_at=task.due_at,
        status=task.status,
        assignee=task.assignee,
        completed_at=task.completed_at,
        result_summary=task.result_summary,
        overdue=overdue,
        version=task.row_version,
    )


def plan_out(plan: Plan, tasks: list[Task]) -> PlanOut:
    return PlanOut(
        plan_id=plan.id,
        instance_id=plan.instance_id,
        patient_id=plan.patient_id,
        version=plan.version,
        status=plan.status,
        snapshot_id=plan.snapshot_id,
        ruleset_version=plan.ruleset_version,
        created_by=plan.created_by,
        created_at=plan.created_at,
        submitted_at=plan.submitted_at,
        approved_by=plan.approved_by,
        approved_at=plan.approved_at,
        activated_at=plan.activated_at,
        summary=plan.summary,
        warnings=load_json(plan.warnings_json, []),
        evidence_refs=load_json(plan.evidence_refs_json, []),
        tasks=[task_out(task) for task in tasks],
        graph_content_hash=plan.graph_content_hash,
        execution_blocked=plan.execution_blocked,
        execution_trace=load_json(plan.execution_trace_json, {}),
        execution_fingerprint=plan.execution_fingerprint,
    )
