from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import (
    EncounterOut,
    ObservationOut,
    PageMeta,
    PatientCreate,
    PatientListOut,
    PatientOut,
    PatientOverviewListOut,
    PatientOverviewOut,
)
from app.db import get_db
from app.domain.enums import Role
from app.domain.models import (
    Encounter,
    Followup,
    Observation,
    PathwayInstance,
    PathwayTemplate,
    PathwayVersion,
    Patient,
    PatientSnapshot,
    Plan,
    Task,
    User,
    Variation,
)
from app.errors import forbidden, not_found
from app.services.audit import record_audit
from app.services.authz import PATIENT_RECORD_ROLES, ensure_patient_access

router = APIRouter(tags=["patients"])


def _get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise not_found("患者不存在")
    return patient


def _patient_or_denied(request: Request, user: User, db: Session, patient_id: str) -> Patient:
    patient = _get_patient_or_404(db, patient_id)
    ensure_patient_access(request, user, patient)
    return patient


@router.get("/patients", response_model=PatientListOut)
def list_patients(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    query: str | None = Query(default=None, max_length=100),
    status: str | None = Query(default=None, max_length=16),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PatientListOut:
    if user.role not in PATIENT_RECORD_ROLES or user.data_scope != "DEPT" or not user.department_id:
        record_audit(
            request=request,
            actor=user,
            action="PATIENT_LIST",
            object_type="PATIENT",
            object_id="*",
            result="DENIED",
            detail="角色或数据范围不具备患者列表访问权限",
        )
        raise forbidden("当前角色不具备患者记录访问权限")
    stmt = select(Patient).where(Patient.department_id == user.department_id)
    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(or_(Patient.display_name.like(pattern), Patient.external_id.like(pattern)))
    if status:
        stmt = stmt.where(Patient.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(stmt.order_by(Patient.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    record_audit(
        request=request,
        actor=user,
        action="PATIENT_LIST",
        object_type="PATIENT",
        object_id=f"dept:{user.department_id}",
        result="SUCCESS",
        detail=f"page={page}, page_size={page_size}, total={total}",
    )
    return PatientListOut(
        items=[PatientOut.model_validate(item) for item in items],
        meta=PageMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(
    body: PatientCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PatientOut:
    if user.role not in {Role.CLINICIAN.value, Role.EXPERT.value} or not user.department_id:
        record_audit(
            request=request,
            actor=user,
            action="PATIENT_CREATE",
            object_type="PATIENT",
            object_id="*",
            result="DENIED",
            detail="当前角色无权创建患者",
        )
        raise forbidden("当前角色无权创建患者")
    now = datetime.now(UTC)
    patient = Patient(
        id=f"PAT-{uuid.uuid4().hex[:12].upper()}",
        synthetic=True,
        source_system=body.source_system,
        external_id=body.external_id,
        display_name=body.display_name,
        sex=body.sex,
        birth_date=body.birth_date,
        diagnosis_code="C22.0",
        diagnosis_name="肝细胞癌",
        status="ACTIVE",
        department_id=user.department_id,
        created_at=now,
        updated_at=now,
    )
    db.add(patient)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="PATIENT_CREATE",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
        detail="创建合成 HCC 患者",
    )
    return PatientOut.model_validate(patient)


@router.get("/patients/overview", response_model=PatientOverviewListOut)
def list_patient_overview(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    query: str | None = Query(default=None, max_length=100),
    status: str | None = Query(default=None, max_length=24),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PatientOverviewListOut:
    if user.role not in PATIENT_RECORD_ROLES or user.data_scope != "DEPT" or not user.department_id:
        record_audit(
            request=request,
            actor=user,
            action="PATIENT_OVERVIEW",
            object_type="PATIENT",
            object_id="*",
            result="DENIED",
            detail="角色或数据范围不具备患者总览权限",
        )
        raise forbidden("当前角色不具备患者记录访问权限")
    stmt = select(Patient).where(Patient.department_id == user.department_id)
    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(or_(Patient.display_name.like(pattern), Patient.external_id.like(pattern)))
    all_rows = db.scalars(stmt.order_by(Patient.updated_at.desc())).all()
    overviews: list[PatientOverviewOut] = []
    today = datetime.now(UTC).date()
    for patient in all_rows:
        latest_encounter = db.scalar(
            select(Encounter).where(Encounter.patient_id == patient.id).order_by(Encounter.admitted_at.desc())
        )
        snapshot = db.scalar(
            select(PatientSnapshot).where(PatientSnapshot.patient_id == patient.id).order_by(PatientSnapshot.as_of.desc(), PatientSnapshot.created_at.desc())
        )
        instance = db.scalar(
            select(PathwayInstance).where(PathwayInstance.patient_id == patient.id).order_by(PathwayInstance.enrolled_at.desc())
        )
        version = db.get(PathwayVersion, instance.pathway_version_id) if instance else None
        template = db.get(PathwayTemplate, version.template_id) if version else None
        plan = db.get(Plan, instance.active_plan_id) if instance and instance.active_plan_id else None
        if plan is None and instance:
            plan = db.scalar(select(Plan).where(Plan.instance_id == instance.id).order_by(Plan.created_at.desc()))
        tasks = db.scalars(select(Task).where(Task.plan_id == plan.id)).all() if plan else []
        open_variations = db.scalars(
            select(Variation).where(
                Variation.patient_id == patient.id,
                Variation.status.in_(["OPEN", "ASSESSING", "REPLAN_PENDING"]),
            )
        ).all()
        high_followups = db.scalars(
            select(Followup).where(
                Followup.patient_id == patient.id,
                Followup.risk_level == "HIGH",
                Followup.status != "CLOSED",
            )
        ).all()
        payload = {}
        if snapshot:
            try:
                payload = json.loads(snapshot.payload_json)
            except ValueError:
                payload = {}
        missing_fields = payload.get("missing_fields", []) if isinstance(payload, dict) else []
        completed = sum(1 for task in tasks if task.status == "COMPLETED")
        progress = round(completed / len(tasks) * 100) if tasks else 0
        overdue = any(task.due_at and task.status not in {"COMPLETED", "CANCELLED", "SKIPPED"} and task.due_at < datetime.now(UTC) for task in tasks)
        high_variation = any(item.severity == "HIGH" for item in open_variations)
        risk = "HIGH" if high_variation or high_followups else ("MEDIUM" if open_variations or overdue else "LOW")
        if missing_fields:
            scenario = "MISSING_DATA"
        elif overdue:
            scenario = "OVERDUE"
        elif open_variations:
            scenario = "CLINICAL_VARIATION"
        else:
            scenario = "NORMAL"
        if instance is None:
            derived_status = "PENDING_ADMISSION"
        elif instance.status == "COMPLETED":
            derived_status = "COMPLETED"
        elif instance.status == "EXITED":
            derived_status = "EXITED"
        else:
            derived_status = "IN_PATHWAY"
        birth = patient.birth_date
        age = None if birth is None else today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        flags = []
        staging = (payload.get("staging") or {}).get("value") if isinstance(payload, dict) else None
        if staging:
            flags.append(f"{staging}")
        liver = (payload.get("liver_reserve") or {}) if isinstance(payload, dict) else {}
        if liver.get("child_pugh"):
            flags.append(f"Child-Pugh {liver['child_pugh']} 级")
        biomarkers = (payload.get("biomarkers") or {}) if isinstance(payload, dict) else {}
        if biomarkers.get("afp_ng_ml") is not None:
            flags.append(f"AFP {biomarkers['afp_ng_ml']} ng/mL")
        if missing_fields:
            flags.append(f"缺失 {len(missing_fields)} 项")
        admitted = latest_encounter.admitted_at if latest_encounter else None
        los = None
        if admitted:
            los = max(1, (datetime.now(UTC) - admitted).days + 1)
        overviews.append(
            PatientOverviewOut(
                patient_id=patient.id,
                display_name=patient.display_name,
                external_id=patient.external_id,
                sex=patient.sex,
                birth_date=patient.birth_date,
                age=age,
                department_name=latest_encounter.department_name if latest_encounter else None,
                ward=latest_encounter.ward if latest_encounter else None,
                bed=latest_encounter.bed if latest_encounter else None,
                attending=latest_encounter.attending_name if latest_encounter else None,
                diagnosis_code=patient.diagnosis_code,
                diagnosis_name=patient.diagnosis_name,
                stage=staging,
                risk_level=risk,
                status=derived_status,
                scenario=scenario,
                pathway_id=template.id if template else None,
                pathway_name=template.name if template else None,
                pathway_version=version.version if version else None,
                instance_id=instance.id if instance else None,
                enrolled_at=instance.enrolled_at if instance else None,
                admitted_at=admitted,
                los=los,
                progress=progress,
                current_stage=instance.current_stage if instance else None,
                data_completeness=instance.data_completeness if instance else (100 - 10 * len(missing_fields)),
                missing_fields=missing_fields,
                flags=flags,
            )
        )
    if status:
        overviews = [item for item in overviews if item.status == status]
    total = len(overviews)
    items = overviews[(page - 1) * page_size : page * page_size]
    record_audit(
        request=request,
        actor=user,
        action="PATIENT_OVERVIEW",
        object_type="PATIENT",
        object_id=f"dept:{user.department_id}",
        result="SUCCESS",
        detail=f"page={page}, total={total}",
    )
    return PatientOverviewListOut(items=items, meta=PageMeta(page=page, page_size=page_size, total=total))


@router.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PatientOut:
    patient = _patient_or_denied(request, user, db, patient_id)
    record_audit(
        request=request,
        actor=user,
        action="PATIENT_VIEW",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
    )
    return PatientOut.model_validate(patient)


@router.get("/patients/{patient_id}/encounters", response_model=list[EncounterOut])
def list_encounters(
    patient_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EncounterOut]:
    patient = _patient_or_denied(request, user, db, patient_id)
    items = db.scalars(
        select(Encounter).where(Encounter.patient_id == patient.id).order_by(Encounter.admitted_at.desc())
    ).all()
    return [EncounterOut.model_validate(item) for item in items]


@router.get("/patients/{patient_id}/observations", response_model=dict)
def list_observations(
    patient_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    patient = _patient_or_denied(request, user, db, patient_id)
    items = db.scalars(
        select(Observation).where(Observation.patient_id == patient.id).order_by(Observation.occurred_at.desc())
    ).all()
    record_audit(
        request=request,
        actor=user,
        action="OBSERVATION_LIST",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
        detail=f"count={len(items)}",
    )
    return {"items": [ObservationOut.model_validate(item).model_dump(mode="json") for item in items]}
