import { MarkerType, type NodeTypes } from "@xyflow/react";
import { NODE_META } from "@/lib/clinical";
import type { PathwayEdge } from "@/types";
import { PathwayNodeCard } from "@/components/pathway/node-card";
import { nodeRfId, type StudioEdge, type StudioNode } from "@/components/pathway/types";

export const nodeTypes = { clinical: PathwayNodeCard } satisfies NodeTypes;

const EDGE_STROKE: Record<PathwayEdge["type"], string> = {
  SEQUENCE: "var(--line-strong)",
  CONDITIONAL: "var(--warn)",
  PARALLEL: "var(--info)",
};

/** fixture 窄卡片坐标 → 临床节点卡片布局放大（仅视觉） */
export const NODE_LAYOUT_SCALE = 1.55;
export const INITIAL_VIEWPORT = { x: 0, y: 8, zoom: 0.7 };

export function styleEdge(edge: PathwayEdge): StudioEdge {
  const conditional = edge.type === "CONDITIONAL";
  const stroke = EDGE_STROKE[edge.type];
  return {
    id: edge.id,
    source: nodeRfId(edge.source),
    target: nodeRfId(edge.target),
    type: "smoothstep",
    data: { edge },
    label: conditional ? (edge.isDefault ? "默认分支" : "条件分支") : undefined,
    labelStyle: { fill: "var(--muted-foreground)", fontSize: 9.5, fontFamily: "var(--font-mono)" },
    labelBgStyle: { fill: "var(--card)", fillOpacity: 1 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 2,
    style: {
      stroke,
      strokeWidth: conditional ? 1.3 : 1.6,
      strokeDasharray: conditional ? "5 3" : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: stroke },
  };
}

export function minimapColor(node: StudioNode): string {
  const group = NODE_META[node.data.node.type].group;
  switch (group) {
    case "TREATMENT":
      return "var(--primary)";
    case "DIAGNOSTIC":
      return "var(--info)";
    case "NURSING":
    case "DECISION":
      return "var(--warn)";
    case "ENTRY":
    case "END":
      return "var(--ink-3)";
    default:
      return "var(--line-strong)";
  }
}
