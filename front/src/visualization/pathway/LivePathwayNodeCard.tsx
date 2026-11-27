import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2, CircleDashed, HelpCircle, Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
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
    dotClass: "bg-ink",
    chipClass: "border-line bg-surface-muted text-ink",
  },
  active: {
    label: "执行中",
    description: "当前正在执行的任务节点",
    dotClass: "bg-ink",
    chipClass: "border-ink bg-ink text-surface",
  },
  variant: {
    label: "变异",
    description: "发生变异或受变异影响，需人工关注",
    dotClass: "bg-risk",
    chipClass: "border-risk/30 bg-risk-wash text-risk",
  },
  blocked: {
    label: "阻塞",
    description: "存在阻断性条件，任务不可继续",
    dotClass: "bg-risk",
    chipClass: "border-risk/30 bg-risk-wash text-risk",
  },
  pending: {
    label: "待执行",
    description: "尚未开始执行",
    dotClass: "bg-muted-foreground/45",
    chipClass: "border-line bg-surface text-muted-foreground",
  },
  unknown: {
    label: "UNKNOWN",
    description: "条件数据缺失或规则未知；下游禁止执行，等待补充",
    dotClass: "bg-warn",
    chipClass: "border-warn/35 bg-warn-wash text-warn",
  },
  not_selected: {
    label: "未选分支",
    description: "条件分支未选中；不生成可执行任务",
    dotClass: "bg-muted-foreground/30",
    chipClass: "border-dashed border-line bg-surface-muted text-muted-foreground",
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

/** V2：默认面只展示名称 + 状态 + 必要异常；角色/时限/证据/ID 进检查器 */
const STATE_SURFACE: Record<PathwayNodeVisualState, string> = {
  completed: "border-line bg-surface",
  active: "border-ink border-2 bg-surface",
  variant: "border-risk bg-surface",
  blocked: "border-risk bg-surface",
  pending: "border-line bg-surface",
  unknown: "border-dashed border-warn bg-surface",
  not_selected: "border-dashed border-line bg-surface-muted/80 opacity-75",
};

function StateGlyph({ state }: { state: PathwayNodeVisualState }) {
  if (state === "completed") return <CheckCircle2 className="size-3.5 shrink-0 text-ink" aria-hidden />;
  if (state === "active") {
    return (
      <span className="relative flex size-3.5 shrink-0 items-center justify-center" aria-hidden>
        <span className="size-2 rounded-full bg-ink" />
      </span>
    );
  }
  if (state === "variant" || state === "blocked") {
    return state === "blocked" ? (
      <Lock className="size-3.5 shrink-0 text-risk" aria-hidden />
    ) : (
      <TriangleAlert className="size-3.5 shrink-0 text-risk" aria-hidden />
    );
  }
  if (state === "unknown") return <HelpCircle className="size-3.5 shrink-0 text-warn" aria-hidden />;
  if (state === "not_selected") return <CircleDashed className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
  return <span className="size-2 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />;
}

function LivePathwayNodeCardImpl({ data }: NodeProps<LivePathwayNode>) {
  const { node, state, selected } = data;
  const stateMeta = PATHWAY_STATE_META[state];
  const isRisk = state === "variant" || state === "blocked";

  return (
    <div
      className={cn(
        "relative w-[168px] rounded-md border bg-surface px-3 py-2.5 transition-[box-shadow,border-color] duration-150",
        STATE_SURFACE[state],
        selected && "ring-2 ring-ink/25",
        selected && state !== "active" && "border-ink",
      )}
      aria-label={`${node.name} · ${stateMeta.label}${node.required ? " · 必做" : ""}`}
    >
      {isRisk && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-risk" aria-hidden />}

      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />

      <div className="flex items-start gap-2">
        <StateGlyph state={state} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-[18px] font-medium text-ink">{node.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-[14px] font-medium",
                "border",
                stateMeta.chipClass,
              )}
            >
              {stateMeta.label}
            </span>
            {node.required && (
              <span
                className="inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] leading-[14px] text-muted-foreground"
                title="必做节点"
              >
                必做
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const LivePathwayNodeCard = memo(LivePathwayNodeCardImpl);
