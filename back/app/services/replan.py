from __future__ import annotations

import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import PathwayInstance, PathwayVersion, Patient, PatientSnapshot, Plan, Task, User
from app.services.graph_execution import select_execution
from app.services.plans import execution_fingerprint, generate_plan_tasks, next_plan_version, plan_summary
from app.services.rules import build_context


def create_reassessment_plan(
    db: Session,
    *,
    instance: PathwayInstance,
    patient: Patient,
    reason: str,
    user: User,
) -> tuple[Plan, list[Task]]:
    version = db.get(PathwayVersion, instance.pathway_version_id)
    snapshot = db.scalar(
        select(PatientSnapshot)
        .where(PatientSnapshot.patient_id == patient.id)
        .order_by(PatientSnapshot.as_of.desc(), PatientSnapshot.created_at.desc())
    )
    if version is None or snapshot is None:
        raise ValueError("missing version or snapshot")
    payload = json.loads(snapshot.payload_json)
    selection = select_execution(json.loads(version.graph_json), build_context(db, patient, payload))
    selection.trace["graph_hash"] = version.content_hash
    existing = db.scalars(select(Plan).where(Plan.instance_id == instance.id)).all()
    plan = Plan(
        id=f"PLAN-{uuid.uuid4().hex[:12].upper()}",
        instance_id=instance.id,
        patient_id=patient.id,
        version=next_plan_version(db, instance.id),
        status="DRAFT",
        snapshot_id=snapshot.id,
        ruleset_version=payload.get("ruleset_version") or "HCC-RULES-0.6.0",
        created_by=user.id,
        graph_content_hash=version.content_hash,
        execution_trace_json=json.dumps(selection.trace, ensure_ascii=False),
        execution_blocked=selection.blocked,
        summary="事件驱动重评生成的候选计划；原 ACTIVE 计划保持不变。",
    )
    plan.execution_fingerprint = execution_fingerprint(version.content_hash, snapshot.id, plan.execution_trace_json)
    db.add(plan)
    db.flush()
    tasks = generate_plan_tasks(
        plan=plan,
        instance=instance,
        version=version,
        snapshot_missing_fields=payload.get("missing_fields", []),
        selected_nodes=selection.selected_nodes,
    )
    active_plan = db.get(Plan, instance.active_plan_id) if instance.active_plan_id else None
    old_tasks = db.scalars(select(Task).where(Task.plan_id == active_plan.id)).all() if active_plan else []
    completed_by_node = {task.node_key: task for task in old_tasks if task.status == "COMPLETED"}
    for task in tasks:
        old = completed_by_node.get(task.node_key)
        if old is not None:
            task.status = "COMPLETED"
            task.completed_at = old.completed_at
            task.result_summary = old.result_summary
            task.assignee = old.assignee
        db.add(task)
    plan.summary = f"{reason} · " + plan_summary(version, len(tasks), payload.get("missing_fields", []))
    warnings = [{"level": "WARN", "message": f"事件驱动重评：{reason}"}]
    if selection.blocked:
        warnings.append({"level": "RISK", "message": f"执行分支阻断：{selection.block_reason}"})
    plan.warnings_json = json.dumps(warnings, ensure_ascii=False)
    evidence = sorted({ref for node in json.loads(version.graph_json).get("nodes", []) for ref in node.get("evidence_refs", [])})
    plan.evidence_refs_json = json.dumps(evidence, ensure_ascii=False)
    return plan, tasks
