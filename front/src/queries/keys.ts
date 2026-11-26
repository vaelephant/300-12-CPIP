export const backendKeys = {
  all: ["backend"] as const,
  me: () => [...backendKeys.all, "me"] as const,
  patients: (params: { page?: number; pageSize?: number; query?: string }) =>
    [...backendKeys.all, "patients", params] as const,
  patient: (patientId: string) => [...backendKeys.all, "patient", patientId] as const,
  observations: (patientId: string) => [...backendKeys.all, "observations", patientId] as const,
  pathways: () => [...backendKeys.all, "pathways"] as const,
  plan: (planId: string) => [...backendKeys.all, "plan", planId] as const,
  tasks: (instanceId?: string) => [...backendKeys.all, "tasks", instanceId ?? "all"] as const,
  variations: (patientId?: string) => [...backendKeys.all, "variations", patientId ?? "all"] as const,
  followups: (risk?: string) => [...backendKeys.all, "followups", risk ?? "all"] as const,
  outcomes: (patientId: string) => [...backendKeys.all, "outcomes", patientId] as const,
};
