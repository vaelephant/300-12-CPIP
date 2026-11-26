from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s2_serializers import plan_out
from app.api.s3_serializers import variation_out
from app.api.schemas import VariationCreate, VariationOut, VariationResolveRequest
from app.db import get_db
from app.domain.models import PathwayInstance, PathwayVersion, Patient, PatientSnapshot, Plan, Task, User, Variation
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access
from app.services.plans import generate_plan_tasks, plan_summary

router = APIRouter(tags=["variations"])

CLINICAL_ROLES = {"CLINICIAN", "EXPERT", "NURSE"}
DOCTOR_ROLES = {"CLINICIAN", "EXPERT"}


def _variation_or_404(db: Session, variation_id: str) -> Variation:
    item = db.get(Variation, variation_id)
    if item is None:
        raise not_found("变异记录不存在")
    return item


@router.get("/variations")
def list_variations(
    patient_id: str | None = Query(default=None),
    instance_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if user.role not in CLINICAL_ROLES or not user.department_id:
        raise forbidden("当前角色无权查看变异记录")
    stmt = select(Variation).join(Patient, Variation.patient_id == Patient.id).where(Patient.department_id == user.department_id)
    if patient_id:
        stmt = stmt.where(Variation.patient_id == patient_id)
    if instance_id:
        stmt = stmt.where(Variation.instance_id == instance_id)
    if status:
        stmt = stmt.where(Variation.status == status)
    if severity:
        stmt = stmt.where(Variation.severity == severity)
    items = db.scalars(stmt.order_by(Variation.detected_at.desc())).all()
    return {"items": [variation_out(item).model_dump(mode="json") for item in items]}


@router.post("/variations", response_model=VariationOut, status_code=201)
def register_variation(
    body: VariationCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VariationOut:
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权登记变异")
    patient = _get_patient_or_404(db, body.patient_id)
    ensure_patient_access(request, user, patient)
    instance = db.get(PathwayInstance, body.instance_id)
    if instance is None or instance.patient_id != patient.id:
        raise not_found("路径实例不存在或不属于该患者")
    variation = Variation(
        id=f"VAR-{uuid.uuid4().hex[:12].upper()}",
        patient_id=patient.id,
        instance_id=instance.id,
        type=body.type,
        severity=body.severity,
        title=body.title,
        description=body.description,
        detected_at=datetime.now(UTC),
        source=body.source,
        status="OPEN",
        affected_nodes_json=json.dumps(body.affected_nodes, ensure_ascii=False),
        rule_ref=body.rule_ref,
        impact=body.impact,
        evidence_refs_json=json.dumps(body.evidence_refs, ensure_ascii=False),
        created_by=user.id,
    )
    db.add(variation)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="VARIATION_CREATE",
        object_type="VARIATION",
        object_id=variation.id,
        result="SUCCESS",
        detail=f"{variation.type}/{variation.severity}",
    )
    return variation_out(variation)


@router.post("/variations/{variation_id}/resolve", response_model=VariationOut)
def resolve_variation(
    variation_id: str,
    body: VariationResolveRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VariationOut:
    variation = _variation_or_404(db, variation_id)
    patient = _get_patient_or_404(db, variation.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in CLINICAL_ROLES:
        raise forbidden("当前角色无权处理变异")
    if variation.status in {"RESOLVED", "CLOSED"}:
        raise conflict("VARIATION_ALREADY_CLOSED", "变异已处理")
    variation.status = "CLOSED" if body.close else "RESOLVED"
    variation.resolution = body.resolution
    variation.resolved_by = user.id
    variation.resolved_at = datetime.now(UTC)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="VARIATION_RESOLVE",
        object_type="VARIATION",
        object_id=variation.id,
        result="SUCCESS",
        detail=body.resolution,
    )
    return variation_out(variation)


@router.post("/variations/{variation_id}/replan", response_model=dict, status_code=201)
def replan_variation(
    variation_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    variation = _variation_or_404(db, variation_id)
    patient = _get_patient_or_404(db, variation.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以发起重规划")
    if variation.instance_id is None:
        raise conflict("INSTANCE_REQUIRED", "变异未关联路径实例，不能重规划")
    instance = db.get(PathwayInstance, variation.instance_id)
    if instance is None:
        raise conflict("INSTANCE_REQUIRED", "路径实例不存在")
    version = db.get(PathwayVersion, instance.pathway_version_id)
    snapshot = db.scalar(
        select(PatientSnapshot).where(PatientSnapshot.patient_id == patient.id).order_by(PatientSnapshot.as_of.desc())
    )
    if version is None or snapshot is None:
        raise conflict("REPLAN_CONTEXT_MISSING", "缺少路径版本或患者快照")
    active_plan = db.get(Plan, instance.active_plan_id) if instance.active_plan_id else None
    existing_plans = db.scalars(select(Plan).where(Plan.instance_id == instance.id)).all()
    plan = Plan(
        id=f"PLAN-{uuid.uuid4().hex[:12].upper()}",
        instance_id=instance.id,
        patient_id=patient.id,
        version=f"P{len(existing_plans) + 1}",
        status="DRAFT",
        snapshot_id=snapshot.id,
        ruleset_version=json.loads(snapshot.payload_json).get("ruleset_version") or "HCC-RULES-0.6.0",
        created_by=user.id,
        summary="由变异重规划生成，保留已完成任务记录。",
    )
    db.add(plan)
    db.flush()
    payload = json.loads(snapshot.payload_json)
    tasks = generate_plan_tasks(plan=plan, instance=instance, version=version, snapshot_missing_fields=payload.get("missing_fields", []))
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
    plan.summary = plan_summary(version, len(tasks), payload.get("missing_fields", []))
    plan.warnings_json = json.dumps(
        [{"level": "WARN", "message": f"变异重规划：{variation.title}"}], ensure_ascii=False
    )
    evidence = sorted({ref for node in json.loads(version.graph_json).get("nodes", []) for ref in node.get("evidence_refs", [])})
    plan.evidence_refs_json = json.dumps(evidence, ensure_ascii=False)
    variation.status = "REPLAN_PENDING"
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="VARIATION_REPLAN",
        object_type="VARIATION",
        object_id=variation.id,
        result="SUCCESS",
        detail=f"plan={plan.id}",
    )
    return plan_out(plan, tasks).model_dump(mode="json")
