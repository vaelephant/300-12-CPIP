import { useQuery } from "@tanstack/react-query";
import { hccApi } from "@/services/hcc-api";
import { backendKeys } from "./keys";

export function useBackendPatients(params: { page?: number; pageSize?: number; query?: string }, enabled = true) {
  return useQuery({
    queryKey: backendKeys.patients(params),
    queryFn: () => hccApi.listPatients(params),
    enabled: enabled && hccApi.hasToken(),
  });
}

export function useBackendPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: backendKeys.patient(patientId ?? ""),
    queryFn: () => hccApi.getPatient(patientId!),
    enabled: Boolean(patientId) && hccApi.hasToken(),
  });
}

export function useBackendObservations(patientId: string | undefined) {
  return useQuery({
    queryKey: backendKeys.observations(patientId ?? ""),
    queryFn: () => hccApi.listObservations(patientId!),
    enabled: Boolean(patientId) && hccApi.hasToken(),
  });
}

export function useBackendPathways() {
  return useQuery({
    queryKey: backendKeys.pathways(),
    queryFn: () => hccApi.listPathways(),
    enabled: hccApi.hasToken(),
  });
}

export function useBackendPathwayOverview() {
  return useQuery({
    queryKey: [...backendKeys.pathways(), "overview"],
    queryFn: () => hccApi.listPathwayOverview(),
    enabled: hccApi.hasToken(),
  });
}

export function useBackendTaskOverview() {
  return useQuery({
    queryKey: [...backendKeys.tasks(), "overview"],
    queryFn: () => hccApi.listTaskOverview(),
    enabled: hccApi.hasToken(),
  });
}

export function useBackendTasks(instanceId?: string) {
  return useQuery({
    queryKey: backendKeys.tasks(instanceId),
    queryFn: () => hccApi.listTasks(instanceId),
    enabled: hccApi.hasToken(),
  });
}
