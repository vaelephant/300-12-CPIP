from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    employee_no: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    user_id: str
    name: str
    role: str
    data_scope: str
    department_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int
    user: UserOut


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    patient_id: str = Field(validation_alias="id")
    synthetic: bool
    source_system: str
    external_id: str | None = None
    display_name: str
    sex: str
    birth_date: date | None = None
    diagnosis_code: str
    diagnosis_name: str
    status: str
    created_at: datetime
    updated_at: datetime


class PatientCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=64)
    sex: Literal["M", "F", "OTHER", "UNKNOWN"]
    birth_date: date | None = None
    source_system: str = Field(min_length=1, max_length=64)
    external_id: str | None = Field(default=None, max_length=128)
    synthetic: Literal[True] = True


class EncounterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    encounter_id: str = Field(validation_alias="id")
    patient_id: str
    type: str
    department_name: str
    ward: str | None = None
    bed: str | None = None
    attending_name: str | None = None
    admitted_at: datetime
    discharged_at: datetime | None = None
    status: str
    source_system: str


class ObservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    observation_id: str = Field(validation_alias="id")
    patient_id: str
    encounter_id: str | None = None
    category: str
    code: str
    display: str
    value_num: float | None = None
    value_text: str | None = None
    unit: str | None = None
    value_status: str
    reference_range: str | None = None
    interpretation: str
    occurred_at: datetime
    recorded_at: datetime
    source_system: str


class Staging(BaseModel):
    system: Literal["CNLC", "BCLC"]
    version: str
    value: str


class LiverReserve(BaseModel):
    child_pugh: Literal["A", "B", "C", "UNKNOWN"]
    child_pugh_version: str | None = None
    albi: float | None = None


class PerformanceStatus(BaseModel):
    ecog: int | None = Field(default=None, ge=0, le=5)


class Tumor(BaseModel):
    max_diameter_mm: float | None = None
    number: int | None = Field(default=None, ge=0)
    location: str | None = None
    vascular_invasion: bool
    extrahepatic_metastasis: bool


class SnapshotCreate(BaseModel):
    snapshot_id: str | None = Field(default=None, max_length=64)
    as_of: datetime
    synthetic: Literal[True] = True
    staging: Staging
    liver_reserve: LiverReserve
    performance_status: PerformanceStatus
    tumor: Tumor
    biomarkers: dict[str, Any] = Field(default_factory=dict)
    hepatitis: dict[str, Any] = Field(default_factory=dict)
    treatment_history: list[str] = Field(default_factory=list)
    observation_refs: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    ruleset_version: str


class SnapshotOut(BaseModel):
    snapshot_id: str
    patient_id: str
    as_of: datetime
    synthetic: bool
    staging: Staging
    liver_reserve: LiverReserve
    performance_status: PerformanceStatus
    tumor: Tumor
    biomarkers: dict[str, Any]
    hepatitis: dict[str, Any]
    treatment_history: list[str]
    observation_refs: list[str]
    missing_fields: list[str]
    ruleset_version: str
    created_by: str
    created_at: datetime


class ClinicalEventIn(BaseModel):
    patient_id: str
    encounter_id: str | None = None
    event_type: str = Field(min_length=1, max_length=64)
    occurred_at: datetime
    recorded_at: datetime
    source_system: str = Field(min_length=1, max_length=64)
    payload: dict[str, Any] = Field(default_factory=dict)


class ClinicalEventImportRequest(BaseModel):
    source_system: str = Field(min_length=1, max_length=64)
    idempotency_key: str | None = Field(default=None, max_length=128)
    events: list[ClinicalEventIn] = Field(min_length=1, max_length=500)


class ImportResult(BaseModel):
    imported: int
    duplicates: int
    request_id: str


class AuditOut(BaseModel):
    event_id: str
    request_id: str
    actor_id: str
    actor_role: str
    action: str
    object_type: str
    object_id: str
    result: str
    occurred_at: datetime
    ip_masked: str | None = None
    detail: str | None = None


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


class PatientListOut(BaseModel):
    items: list[PatientOut]
    meta: PageMeta


class HealthOut(BaseModel):
    status: Literal["ok"] = "ok"
    version: str
    database: str
    external_services: dict[str, str]


def normalize_snapshot_payload(body: SnapshotCreate, snapshot_id: str, patient_id: str, created_by: str, created_at: datetime) -> dict[str, Any]:
    payload = body.model_dump(mode="json", exclude={"snapshot_id"})
    payload["snapshot_id"] = snapshot_id
    payload["patient_id"] = patient_id
    payload["created_by"] = created_by
    payload["created_at"] = created_at.isoformat()
    return payload


# ------------------------------ S2: pathways / rules / plans ------------------------------


class PathwayGraphIn(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]


class PathwayCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    version: str = Field(default="0.1.0", max_length=32)
    graph: PathwayGraphIn
    rules: list[dict[str, Any]] = Field(min_length=1)


class PathwayVersionCreate(BaseModel):
    version: str = Field(min_length=1, max_length=32)
    graph: PathwayGraphIn
    rules: list[dict[str, Any]] = Field(min_length=1)


class PathwayVersionOut(BaseModel):
    version_id: str
    template_id: str
    name: str
    disease_code: str
    version: str
    status: str
    graph: dict[str, Any]
    rules: list[dict[str, Any]]
    content_hash: str
    created_by: str
    created_at: datetime
    submitted_at: datetime | None = None
    published_at: datetime | None = None
    approval: dict[str, Any] | None = None
    validation: dict[str, Any]


class ValidationResultOut(BaseModel):
    valid: bool
    errors: list[dict[str, Any]]
    warnings: list[dict[str, Any]]
    content_hash: str | None = None


class EnrollmentEvaluateRequest(BaseModel):
    patient_id: str
    snapshot_id: str
    pathway_version_id: str


class EnrollmentRuleResult(BaseModel):
    rule_id: str
    version: str
    result: str
    missing_fields: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)


class EnrollmentEvaluationOut(BaseModel):
    evaluation_id: str
    patient_id: str
    snapshot_id: str
    pathway_version_id: str
    evaluated_at: datetime
    rule_version: str
    admission_tri_state: str
    exclusion_tri_state: str
    completeness_tri_state: str
    decision: str
    auto_enroll_allowed: bool
    missing_fields: list[str]
    reasons: list[str] = Field(default_factory=list)
    rule_results: list[EnrollmentRuleResult] = Field(default_factory=list)


class InstanceCreate(BaseModel):
    patient_id: str
    pathway_version_id: str
    enrollment_evaluation_id: str
    doctor_confirmed: bool
    idempotency_key: str | None = Field(default=None, max_length=128)


class InstanceOut(BaseModel):
    instance_id: str
    patient_id: str
    pathway_version_id: str
    status: str
    enrolled_at: datetime
    active_plan_id: str | None = None
    current_stage: str | None = None
    data_completeness: int


class PlanCreate(BaseModel):
    snapshot_id: str
    ruleset_version: str
    template_plan_id: str | None = None


class TaskOut(BaseModel):
    task_id: str
    plan_id: str
    instance_id: str
    node_key: str
    name: str
    stage: str
    role: str
    required: bool
    depends_on: list[str]
    earliest_start_at: datetime | None = None
    due_at: datetime | None = None
    status: str
    assignee: str | None = None
    completed_at: datetime | None = None
    result_summary: str | None = None
    overdue: bool = False
    version: int


class PlanOut(BaseModel):
    plan_id: str
    instance_id: str
    patient_id: str
    version: str
    status: str
    snapshot_id: str
    ruleset_version: str
    created_by: str
    created_at: datetime
    submitted_at: datetime | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    activated_at: datetime | None = None
    summary: str
    warnings: list[dict[str, Any]] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    tasks: list[TaskOut] = Field(default_factory=list)


class TaskTransitionRequest(BaseModel):
    to_status: Literal["PENDING", "READY", "IN_PROGRESS", "COMPLETED", "BLOCKED", "SKIPPED", "CANCELLED"]
    expected_version: int
    result_summary: str | None = None


class ApprovalOut(BaseModel):
    approval_id: str
    object_type: str
    object_id: str
    status: str
    risk: str
    requested_by: str
    requested_at: datetime
    reviewer: str | None = None
    reviewed_at: datetime | None = None
    comment: str | None = None


class ApprovalDecisionRequest(BaseModel):
    comment: str | None = Field(default=None, max_length=2000)


class ApprovalListOut(BaseModel):
    items: list[ApprovalOut]
    meta: PageMeta


class RuleEvaluateRequest(BaseModel):
    rule_id: str
    rule_version: str
    patient_id: str
    snapshot_id: str


class RuleEvaluationOut(BaseModel):
    rule_id: str
    rule_version: str
    result: str
    missing_fields: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)


class PathwayListOut(BaseModel):
    items: list[PathwayVersionOut]
    meta: PageMeta


# ------------------------------ S3: variations / followups / outcomes ------------------------------


class VariationCreate(BaseModel):
    patient_id: str
    instance_id: str
    type: Literal["CLINICAL", "TIME", "SAFETY", "RESOURCE", "PROCESS", "PATIENT", "DATA"]
    severity: Literal["LOW", "MEDIUM", "HIGH"]
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=4000)
    affected_nodes: list[str] = Field(default_factory=list)
    rule_ref: str | None = None
    impact: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    source: str = "人工登记"


class VariationOut(BaseModel):
    variation_id: str
    patient_id: str
    instance_id: str | None = None
    type: str
    severity: str
    title: str
    description: str
    detected_at: datetime
    source: str
    status: str
    affected_nodes: list[str] = Field(default_factory=list)
    rule_ref: str | None = None
    impact: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    resolution: str | None = None
    resolved_at: datetime | None = None


class VariationResolveRequest(BaseModel):
    resolution: str = Field(min_length=1, max_length=2000)
    close: bool = False


class FollowupCreateRequest(BaseModel):
    patient_id: str
    instance_id: str | None = None
    treatment_event_id: str | None = None
    window_start: datetime
    window_end: datetime
    channel: Literal["PHONE", "OUTPATIENT", "ONLINE"]
    consent_status: Literal["GRANTED", "DECLINED", "UNKNOWN"]
    owner: str
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"


class FollowupContactCreate(BaseModel):
    channel: Literal["PHONE", "OUTPATIENT", "ONLINE"]
    outcome: Literal["REACHED", "NO_ANSWER", "RESCHEDULED", "DECLINED"]
    raw_patient_text: str | None = None
    structured_extract: dict[str, Any] | None = None
    confirmed_by_human: bool = False


class FollowupEscalationRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class FollowupCloseRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class FollowupOut(BaseModel):
    followup_id: str
    patient_id: str
    instance_id: str | None = None
    treatment_event_id: str | None = None
    window_start: datetime
    window_end: datetime
    channel: str
    consent_status: str
    status: str
    owner: str
    risk_level: str
    structured_record: dict[str, Any] = Field(default_factory=dict)
    escalation: dict[str, Any] = Field(default_factory=dict)
    contacts: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class OutcomeCreate(BaseModel):
    instance_id: str
    treatment_type: str
    evaluation_standard: Literal["RECIST", "mRECIST"]
    observed_at: datetime
    recurrence: Literal["NONE", "LOCAL", "DISTANT", "UNKNOWN"]
    progression: bool | None = None
    response: Literal["CR", "PR", "SD", "PD", "UNKNOWN"]
    adverse_events: list[dict[str, Any]] = Field(default_factory=list)
    lost_to_followup: bool = False


class OutcomeOut(BaseModel):
    outcome_id: str
    patient_id: str
    instance_id: str
    treatment_type: str
    evaluation_standard: str
    observed_at: datetime
    recurrence: str
    progression: bool | None = None
    response: str
    adverse_events: list[dict[str, Any]] = Field(default_factory=list)
    lost_to_followup: bool
    recorded_by: str
    recorded_at: datetime


class SpecialtyAssessmentOut(BaseModel):
    assessment_id: str
    patient_id: str
    snapshot_id: str
    as_of: datetime
    staging: dict[str, Any]
    liver_reserve: dict[str, Any]
    performance_status: dict[str, Any]
    tumor: dict[str, Any]
    biomarkers: dict[str, Any]
    hepatitis: dict[str, Any]
    treatment_history: list[str]
    missing_fields: list[str]
    ruleset_version: str


class AnalyticsMetric(BaseModel):
    key: str
    label: str
    value: float | str
    numerator: int | float | str
    denominator: int | float | str
    period: str
    definition: str


class AnalyticsSummaryOut(BaseModel):
    generated_at: datetime
    period: dict[str, str]
    metrics: list[AnalyticsMetric]
    note: str


class PatientOverviewOut(BaseModel):
    patient_id: str
    display_name: str
    external_id: str | None = None
    sex: str
    birth_date: date | None = None
    age: int | None = None
    department_name: str | None = None
    ward: str | None = None
    bed: str | None = None
    attending: str | None = None
    diagnosis_code: str
    diagnosis_name: str
    stage: str | None = None
    risk_level: str
    status: str
    scenario: str
    pathway_id: str | None = None
    pathway_name: str | None = None
    pathway_version: str | None = None
    instance_id: str | None = None
    enrolled_at: datetime | None = None
    admitted_at: datetime | None = None
    los: int | None = None
    progress: int = 0
    current_stage: str | None = None
    data_completeness: int | None = None
    missing_fields: list[str] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)


class PatientOverviewListOut(BaseModel):
    items: list[PatientOverviewOut]
    meta: PageMeta


class PatientDetailOut(BaseModel):
    patient: PatientOut
    encounters: list[EncounterOut] = Field(default_factory=list)
    observations: list[ObservationOut] = Field(default_factory=list)
    assessment: SpecialtyAssessmentOut | None = None
    instance: InstanceOut | None = None
    plan: PlanOut | None = None
    variations: list[VariationOut] = Field(default_factory=list)
    followups: list[FollowupOut] = Field(default_factory=list)
    outcomes: list[OutcomeOut] = Field(default_factory=list)


class PathwayOverviewOut(BaseModel):
    template_id: str
    name: str
    disease_code: str
    department_name: str | None = None
    current_version_id: str | None = None
    current_version: str | None = None
    status: str | None = None
    owner_name: str | None = None
    instance_count: int = 0
    version_count: int = 0
    node_count: int = 0
    updated_at: datetime | None = None


class PathwayOverviewListOut(BaseModel):
    items: list[PathwayOverviewOut]
    meta: PageMeta


class TaskOverviewOut(BaseModel):
    task_id: str
    instance_id: str
    patient_id: str
    patient_name: str | None = None
    pathway_name: str | None = None
    node_key: str
    name: str
    stage: str
    role: str
    status: str
    required: bool
    assignee: str | None = None
    due_at: datetime | None = None
    overdue: bool = False
    version: int
    dependencies_completed: bool = True


class TaskOverviewListOut(BaseModel):
    items: list[TaskOverviewOut]
    meta: PageMeta
