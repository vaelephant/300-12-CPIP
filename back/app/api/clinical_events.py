from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import ClinicalEventImportRequest, ImportResult
from app.db import get_db
from app.domain.models import ClinicalEvent, Encounter, PathwayInstance, Patient, Reassessment, User
from app.errors import bad_request, forbidden
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["patients"])


@router.post("/clinical-events/import", response_model=ImportResult)
def import_clinical_events(
    body: ClinicalEventImportRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportResult:
    if user.role not in {"CLINICIAN", "EXPERT", "NURSE"}:
        record_audit(
            request=request,
            actor=user,
            action="CLINICAL_EVENT_IMPORT",
            object_type="PATIENT",
            object_id="*",
            result="DENIED",
            detail="当前角色无权导入临床事件",
        )
        raise forbidden("当前角色无权导入临床事件")

    if body.idempotency_key:
        existing = db.scalar(
            select(ClinicalEvent.id).where(
                ClinicalEvent.source_system == body.source_system,
                ClinicalEvent.idempotency_key == body.idempotency_key,
            )
        )
        if existing is not None:
            record_audit(
                request=request,
                actor=user,
                action="CLINICAL_EVENT_IMPORT",
                object_type="PATIENT",
                object_id="idempotent",
                result="SUCCESS",
                detail=f"重复提交，已跳过 {len(body.events)} 条",
            )
            return ImportResult(imported=0, duplicates=len(body.events), request_id=request.state.request_id)

    # Pre-validate all patients/encounters before writing to avoid partial imports.
    patients: dict[str, Patient] = {}
    for event in body.events:
        patient = db.get(Patient, event.patient_id)
        if patient is None:
            raise bad_request("PATIENT_NOT_FOUND", f"事件引用的患者不存在：{event.patient_id}")
        ensure_patient_access(request, user, patient)
        if event.encounter_id:
            encounter = db.get(Encounter, event.encounter_id)
            if encounter is None or encounter.patient_id != patient.id:
                raise bad_request("ENCOUNTER_MISMATCH", f"就诊记录与患者不匹配：{event.encounter_id}")
        patients[patient.id] = patient

    now = datetime.now(UTC)
    imported_events: list[ClinicalEvent] = []
    for event in body.events:
        row = ClinicalEvent(
                id=f"CE-{uuid.uuid4().hex[:16].upper()}",
                patient_id=event.patient_id,
                encounter_id=event.encounter_id,
                event_type=event.event_type,
                occurred_at=event.occurred_at,
                recorded_at=event.recorded_at,
                source_system=event.source_system,
                payload_json=json.dumps(event.payload, ensure_ascii=False, default=str),
                idempotency_key=body.idempotency_key,
                imported_at=now,
            )
        db.add(row)
        imported_events.append(row)
    db.flush()
    reassessment_count = 0
    triggers = {"PatientStateUpdated", "ObservationImported", "VariationDetected", "ClinicalEventImported"}
    for row in imported_events:
        if row.event_type not in triggers:
            continue
        instances = db.scalars(
            select(PathwayInstance).where(
                PathwayInstance.patient_id == row.patient_id,
                PathwayInstance.status.in_(["ACTIVE", "REPLAN_REQUIRED"]),
            )
        ).all()
        for instance in instances:
            existing = db.scalar(select(Reassessment.id).where(Reassessment.event_id == row.id, Reassessment.instance_id == instance.id))
            if existing:
                continue
            db.add(
                Reassessment(
                    id=f"REA-{uuid.uuid4().hex[:12].upper()}",
                    patient_id=row.patient_id,
                    instance_id=instance.id,
                    event_id=row.id,
                    trigger_type=row.event_type,
                    reason=f"临床事件触发重评：{row.event_type}",
                    status="OPEN",
                    created_by=user.id,
                )
            )
            reassessment_count += 1
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="CLINICAL_EVENT_IMPORT",
        object_type="PATIENT",
        object_id=",".join(patients),
        result="SUCCESS",
        detail=f"imported={len(body.events)}, reassessments={reassessment_count}, source={body.source_system}",
    )
    return ImportResult(imported=len(body.events), duplicates=0, request_id=request.state.request_id)
