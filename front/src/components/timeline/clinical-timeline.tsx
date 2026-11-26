import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  FlaskConical,
  GitBranch,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ClinicalEvent, TaskEvent } from "@/types";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/section";

const EVENT_ICON: Record<ClinicalEvent["eventType"], LucideIcon> = {
  PatientCreated: UserPlus,
  PathwayEnrolled: GitBranch,
  PlanApproved: ShieldCheck,
  PlanActivated: Play,
  TaskStarted: Play,
  TaskCompleted: CheckCircle2,
  TaskOverdue: Timer,
  ObservationReceived: FlaskConical,
  PatientStateUpdated: RefreshCw,
  VariationDetected: AlertTriangle,
  ReplanRequested: Sparkles,
  PathwayCompleted: ClipboardCheck,
  PathwayExited: LogOut,
};

const SEVERITY_META = {
  INFO: { tone: "neutral" as const, icon: "text-muted-foreground", ring: "border-line bg-secondary/60" },
  WARN: { tone: "warn" as const, icon: "text-warn", ring: "border-warn/30 bg-warn-wash" },
  RISK: { tone: "risk" as const, icon: "text-risk", ring: "border-risk/25 bg-risk-wash" },
};

export function ClinicalTimeline({
  events,
  emptyText = "该患者暂无临床事件记录",
  className,
}: {
  events: ClinicalEvent[];
  emptyText?: string;
  className?: string;
}) {
  if (!events.length) {
    return <EmptyState title="暂无临床事件" description={emptyText} icon={<CircleDot />} />;
  }
  return (
    <ol className={cn("relative", className)}>
      {events.map((e, i) => {
        const Icon = EVENT_ICON[e.eventType] ?? CircleDot;
        const meta = SEVERITY_META[e.severity];
        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="relative flex w-8 shrink-0 justify-center">
              {i !== events.length - 1 && <span className="absolute top-[30px] bottom-0 w-px bg-line" aria-hidden />}
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex size-7 items-center justify-center rounded-full border",
                  meta.ring,
                  meta.icon,
                )}
              >
                <Icon className="size-3.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5 pb-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[12.5px] font-medium text-foreground/90">{e.title}</span>
                {e.severity !== "INFO" && (
                  <StatusBadge tone={meta.tone} dot={false}>
                    {e.severity === "WARN" ? "提示" : "风险"}
                  </StatusBadge>
                )}
                <span className="ml-auto shrink-0 font-mono text-[9.5px] text-muted-foreground tabular">
                  {fmtDate(e.occurredAt)} {fmtTime(e.occurredAt)} · {relTime(e.occurredAt)}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{e.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] text-muted-foreground/75">
                <span className="rounded-[3px] border border-line bg-secondary/50 px-1.5 py-px">{e.sourceSystem}</span>
                <span>操作人 {e.actor}</span>
                <span className="text-muted-foreground/50">{e.eventType}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** 右侧栏使用的紧凑事件流（临床事件 / 任务事件）。 */
export function EventFeed({
  events,
  limit = 6,
  emptyText = "暂无事件",
}: {
  events: ClinicalEvent[];
  limit?: number;
  emptyText?: string;
}) {
  const rows = events.slice(0, limit);
  if (!rows.length) return <p className="py-3 text-center text-[11px] text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((e) => {
        const meta = SEVERITY_META[e.severity];
        const Icon = EVENT_ICON[e.eventType] ?? CircleDot;
        return (
          <li key={e.id} className="flex items-start gap-2">
            <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", meta.ring, meta.icon)}>
              <Icon className="size-2.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11.5px] font-medium text-foreground/85">{e.title}</span>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{relTime(e.occurredAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">{e.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 运行时任务事件流（本次会话内由任务操作产生）。 */
export function TaskEventFeed({ events, taskNames, limit = 4 }: { events: TaskEvent[]; taskNames: Record<string, string>; limit?: number }) {
  if (!events.length) {
    return <p className="py-2 text-[10.5px] leading-relaxed text-muted-foreground">本次会话暂无任务操作事件；执行「开始 / 完成 / 取消 / 跳过」后将在此实时记录。</p>;
  }
  const TYPE_LABEL: Record<TaskEvent["type"], string> = {
    CREATED: "创建",
    STARTED: "开始",
    COMPLETED: "完成",
    OVERDUE: "超时",
    CANCELLED: "取消",
    SKIPPED: "跳过",
  };
  return (
    <ul className="space-y-1.5">
      {events.slice(0, limit).map((e) => (
        <li key={e.id} className="flex items-start gap-2 text-[10.5px] leading-relaxed">
          <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-foreground/80">{TYPE_LABEL[e.type]}</span>
            <span className="text-muted-foreground"> · {taskNames[e.taskId] ?? e.taskId}</span>
            <span className="text-muted-foreground/70"> · {e.actor} · {relTime(e.at)}</span>
            {e.note && <p className="truncate text-muted-foreground/70">{e.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
