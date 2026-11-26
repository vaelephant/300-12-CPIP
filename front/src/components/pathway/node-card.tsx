import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, CircleAlert, Clock3, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_META, ROLE_LABELS } from "@/lib/clinical";
import type { TimeConstraint } from "@/types";
import type { StudioNode } from "./types";

const ANCHOR_LABELS: Record<TimeConstraint["anchor"], string> = {
  ENROLLMENT: "入径后",
  PREVIOUS_NODE: "前序节点后",
  ADMISSION: "入院后",
};

/** 将时间约束格式化为画布上的短标签，例如「入径后 24h」「入径后 96h ±24h」。 */
export function formatTimeConstraint(tc?: TimeConstraint): string | null {
  if (!tc) return null;
  const base = `${ANCHOR_LABELS[tc.anchor]} ${tc.offsetHours}h`;
  if (tc.windowBeforeHours || tc.windowAfterHours) {
    return `${base} ±${tc.windowAfterHours ?? tc.windowBeforeHours ?? 0}h`;
  }
  return base;
}

const HANDLE_STYLE = {
  width: 8,
  height: 8,
  background: "var(--line-strong)",
  border: "2px solid var(--card)",
} as const;

function PathwayNodeCardImpl({ data, selected }: NodeProps<StudioNode>) {
  const { node, issues } = data;
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const hasError = issues.some((i) => i.level === "ERROR");
  const hasWarning = !hasError && issues.some((i) => i.level === "WARNING");
  const timeLabel = formatTimeConstraint(node.timeConstraint);

  return (
    <div
      className={cn(
        "group relative w-[218px] rounded-lg border bg-card shadow-card transition-[border-color,box-shadow] duration-150",
        selected ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-line-strong",
        hasError && !selected && "border-risk/45",
      )}
    >
      <span className={cn("absolute inset-y-2 left-0 w-[2px] rounded-full", meta.bar)} aria-hidden />

      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />

      <div className="flex items-start gap-2 px-3 pt-2.5">
        <span className={cn("mt-px flex size-6 shrink-0 items-center justify-center rounded-[5px]", meta.chip)}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="label-micro truncate">{meta.label}</span>
            {node.required && (
              <span className="size-1.5 shrink-0 rounded-full bg-risk" title="必做节点：患者计划中不可跳过" />
            )}
            {hasError && (
              <span className="ml-auto inline-flex items-center gap-0.5 rounded-[3px] bg-risk-wash px-1 py-px text-[8.5px] font-medium text-risk">
                <CircleAlert className="size-2.5" />
                错误
              </span>
            )}
            {hasWarning && (
              <span className="ml-auto inline-flex items-center gap-0.5 rounded-[3px] bg-warn-wash px-1 py-px text-[8.5px] font-medium text-warn">
                <AlertTriangle className="size-2.5" />
                警告
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.35] font-medium text-foreground">{node.name}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 px-3">
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1 py-px text-[9.5px] text-muted-foreground">
          <UserRound className="size-2.5" />
          {ROLE_LABELS[node.responsibleRole]}
        </span>
        {timeLabel && (
          <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1 py-px font-mono text-[9.5px] text-foreground/70">
            <Clock3 className="size-2.5 text-muted-foreground" />
            {timeLabel}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/80 px-3 py-1.5">
        <span className="truncate font-mono text-[9.5px] text-muted-foreground">{node.nodeKey}</span>
        <span className="shrink-0 truncate text-[9.5px] text-muted-foreground/70">{node.stage}</span>
      </div>
    </div>
  );
}

export const PathwayNodeCard = memo(PathwayNodeCardImpl);
