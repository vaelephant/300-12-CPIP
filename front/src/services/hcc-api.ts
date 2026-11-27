import { apiRequest, clearBackendToken, getBackendToken, setBackendToken } from "./http";
import type {
  BackendAnalyticsSummary,
  BackendApproval,
  BackendAuditEvent,
  BackendEnrollmentEvaluation,
  BackendFollowup,
  BackendInstance,
  BackendLoginResponse,
  BackendObservation,
  BackendOutcome,
  BackendPage,
  BackendPathwayOverview,
  BackendPathwayVersion,
  BackendPathwayVersionCreate,
  BackendPatient,
  BackendPatientDetail,
  BackendPatientOverview,
  BackendPlan,
  BackendReassessment,
  BackendTask,
  BackendTaskOverview,
  BackendUser,
  BackendVariation,
} from "./types";

interface Credentials {
  employee_no: string;
  password: string;
}

interface SnapshotPayload {
  as_of: string;
  staging: Record<string, unknown>;
  liver_reserve: Record<string, unknown>;
  performance_status: Record<string, unknown>;
  tumor: Record<string, unknown>;
  biomarkers?: Record<string, unknown>;
  hepatitis?: Record<string, unknown>;
  treatment_history?: string[];
  observation_refs?: string[];
  missing_fields?: string[];
  ruleset_version: string;
}

export const hccApi = {
  async login(credentials: Credentials): Promise<BackendLoginResponse> {
    const response = await apiRequest<BackendLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setBackendToken(response.access_token);
    return response;
  },
  logout(): void {
    clearBackendToken();
  },
  hasToken(): boolean {
    return Boolean(getBackendToken());
  },
  me: () => apiRequest<BackendUser>("/me"),
  listPatients: (params: { page?: number; pageSize?: number; query?: string } = {}) => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.pageSize ?? 20));
    if (params.query) search.set("query", params.query);
    return apiRequest<BackendPage<BackendPatient>>(`/patients?${search.toString()}`);
  },
  getPatient: (patientId: string) => apiRequest<BackendPatient>(`/patients/${patientId}`),
  getPatientDetail: (patientId: string) => apiRequest<BackendPatientDetail>(`/patients/${patientId}/overview`),
  listPatientOverview: (params: { page?: number; pageSize?: number; query?: string; status?: string } = {}) => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.pageSize ?? 100));
    if (params.query) search.set("query", params.query);
    if (params.status) search.set("status", params.status);
    return apiRequest<BackendPage<BackendPatientOverview>>(`/patients/overview?${search.toString()}`);
  },
  listObservations: (patientId: string) =>
    apiRequest<{ items: BackendObservation[] }>(`/patients/${patientId}/observations`),
  createSnapshot: (patientId: string, payload: SnapshotPayload) =>
    apiRequest<Record<string, unknown>>(`/patients/${patientId}/snapshots`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listPathways: () => apiRequest<BackendPage<BackendPathwayVersion>>("/pathways"),
  listPathwayOverview: () => apiRequest<BackendPage<BackendPathwayOverview>>("/pathways/overview"),
  listPathwayVersions: (pathwayId: string) =>
    apiRequest<BackendPathwayVersion[]>(`/pathways/${pathwayId}/versions`),
  createPathwayVersion: (pathwayId: string, payload: BackendPathwayVersionCreate) =>
    apiRequest<BackendPathwayVersion>(`/pathways/${pathwayId}/versions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  validatePathwayVersion: (versionId: string) =>
    apiRequest<{ valid: boolean; errors: unknown[]; warnings: unknown[]; content_hash?: string | null }>(
      `/pathway-versions/${versionId}/validate`,
      { method: "POST" },
    ),
  submitPathwayVersion: (versionId: string) =>
    apiRequest<BackendPathwayVersion>(`/pathway-versions/${versionId}/submit`, { method: "POST" }),
  publishPathwayVersion: (versionId: string) =>
    apiRequest<BackendPathwayVersion>(`/pathway-versions/${versionId}/publish`, { method: "POST" }),
  listApprovals: (params: { status?: string; page?: number; pageSize?: number } = {}) => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.pageSize ?? 50));
    if (params.status) search.set("status", params.status);
    return apiRequest<BackendPage<BackendApproval>>(`/approvals?${search.toString()}`);
  },
  approveRequest: (approvalId: string, comment?: string) =>
    apiRequest<BackendApproval>(`/approvals/${approvalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  rejectRequest: (approvalId: string, comment?: string) =>
    apiRequest<BackendApproval>(`/approvals/${approvalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  listAuditEvents: (params: { page?: number; pageSize?: number; objectType?: string; objectId?: string } = {}) => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.pageSize ?? 50));
    if (params.objectType) search.set("object_type", params.objectType);
    if (params.objectId) search.set("object_id", params.objectId);
    return apiRequest<BackendPage<BackendAuditEvent>>(`/audit-events?${search.toString()}`);
  },
  listReassessments: (params: { page?: number; pageSize?: number; status?: string } = {}) => {
    const search = new URLSearchParams();
    search.set("page", String(params.page ?? 1));
    search.set("page_size", String(params.pageSize ?? 50));
    if (params.status) search.set("status", params.status);
    return apiRequest<BackendPage<BackendReassessment>>(`/reassessments?${search.toString()}`);
  },
  dismissReassessment: (reassessmentId: string, reason: string) =>
    apiRequest<BackendReassessment>(`/reassessments/${reassessmentId}/dismiss`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  replanReassessment: (reassessmentId: string) =>
    apiRequest<BackendPlan>(`/reassessments/${reassessmentId}/replan`, { method: "POST" }),
  importClinicalEvents: (payload: {
    source_system: string;
    idempotency_key?: string;
    events: Record<string, unknown>[];
  }) =>
    apiRequest<{ imported: number; duplicates: number; request_id: string }>("/clinical-events/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  evaluateEnrollment: (payload: { patient_id: string; snapshot_id: string; pathway_version_id: string }) =>
    apiRequest<BackendEnrollmentEvaluation>("/enrollment/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createInstance: (payload: {
    patient_id: string;
    pathway_version_id: string;
    enrollment_evaluation_id: string;
    doctor_confirmed: boolean;
  }) =>
    apiRequest<BackendInstance>("/instances", { method: "POST", body: JSON.stringify(payload) }),
  getInstance: (instanceId: string) => apiRequest<BackendInstance>(`/instances/${instanceId}`),
  listInstancePlans: (instanceId: string) => apiRequest<BackendPlan[]>(`/instances/${instanceId}/plans`),
  generatePlan: (instanceId: string, payload: { snapshot_id: string; ruleset_version: string }) =>
    apiRequest<BackendPlan>(`/instances/${instanceId}/plans`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPlan: (planId: string) => apiRequest<BackendPlan>(`/plans/${planId}`),
  submitPlan: (planId: string) => apiRequest<BackendPlan>(`/plans/${planId}/submit`, { method: "POST" }),
  approvePlan: (planId: string, comment?: string) =>
    apiRequest<BackendPlan>(`/plans/${planId}/approve`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  activatePlan: (planId: string) => apiRequest<BackendPlan>(`/plans/${planId}/activate`, { method: "POST" }),
  listTaskOverview: (params: { status?: string; overdueOnly?: boolean } = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.overdueOnly) search.set("overdue_only", "true");
    return apiRequest<BackendPage<BackendTaskOverview>>(`/tasks/overview?${search.toString()}`);
  },
  listTasks: (instanceId?: string) => {
    const suffix = instanceId ? `?instance_id=${encodeURIComponent(instanceId)}` : "";
    return apiRequest<{ items: BackendTask[] }>(`/tasks${suffix}`);
  },
  transitionTask: (taskId: string, payload: { to_status: string; expected_version: number; result_summary?: string }) =>
    apiRequest<BackendTask>(`/tasks/${taskId}/transition`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listVariations: (params: { patientId?: string; status?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.patientId) search.set("patient_id", params.patientId);
    if (params.status) search.set("status", params.status);
    return apiRequest<{ items: BackendVariation[] }>(`/variations?${search.toString()}`);
  },
  registerVariation: (payload: Record<string, unknown>) =>
    apiRequest<BackendVariation>("/variations", { method: "POST", body: JSON.stringify(payload) }),
  replanVariation: (variationId: string) =>
    apiRequest<BackendPlan>(`/variations/${variationId}/replan`, { method: "POST" }),
  resolveVariation: (variationId: string, payload: { resolution: string; close: boolean }) =>
    apiRequest<BackendVariation>(`/variations/${variationId}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listFollowups: (params: { status?: string; risk?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.risk) search.set("risk", params.risk);
    return apiRequest<{ items: BackendFollowup[] }>(`/followups?${search.toString()}`);
  },
  createFollowup: (payload: Record<string, unknown>) =>
    apiRequest<BackendFollowup>("/followups", { method: "POST", body: JSON.stringify(payload) }),
  recordFollowupContact: (followupId: string, payload: Record<string, unknown>) =>
    apiRequest<BackendFollowup>(`/followups/${followupId}/contacts`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  escalateFollowup: (followupId: string, reason: string) =>
    apiRequest<BackendFollowup>(`/followups/${followupId}/escalate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  closeFollowup: (followupId: string, reason: string) =>
    apiRequest<BackendFollowup>(`/followups/${followupId}/close`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  listOutcomes: (patientId: string) =>
    apiRequest<{ items: BackendOutcome[] }>(`/patients/${patientId}/outcomes`),
  createOutcome: (patientId: string, payload: Record<string, unknown>) =>
    apiRequest<BackendOutcome>(`/patients/${patientId}/outcomes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  specialtyAssessment: (patientId: string) =>
    apiRequest<Record<string, unknown>>(`/patients/${patientId}/specialty-assessment`),
  analyticsSummary: (period = "last_30_days") =>
    apiRequest<BackendAnalyticsSummary>(`/analytics/summary?period=${encodeURIComponent(period)}`),
};
