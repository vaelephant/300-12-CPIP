import type { Tone } from "@/lib/clinical";

export type ClinicalSemantic =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "PENDING"
  | "HIGH_RISK"
  | "UNKNOWN"
  | "AI_SUGGESTION"
  | "NOT_SELECTED";

export interface SemanticDescriptor {
  semantic: ClinicalSemantic;
  label: string;
  tone: Tone;
  /** Always pair color with a shape/word; color alone must not carry meaning. */
  marker: string;
}

const SEMANTICS: Record<ClinicalSemantic, SemanticDescriptor> = {
  COMPLETED: { semantic: "COMPLETED", label: "已完成", tone: "ok", marker: "check" },
  IN_PROGRESS: { semantic: "IN_PROGRESS", label: "执行中", tone: "info", marker: "progress" },
  PENDING: { semantic: "PENDING", label: "待处理", tone: "warn", marker: "clock" },
  HIGH_RISK: { semantic: "HIGH_RISK", label: "高风险", tone: "risk", marker: "alert" },
  UNKNOWN: { semantic: "UNKNOWN", label: "未知/缺失", tone: "neutral", marker: "question" },
  AI_SUGGESTION: { semantic: "AI_SUGGESTION", label: "AI 建议 · 待审核", tone: "info", marker: "ai" },
  NOT_SELECTED: { semantic: "NOT_SELECTED", label: "未选路径", tone: "neutral", marker: "dashed" },
};

const STATUS_MAP: Record<string, ClinicalSemantic> = {
  COMPLETED: "COMPLETED",
  DONE: "COMPLETED",
  CLOSED: "COMPLETED",
  RESOLVED: "COMPLETED",
  ACTIVE: "IN_PROGRESS",
  IN_PROGRESS: "IN_PROGRESS",
  APPROVED: "IN_PROGRESS",
  READY: "PENDING",
  PENDING: "PENDING",
  PENDING_APPROVAL: "PENDING",
  PENDING_ACTION: "PENDING",
  PLANNED: "PENDING",
  OPEN: "PENDING",
  ASSESSING: "PENDING",
  REPLAN_PENDING: "PENDING",
  HIGH: "HIGH_RISK",
  CRITICAL: "HIGH_RISK",
  BLOCKED: "HIGH_RISK",
  UNKNOWN: "UNKNOWN",
  NOT_MEASURED: "UNKNOWN",
  DRAFT: "UNKNOWN",
  SUPERSEDED: "NOT_SELECTED",
  SKIPPED: "NOT_SELECTED",
  CANCELLED: "NOT_SELECTED",
};

export function semanticForStatus(status: string | null | undefined): SemanticDescriptor {
  if (!status) return SEMANTICS.UNKNOWN;
  return SEMANTICS[STATUS_MAP[status.toUpperCase()] ?? "UNKNOWN"];
}

export function semanticDescriptor(semantic: ClinicalSemantic): SemanticDescriptor {
  return SEMANTICS[semantic];
}

/** Safe for charts/labels: unknown enum values degrade to UNKNOWN, never to "normal". */
export function labelForStatus(status: string | null | undefined): string {
  return semanticForStatus(status).label;
}


const RISK_SEMANTICS: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: "低风险", tone: "ok" },
  MEDIUM: { label: "中风险", tone: "warn" },
  HIGH: { label: "高风险", tone: "risk" },
  CRITICAL: { label: "严重风险", tone: "risk" },
};

export function semanticForRisk(risk: string | null | undefined): { label: string; tone: Tone } {
  return RISK_SEMANTICS[(risk ?? "").toUpperCase()] ?? { label: "风险未知", tone: "neutral" };
}
