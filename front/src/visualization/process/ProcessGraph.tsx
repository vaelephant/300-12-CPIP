// ---------------------------------------------------------------------------
// 临床流程挖掘 · 发现流程 React Flow 图
// 节点：活动 / 开始 / 结束 / 偏差；展示例数、平均等待、偏差率。
// 边：宽度反映流转例数；合规流转实线、偏差流转红色虚线。
// 数据为合成事件日志（100 例），不用于临床决策。
// ---------------------------------------------------------------------------
import { memo, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, CornerDownRight, Frame, LogOut, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProcessEdge, ProcessNode } from "@/visualization/core/types";

export type ProcessViewMode = "standard" | "actual" | "deviation";

export type ProcessSelection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

export interface ProcessGraphProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  mode: ProcessViewMode;
  selection: ProcessSelection;
  onSelect: (selection: ProcessSelection) => void;
}

/* -------------------------------- 节点类型 -------------------------------- */

interface ProcessNodeData extends Record<string, unknown> {
  node: ProcessNode;
  mode: ProcessViewMode;
  active: boolean;
  dimmed: boolean;
}

type ProcessFlowNode = Node<ProcessNodeData, "process">;

const NODE_TYPE_LABEL: Record<ProcessNode["type"], string> = {
  start: "起点",
  activity: "活动",
  decision: "决策",
  end: "终点",
  deviation: "偏差",
};

function formatWait(minutes: number) {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

function nodeAccent(type: ProcessNode["type"]) {
  switch (type) {
    case "start":
      return "bg-ink";
    case "end":
      return "bg-ok";
    case "deviation":
      return "bg-risk";
    case "decision":
      return "bg-warn";
    default:
      return "bg-primary";
  }
}

function nodeIcon(type: ProcessNode["type"]) {
  switch (type) {
    case "start":
      return Play;
    case "end":
      return Square;
    case "deviation":
      return AlertTriangle;
    default:
      return CornerDownRight;
  }
}

const ProcessNodeCard = memo(function ProcessNodeCard({ data, selected }: NodeProps<ProcessFlowNode>) {
  const { node, mode, active, dimmed } = data;
  const Icon = nodeIcon(node.type);
  const deviation = node.type === "deviation" || node.deviationRate >= 10;

  return (
    <div
      className={cn(
        "relative w-[172px] rounded-lg border bg-card px-2.5 py-2 shadow-card transition-[opacity,border-color,box-shadow] duration-150",
        selected || active ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-line-strong",
        node.type === "deviation" && "border-risk/40 bg-risk-wash/40",
        dimmed && "opacity-30",
        mode === "deviation" && node.type === "deviation" && "border-risk/60",
      )}
    >
      <span className={cn("absolute inset-y-1.5 left-0 w-[2px] rounded-full", nodeAccent(node.type))} aria-hidden />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

      <div className="flex items-center gap-1.5 pl-1">
        <Icon className={cn("size-2.5 shrink-0", deviation ? "text-risk" : "text-muted-foreground")} />
        <span className="label-micro truncate">{NODE_TYPE_LABEL[node.type]}</span>
        <span className="ml-auto font-mono text-[10px] font-medium tabular text-foreground">{node.count} 例</span>
      </div>

      <p className="mt-0.5 truncate pl-1 text-[12px] leading-tight font-medium text-foreground">{node.label}</p>

      <div className="mt-1.5 flex items-center justify-between gap-1 rounded-[4px] bg-secondary/50 px-1.5 py-1">
        <span className="text-[9px] text-muted-foreground">平均等待</span>
        <span className="font-mono text-[9.5px] tabular text-foreground/80">{formatWait(node.avgWaitMin)}</span>
        <span className="h-2.5 w-px bg-line-strong" />
        <span className="text-[9px] text-muted-foreground">偏差</span>
        <span className={cn("font-mono text-[9.5px] tabular", deviation ? "text-risk" : "text-foreground/80")}>
          {node.deviationRate}%
        </span>
      </div>
    </div>
  );
});

const nodeTypes = { process: ProcessNodeCard } satisfies NodeTypes;

const HANDLE_STYLE = {
  width: 7,
  height: 7,
  background: "var(--line-strong)",
  border: "2px solid var(--card)",
} as const;

/* -------------------------------- 图内工具栏 -------------------------------- */

function GraphCanvas({ nodes, edges, mode, selection, onSelect }: ProcessGraphProps) {
  const { fitView } = useReactFlow<ProcessFlowNode>();

  const flowNodes = useMemo<ProcessFlowNode[]>(() => {
    const visible = mode === "standard" ? nodes.filter((n) => n.type !== "deviation") : nodes;
    return visible.map((node) => {
      const active = selection?.kind === "node" && selection.id === node.id;
      const dimmed =
        mode === "deviation" ? node.type !== "deviation" : selection?.kind === "node" && !active;
      return {
        id: node.id,
        type: "process",
        position: { x: node.x, y: node.y },
        data: { node, mode, active, dimmed },
        draggable: false,
        connectable: false,
        selected: active,
      };
    });
  }, [nodes, mode, selection]);

  const flowEdges = useMemo<Edge[]>(() => {
    const visible = mode === "standard" ? edges.filter((e) => e.conformance === "COMPLIANT") : edges;
    return visible.map((edge) => {
      const deviation = edge.conformance === "DEVIATION";
      const active = selection?.kind === "edge" && selection.id === edge.id;
      const dimmed = mode === "deviation" ? !deviation : selection?.kind === "edge" && !active;
      const width = Math.min(4, 0.9 + edge.count / 34);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "default",
        label: `${edge.count}`,
        labelStyle: {
          fill: deviation ? "var(--risk)" : "var(--muted-foreground)",
          fontSize: 9,
          fontFamily: "var(--font-mono)",
          opacity: dimmed ? 0.25 : 1,
        },
        labelBgStyle: { fill: "var(--card)", fillOpacity: 0.92 },
        labelBgPadding: [3, 2] as [number, number],
        style: {
          stroke: active ? "var(--primary)" : deviation ? "var(--risk)" : "var(--line-strong)",
          strokeWidth: active ? Math.max(2.6, width + 1) : deviation ? 1.6 : width,
          strokeDasharray: deviation ? "5 4" : undefined,
          opacity: dimmed ? 0.18 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 13,
          height: 13,
          color: active ? "var(--primary)" : deviation ? "var(--risk)" : "var(--line-strong)",
        },
        animated: false,
      } satisfies Edge;
    });
  }, [edges, mode, selection]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.16, duration: 320, maxZoom: 1.05 });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [mode, fitView]);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-md border border-line bg-background">
      <ReactFlow<ProcessFlowNode>
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => onSelect({ kind: "node", id: node.id })}
        onEdgeClick={(_, edge) => onSelect({ kind: "edge", id: edge.id })}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 1.05 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "default" }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line-strong)" />
        <Controls showInteractive={false} fitViewOptions={{ padding: 0.16, maxZoom: 1.05 }} className="!shadow-card" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={1}
          nodeColor={(node) => {
            const data = node.data as ProcessNodeData | undefined;
            if (!data) return "var(--line-strong)";
            if (data.node.type === "deviation") return "var(--risk)";
            if (data.node.type === "start" || data.node.type === "end") return "var(--ink)";
            return "var(--primary)";
          }}
          className="!border !border-line !bg-card !shadow-card"
        />
      </ReactFlow>
      <Button
        variant="outline"
        size="xs"
        className="absolute top-2.5 right-2.5 z-10 bg-card/95"
        onClick={() => void fitView({ padding: 0.16, duration: 300, maxZoom: 1.05 })}
      >
        <Frame className="size-3" />
        适应画布
      </Button>
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-[3px] border border-line bg-card/95 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
        <LogOut className="size-2.5 rotate-180" />
        事件日志
      </span>
    </div>
  );
}

export function ProcessGraph(props: ProcessGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
