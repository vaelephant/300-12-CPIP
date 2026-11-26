// ---------------------------------------------------------------------------
// CPIP V0.5 · 前端领域模型
// 与《临床路径统一数据协议》及后端 Pathway Schema 对齐；演示数据均标记为合成数据。
// ---------------------------------------------------------------------------

export type ID = string;
export type ISODate = string;

/* ----------------------------- 组织与权限 ----------------------------- */

export type RoleKey =
  | "ADMIN"
  | "MEDICAL_AFFAIRS"
  | "EXPERT"
  | "DOCTOR"
  | "NURSE"
  | "QC"
  | "RESEARCHER"
  | "EXECUTIVE";

export interface Organization {
  id: ID;
  name: string;
  shortName: string;
  code: string;
  level: string;
  city: string;
  beds: number;
}

export interface Department {
  id: ID;
  code: string;
  name: string;
  shortName: string;
  type: "CLINICAL" | "SURGICAL" | "SUPPORT" | "NURSING";
  bedCount: number;
  activePatients: number;
}

export type DataScope = "ALL" | "ORG" | "DEPT" | "SELF";

export interface User {
  id: ID;
  name: string;
  employeeNo: string;
  role: RoleKey;
  title: string;
  departmentId: ID;
  departmentName: string;
  phoneMasked: string;
  status: "ACTIVE" | "DISABLED";
  dataScope: DataScope;
  lastLoginAt: ISODate;
}

export interface PermissionGroup {
  group: string;
  items: { key: string; label: string }[];
}

export interface RoleDefinition {
  key: RoleKey;
  name: string;
  description: string;
  userCount: number;
  dataScope: DataScope;
  permissions: string[];
  system: boolean;
}

/* ------------------------------- 患者 --------------------------------- */

export type PatientStatus =
  | "IN_PATHWAY"
  | "PENDING_ADMISSION"
  | "NOT_ELIGIBLE"
  | "COMPLETED"
  | "EXITED";

export type PatientScenario =
  | "NORMAL"
  | "CLINICAL_VARIATION"
  | "OVERDUE"
  | "NOT_ELIGIBLE"
  | "MISSING_DATA"
  | "EXITED";

export interface Patient {
  id: ID;
  mrn: string;
  name: string;
  gender: "M" | "F";
  age: number;
  birthDate: string;
  departmentId: ID;
  departmentName: string;
  ward: string;
  bed: string;
  diagnosis: string;
  diagnosisCode: string;
  stage: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  allergy: string[];
  status: PatientStatus;
  scenario: PatientScenario;
  pathwayId?: ID;
  pathwayName?: string;
  pathwayVersion?: string;
  instanceId?: ID;
  enrolledAt?: ISODate;
  admissionAt: ISODate;
  los: number;
  attending: string;
  nurse: string;
  progress: number;
  presentIllness: string;
  flags: string[];
}

export interface Encounter {
  id: ID;
  patientId: ID;
  type: "INPATIENT" | "OUTPATIENT" | "EMERGENCY";
  admittedAt: ISODate;
  dischargedAt?: ISODate;
  department: string;
  attending: string;
  diagnosis: string;
  bed: string;
}

export interface Observation {
  id: ID;
  patientId: ID;
  category: "VITAL" | "LAB" | "IMAGING" | "PATHOLOGY" | "FUNCTION";
  code: string;
  name: string;
  value: string;
  unit?: string;
  refRange?: string;
  flag?: "HIGH" | "LOW" | "NORMAL" | "UNKNOWN";
  observedAt: ISODate;
  source: string;
}

export interface ClinicalEvent {
  id: ID;
  patientId: ID;
  eventType:
    | "PatientCreated"
    | "ObservationReceived"
    | "PatientStateUpdated"
    | "PathwayEnrolled"
    | "PlanApproved"
    | "PlanActivated"
    | "TaskStarted"
    | "TaskCompleted"
    | "TaskOverdue"
    | "VariationDetected"
    | "ReplanRequested"
    | "PathwayCompleted"
    | "PathwayExited";
  title: string;
  description: string;
  occurredAt: ISODate;
  /** Optional source-recorded-at timestamp; absent means not supplied, not equal to occurredAt. */
  recordedAt?: ISODate;
  sourceSystem: string;
  actor: string;
  severity: "INFO" | "WARN" | "RISK";
}

export interface PatientStateSnapshot {
  patientId: ID;
  snapshotAt: ISODate;
  fields: { field: string; label: string; value: string | null; unit?: string; status: "KNOWN" | "UNKNOWN" | "STALE" }[];
  missingFields: string[];
  unknownConditions: string[];
  goals: string[];
  preferences: string[];
  dataCompleteness: number;
}

/* ------------------------------- 路径 --------------------------------- */

export type PathwayStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "RETIRED";
export type VersionStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "RETIRED";

export type NodeType =
  | "START"
  | "ASSESSMENT"
  | "EXAMINATION"
  | "LAB_TEST"
  | "DIAGNOSIS"
  | "TREATMENT"
  | "SURGERY"
  | "MEDICATION"
  | "NURSING"
  | "CONSULTATION"
  | "DECISION"
  | "PARALLEL_SPLIT"
  | "PARALLEL_JOIN"
  | "WAIT"
  | "FOLLOW_UP"
  | "END";

export type ClinicalRole =
  | "DOCTOR"
  | "NURSE"
  | "SURGEON"
  | "ANESTHESIOLOGIST"
  | "PHARMACIST"
  | "COORDINATOR";

export type RuleOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "between"
  | "exists"
  | "is_null";

export interface ConditionNode {
  field?: string;
  operator?: RuleOperator;
  value?: unknown;
  all?: ConditionNode[];
  any?: ConditionNode[];
  not?: ConditionNode;
}

export interface RuleExpression {
  id: string;
  name: string;
  version: string;
  type: "ADMISSION" | "EXCLUSION" | "COMPLETION" | "BRANCH" | "SAFETY" | "VARIATION" | "EXIT";
  expression: ConditionNode;
  result?: "TRUE" | "FALSE" | "UNKNOWN";
}

export interface TimeConstraint {
  anchor: "ENROLLMENT" | "PREVIOUS_NODE" | "ADMISSION";
  offsetHours: number;
  windowBeforeHours?: number;
  windowAfterHours?: number;
  hard: boolean;
}

export interface PathwayNode {
  id: string;
  nodeKey: string;
  type: NodeType;
  name: string;
  description?: string;
  required: boolean;
  responsibleRole: ClinicalRole;
  position: { x: number; y: number };
  stage: string;
  completionRule?: RuleExpression;
  timeConstraint?: TimeConstraint;
  evidenceRefs?: string[];
  configuration?: Record<string, unknown>;
}

export interface PathwayEdge {
  id: string;
  source: string;
  target: string;
  type: "SEQUENCE" | "CONDITIONAL" | "PARALLEL";
  condition?: RuleExpression;
  priority?: number;
  isDefault?: boolean;
}

export interface ValidationIssue {
  id: string;
  level: "ERROR" | "WARNING" | "INFO";
  category: "GRAPH" | "RULE" | "TIME" | "SAFETY" | "PERMISSION" | "VERSION";
  message: string;
  nodeKey?: string;
  ruleRef?: string;
}

export interface PathwayVersion {
  id: ID;
  pathwayId: ID;
  version: string;
  status: VersionStatus;
  graphHash: string;
  effectiveAt?: ISODate;
  publishedAt?: ISODate;
  createdAt: ISODate;
  createdBy: string;
  changeSummary: string;
  nodeCount: number;
  edgeCount: number;
  approval?: { reviewer: string; reviewedAt: ISODate; comment: string };
  validation: { errors: number; warnings: number; passedAt?: ISODate };
}

export interface Pathway {
  id: ID;
  code: string;
  name: string;
  diseaseCode: string;
  diseaseCodeSystem: string;
  diseaseName: string;
  departmentId: ID;
  departmentName: string;
  description: string;
  status: PathwayStatus;
  currentVersion: string;
  versionId: ID;
  updatedAt: ISODate;
  createdAt: ISODate;
  ownerName: string;
  instanceCount: number;
  tags: string[];
  clinicalUse: boolean;
  evidenceRefs: string[];
}

export interface EvidenceItem {
  id: ID;
  title: string;
  source: string;
  sourceType: "GUIDELINE" | "CONSENSUS" | "NATIONAL_PATHWAY" | "HOSPITAL_STANDARD" | "LITERATURE";
  year: number;
  grade: string;
  summary: string;
}

export interface KnowledgeDoc {
  id: ID;
  code: string;
  title: string;
  type: "GUIDELINE" | "CONSENSUS" | "NATIONAL_PATHWAY" | "HOSPITAL_STANDARD" | "CLINICAL_RULE" | "TERMINOLOGY";
  source: string;
  version: string;
  effectiveAt: ISODate;
  department: string;
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SUPERSEDED";
  owner: string;
  summary: string;
  linkedPathways: string[];
  evidenceCount: number;
}

export interface ClinicalRule {
  id: ID;
  code: string;
  name: string;
  type: RuleExpression["type"];
  version: string;
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED";
  description: string;
  linkedPathways: number;
  lastTestedAt?: ISODate;
}

/* --------------------------- 实例 / 计划 / 任务 --------------------------- */

export type InstanceStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAUSED"
  | "REPLAN_REQUIRED"
  | "COMPLETED"
  | "EXITED"
  | "CANCELLED";

export interface PathwayInstance {
  id: ID;
  patientId: ID;
  patientName: string;
  pathwayId: ID;
  pathwayName: string;
  versionId: ID;
  version: string;
  status: InstanceStatus;
  enrolledAt: ISODate;
  activePlanId?: ID;
  progress: number;
  currentStage: string;
  responsibleDoctor: string;
  revision: number;
  dataCompleteness: number;
  unknownConditions: string[];
}

export type TaskStatus =
  | "PENDING"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED"
  | "BLOCKED";

export interface Task {
  id: ID;
  instanceId: ID;
  planId?: ID;
  nodeKey: string;
  stage: string;
  name: string;
  type: NodeType;
  status: TaskStatus;
  role: ClinicalRole;
  assignee: string;
  earliestStartAt: ISODate;
  dueAt: ISODate;
  startedAt?: ISODate;
  completedAt?: ISODate;
  overdue: boolean;
  required: boolean;
  summary?: string;
  result?: string;
}

export interface TaskEvent {
  id: ID;
  taskId: ID;
  type: "CREATED" | "STARTED" | "COMPLETED" | "OVERDUE" | "CANCELLED" | "SKIPPED";
  at: ISODate;
  actor: string;
  note?: string;
}

export type PlanStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "ACTIVE" | "SUPERSEDED" | "REJECTED";

export interface PlannedTask {
  nodeKey: string;
  name: string;
  type: NodeType;
  stage: string;
  role: ClinicalRole;
  required: boolean;
  earliestStartAt: ISODate;
  dueAt: ISODate;
  dependsOn: string[];
  evidenceRefs: string[];
  unresolved?: boolean;
  note?: string;
}

export interface PlanVersion {
  id: ID;
  instanceId: ID;
  version: string;
  status: PlanStatus;
  createdBy: string;
  createdAt: ISODate;
  approvedBy?: string;
  approvedAt?: ISODate;
  summary: string;
  tasks: PlannedTask[];
  warnings: { id: string; level: "WARN" | "RISK"; message: string }[];
  validation: { level: "PASS" | "WARNING" | "BLOCKED" | "UNKNOWN"; label: string; detail: string }[];
  evidence: { ref: string; title: string; source: string }[];
  differences?: { added: number; removed: number; changed: number; note: string };
}

/* ------------------------------- 变异 --------------------------------- */

export type VariationType =
  | "CLINICAL"
  | "RESOURCE"
  | "TIME"
  | "PATIENT"
  | "PROCESS"
  | "SAFETY"
  | "DATA";

export interface Variation {
  id: ID;
  patientId: ID;
  patientName: string;
  pathwayName: string;
  type: VariationType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  detectedAt: ISODate;
  status: "OPEN" | "ASSESSING" | "REPLAN_PENDING" | "RESOLVED" | "CLOSED";
  source: string;
  affectedNodes: string[];
  impact: string;
  ruleRef: string;
  evidence: string[];
  resolvedBy?: string;
  resolution?: string;
}

/* ------------------------------- 审批 --------------------------------- */

export interface ApprovalChecklistItem {
  key: string;
  label: string;
  status: "PASS" | "WARN" | "BLOCKED" | "PENDING";
  note?: string;
}

export interface Approval {
  id: ID;
  type: "PATHWAY_VERSION" | "PLAN" | "VARIATION_REPLAN";
  title: string;
  pathwayName: string;
  version: string;
  submittedBy: string;
  submittedAt: ISODate;
  status: "PENDING" | "APPROVED" | "REJECTED";
  risk: "HIGH" | "MEDIUM" | "LOW";
  checklist: ApprovalChecklistItem[];
  comments: { author: string; role: string; at: ISODate; content: string }[];
  deadline?: ISODate;
  patientName?: string;
}

/* ------------------------------- 分析 --------------------------------- */

export interface Kpi {
  key: string;
  label: string;
  value: string;
  rawValue?: number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  trend: number[];
  hint: string;
  numerator?: string;
  denominator?: string;
  period?: string;
  exclusions?: string;
  source?: string;
  unavailable?: boolean;
}

export interface MetricRow {
  key: string;
  name: string;
  sub?: string;
  value: string;
  numeric?: number;
  delta?: number;
  trend?: number[];
  status?: "ok" | "warn" | "risk";
}

export interface SeriesPoint {
  label: string;
  values: Record<string, number>;
}

/* --------------------------- AI / 世界模型 ---------------------------- */

export interface PredictionRecord {
  id: ID;
  modelId: string;
  modelVersion: string;
  provider: "mock" | "mwm";
  clinicalUse: false;
  patientStateId: string;
  candidatePlanId?: string;
  horizonDays: number;
  status: "SIMULATED" | "UNAVAILABLE" | "FAILED";
  createdAt: ISODate;
  warnings: string[];
  metrics?: { label: string; value: string; uncertainty?: string }[];
}

export interface SimulationScenario {
  id: ID;
  name: string;
  description: string;
  pathwayId: ID;
  horizonDays: number;
  cohortSize: number;
  resourceProfile: string;
  synthetic: true;
}

export interface SimulationResult {
  scenarioId: ID;
  status: "SIMULATED";
  generatedAt: ISODate;
  outcomes: { label: string; value: string; uncertainty: string }[];
  trajectories: SeriesPoint[];
  comparison: { plan: string; los: string; cost: string; completion: string; risk: string; recommended: boolean }[];
  warnings: string[];
}

/* ------------------------------- 审计 --------------------------------- */

export interface AuditLog {
  id: ID;
  at: ISODate;
  actor: string;
  role: string;
  action: string;
  actionLabel: string;
  target: string;
  targetType: "PATHWAY" | "PATIENT" | "PLAN" | "TASK" | "USER" | "SYSTEM";
  ip: string;
  result: "SUCCESS" | "DENIED" | "FAILED";
  detail: string;
}
