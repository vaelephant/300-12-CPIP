import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { HCC_GRAPH } from "@/data/pathways";
import type { PathwayEdge, PathwayNode } from "@/types";
import type { PathwayNodeVisualState } from "@/visualization/core/types";
import {
  LivePathwayNodeCard,
  PATHWAY_STATE_META,
  type LivePathwayNode,
} from "./LivePathwayNodeCard";

export { PATHWAY_STATE_META };

const nodeTypes = { clinical: LivePathwayNodeCard } satisfies NodeTypes;

const MINIMAP_COLOR: Record<PathwayNodeVisualState, string> = {
  completed: "var(--primary)",
  active: "var(--warn)",
  variant: "var(--risk)",
  blocked: "var(--risk)",
  pending: "var(--line-strong)",
  unknown: "var(--warn)",
  not_selected: "var(--line)",
};

export interface LivePathwayGraphProps {
  /** 路径节点，默认使用 HCC_GRAPH.nodes */
  nodes?: PathwayNode[];
  /** 路径连线，默认使用 HCC_GRAPH.edges */
  edges?: PathwayEdge[];
  /** nodeKey → 执行状态（缺失视为 pending） */
  stateMap: Record<string, PathwayNodeVisualState>;
  mode?: "planned" | "actual";
  selectedKey?: string | null;
  onNodeSelect?: (nodeKey: string | null) => void;
  height?: number | string;
  showLegend?: boolean;
  showEvidence?: boolean;
  showMiniMap?: boolean;
  /** fixture 坐标按窄卡片排布，默认放大以避免 200px 卡片重叠 */
  layoutScale?: number;
  /** 自增计数触发 fitView（用于工具栏「适应画布」） */
  fitSignal?: number;
  fitOnMount?: boolean;
  /** Optional node to center at a readable zoom on first render. */
  focusKey?: string | null;
  defaultViewport?: { x: number; y: number; zoom: number };
  className?: string;
}

interface GraphCanvasProps extends Required<Pick<LivePathwayGraphProps, "stateMap">> {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  mode: "planned" | "actual";
  selectedKey?: string | null;
  onNodeSelect?: (nodeKey: string | null) => void;
  showEvidence: boolean;
  showMiniMap: boolean;
  layoutScale: number;
  fitSignal: number;
  fitOnMount: boolean;
  focusKey?: string | null;
  defaultViewport: { x: number; y: number; zoom: number };
}

function GraphCanvas({
  nodes,
  edges,
  stateMap,
  mode,
  selectedKey,
  onNodeSelect,
  showEvidence,
  showMiniMap,
  layoutScale,
  fitSignal,
  fitOnMount,
  focusKey,
  defaultViewport,
}: GraphCanvasProps) {
  const { fitView, setCenter } = useReactFlow<LivePathwayNode, Edge>();

  const nodeIdByKey = useMemo(() => new Map(nodes.map((node) => [node.nodeKey, node.id])), [nodes]);

  const rfNodes = useMemo<LivePathwayNode[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: "clinical" as const,
        position: { x: node.position.x * layoutScale, y: node.position.y * layoutScale },
        data: {
          node,
          state: stateMap[node.nodeKey] ?? "pending",
          showEvidence,
          selected: selectedKey === node.nodeKey,
        },
        draggable: false,
        selectable: false,
        connectable: false,
      })),
    [layoutScale, nodes, selectedKey, showEvidence, stateMap],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const sourceState = stateMap[edge.source] ?? "pending";
        const targetState = stateMap[edge.target] ?? "pending";
        const isVariant =
          sourceState === "variant" ||
          sourceState === "blocked" ||
          targetState === "variant" ||
          targetState === "blocked";
        const isActive = sourceState === "active" || targetState === "active";
        const isCompleted = sourceState === "completed" && targetState === "completed";
        const isNotSelected = sourceState === "not_selected" || targetState === "not_selected";
        const isUnknown = sourceState === "unknown" || targetState === "unknown";
        const stroke = isUnknown
          ? "var(--warn)"
          : isNotSelected
          ? "var(--line-strong)"
          : isVariant
            ? "var(--risk)"
            : isActive
              ? "var(--warn)"
              : isCompleted
                ? "var(--primary)"
                : mode === "planned"
                  ? "var(--line-strong)"
                  : "var(--line)";
        const strokeWidth = isVariant ? 1.7 : isActive ? 2.3 : isCompleted ? 1.7 : 1.2;
        const conditional = edge.type === "CONDITIONAL";
        return {
          id: edge.id,
          source: nodeIdByKey.get(edge.source) ?? `node-${edge.source}`,
          target: nodeIdByKey.get(edge.target) ?? `node-${edge.target}`,
          type: "smoothstep",
          data: { edge },
          label: conditional ? (edge.isDefault ? "默认分支" : "条件分支") : undefined,
          labelStyle: {
            fill: isVariant ? "var(--risk)" : "var(--muted-foreground)",
            fontSize: 9,
            fontFamily: "var(--font-mono)",
          },
          labelBgStyle: { fill: "var(--card)", fillOpacity: 0.92 },
          labelBgPadding: [3, 1] as [number, number],
          labelBgBorderRadius: 2,
          style: { stroke, strokeWidth, strokeDasharray: isVariant || isNotSelected || isUnknown ? "5 4" : undefined },
          markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13, color: stroke },
        };
      }),
    [edges, mode, nodeIdByKey, stateMap],
  );

  useEffect(() => {
    if (!fitSignal || fitSignal <= 0) return;
    void fitView({ padding: 0.16, maxZoom: 1, duration: 450 });
  }, [fitSignal, fitView]);

  useEffect(() => {
    if (!focusKey) return;
    const focus = nodes.find((node) => node.nodeKey === focusKey);
    if (!focus) return;
    // Center the current/selected clinical node at a readable zoom instead of
    // shrinking the whole large DAG to fit the viewport.
    void setCenter((focus.position.x + 100) * layoutScale, (focus.position.y + 40) * layoutScale, { zoom: 0.82, duration: 0 });
  }, [focusKey, layoutScale, nodes, setCenter]);

  return (
    <ReactFlow<LivePathwayNode, Edge>
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      edgesFocusable={false}
      deleteKeyCode={null}
      fitView={fitOnMount}
      fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
      minZoom={0.12}
      maxZoom={1.5}
      defaultViewport={defaultViewport}
      onNodeClick={(_, node) => onNodeSelect?.(node.data.node.nodeKey)}
      onPaneClick={() => onNodeSelect?.(null)}
      proOptions={{ hideAttribution: true }}
      className="bg-background"
      style={{ width: "100%", height: "100%" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line-strong)" />
      <Controls showInteractive={false} fitViewOptions={{ padding: 0.16, maxZoom: 1 }} className="!shadow-card" />
      {showMiniMap && (
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={1}
          nodeColor={(node) => MINIMAP_COLOR[(node as LivePathwayNode).data.state]}
          className="!border !border-line !shadow-card"
        />
      )}
    </ReactFlow>
  );
}

/** 只读动态路径图：stateMap 驱动节点完成/执行中/变异/待执行状态。 */
export function LivePathwayGraph({
  nodes = HCC_GRAPH.nodes,
  edges = HCC_GRAPH.edges,
  stateMap,
  mode = "actual",
  selectedKey,
  onNodeSelect,
  height = 620,
  showLegend = true,
  showEvidence = true,
  showMiniMap = false,
  layoutScale = 1.45,
  fitSignal = 0,
  fitOnMount = false,
  focusKey,
  defaultViewport = { x: 0, y: 4, zoom: 0.66 },
  className,
}: LivePathwayGraphProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border border-line bg-background", className)}
      style={{ height }}
    >
      <ReactFlowProvider>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          stateMap={stateMap}
          mode={mode}
          selectedKey={selectedKey}
          onNodeSelect={onNodeSelect}
          showEvidence={showEvidence}
          showMiniMap={showMiniMap}
          layoutScale={layoutScale}
          fitSignal={fitSignal}
          fitOnMount={fitOnMount}
          focusKey={focusKey}
          defaultViewport={defaultViewport}
        />
      </ReactFlowProvider>

      {/* 只读态标识 */}
      <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-[3px] border border-line bg-card/90 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground backdrop-blur">
        <span className="size-1 rounded-full bg-primary/60" />
        READ-ONLY · {mode === "actual" ? "实际执行态" : "计划态"}
      </div>

      {/* 图例（可选） */}
      {showLegend && (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 rounded-md border border-line bg-card/92 px-2.5 py-1.5 shadow-card backdrop-blur">
          <PathwayStateLegend compact />
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 rounded-[3px] bg-card/85 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/80 backdrop-blur">
        SYNTHETIC · 演示路径图
      </div>
    </div>
  );
}

interface PathwayStateLegendProps {
  compact?: boolean;
  includeBlocked?: boolean;
  className?: string;
}

/** 四态图例（completed / active / variant / pending，可选 blocked）。 */
export function PathwayStateLegend({
  compact = false,
  includeBlocked = false,
  className,
}: PathwayStateLegendProps) {
  const states: PathwayNodeVisualState[] = includeBlocked
    ? ["completed", "active", "variant", "blocked", "unknown", "pending", "not_selected"]
    : ["completed", "active", "variant", "unknown", "pending", "not_selected"];

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground", className)}>
        {states.map((state) => {
          const meta = PATHWAY_STATE_META[state];
          return (
            <span key={state} className="inline-flex items-center gap-1">
              <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
              {meta.label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}>
      {states.map((state) => {
        const meta = PATHWAY_STATE_META[state];
        return (
          <div key={state} className="flex items-start gap-1.5">
            <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", meta.dotClass)} />
            <div className="min-w-0">
              <p className="text-[10.5px] leading-tight font-medium">{meta.label}</p>
              <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{meta.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
