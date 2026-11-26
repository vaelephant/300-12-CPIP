from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas import SnapshotCreate, SnapshotOut, normalize_snapshot_payload
from app.db import get_db
from app.domain.models import Observation, PatientSnapshot, User
from app.errors import conflict, validation_error
from app.services.audit import record_audit
from app.services.authz import ensure_patient_access

router = APIRouter(tags=["patients"])


@router.post("/patients/{patient_id}/snapshots", response_model=SnapshotOut, status_code=201)
def create_snapshot(
    patient_id: str,
    body: SnapshotCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SnapshotOut:
    from app.api.patients import _get_patient_or_404

    patient = _get_patient_or_404(db, patient_id)
    ensure_patient_access(request, user, patient)

    if body.observation_refs:
        existing_refs = set(
            db.scalars(select(Observation.id).where(Observation.patient_id == patient.id)).all()
        )
        missing = [ref for ref in body.observation_refs if ref not in existing_refs]
        if missing:
            raise validation_error("快照引用了不存在或不属于该患者的观测记录", [{"field": "observation_refs", "missing": missing}])

    snapshot_id = body.snapshot_id or f"SNAP-{uuid.uuid4().hex[:12].upper()}"
    if db.get(PatientSnapshot, snapshot_id) is not None:
        raise conflict("SNAPSHOT_EXISTS", "快照 ID 已存在，快照不可覆盖")

    now = datetime.now(UTC)
    payload = normalize_snapshot_payload(body, snapshot_id, patient.id, user.id, now)
    snapshot = PatientSnapshot(
        id=snapshot_id,
        patient_id=patient.id,
        as_of=body.as_of,
        payload_json=json.dumps(payload, ensure_ascii=False),
        created_by=user.id,
        created_at=now,
    )
    db.add(snapshot)
    db.commit()
    record_audit(
        request=request,
        actor=user,
        action="SNAPSHOT_CREATE",
        object_type="PATIENT",
        object_id=patient.id,
        result="SUCCESS",
        detail=f"snapshot_id={snapshot_id}, missing_fields={len(body.missing_fields)}",
    )
    return SnapshotOut.model_validate(payload)
