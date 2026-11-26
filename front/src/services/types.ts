export interface BackendUser {
  user_id: string;
  employee_no: string | null;
  name: string;
  role: "ADMIN" | "CLINICIAN" | "EXPERT" | "MEDICAL_AFFAIRS" | "NURSE" | "EXECUTIVE";
  data_scope: "SELF" | "DEPT" | "ORG" | "ALL_NO_RECORD";
  department_id: string | null;
}

export interface BackendLoginResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: BackendUser;
}

export interface BackendPatient {
  patient_id: string;
  synthetic: boolean;
  source_system: string;
  external_id: string | null;
  display_name: string;
  sex: "M" | "F" | "OTHER" | "UNKNOWN";
  birth_date: string | null;
  diagnosis_code: string;
  diagnosis_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BackendObservation {
  observation_id: string;
  patient_id: string;
  encounter_id: string | null;
  category: string;
  code: string;
  display: string;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  value_status: "KNOWN" | "UNKNOWN";
  reference_range: string | null;
  interpretation: string;
  occurred_at: string;
  recorded_at: string;
  source_system: string;
}

export interface BackendPathwayVersion {
  version_id: string;
  template_id: string;
  name: string;
  disease_code: string;
  version: string;
  status: string;
  graph: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] };
  rules: Record<string, unknown>[];
  content_hash: string;
  validation: { passed?: boolean; errors?: unknown[]; warnings?: unknown[] };
}

export interface BackendEnrollmentEvaluation {
  evaluation_id: string;
  patient_id: string;
  snapshot_id: string;
  pathway_version_id: string;
  decision: "ELIGIBLE" | "PENDING_SUPPLEMENT" | "NOT_ELIGIBLE";
  auto_enroll_allowed: boolean;
  admission_tri_state: "TRUE" | "FALSE" | "UNKNOWN";
  exclusion_tri_state: "TRUE" | "FALSE" | "UNKNOWN";
  completeness_tri_state: "TRUE" | "FALSE" | "UNKNOWN";
  missing_fields: string[];
  reasons: string[];
}

export interface BackendInstance {
  instance_id: string;
  patient_id: string;
  pathway_version_id: string;
  status: string;
  active_plan_id: string | null;
  current_stage: string | null;
  data_completeness: number;
}

export interface BackendTask {
  task_id: string;
  plan_id: string;
  instance_id: string;
  node_key: string;
  name: string;
  stage: string;
  role: string;
  status: string;
  depends_on: string[];
  due_at: string | null;
  overdue: boolean;
  version: number;
}

export interface BackendTaskOverview {
  task_id: string;
  instance_id: string;
  patient_id: string;
  patient_name: string | null;
  pathway_name: string | null;
  node_key: string;
  name: string;
  stage: string;
  role: string;
  status: string;
  required: boolean;
  assignee: string | null;
  due_at: string | null;
  overdue: boolean;
  version: number;
  dependencies_completed: boolean;
}

export interface BackendPlan {
  plan_id: string;
  instance_id: string;
  patient_id: string;
  version: string;
  status: string;
  summary: string;
  tasks: BackendTask[];
}

export interface BackendVariation {
  variation_id: string;
  patient_id: string;
  instance_id: string | null;
  type: string;
  severity: string;
  title: string;
  description: string;
  detected_at: string;
  source: string;
  status: string;
  affected_nodes: string[];
  rule_ref: string | null;
  impact: string | null;
  resolution: string | null;
  resolved_at: string | null;
}

export interface BackendFollowup {
  followup_id: string;
  patient_id: string;
  instance_id: string | null;
  status: string;
  risk_level: string;
  window_start: string;
  window_end: string;
  channel: string;
  owner: string;
  consent_status: string;
  escalation: Record<string, unknown>;
  contacts: Record<string, unknown>[];
}

export interface BackendOutcome {
  outcome_id: string;
  patient_id: string;
  instance_id: string;
  treatment_type: string;
  recurrence: string;
  response: string;
  observed_at: string;
}

export interface BackendPatientOverview {
  patient_id: string;
  display_name: string;
  external_id: string | null;
  sex: "M" | "F" | "OTHER" | "UNKNOWN";
  birth_date: string | null;
  age: number | null;
  department_name: string | null;
  ward: string | null;
  bed: string | null;
  attending: string | null;
  diagnosis_code: string;
  diagnosis_name: string;
  stage: string | null;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  scenario: string;
  pathway_id: string | null;
  pathway_name: string | null;
  pathway_version: string | null;
  instance_id: string | null;
  enrolled_at: string | null;
  admitted_at: string | null;
  los: number | null;
  progress: number;
  current_stage: string | null;
  data_completeness: number | null;
  missing_fields: string[];
  flags: string[];
}

export interface BackendPatientDetail {
  patient: BackendPatient;
  encounters: Record<string, unknown>[];
  observations: BackendObservation[];
  assessment: Record<string, unknown> | null;
  instance: BackendInstance | null;
  plan: BackendPlan | null;
  variations: BackendVariation[];
  followups: BackendFollowup[];
  outcomes: BackendOutcome[];
}

export interface BackendPathwayOverview {
  template_id: string;
  name: string;
  disease_code: string;
  department_name: string | null;
  current_version_id: string | null;
  current_version: string | null;
  status: string | null;
  owner_name: string | null;
  instance_count: number;
  version_count: number;
  node_count: number;
  updated_at: string | null;
}

export interface BackendPage<T> {
  items: T[];
  meta: { page: number; page_size: number; total: number };
}


export interface BackendAnalyticsMetric {
  key: string;
  label: string;
  value: number;
  numerator: number;
  denominator: number;
  period: string;
  definition: string;
}

export interface BackendAnalyticsSummary {
  generated_at: string;
  period: { key: string; timezone: string };
  metrics: BackendAnalyticsMetric[];
  note: string;
}
