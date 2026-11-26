import { useMemo, useState } from "react";
import { CalendarClock, List, Rows3 } from "lucide-react";
import type { ClinicalEvent } from "@/types";
import { cn, fmtDate, fmtTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";

const LANES: { key: string; label: string; types: ClinicalEvent["eventType"][] }[] = [
  { key: "assess", label: "评估", types: ["PatientCreated", "PatientStateUpdated", "PathwayEnrolled"] },
  { key: "exam", label: "检验检查", types: ["ObservationReceived"] },
  { key: "treatment", label: "治疗执行", types: ["PlanApproved", "PlanActivated", "TaskStarted", "TaskCompleted", "TaskOverdue"] },
  { key: "variation", label: "变异/重评", types: ["VariationDetected", "ReplanRequested"] },
  { key: "outcome", label: "随访/结局", types: ["PathwayCompleted", "PathwayExited"] },
];

const SEVERITY_DOT: Record<ClinicalEvent["severity"], string> = {
  INFO: "bg-info",
  WARN: "bg-warn",
  RISK: "bg-risk",
};

function laneOf(event: ClinicalEvent) {
  return LANES.find((lane) => lane.types.includes(event.eventType))?.key ?? "assess";
}

/** True-time lane timeline. Missing recorded time is shown as missing, never invented. */
export function PatientTimeline({ events, className }: { events: ClinicalEvent[]; className?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [rangeDays, setRangeDays] = useState<0 | 1 | 7>(0);
  const sorted = useMemo(() => [...events].sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt)), [events]);
  const visible = useMemo(() => {
    if (!rangeDays || !sorted.length) return sorted;
    const end = +new Date(sorted[sorted.length - 1].occurredAt);
    return sorted.filter((event) => +new Date(event.occurredAt) >= end - rangeDays * 24 * 60 * 60 * 1000);
  }, [rangeDays, sorted]);
  const range = useMemo(() => {
    if (!visible.length) return { start: 0, end: 1, ticks: [] as { at: number; label: string }[] };
    const start = +new Date(visible[0].occurredAt);
    const end = +new Date(visible[visible.length - 1].occurredAt);
    const span = Math.max(end - start, 6 * 60 * 60 * 1000);
    return {
      start,
      end: start + span,
      ticks: Array.from({ length: 5 }, (_, i) => {
        const at = start + (span * i) / 4;
        return { at, label: `${fmtDate(new Date(at).toISOString())} ${fmtTime(new Date(at).toISOString())}` };
      }),
    };
  }, [visible]);
  const active = visible.find((event) => event.id === selected) ?? null;

  if (!events.length) return <EmptyState title="暂无临床事件" description="该患者暂无时间轴事件。" icon={<CalendarClock />} />;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          按事件时间排列 · {visible.length}/{sorted.length} 个事件 · 当前时点以最新事件为界，不补造缺失时间
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md border border-line bg-secondary/40 p-0.5">
            {[{ label: "全部", value: 0 }, { label: "近 7 天", value: 7 }, { label: "近 24h", value: 1 }].map((option) => (
              <Button
                key={option.label}
                size="xs"
                variant={rangeDays === option.value ? "secondary" : "ghost"}
                onClick={() => { setRangeDays(option.value as 0 | 1 | 7); setSelected(null); }}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-line bg-secondary/40 p-0.5">
          <Button size="xs" variant={view === "timeline" ? "secondary" : "ghost"} onClick={() => setView("timeline")}>
            <Rows3 className="size-3" /> 时间轴
          </Button>
          <Button size="xs" variant={view === "table" ? "secondary" : "ghost"} onClick={() => setView("table")}>
            <List className="size-3" /> 表格
          </Button>
          </div>
        </div>
      </div>

      {view === "timeline" ? (
        <div className="overflow-x-auto scrollbar-slim rounded-md border border-line bg-card">
          <div className="min-w-[760px] p-4">
            <div className="relative ml-[92px] h-7 border-b border-line" aria-hidden>
              {range.ticks.map((tick, i) => (
                <div
                  key={tick.at}
                  className={cn(
                    "absolute top-0",
                    i === 0 ? "left-0" : i === 4 ? "right-0" : "-translate-x-1/2",
                  )}
                  style={i === 4 ? undefined : { left: `${(i / 4) * 100}%` }}
                >
                  <span className={cn("block font-mono text-[9px] whitespace-nowrap text-muted-foreground", i === 4 && "text-right")}>{tick.label}</span>
                  <span className="absolute top-[22px] left-1/2 h-2 w-px bg-line" />
                </div>
              ))}
              <div className="absolute top-0 right-0 h-full w-px bg-brand/60" title="最新事件时点" aria-label="最新事件时点" />
            </div>
            {LANES.map((lane) => {
              const laneEvents = visible.filter((event) => laneOf(event) === lane.key);
              return (
                <div key={lane.key} className="flex border-b border-line/70 py-2 last:border-0">
                  <div className="w-[76px] shrink-0 pt-1 text-[10px] font-medium text-muted-foreground">{lane.label}</div>
                  <div className="relative h-10 flex-1">
                    <div className="absolute top-1/2 right-0 left-0 h-px bg-line/70" aria-hidden />
                    {laneEvents.length === 0 ? (
                      <span className="absolute top-1/2 left-0 -translate-y-1/2 text-[9px] text-muted-foreground/50">无事件</span>
                    ) : (
                      laneEvents.map((event, index) => {
                        const x = ((+new Date(event.occurredAt) - range.start) / (range.end - range.start)) * 100;
                        const isActive = selected === event.id;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelected(isActive ? null : event.id)}
                            className={cn(
                              "absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-card p-1 shadow-card transition-transform hover:scale-110",
                              isActive ? "border-primary ring-2 ring-primary/20" : "border-line",
                              index % 2 === 1 && "mt-2.5",
                            )}
                            style={{ left: `${Math.max(2, Math.min(98, x))}%` }}
                            title={`${event.title} · ${fmtDate(event.occurredAt, true)}`}
                            aria-label={`${event.title}，${fmtDate(event.occurredAt, true)}`}
                          >
                            <span className={cn("block size-2 rounded-full", SEVERITY_DOT[event.severity])} />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="border-b border-line bg-secondary/40 text-[10px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">事件时间</th>
                <th className="px-3 py-2 font-medium">录入时间</th>
                <th className="px-3 py-2 font-medium">泳道</th>
                <th className="px-3 py-2 font-medium">事件</th>
                <th className="px-3 py-2 font-medium">来源 / 操作人</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => (
                <tr key={event.id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2 font-mono text-[10px]">{fmtDate(event.occurredAt, true)}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{event.recordedAt ? fmtDate(event.recordedAt, true) : "未提供"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{LANES.find((lane) => lane.key === laneOf(event))?.label}</td>
                  <td className="px-3 py-2">{event.title}</td>
                  <td className="px-3 py-2 font-mono text-[9.5px] text-muted-foreground">{event.sourceSystem} · {event.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active ? (
        <div className="rounded-md border border-line bg-secondary/30 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={active.severity === "RISK" ? "risk" : active.severity === "WARN" ? "warn" : "neutral"} dot={false}>
              {active.severity === "RISK" ? "风险" : active.severity === "WARN" ? "提示" : "信息"}
            </StatusBadge>
            <span className="text-[12px] font-medium">{active.title}</span>
            <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">{fmtDate(active.occurredAt, true)}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{active.description}</p>
          <p className="mt-1.5 font-mono text-[9px] text-muted-foreground/80">
            来源 {active.sourceSystem} · 操作人 {active.actor} · 事件时间 {fmtDate(active.occurredAt, true)}
            {active.recordedAt ? ` · 录入时间 ${fmtDate(active.recordedAt, true)}` : " · 录入时间未提供"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
