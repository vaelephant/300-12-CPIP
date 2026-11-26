import type { Patient, PathwayInstance, Task, TaskStatus } from "@/types";
import { TASKS, addHours, getInstance, getInstanceByPatient } from "@/data";
import { useRuntimeStore } from "@/stores/runtime-store";
import { cn } from "@/lib/utils";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import type { Tone } from "@/lib/clinical";

/** 与数据层 stage 字段保持一致的五个临床阶段。 */
export const CLINICAL_STAGES = ["术前评估", "术前检查", "治疗方案确认", "手术及术后", "出院与随访"] as const;
export type ClinicalStage = (typeof CLINICAL_STAGES)[number];

export type StageState = "DONE" | "ACTIVE" | "PENDING";

const TERMINAL: TaskStatus[] = ["COMPLETED", "SKIPPED", "CANCELLED"];

export const STAGE_STATE_META: Record<StageState, { label: string; tone: Tone }> = {
  DONE: { label: "已完成", tone: "ok" },
  ACTIVE: { label: "执行中", tone: "warn" },
  PENDING: { label: "待执行", tone: "neutral" },
};

/** 患者关联的路径实例：优先按患者检索，其次使用患者记录上的 instanceId。 */
export function getPatientInstance(patient: Patient): PathwayInstance | undefined {
  return getInstanceByPatient(patient.id) ?? (patient.instanceId ? getInstance(patient.instanceId) : undefined);
}

export function isTerminalTask(status: TaskStatus) {
  return TERMINAL.includes(status);
}

export function deriveStageStates(tasks: Task[]): Record<string, StageState> {
  const map: Record<string, StageState> = {};
  CLINICAL_STAGES.forEach((stage) => {
    const list = tasks.filter((t) => t.stage === stage);
    if (!list.length) {
      map[stage] = "PENDING";
      return;
    }
    if (list.every((t) => isTerminalTask(t.status))) map[stage] = "DONE";
    else if (list.some((t) => t.status === "IN_PROGRESS" || t.status === "COMPLETED")) map[stage] = "ACTIVE";
    else map[stage] = "PENDING";
  });
  return map;
}

/** 非演示患者的合成推演任务：按患者住院进度推导各阶段任务状态（仅用于界面展示）。 */
export function deriveDisplayTasks(patient: Patient): Task[] {
  const thresholds = [20, 45, 70, 90, 100];
  const instanceId = patient.instanceId ?? `INST-DERIVED-${patient.id}`;
  const out: Task[] = [];
  CLINICAL_STAGES.forEach((stage, si) => {
    const templates = TASKS.filter((t) => t.stage === stage).slice(0, 3);
    const stageStart = si === 0 ? 0 : thresholds[si - 1];
    const stageEnd = thresholds[si];
    const phase = patient.progress >= stageEnd ? "DONE" : patient.progress > stageStart ? "PARTIAL" : "BEFORE";
    templates.forEach((tpl, ti) => {
      const status: TaskStatus =
        phase === "DONE"
          ? "COMPLETED"
          : phase === "PARTIAL"
            ? ti === 0
              ? "COMPLETED"
              : ti === 1
                ? "IN_PROGRESS"
                : "PENDING"
            : ti === 0 && patient.progress === stageStart
              ? "READY"
              : "PENDING";
      const earliestStartAt = addHours(patient.admissionAt, si * 24 + ti * 4 + 2);
      const dueAt = addHours(earliestStartAt, 8);
      out.push({
        ...tpl,
        id: `SYN-${patient.id}-${si}-${ti}`,
        instanceId,
        planId: undefined,
        stage,
        status,
        assignee: tpl.role === "NURSE" ? patient.nurse : patient.attending,
        earliestStartAt,
        dueAt,
        startedAt: status === "COMPLETED" || status === "IN_PROGRESS" ? earliestStartAt : undefined,
        completedAt: status === "COMPLETED" ? addHours(earliestStartAt, 2) : undefined,
        overdue: false,
        summary: `${patient.name} · ${patient.diagnosis} · 合成推演任务`,
      });
    });
  });
  return out;
}

/**
 * 读取患者任务：优先使用运行时 store 中该实例的真实任务；
 * 若实例没有任务（或患者无实例），回退为按进度推导的展示任务。
 */
export function usePatientTasks(patient: Patient): {
  tasks: Task[];
  derived: boolean;
  instance?: PathwayInstance;
} {
  const all = useRuntimeStore((s) => s.tasks);
  const instance = getPatientInstance(patient);
  const real = instance ? all.filter((t) => t.instanceId === instance.id) : [];
  if (real.length) return { tasks: real, derived: false, instance };
  return { tasks: deriveDisplayTasks(patient), derived: true, instance };
}

export function stageCounts(tasks: Task[], stage: string) {
  const list = tasks.filter((t) => t.stage === stage);
  return {
    total: list.length,
    done: list.filter((t) => t.status === "COMPLETED").length,
    running: list.filter((t) => t.status === "IN_PROGRESS").length,
    overdue: list.filter((t) => t.overdue && !isTerminalTask(t.status)).length,
  };
}

/* ------------------------------ 阶段进度条 ------------------------------ */

export function StageProgressStrip({
  tasks,
  progress,
  className,
}: {
  tasks: Task[];
  progress: number;
  className?: string;
}) {
  const states = deriveStageStates(tasks);
  return (
    <div className={cn("flex items-stretch overflow-x-auto pb-0.5 scrollbar-slim", className)}>
      {CLINICAL_STAGES.map((stage, i) => {
        const state = states[stage];
        const counts = stageCounts(tasks, stage);
        const meta = STAGE_STATE_META[state];
        return (
          <div key={stage} className="flex min-w-0 flex-1 items-stretch">
            <div
              className={cn(
                "min-w-[132px] flex-1 rounded-md border px-2.5 py-2",
                state === "DONE" && "border-ok/20 bg-ok-wash/40",
                state === "ACTIVE" && "border-warn/30 bg-warn-wash/40",
                state === "PENDING" && "border-line bg-card",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold",
                    state === "DONE" && "border-ok/30 bg-ok text-white",
                    state === "ACTIVE" && "border-warn/40 bg-warn-wash text-warn",
                    state === "PENDING" && "border-line-strong bg-secondary text-muted-foreground",
                  )}
                >
                  {state === "DONE" ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : state === "ACTIVE" ? (
                    <Loader2 className="size-2.5 animate-spin" />
                  ) : (
                    <CircleDashed className="size-2.5" />
                  )}
                </span>
                <span className="truncate text-[11.5px] font-medium">{stage}</span>
                <span className="ml-auto font-mono text-[9.5px] text-muted-foreground tabular">
                  {counts.done}/{counts.total}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[10px] text-muted-foreground">{meta.label}</span>
                {counts.overdue > 0 && (
                  <span className="rounded-[3px] bg-risk-wash px-1 font-mono text-[9px] text-risk">
                    超时 {counts.overdue}
                  </span>
                )}
              </div>
            </div>
            {i < CLINICAL_STAGES.length - 1 && (
              <div className="flex w-4 shrink-0 items-center px-0.5" aria-hidden>
                <span className={cn("h-px w-full", state === "DONE" ? "bg-ok/45" : "bg-line-strong/70")} />
              </div>
            )}
          </div>
        );
      })}
      <span className="sr-only">路径整体进度 {progress}%</span>
    </div>
  );
}

/** 阶段状态徽标（供详情/执行页复用）。 */
export function StageStateBadge({ state }: { state: StageState }) {
  const meta = STAGE_STATE_META[state];
  return (
    <StatusBadge tone={meta.tone} pulse={state === "ACTIVE"}>
      {meta.label}
    </StatusBadge>
  );
}
