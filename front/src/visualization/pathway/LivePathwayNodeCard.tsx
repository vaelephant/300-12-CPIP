import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Clock3, FileText, Lock, TriangleAlert, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_META, ROLE_LABELS } from "@/lib/clinical";
import type { PathwayNode, TimeConstraint } from "@/types";
import type { PathwayNodeVisualState } from "@/visualization/core/types";

/** 动态路径图节点数据（只读视图，不参与编辑） */
export type LiveNodeData = {
  node: PathwayNode;
  state: PathwayNodeVisualState;
  showEvidence: boolean;
  selected: boolean;
};

export type LivePathwayNode = Node<LiveNodeData, "clinical">;

export interface PathwayStateMeta {
  label: string;
  description: string;
  dotClass: string;
  chipClass: string;
}

export const PATHWAY_STATE_META: Record<PathwayNodeVisualState, PathwayStateMeta> = {
  completed: {
    label: "已完成",
    description: "节点已完成并归档",
    dotClass: "bg-primary",
    chipClass: "border-primary/20 bg-accent text-primary",
  },
  active: {
    label: "执行中",
    description: "当前正在执行的任务节点",
    dotClass: "bg-warn",
    chipClass: "border-warn/25 bg-warn-wash text-warn",
  },
  variant: {
    label: "变异",
    description: "发生变异或受变异影响，需人工关注",
    dotClass: "bg-risk",
    chipClass: "border-risk/20 bg-risk-wash text-risk",
  },
  blocked: {
    label: "阻塞",
    description: "存在阻断性条件，任务不可继续",
    dotClass: "bg-risk",
    chipClass: "border-risk/25 bg-risk-wash text-risk",
  },
  pending: {
    label: "待执行",
    description: "尚未开始执行",
    dotClass: "bg-muted-foreground/40",
    chipClass: "border-line bg-secondary text-muted-foreground",
  },
};

const ANCHOR_LABELS: Record<TimeConstraint["anchor"], string> = {
  ENROLLMENT: "入径后",
  PREVIOUS_NODE: "前序节点后",
  ADMISSION: "入院后",
};

export function formatConstraint(tc?: TimeConstraint): string | null {
  if (!tc) return null;
  const base = `${ANCHOR_LABELS[tc.anchor]} ${tc.offsetHours}h`;
  if (tc.windowBeforeHours || tc.windowAfterHours) {
    return `${base} ±${tc.windowAfterHours ?? tc.windowBeforeHours ?? 0}h`;
  }
  return base;
}

const HANDLE_STYLE = {
  width: 6,
  height: 6,
  opacity: 0,
  background: "transparent",
  border: "none",
  pointerEvents: "none",
} as const;

const STATE_SURFACE: Record<PathwayNodeVisualState, string> = {
  completed: "border-primary/35 bg-accent/55",
  active: "border-warn/55 bg-warn-wash/60 ring-2 ring-warn/15",
  variant: "border-dashed border-risk/55 bg-risk-wash/35",
  blocked: "border-risk/50 bg-risk-wash/30",
  pending: "border-line bg-card",
};

function LivePathwayNodeCardImpl({ data }: NodeProps<LivePathwayNode>) {
  const { node, state, showEvidence, selected } = data;
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const stateMeta = PATHWAY_STATE_META[state];
  const timeLabel = formatConstraint(node.timeConstraint);
  const evidenceCount = showEvidence ? (node.evidenceRefs?.length ?? 0) : 0;
  const isRisk = state === "variant" || state === "blocked";

  return (
    <div
      className={cn(
        "relative w-[200px] rounded-lg border shadow-card transition-shadow duration-150",
        STATE_SURFACE[state],
        selected && "shadow-pop ring-2 ring-primary/30",
      )}
    >
      {/* 变异/阻塞红色提示条 */}
      {isRisk && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-risk" aria-hidden />}

      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />

      <div className="flex items-start gap-2 px-2.5 pt-2">
        <span className={cn("mt-px flex size-6 shrink-0 items-center justify-center rounded-[5px]", meta.chip)}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="label-micro truncate">{meta.label}</span>
            {node.required && <span className="size-1.5 shrink-0 rounded-full bg-risk" title="必做节点" />}
            {state === "completed" && <CheckCircle2 className="ml-auto size-3 shrink-0 text-primary" />}
            {state === "active" && (
              <span className="relative ml-auto flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-warn/60" />
                <span className="relative inline-flex size-2 rounded-full bg-warn" />
              </span>
            )}
            {isRisk && <TriangleAlert className="ml-auto size-3 shrink-0 text-risk" />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.35] font-medium text-foreground">{node.name}</p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1 px-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-[3px] border px-1 py-px text-[9px] font-medium",
            stateMeta.chipClass,
          )}
        >
          <span className={cn("size-1 rounded-full", stateMeta.dotClass)} />
          {stateMeta.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-card/70 px-1 py-px text-[9px] text-muted-foreground">
          <UserRound className="size-2.5" />
          {ROLE_LABELS[node.responsibleRole]}
        </span>
        {timeLabel && (
          <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-card/70 px-1 py-px font-mono text-[9px] text-foreground/70">
            <Clock3 className="size-2.5 text-muted-foreground" />
            {timeLabel}
          </span>
        )}
        {evidenceCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-[3px] border border-info/20 bg-info-wash px-1 py-px font-mono text-[9px] text-info"
            title={`已绑定 ${evidenceCount} 条证据`}
          >
            <FileText className="size-2.5" />
            {evidenceCount}
          </span>
        )}
        {state === "blocked" && (
          <span className="inline-flex items-center gap-1 rounded-[3px] border border-risk/20 bg-risk-wash px-1 py-px text-[9px] text-risk">
            <Lock className="size-2.5" />
            阻塞
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-line/70 px-2.5 py-1">
        <span className="truncate font-mono text-[9px] text-muted-foreground">{node.nodeKey}</span>
        <span className="shrink-0 truncate text-[9px] text-muted-foreground/70">{node.stage}</span>
      </div>
    </div>
  );
}

export const LivePathwayNodeCard = memo(LivePathwayNodeCardImpl);
