import type { Patient, PathwayInstance, Task } from "@/types";
import type { PatientStateSnapshot } from "@/types";
import {
  WM_FIXTURE,
  type WmCanvasData,
  type WmNowFact,
  type WmPastEvent,
  type WmSelection,
  type WmStage,
  type WmStageState,
} from "@/dev/desgin/kit/world-model";
import { CLINICAL_STAGES, deriveStageStates, isTerminalTask, type StageState } from "@/components/patient/stages";
import { fmtDate } from "@/lib/utils";

export type ObservatoryCdssAction = {
  id: string;
  title: string;
  why: string;
  evidence: string[];
  severity: "critical" | "warn" | "info";
  cta: string;
  target: WmSelection;
  focusStageId?: string | null;
};

const STAGE_TO_ID = Object.fromEntries(CLINICAL_STAGES.map((name, i) => [name, `s${i + 1}`])) as Record<
  string,
  string
>;

function stageStateToWm(state: StageState): WmStageState {
  if (state === "DONE") return "done";
  if (state === "ACTIVE") return "active";
  return "pending";
}

function taskKind(task: Task): NonNullable<WmPastEvent["kind"]> {
  const n = task.name;
  if (/检验|化验|ICG|血|影像|MRI|CT|超声/.test(n)) return "exam";
  if (/MDT|决策|指征|评估签署|知情/.test(n)) return "decision";
  if (/宣教|记录|护理/.test(n)) return "note";
  return "task";
}

function taskStatus(task: Task): NonNullable<WmPastEvent["status"]> {
  if (task.overdue && !isTerminalTask(task.status)) return "overdue";
  if (task.status === "COMPLETED") return "done";
  if (task.status === "IN_PROGRESS" || task.status === "READY") return "partial";
  return "done";
}

/** 将临床阶段任务投影为世界模型 Past / Stages / Now */
export function buildPatientObservatoryData(input: {
  patient: Patient;
  instance?: PathwayInstance;
  tasks: Task[];
  state?: PatientStateSnapshot;
}): WmCanvasData {
  const { patient, instance, tasks, state } = input;
  const stageStates = deriveStageStates(tasks);
  const progress = instance?.progress ?? patient.progress;

  const stages: WmStage[] = CLINICAL_STAGES.map((name) => {
    const list = tasks.filter((t) => t.stage === name);
    const done = list.filter((t) => isTerminalTask(t.status)).length;
    const overdue = list.filter((t) => t.overdue && !isTerminalTask(t.status)).length;
    const st = stageStates[name] ?? "PENDING";
    const open = list.find((t) => !isTerminalTask(t.status));
    return {
      id: STAGE_TO_ID[name],
      name,
      state: stageStateToWm(st),
      done,
      total: Math.max(list.length, 1),
      overdue: overdue || undefined,
      window: instance?.currentStage === name ? "当前" : undefined,
      summary:
        st === "DONE"
          ? `${name}阶段任务已闭环。`
          : st === "ACTIVE"
            ? open
              ? `进行中：${open.name}${open.overdue ? "（超时）" : ""}`
              : `${name}执行中`
            : `${name}尚未解锁或未开始。`,
      nextAction: open?.name,
    };
  });

  const pastSource = tasks
    .filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED" || t.status === "IN_PROGRESS")
    .slice()
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 8);

  const past: WmPastEvent[] = pastSource.map((t) => ({
    id: t.id,
    label: t.name,
    at: fmtDate(t.completedAt ?? t.dueAt, true),
    stageId: STAGE_TO_ID[t.stage] ?? "s1",
    kind: taskKind(t),
    status: taskStatus(t),
    detail: t.name,
    operator: t.assignee,
    result: t.status === "COMPLETED" ? "已完成" : t.status === "IN_PROGRESS" ? "执行中" : t.status,
    evidence: t.nodeKey ? [`node:${t.nodeKey}`] : undefined,
    department: patient.departmentName,
    relatedNext: undefined,
    refs: [
      { label: "任务", value: t.id },
      { label: "节点", value: t.nodeKey },
    ],
  }));

  const activeStageName =
    CLINICAL_STAGES.find((s) => stageStates[s] === "ACTIVE") ?? instance?.currentStage ?? "—";
  const overdueTasks = tasks.filter((t) => t.overdue && !isTerminalTask(t.status));
  const unknownFields = state?.fields.filter((f) => f.status === "UNKNOWN") ?? [];
  const missing = state?.missingFields ?? [];

  const nowBlockers: string[] = [
    ...overdueTasks.map((t) => `${t.name}超时未闭环`),
    ...unknownFields.map((f) => `${f.label} UNKNOWN`),
    ...missing.slice(0, 2).map((m) => `缺失 · ${m.split(".").slice(-1)[0]}`),
  ];

  const nowFacts: WmNowFact[] = [
    { id: "f-progress", label: "路径进度", value: `${progress}%`, tone: "mute" },
    { id: "f-stage", label: "当前阶段", value: activeStageName, tone: "ok" },
    {
      id: "f-overdue",
      label: "超时任务",
      value: overdueTasks.length ? `${overdueTasks.length} 项` : "无",
      tone: overdueTasks.length ? "warn" : "ok",
    },
    {
      id: "f-unknown",
      label: "UNKNOWN",
      value: unknownFields.length ? `${unknownFields.length} 字段` : "无",
      tone: unknownFields.length ? "warn" : "mute",
    },
  ];

  const nowLabel = overdueTasks[0]
    ? `${activeStageName} · 有阻断`
    : `${activeStageName}`;
  const nowDetail = nowBlockers.length
    ? nowBlockers.slice(0, 2).join(" · ")
    : "当前无硬阻断，可继续路径执行或研究情景。";

  return {
    ...WM_FIXTURE,
    patient: `${patient.name} · ${patient.stage}`,
    pathway: (() => {
      const name = instance?.pathwayName ?? patient.pathwayName ?? WM_FIXTURE.pathway;
      const ver = instance?.version ?? patient.pathwayVersion;
      return ver ? `${name} · V${ver}` : name;
    })(),
    progress,
    stages,
    past: past.length ? past : WM_FIXTURE.past,
    nowLabel,
    nowDetail,
    nowFacts,
    nowBlockers: nowBlockers.length ? nowBlockers : ["当前无硬阻断"],
    candidates: WM_FIXTURE.candidates,
  };
}

/** CDSS 行动：优先超时 / UNKNOWN，并保留一条 Future 情景入口 */
export function buildPatientCdssActions(input: {
  data: WmCanvasData;
  tasks: Task[];
}): ObservatoryCdssAction[] {
  const { data, tasks } = input;
  const overdue = tasks.filter((t) => t.overdue && !isTerminalTask(t.status));
  const actions: ObservatoryCdssAction[] = [];

  if (overdue[0]) {
    const t = overdue[0];
    actions.push({
      id: `cdss-overdue-${t.id}`,
      title: `闭环「${t.name}」`,
      why: `${t.stage}超时 · 阻断阶段推进`,
      evidence: [`截止 ${fmtDate(t.dueAt, true)}`, t.assignee, t.nodeKey].filter(Boolean) as string[],
      severity: "critical",
      cta: "定位到 Now",
      target: { kind: "now" },
      focusStageId: STAGE_TO_ID[t.stage] ?? null,
    });
  }

  const unknownFact = data.nowFacts?.find((f) => f.id === "f-unknown" && f.tone === "warn");
  if (unknownFact) {
    actions.push({
      id: "cdss-unknown",
      title: "补齐 UNKNOWN 字段",
      why: data.nowBlockers?.find((b) => /UNKNOWN|缺失/.test(b)) ?? "关键数据缺口影响决策",
      evidence: data.nowBlockers?.filter((b) => /UNKNOWN|缺失/.test(b)).slice(0, 3) ?? ["数据缺口"],
      severity: "warn",
      cta: "查看 Now",
      target: { kind: "now" },
      focusStageId: data.stages.find((s) => s.state === "active")?.id ?? null,
    });
  }

  const lastPast = data.past[data.past.length - 1];
  if (lastPast) {
    actions.push({
      id: `cdss-past-${lastPast.id}`,
      title: `回顾「${lastPast.label}」`,
      why: "最近完成/进行中事件，核对证据后再定案",
      evidence: lastPast.evidence?.slice(0, 2) ?? [lastPast.result ?? "已归档"],
      severity: "warn",
      cta: "定位 Past",
      target: { kind: "past", id: lastPast.id },
      focusStageId: lastPast.stageId,
    });
  }

  actions.push({
    id: "cdss-future-b",
    title: "对照情景 B 再议转化",
    why: "研究推演 · 不可直激；用于 MDT 对照讨论",
    evidence: ["情景 B", "研究推演", `90 天负担 · ${data.candidates.find((c) => c.id === "B")?.burden90 ?? "—"}`],
    severity: "info",
    cta: "仅查看推演",
    target: { kind: "future", candidateId: "B", nodeId: "b1" },
    focusStageId: null,
  });

  return actions.slice(0, 4);
}

export function stageIdFromClinicalName(name: string | null | undefined): string | null {
  if (!name) return null;
  return STAGE_TO_ID[name] ?? null;
}

export function clinicalNameFromStageId(id: string | null | undefined): string | null {
  if (!id) return null;
  const idx = Number(id.replace(/^s/, "")) - 1;
  return CLINICAL_STAGES[idx] ?? null;
}
