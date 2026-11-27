import type { Patient, PathwayInstance, PatientStateSnapshot } from "@/types";
import { PATIENT_STATE, minutesAgo } from "@/data";

const RISK_LABEL = { HIGH: "高风险", MEDIUM: "中风险", LOW: "低风险" } as const;

/**
 * 返回患者状态快照：
 * - 演示患者 陈志远 使用数据层中完整的状态快照；
 * - 其他患者按实例与患者记录构建一份合成快照（字段状态明确标注 KNOWN / UNKNOWN）。
 */
export function getStateForPatient(patient: Patient, instance?: PathwayInstance): PatientStateSnapshot {
  if (patient.id === "HCC-DEMO-001") return PATIENT_STATE;
  return {
    patientId: patient.id,
    snapshotAt: minutesAgo(35),
    fields: [
      { field: "diagnosis.code", label: "主要诊断", value: `${patient.diagnosis} (${patient.diagnosisCode})`, status: "KNOWN" },
      { field: "diagnosis.stage", label: "临床分期", value: patient.stage, status: "KNOWN" },
      { field: "patient.risk", label: "风险等级", value: RISK_LABEL[patient.riskLevel], status: "KNOWN" },
      { field: "lab.inr", label: "凝血 INR", value: "1.08", status: "KNOWN" },
      { field: "imaging.report", label: "影像报告", value: "已归档", status: "KNOWN" },
      { field: "assessment.nutrition", label: "营养风险筛查 NRS 2002", value: null, status: "UNKNOWN" },
      { field: "imaging.extra", label: "补充影像复核", value: "待影像复核", status: "STALE" },
      { field: "consent.signed", label: "手术知情同意", value: patient.status === "PENDING_ADMISSION" ? "未签署" : "已签署", status: "KNOWN" },
      { field: "pathway.instance", label: "路径实例", value: instance?.id ?? "未创建", status: instance ? "KNOWN" : "UNKNOWN" },
    ],
    missingFields: ["assessment.nutrition"],
    unknownConditions: instance?.unknownConditions.length ? instance.unknownConditions : ["营养风险分级"],
    goals: ["按临床路径完成标准诊疗", "控制住院日与并发症风险"],
    preferences: ["患者希望尽量缩短住院时间", "家属可提供术后照护"],
    dataCompleteness: instance?.dataCompleteness ?? Math.max(62, Math.min(98, patient.progress + 28)),
  };
}

/** 字段 key → 中文标签（用于“待补充资料”展示）。 */
export function fieldLabel(state: PatientStateSnapshot, field: string): string {
  return state.fields.find((f) => f.field === field)?.label ?? field;
}
