import { IS_SERVER_MODE } from "@/lib/data-mode";
import { useQuery } from "@tanstack/react-query";
import { LAST_SYNC, PATIENTS, PATIENT_SUMMARY } from "@/data";
import { hccApi } from "@/services/hcc-api";
import { toPatient } from "@/services/adapters";

const API_MODE = IS_SERVER_MODE;
const DIRECTORY_KEY = ["backend", "patient-directory"] as const;

export function usePatientDirectory() {
  const query = useQuery({
    queryKey: DIRECTORY_KEY,
    queryFn: () => hccApi.listPatientOverview({ pageSize: 100 }),
    enabled: API_MODE && hccApi.hasToken(),
    staleTime: 15_000,
  });

  if (!API_MODE) {
    return {
      patients: PATIENTS,
      summary: PATIENT_SUMMARY,
      lastSync: LAST_SYNC,
      mode: "demo" as const,
      isLoading: false,
      error: null,
    };
  }

  const patients = (query.data?.items ?? []).map(toPatient);
  const summary = {
    total: patients.length,
    inPathway: patients.filter((patient) => patient.status === "IN_PATHWAY").length,
    pendingAdmission: patients.filter((patient) => patient.status === "PENDING_ADMISSION").length,
    notEligible: patients.filter((patient) => patient.status === "NOT_ELIGIBLE").length,
    completed: patients.filter((patient) => patient.status === "COMPLETED").length,
    exited: patients.filter((patient) => patient.status === "EXITED").length,
    highRisk: patients.filter((patient) => patient.riskLevel === "HIGH").length,
  };

  return {
    patients,
    summary,
    lastSync: new Date().toISOString(),
    mode: "server" as const,
    isLoading: query.isLoading,
    error: query.error,
  };
}
