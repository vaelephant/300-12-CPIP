from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.approvals import decide_approval
from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.s2_serializers import latest_approval, plan_out
from app.api.schemas import InstanceCreate, InstanceOut, PlanCreate, PlanOut, ApprovalDecisionRequest
from app.db import get_db
from app.domain.models import (
    Approval,
    EnrollmentEvaluation,
    PathwayInstance,
    PathwayVersion,
    PatientSnapshot,
    Plan,
    Task,
    User,
)
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access
from app.services.plans import execution_fingerprint, generate_plan_tasks, next_plan_version, plan_summary
from app.services.graph_execution import select_execution
from app.services.rules import build_context, evaluate_rule, Tri

router = APIRouter(tags=["instances"])

DOCTOR_ROLES = {"CLINICIAN", "EXPERT"}


def _instance_or_404(db: Session, instance_id: str) -> PathwayInstance:
    instance = db.get(PathwayInstance, instance_id)
    if instance is None:
        raise not_found("路径实例不存在")
    return instance


def _plan_tasks(db: Session, plan_id: str) -> list[Task]:
    return list(db.scalars(select(Task).where(Task.plan_id == plan_id).order_by(Task.earliest_start_at, Task.id)).all())


def _instance_out(instance: PathwayInstance) -> InstanceOut:
    return InstanceOut(
        instance_id=instance.id,
        patient_id=instance.patient_id,
        pathway_version_id=instance.pathway_version_id,
        status=instance.status,
        enrolled_at=instance.enrolled_at,
        active_plan_id=instance.active_plan_id,
        current_stage=instance.current_stage,
        data_completeness=instance.data_completeness,
    )


@router.post("/instances", response_model=InstanceOut, status_code=201)
def create_instance(
    body: InstanceCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InstanceOut:
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以创建路径实例")
    patient = _get_patient_or_404(db, body.patient_id)
    ensure_patient_access(request, user, patient)
    evaluation = db.get(EnrollmentEvaluation, body.enrollment_evaluation_id)
    if evaluation is None or evaluation.patient_id != patient.id:
        raise not_found("入径评估不存在或不属于该患者")
    if evaluation.decision != "ELIGIBLE" or not body.doctor_confirmed:
        raise conflict("ENROLLMENT_NOT_ELIGIBLE", "入径评估未通过或医生未确认，不能创建实例")
    if evaluation.pathway_version_id != body.pathway_version_id:
        raise conflict("VERSION_MISMATCH", "入径评估与请求的路径版本不一致")
    existing = db.scalar(select(PathwayInstance).where(PathwayInstance.enrollment_evaluation_id == evaluation.id))
    if existing is not None:
        raise conflict("INSTANCE_EXISTS", "该入径评估已创建实例")
    version = db.get(PathwayVersion, body.pathway_version_id)
    if version is None or version.status != "PUBLISHED":
        raise conflict("PATHWAY_NOT_PUBLISHED", "只能使用已发布路径版本创建实例")
    snapshot = db.get(PatientSnapshot, evaluation.snapshot_id)
    graph = json.loads(version.graph_json)
    stages = []
    for node in graph.get("nodes", []):
        if node.get("type") not in {"START", "END"} and node.get("stage") not in stages:
            stages.append(node.get("stage"))
    missing = json.loads(snapshot.payload_json).get("missing_fields", []) if snapshot else []
    instance = PathwayInstance(
        id=f"INST-{uuid.uuid4().hex[:12].upper()}",
        patient_id=patient.id,
        pathway_version_id=version.id,
        enrollment_evaluation_id=evaluation.id,
        status="ACTIVE",
        current_stage=stages[0] if stages else None,
        data_completeness=max(0, 100 - 10 * len(missing)),
    )
    db.add(instance)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="INSTANCE_CREATE",
        object_type="INSTANCE",
        object_id=instance.id,
        result="SUCCESS",
        detail=f"evaluation={evaluation.id}",
    )
    return _instance_out(instance)


@router.get("/instances/{instance_id}", response_model=InstanceOut)
def get_instance(
    instance_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InstanceOut:
    instance = _instance_or_404(db, instance_id)
    patient = _get_patient_or_404(db, instance.patient_id)
    ensure_patient_access(request, user, patient)
    return _instance_out(instance)


@router.get("/instances/{instance_id}/plans", response_model=list[PlanOut])
def list_instance_plans(
    instance_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PlanOut]:
    instance = _instance_or_404(db, instance_id)
    patient = _get_patient_or_404(db, instance.patient_id)
    ensure_patient_access(request, user, patient)
    plans = db.scalars(select(Plan).where(Plan.instance_id == instance.id).order_by(Plan.created_at.desc())).all()
    return [plan_out(plan, _plan_tasks(db, plan.id)) for plan in plans]


@router.post("/instances/{instance_id}/plans", response_model=PlanOut, status_code=201)
def generate_plan(
    instance_id: str,
    body: PlanCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanOut:
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以生成计划")
    instance = _instance_or_404(db, instance_id)
    patient = _get_patient_or_404(db, instance.patient_id)
    ensure_patient_access(request, user, patient)
    version = db.get(PathwayVersion, instance.pathway_version_id)
    if version is None:
        raise conflict("PATHWAY_VERSION_MISSING", "实例绑定的路径版本不存在")
    snapshot = db.get(PatientSnapshot, body.snapshot_id)
    if snapshot is None or snapshot.patient_id != patient.id:
        raise not_found("计划快照不存在或不属于该患者")
    plans = db.scalars(select(Plan).where(Plan.instance_id == instance.id)).all()
    plan = Plan(
        id=f"PLAN-{uuid.uuid4().hex[:12].upper()}",
        instance_id=instance.id,
        patient_id=patient.id,
        version=next_plan_version(db, instance.id),
        status="DRAFT",
        snapshot_id=snapshot.id,
        ruleset_version=body.ruleset_version,
        created_by=user.id,
    )
    snapshot_payload = json.loads(snapshot.payload_json)
    selection = select_execution(json.loads(version.graph_json), build_context(db, patient, snapshot_payload))
    selection.trace["graph_hash"] = version.content_hash
    db.add(plan)
    db.flush()
    tasks = generate_plan_tasks(
        plan=plan,
        instance=instance,
        version=version,
        snapshot_missing_fields=snapshot_payload.get("missing_fields", []),
        selected_nodes=selection.selected_nodes,
    )
    plan.graph_content_hash = version.content_hash
    plan.execution_trace_json = json.dumps(selection.trace, ensure_ascii=False)
    plan.execution_blocked = selection.blocked
    plan.execution_fingerprint = execution_fingerprint(version.content_hash, snapshot.id, plan.execution_trace_json)
    db.add_all(tasks)
    plan.summary = plan_summary(version, len(tasks), snapshot_payload.get("missing_fields", []))
    warnings = [{"level": "UNKNOWN", "message": f"缺失字段：{field}"} for field in snapshot_payload.get("missing_fields", [])]
    if selection.blocked:
        warnings.append({"level": "RISK", "message": f"执行分支阻断：{selection.block_reason}"})
    plan.warnings_json = json.dumps(warnings, ensure_ascii=False)
    evidence = sorted({ref for node in json.loads(version.graph_json).get("nodes", []) for ref in node.get("evidence_refs", [])})
    plan.evidence_refs_json = json.dumps(evidence, ensure_ascii=False)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="PLAN_CREATE",
        object_type="PLAN",
        object_id=plan.id,
        result="SUCCESS",
        detail=f"instance={instance.id}, tasks={len(tasks)}",
    )
    return plan_out(plan, tasks)


@router.get("/plans/{plan_id}", response_model=PlanOut)
def get_plan(
    plan_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanOut:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise not_found("计划不存在")
    patient = _get_patient_or_404(db, plan.patient_id)
    ensure_patient_access(request, user, patient)
    return plan_out(plan, _plan_tasks(db, plan.id))


@router.post("/plans/{plan_id}/submit", response_model=PlanOut)
def submit_plan(
    plan_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanOut:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise not_found("计划不存在")
    patient = _get_patient_or_404(db, plan.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以提交计划")
    if plan.status != "DRAFT":
        raise conflict("INVALID_PLAN_STATE", "仅草稿计划可以提交审核")
    if plan.execution_blocked:
        raise conflict("EXECUTION_BLOCKED", "执行分支存在 UNKNOWN/冲突，不能提交审核")
    if plan.execution_fingerprint is None:
        plan.execution_fingerprint = execution_fingerprint(plan.graph_content_hash, plan.snapshot_id, plan.execution_trace_json)
    approval = Approval(
        id=f"AP-{uuid.uuid4().hex[:12].upper()}",
        object_type="PLAN",
        object_id=plan.id,
        status="PENDING",
        risk="HIGH" if plan.warnings_json != "[]" else "MEDIUM",
        requested_by=user.id,
        subject_fingerprint=plan.execution_fingerprint,
    )
    plan.status = "PENDING_APPROVAL"
    plan.submitted_at = datetime.now(UTC)
    db.add(approval)
    record_audit(
        request=request,
        actor=user,
        action="PLAN_SUBMIT",
        object_type="PLAN",
        object_id=plan.id,
        result="SUCCESS",
        detail=f"approval={approval.id}",
        db=db,
    )
    db.commit()
    return plan_out(plan, _plan_tasks(db, plan_id))


@router.post("/plans/{plan_id}/approve", response_model=PlanOut)
def approve_plan(
    plan_id: str,
    body: ApprovalDecisionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanOut:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise not_found("计划不存在")
    if plan.status != "PENDING_APPROVAL":
        raise conflict("INVALID_PLAN_STATE", "计划不在待审核状态")
    approval = latest_approval(db, "PLAN", plan.id)
    if approval is None:
        raise conflict("APPROVAL_MISSING", "计划缺少审批记录")
    decide_approval(db, approval, user, approve=True, comment=body.comment)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="PLAN_APPROVE",
        object_type="PLAN",
        object_id=plan.id,
        result="SUCCESS",
        detail=body.comment,
    )
    return plan_out(plan, _plan_tasks(db, plan.id))


@router.post("/plans/{plan_id}/activate", response_model=PlanOut)
def activate_plan(
    plan_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlanOut:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise not_found("计划不存在")
    patient = _get_patient_or_404(db, plan.patient_id)
    ensure_patient_access(request, user, patient)
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以激活计划")
    if plan.status != "APPROVED":
        raise conflict("PLAN_NOT_APPROVED", "计划必须先审核通过才能激活")
    if plan.execution_blocked:
        raise conflict("EXECUTION_BLOCKED", "执行分支已被阻断，不能激活计划")
    approval = latest_approval(db, "PLAN", plan.id)
    if approval is None or approval.status != "APPROVED":
        raise conflict("APPROVAL_REQUIRED", "计划缺少有效审批")
    current_fingerprint = execution_fingerprint(plan.graph_content_hash, plan.snapshot_id, plan.execution_trace_json)
    if approval.subject_fingerprint != current_fingerprint or plan.execution_fingerprint != current_fingerprint:
        raise conflict("PLAN_FINGERPRINT_MISMATCH", "计划执行轨迹与审批指纹不一致，需重新审核")
    instance = _instance_or_404(db, plan.instance_id)
    version = db.get(PathwayVersion, instance.pathway_version_id)
    snapshot = db.get(PatientSnapshot, plan.snapshot_id)
    if version is None or snapshot is None:
        raise conflict("PLAN_CONTEXT_MISSING", "计划缺少路径版本或快照")
    latest_snapshot = db.scalar(
        select(PatientSnapshot).where(PatientSnapshot.patient_id == patient.id).order_by(PatientSnapshot.as_of.desc(), PatientSnapshot.created_at.desc())
    )
    if latest_snapshot is None or latest_snapshot.id != snapshot.id:
        record_audit(
            request=request,
            actor=user,
            action="PLAN_ACTIVATION_BLOCKED",
            object_type="PLAN",
            object_id=plan.id,
            result="DENIED",
            detail="计划快照不是该患者最新快照，需重评",
        )
        raise conflict("PLAN_REASSESSMENT_REQUIRED", "患者已有更新快照，计划必须重新评估后才能激活")
    payload = json.loads(snapshot.payload_json)
    ctx = build_context(db, patient, payload)
    for rule in json.loads(version.rules_json):
        if rule.get("binding") != "SAFETY":
            continue
        outcome = evaluate_rule(ctx, rule["rule_id"], rule["version"])
        if outcome.result == Tri.TRUE:
            raise conflict("SAFETY_BLOCKED", "最新快照触发安全约束，不能激活计划")
        if outcome.result == Tri.UNKNOWN:
            raise conflict("SAFETY_UNKNOWN", "最新快照安全条件为 UNKNOWN，需补充后重新激活")
    previous_active = db.scalars(
        select(Plan).where(Plan.instance_id == instance.id, Plan.status == "ACTIVE", Plan.id != plan.id)
    ).all()
    for previous in previous_active:
        previous.status = "SUPERSEDED"
    if previous_active:
        db.flush()
    plan.status = "ACTIVE"
    plan.activated_at = datetime.now(UTC)
    instance.active_plan_id = plan.id
    instance.status = "ACTIVE"
    graph = json.loads(version.graph_json)
    stages = [node.get("stage") for node in graph.get("nodes", []) if node.get("type") not in {"START", "END"}]
    if stages:
        instance.current_stage = stages[0]
    record_audit(
        request=request,
        actor=user,
        action="PLAN_ACTIVATE",
        object_type="PLAN",
        object_id=plan.id,
        result="SUCCESS",
        detail=f"instance={instance.id}",
        db=db,
    )
    db.commit()
    return plan_out(plan, _plan_tasks(db, plan.id))
