from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.domain.types import UTCDateTime


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="CLINICAL")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    employee_no: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    data_scope: Mapped[str] = mapped_column(String(32), nullable=False)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)

    department: Mapped[Department | None] = relationship(lazy="joined")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    sex: Mapped[str] = mapped_column(String(16), nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    diagnosis_code: Mapped[str] = mapped_column(String(16), nullable=False, default="C22.0")
    diagnosis_name: Mapped[str] = mapped_column(String(64), nullable=False, default="肝细胞癌")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="ACTIVE")
    # Internal authorization scope only; not returned by the contract schema.
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow, nullable=False)

    encounters: Mapped[list["Encounter"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), nullable=False)
    department_name: Mapped[str] = mapped_column(String(128), nullable=False)
    ward: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bed: Mapped[str | None] = mapped_column(String(32), nullable=True)
    attending_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    admitted_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    discharged_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False)

    patient: Mapped[Patient] = relationship(back_populates="encounters")


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    encounter_id: Mapped[str | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    display: Mapped[str] = mapped_column(String(128), nullable=False)
    value_num: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    value_status: Mapped[str] = mapped_column(String(16), nullable=False, default="UNKNOWN")
    reference_range: Mapped[str | None] = mapped_column(String(128), nullable=True)
    interpretation: Mapped[str] = mapped_column(String(16), nullable=False, default="UNKNOWN")
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False)


class ClinicalEvent(Base):
    __tablename__ = "clinical_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    encounter_id: Mapped[str | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    imported_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)


class PatientSnapshot(Base):
    __tablename__ = "patient_snapshots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    as_of: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    object_type: Mapped[str] = mapped_column(String(32), nullable=False)
    object_id: Mapped[str] = mapped_column(String(128), nullable=False)
    result: Mapped[str] = mapped_column(String(16), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    ip_masked: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)


class PathwayTemplate(Base):
    __tablename__ = "pathway_templates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    disease_code: Mapped[str] = mapped_column(String(16), nullable=False, default="C22.0")
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), nullable=False)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    current_published_version_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class PathwayVersion(Base):
    __tablename__ = "pathway_versions"
    __table_args__ = {"sqlite_autoincrement": False}

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    template_id: Mapped[str] = mapped_column(ForeignKey("pathway_templates.id"), index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="DRAFT")
    graph_json: Mapped[str] = mapped_column(Text, nullable=False)
    rules_json: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(80), nullable=False)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    validation_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")


class EnrollmentEvaluation(Base):
    __tablename__ = "enrollment_evaluations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    snapshot_id: Mapped[str] = mapped_column(ForeignKey("patient_snapshots.id"), nullable=False)
    pathway_version_id: Mapped[str] = mapped_column(ForeignKey("pathway_versions.id"), nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    rule_version: Mapped[str] = mapped_column(String(32), nullable=False)
    admission_tri_state: Mapped[str] = mapped_column(String(16), nullable=False)
    exclusion_tri_state: Mapped[str] = mapped_column(String(16), nullable=False)
    completeness_tri_state: Mapped[str] = mapped_column(String(16), nullable=False)
    decision: Mapped[str] = mapped_column(String(24), nullable=False)
    auto_enroll_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    missing_fields_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    rule_results_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)


class PathwayInstance(Base):
    __tablename__ = "pathway_instances"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    pathway_version_id: Mapped[str] = mapped_column(ForeignKey("pathway_versions.id"), nullable=False)
    enrollment_evaluation_id: Mapped[str] = mapped_column(ForeignKey("enrollment_evaluations.id"), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="ACTIVE")
    enrolled_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    active_plan_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    data_completeness: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    instance_id: Mapped[str] = mapped_column(ForeignKey("pathway_instances.id"), index=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="DRAFT")
    snapshot_id: Mapped[str] = mapped_column(ForeignKey("patient_snapshots.id"), nullable=False)
    ruleset_version: Mapped[str] = mapped_column(String(32), nullable=False)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    activated_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    warnings_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    evidence_refs_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), index=True, nullable=False)
    instance_id: Mapped[str] = mapped_column(ForeignKey("pathway_instances.id"), nullable=False)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    node_key: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    stage: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    depends_on_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    earliest_start_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="PENDING")
    assignee: Mapped[str | None] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    row_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    object_type: Mapped[str] = mapped_column(String(32), nullable=False)
    object_id: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING")
    risk: Mapped[str] = mapped_column(String(16), nullable=False, default="MEDIUM")
    requested_by: Mapped[str] = mapped_column(String(64), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    reviewer: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)


class Variation(Base):
    __tablename__ = "variations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    instance_id: Mapped[str | None] = mapped_column(ForeignKey("pathway_instances.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    detected_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    source: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="OPEN")
    affected_nodes_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    rule_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_refs_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)


class Followup(Base):
    __tablename__ = "followups"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    instance_id: Mapped[str | None] = mapped_column(ForeignKey("pathway_instances.id"), nullable=True)
    treatment_event_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    window_start: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    window_end: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    consent_status: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="WAITING_CONTACT")
    owner: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="LOW")
    structured_record_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    escalation_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    contacts_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow, nullable=False)


class Outcome(Base):
    __tablename__ = "outcomes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    instance_id: Mapped[str] = mapped_column(ForeignKey("pathway_instances.id"), nullable=False)
    treatment_type: Mapped[str] = mapped_column(String(64), nullable=False)
    evaluation_standard: Mapped[str] = mapped_column(String(16), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    recurrence: Mapped[str] = mapped_column(String(16), nullable=False)
    progression: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    response: Mapped[str] = mapped_column(String(16), nullable=False)
    adverse_events_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    lost_to_followup: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recorded_by: Mapped[str] = mapped_column(String(64), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
