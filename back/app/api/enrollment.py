from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.patients import _get_patient_or_404
from app.api.schemas import (
    EnrollmentEvaluateRequest,
    EnrollmentEvaluationOut,
    EnrollmentRuleResult,
    RuleEvaluateRequest,
    RuleEvaluationOut,
)
from app.db import get_db
from app.domain.models import EnrollmentEvaluation, PathwayVersion, PatientSnapshot, User
from app.errors import conflict, forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access
from app.services.rules import build_context, combine_enrollment, evaluate_rule

router = APIRouter(tags=["enrollment"])

DOCTOR_ROLES = {"CLINICIAN", "EXPERT"}


def _snapshot_payload(db: Session, patient_id: str, snapshot_id: str) -> PatientSnapshot:
    snapshot = db.get(PatientSnapshot, snapshot_id)
    if snapshot is None or snapshot.patient_id != patient_id:
        raise not_found("患者状态快照不存在或不属于该患者")
    return snapshot


@router.post("/rules/evaluate", response_model=RuleEvaluationOut)
def evaluate_rule_endpoint(
    body: RuleEvaluateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RuleEvaluationOut:
    if user.role not in DOCTOR_ROLES | {"NURSE"}:
        raise forbidden("当前角色无权执行规则")
    patient = _get_patient_or_404(db, body.patient_id)
    ensure_patient_access(request, user, patient)
    snapshot = _snapshot_payload(db, patient.id, body.snapshot_id)
    payload = json.loads(snapshot.payload_json)
    ctx = build_context(db, patient, payload)
    outcome = evaluate_rule(ctx, body.rule_id, body.rule_version)
    record_audit(
        request=request,
        actor=user,
        action="RULE_EVALUATE",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
        detail=f"{body.rule_id}@{body.rule_version} -> {outcome.result.value}",
    )
    return RuleEvaluationOut(
        rule_id=outcome.rule_id,
        rule_version=outcome.version,
        result=outcome.result.value,
        missing_fields=outcome.missing_fields,
        reasons=outcome.reasons,
    )


@router.post("/enrollment/evaluate", response_model=EnrollmentEvaluationOut)
def evaluate_enrollment(
    body: EnrollmentEvaluateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EnrollmentEvaluationOut:
    if user.role not in DOCTOR_ROLES:
        raise forbidden("仅临床医生或专家可以执行入径评估")
    patient = _get_patient_or_404(db, body.patient_id)
    ensure_patient_access(request, user, patient)
    snapshot = _snapshot_payload(db, patient.id, body.snapshot_id)
    version = db.get(PathwayVersion, body.pathway_version_id)
    if version is None:
        raise not_found("路径版本不存在")
    if version.status != "PUBLISHED":
        raise conflict("PATHWAY_NOT_PUBLISHED", "只能基于已发布路径版本评估入径")
    payload = json.loads(snapshot.payload_json)
    rules = json.loads(version.rules_json)
    ctx = build_context(db, patient, payload)
    result = combine_enrollment(rules, ctx)
    evaluation = EnrollmentEvaluation(
        id=f"EV-{uuid.uuid4().hex[:12].upper()}",
        patient_id=patient.id,
        snapshot_id=snapshot.id,
        pathway_version_id=version.id,
        rule_version=payload.get("ruleset_version") or "HCC-RULES-0.6.0",
        admission_tri_state=result["admission"].value,
        exclusion_tri_state=result["exclusion"].value,
        completeness_tri_state=result["completeness"].value,
        decision=result["decision"],
        auto_enroll_allowed=result["auto_enroll_allowed"],
        missing_fields_json=json.dumps(result["missing_fields"], ensure_ascii=False),
        rule_results_json=json.dumps(result["rule_results"], ensure_ascii=False),
        created_by=user.id,
    )
    db.add(evaluation)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="ENROLLMENT_EVALUATE",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
        detail=f"evaluation={evaluation.id}, decision={evaluation.decision}, auto_enroll={evaluation.auto_enroll_allowed}",
    )
    return EnrollmentEvaluationOut(
        evaluation_id=evaluation.id,
        patient_id=evaluation.patient_id,
        snapshot_id=evaluation.snapshot_id,
        pathway_version_id=evaluation.pathway_version_id,
        evaluated_at=evaluation.evaluated_at,
        rule_version=evaluation.rule_version,
        admission_tri_state=evaluation.admission_tri_state,
        exclusion_tri_state=evaluation.exclusion_tri_state,
        completeness_tri_state=evaluation.completeness_tri_state,
        decision=evaluation.decision,
        auto_enroll_allowed=evaluation.auto_enroll_allowed,
        missing_fields=result["missing_fields"],
        reasons=result["reasons"],
        rule_results=[EnrollmentRuleResult(**item) for item in result["rule_results"]],
    )
