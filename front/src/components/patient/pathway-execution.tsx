import { useMemo, useState } from "react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import {
  CLINICAL_STAGES,
  deriveStageStates,
  isTerminalTask,
  stageCounts,
  type ClinicalStage,
} from "@/components/patient/stages";

/**
 * 路径执行面板 · B Segments + F Swimlane
 * 上：阶段分段条 · 下：阶段泳道甘特 · 点选联动
 */

type LaneStatus = "done" | "active" | "pending" | "overdue";

type LaneRow = {
  id: string;
  name: string;
  group: string;
  role?: string;
  start: number;
  end: number;
  status: LaneStatus;
};

const STATUS_LABEL: Record<LaneStatus, string> = {
  done: "已完成",
  active: "执行中",
  pending: "待执行",
  overdue: "超时",
};

function taskStatus(task: Task): LaneStatus {
  if (task.overdue && !isTerminalTask(task.status)) return "overdue";
  if (task.status === "COMPLETED") return "done";
  if (task.status === "IN_PROGRESS" || task.status === "READY") return "active";
  return "pending";
}

function shortDay(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;
}

function toRows(tasks: Task[]): LaneRow[] {
  return tasks
    .filter((t) => CLINICAL_STAGES.includes(t.stage as ClinicalStage))
    .map((t) => ({
      id: t.id,
      name: t.name,
      group: t.stage,
      role: t.assignee,
      start: +new Date(t.earliestStartAt),
      end: +new Date(t.dueAt),
      status: taskStatus(t),
    }))
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end >= r.start);
}

function barClass(status: LaneStatus) {
  if (status === "overdue") return "bg-risk text-white";
  if (status === "done") return "bg-ink text-canvas";
  if (status === "active") return "bg-ink/55 text-canvas";
  return "bg-ink/20 text-ink";
}

export function PathwayExecutionPanel({
  tasks,
  progress,
  pathwayName,
  className,
  selectedStage,
  onSelectStage,
  selectedTaskId,
  onSelectTask,
}: {
  tasks: Task[];
  progress: number;
  pathwayName?: string;
  className?: string;
  selectedStage?: string;
  onSelectStage?: (stage: string) => void;
  selectedTaskId?: string;
  onSelectTask?: (id: string) => void;
}) {
  const states = deriveStageStates(tasks);
  const activeDefault = CLINICAL_STAGES.find((s) => states[s] === "ACTIVE") ?? "";
  const [localStage, setLocalStage] = useState(activeDefault);
  const stage = selectedStage ?? localStage;
  const setStage = (next: string) => {
    onSelectStage?.(next);
    if (selectedStage === undefined) setLocalStage(next);
  };

  const stages = CLINICAL_STAGES.map((name) => {
    const counts = stageCounts(tasks, name);
    const state = states[name];
    return {
      id: name,
      name,
      state: state === "DONE" ? "done" : state === "ACTIVE" ? "active" : "pending",
      done: counts.done,
      total: counts.total,
      overdue: counts.overdue,
    };
  }).filter((s) => s.total > 0 || tasks.some((t) => t.stage === s.name));

  const displayStages = stages.length
    ? stages
    : CLINICAL_STAGES.map((name) => ({
        id: name,
        name,
        state: "pending" as const,
        done: 0,
        total: 0,
        overdue: 0,
      }));

  const weight = displayStages.map((s) => Math.max(1, s.total));
  const sum = weight.reduce((a, b) => a + b, 0);

  const rows = useMemo(() => toRows(tasks), [tasks]);
  const nowTs = Date.now();

  const domain = useMemo(() => {
    const times = rows.flatMap((r) => [r.start, r.end]);
    times.push(nowTs);
    if (!times.length) {
      const n = Date.now();
      return { start: n - 86400000, end: n + 86400000 };
    }
    const min = Math.min(...times);
    const max = Math.max(...times);
    const pad = Math.max((max - min) * 0.04, 2 * 3600_000);
    return { start: min - pad, end: max + pad };
  }, [rows, nowTs]);

  const span = Math.max(domain.end - domain.start, 1);
  const pct = (ts: number) => ((ts - domain.start) / span) * 100;

  const ticks = useMemo(() => {
    const list: { ts: number; label: string }[] = [];
    const cursor = new Date(domain.start);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getTime() < domain.end) {
      list.push({ ts: cursor.getTime(), label: shortDay(cursor.getTime()) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [domain]);

  const tickStep = Math.max(1, Math.ceil(ticks.length / 6));

  const lanes = useMemo(() => {
    const map = new Map<string, LaneRow[]>();
    for (const stageName of CLINICAL_STAGES) {
      const items = rows.filter((r) => r.group === stageName);
      if (items.length) map.set(stageName, items);
    }
    return Array.from(map.entries());
  }, [rows]);

  const toggleStage = (name: string) => {
    setStage(stage === name ? "" : name);
  };

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      {/* B · Segments */}
      <div>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <p className="truncate text-[14px] font-medium tracking-[-0.02em] text-ink">
            {pathwayName ?? "临床路径"}
          </p>
          <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
            {progress}%
          </span>
        </div>

        <div
          className="mb-2 grid gap-1"
          style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
        >
          {displayStages.map((s) => {
            const focused = stage === s.name;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStage(s.name)}
                className="min-w-0 text-left"
              >
                <p
                  className={cn(
                    "truncate text-[11px]",
                    focused || s.state === "active" ? "font-semibold text-ink" : "font-medium",
                    s.state === "pending" && !focused && "text-muted-foreground",
                  )}
                >
                  {s.name}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex h-2 overflow-hidden rounded-full bg-secondary" role="list">
          {displayStages.map((s, i) => {
            const focused = stage === s.name;
            const fill =
              s.state === "done"
                ? "bg-ink"
                : s.state === "active"
                  ? "bg-ink/55"
                  : s.overdue
                    ? "bg-risk"
                    : "";
            return (
              <button
                key={s.id}
                type="button"
                role="listitem"
                onClick={() => toggleStage(s.name)}
                className={cn(
                  "relative h-full border-r border-line/40 last:border-0",
                  fill,
                  focused && "ring-1 ring-inset ring-ink",
                )}
                style={{ flex: weight[i] }}
                title={`${s.name} ${s.done}/${s.total}`}
              />
            );
          })}
        </div>

        <div
          className="mt-2 grid gap-1"
          style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
        >
          {displayStages.map((s) => (
            <p key={s.id} className="truncate font-mono text-[10px] tabular-nums text-muted-foreground">
              {s.done}/{s.total}
              {s.overdue > 0 ? <span className="text-risk"> ·超时</span> : null}
            </p>
          ))}
        </div>
      </div>

      {/* F · Swimlane（阶段泳道 · 原版） */}
      {rows.length > 0 ? (
        <div className="min-w-0 overflow-hidden rounded-lg border border-line">
          <div className="flex h-7 border-b border-line bg-secondary/40">
            <div className="flex w-[112px] shrink-0 items-center border-r border-line px-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              阶段
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              {ticks.map((t, i) =>
                i % tickStep === 0 ? (
                  <span
                    key={t.ts}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted-foreground"
                    style={{ left: `${pct(t.ts)}%` }}
                  >
                    {t.label}
                  </span>
                ) : null,
              )}
            </div>
          </div>

          {lanes.map(([group, items]) => {
            const focused = !stage || stage === group;
            const laneH = Math.max(56, 20 + items.length * 14);
            return (
              <div
                key={group}
                className={cn(
                  "flex border-t border-line transition-opacity",
                  focused ? "opacity-100" : "opacity-30",
                  stage === group && "bg-secondary/35 shadow-[inset_2px_0_0_var(--ink)]",
                )}
                style={{ minHeight: laneH }}
              >
                <button
                  type="button"
                  className="flex w-[112px] shrink-0 items-start border-r border-line px-3 pt-3 text-left"
                  onClick={() => toggleStage(group)}
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-[12px]",
                        stage === group ? "font-semibold text-ink" : "font-medium text-ink",
                      )}
                    >
                      {group}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {items.filter((i) => i.status === "done").length}/{items.length}
                    </p>
                  </div>
                </button>
                <div className="relative min-w-0 flex-1 overflow-hidden py-2">
                  {ticks.map((t) => (
                    <span
                      key={t.ts}
                      className="absolute top-0 bottom-0 border-l border-dashed border-line/70"
                      style={{ left: `${pct(t.ts)}%` }}
                    />
                  ))}
                  {nowTs > domain.start && nowTs < domain.end && (
                    <span
                      className="absolute top-0 bottom-0 w-px bg-risk/70"
                      style={{ left: `${pct(nowTs)}%` }}
                    />
                  )}
                  {items.map((row, idx) => {
                    const left = pct(row.start);
                    const width = Math.max(pct(row.end) - left, 1.2);
                    const selected = selectedTaskId === row.id;
                    const top = 6 + idx * 14;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        title={`${row.name} · ${STATUS_LABEL[row.status]}`}
                        onClick={() => onSelectTask?.(row.id)}
                        className={cn(
                          "absolute h-3 truncate rounded-[3px] px-1.5 text-left text-[9px] leading-3",
                          barClass(row.status),
                          row.status === "pending" && "opacity-55",
                          selected && "outline outline-1 outline-offset-1 outline-ink",
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          minWidth: 28,
                          top,
                          pointerEvents: focused ? "auto" : "none",
                        }}
                      >
                        {row.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-secondary/30 px-3 py-1.5 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-[1px] bg-ink" /> 任务
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-[1px] bg-risk" /> 超时
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-px bg-risk/70" /> 现在
            </span>
            <span className="ml-auto">点分段条聚焦泳道</span>
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-[13px] text-muted-foreground">暂无任务时间窗</p>
      )}
    </div>
  );
}
