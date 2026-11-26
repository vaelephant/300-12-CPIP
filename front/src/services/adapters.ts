import type { Patient, PatientScenario, PatientStatus } from "@/types";
import type { BackendPatientOverview } from "./types";

function toStatus(value: string): PatientStatus {
  if (value === "COMPLETED") return "COMPLETED";
  if (value === "EXITED") return "EXITED";
  if (value === "NOT_ELIGIBLE") return "NOT_ELIGIBLE";
  if (value === "PENDING_ADMISSION") return "PENDING_ADMISSION";
  return "IN_PATHWAY";
}

function toScenario(value: string): PatientScenario {
  if (value === "CLINICAL_VARIATION" || value === "OVERDUE" || value === "MISSING_DATA" || value === "EXITED" || value === "NOT_ELIGIBLE") {
    return value;
  }
  return "NORMAL";
}

export function toPatient(overview: BackendPatientOverview): Patient {
  return {
    id: overview.patient_id,
    mrn: overview.external_id ?? overview.patient_id,
    name: overview.display_name,
    gender: overview.sex === "M" ? "M" : "F",
    age: overview.age ?? 0,
    birthDate: overview.birth_date ?? "",
    departmentId: overview.department_name?.includes("肝胆") ? "dept-hpb" : "server",
    departmentName: overview.department_name ?? "—",
    ward: overview.ward ?? "—",
    bed: overview.bed ?? "—",
    diagnosis: overview.diagnosis_name,
    diagnosisCode: overview.diagnosis_code,
    stage: overview.stage ?? "未分期",
    riskLevel: overview.risk_level,
    allergy: [],
    status: toStatus(overview.status),
    scenario: toScenario(overview.scenario),
    pathwayId: overview.pathway_id ?? undefined,
    pathwayName: overview.pathway_name ?? undefined,
    pathwayVersion: overview.pathway_version ?? undefined,
    instanceId: overview.instance_id ?? undefined,
    enrolledAt: overview.enrolled_at ?? undefined,
    admissionAt: overview.admitted_at ?? "",
    los: overview.los ?? 0,
    attending: overview.attending ?? "—",
    nurse: "—",
    progress: overview.progress,
    presentIllness: "",
    flags: overview.flags,
  };
}
