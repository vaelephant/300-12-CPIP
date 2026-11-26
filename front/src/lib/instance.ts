import { INSTANCES } from "@/data/runtime";
import { PATIENTS } from "@/data/patients";

/** 任务行等场景只有 instanceId，解析出患者展示名。 */
export function patientNameForInstance(instanceId: string, fallback?: string): string {
  const instance = INSTANCES.find((i) => i.id === instanceId);
  if (instance) return `${instance.patientName} · ${instance.pathwayName}`;
  const patient = PATIENTS.find((p) => p.instanceId === instanceId);
  if (patient) return `${patient.name} · ${patient.diagnosis}`;
  return fallback?.split(" · ")[0] ?? "演示患者";
}

export function instanceForId(instanceId: string) {
  return INSTANCES.find((i) => i.id === instanceId);
}
