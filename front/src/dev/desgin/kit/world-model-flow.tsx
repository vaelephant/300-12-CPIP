import { memo, useEffect, useMemo, type CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
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
import type { WmCanvasData, WmPastEvent, WmSelection, WmTone } from "./world-model";

/**
 * WM 情景推演 · React Flow · 布局 A
 * 回放链 → Now 铰链（贴在链末端）→ 右侧扇出 A/B/C
 */

export type WmFlowNodeData = {
  tone: WmTone;
  label: string;
  sub?: string;
  mark?: string;
  selected?: boolean;
  dimmed?: boolean;
  branchOn?: boolean;
  kind: "past" | "now" | "future";
  selection: WmSelection;
};

type WmFlowNode = Node<WmFlowNodeData, "wm">;

const HANDLE_BASE: CSSProperties = {
  width: 8,
  height: 8,
  opacity: 0,
  background: "transparent",
  border: "none",
  pointerEvents: "none",
};

function WmNode({ data }: NodeProps<WmFlowNode>) {
  const { tone: T, kind, label, sub, mark, selected, dimmed, branchOn } = data;

  if (kind === "now") {
    return (
      <div
        className="relative flex h-[48px] w-[100px] flex-col items-center justify-center rounded-full border-2 px-2"
        style={{
          background: T.void,
          borderColor: T.now,
          color: T.now,
          boxShadow: selected ? `0 0 0 3px ${T.simSoft}` : undefined,
        }}
      >
        <Handle type="target" position={Position.Left} id="in" style={HANDLE_BASE} />
        <Handle
          type="source"
          position={Position.Right}
          id="out-a"
          style={{ ...HANDLE_BASE, top: "18%" }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="out-b"
          style={{ ...HANDLE_BASE, top: "50%" }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="out-c"
          style={{ ...HANDLE_BASE, top: "82%" }}
        />
        <span className="size-2 rounded-full" style={{ background: T.now }} />
        <p
          className="mt-0.5 max-w-[90px] truncate text-center text-[11px] font-semibold leading-tight"
          style={{ fontFamily: T.display }}
        >
          {label}
        </p>
      </div>
    );
  }

  if (kind === "future") {
    return (
      <div
        className="relative rounded border px-2 py-1.5"
        style={{
          background: T.futureBand,
          borderColor: selected ? T.now : branchOn ? T.sim : T.simLine,
          borderStyle: branchOn || selected ? "solid" : "dashed",
          borderWidth: selected ? 2 : 1,
          color: selected || branchOn ? T.ink : T.mute,
          opacity: branchOn || selected ? 1 : 0.5,
          width: 100,
          fontFamily: T.sans,
        }}
      >
        <Handle type="target" position={Position.Left} id="in" style={HANDLE_BASE} />
        <Handle type="source" position={Position.Right} id="out" style={HANDLE_BASE} />
        <p className="truncate text-[11px] font-medium leading-4">{label}</p>
        {sub ? (
          <p className="mt-0.5 truncate font-mono text-[9px]" style={{ color: T.dim }}>
            {sub}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{ opacity: dimmed ? 0.3 : 1, fontFamily: T.sans, width: 72, height: 56 }}
    >
      <p
        className="absolute inset-x-0 top-0 truncate text-center text-[10px] font-medium leading-tight"
        style={{ color: selected ? T.sim : T.ink }}
      >
        {label}
      </p>
      <div
        className="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2"
        style={{
          background: T.pastBand,
          borderColor: selected ? T.sim : T.past,
          boxShadow: selected ? `0 0 0 3px ${T.simSoft}` : undefined,
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ ...HANDLE_BASE, left: -2, top: "50%" }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ ...HANDLE_BASE, right: -2, top: "50%" }}
        />
        <span className="font-mono text-[8px] font-medium" style={{ color: selected ? T.sim : T.past }}>
          {mark ?? "·"}
        </span>
      </div>
      {sub ? (
        <p
          className="absolute inset-x-0 bottom-0 truncate text-center font-mono text-[8px]"
          style={{ color: T.dim }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

const nodeTypes = { wm: memo(WmNode) } satisfies NodeTypes;

const KIND_MARK: Record<string, string> = {
  task: "任",
  exam: "检",
  decision: "决",
  note: "记",
};

/** 布局 A：回放链 → Now 贴末端 → 右扇 A/B/C */
function buildGraph(
  data: WmCanvasData,
  tone: WmTone,
  pastEvents: WmPastEvent[],
  selection: WmSelection | null,
  activeCandidate: "A" | "B" | "C",
  focusStage: string | null,
  stageNameById: Map<string, string>,
): { nodes: WmFlowNode[]; edges: Edge[] } {
  const selectedPast = selection?.kind === "past" ? selection.id : null;
  const selectedFuture = selection?.kind === "future" ? selection.nodeId : null;
  const nowSelected = !selection || selection.kind === "now";

  const nodes: WmFlowNode[] = [];
  const edges: Edge[] = [];

  const pastY = 118;
  const gap = 76;
  const pastLeft = 12;

  pastEvents.forEach((ev, i) => {
    const id = `past-${ev.id}`;
    const stageName = stageNameById.get(ev.stageId);
    nodes.push({
      id,
      type: "wm",
      position: { x: pastLeft + i * gap, y: pastY },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        tone,
        kind: "past",
        label: ev.label,
        sub: stageName ? `${ev.at.split(" ")[0]} · ${stageName}` : ev.at.split(" ")[0],
        mark: ev.kind ? KIND_MARK[ev.kind] : "·",
        selected: selectedPast === ev.id,
        dimmed: focusStage != null && ev.stageId !== focusStage,
        selection: { kind: "past", id: ev.id },
      },
      draggable: false,
      connectable: false,
    });
    if (i > 0) {
      const prev = pastEvents[i - 1];
      edges.push({
        id: `e-past-${prev.id}-${ev.id}`,
        source: `past-${prev.id}`,
        sourceHandle: "out",
        target: id,
        targetHandle: "in",
        type: "straight",
        animated: true,
        style: { stroke: tone.past, strokeWidth: 1.75, strokeDasharray: "5 5" },
      });
    }
  });

  /** Now 紧贴回放链末端（铰链），不居中 */
  const nowX = pastLeft + pastEvents.length * gap + 4;
  nodes.push({
    id: "now",
    type: "wm",
    position: { x: nowX, y: pastY - 2 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      tone,
      kind: "now",
      label: data.nowLabel,
      selected: nowSelected,
      selection: { kind: "now" },
    },
    draggable: false,
    connectable: false,
  });

  if (pastEvents.length) {
    edges.push({
      id: "e-past-now",
      source: `past-${pastEvents[pastEvents.length - 1].id}`,
      sourceHandle: "out",
      target: "now",
      targetHandle: "in",
      type: "straight",
      animated: true,
      style: { stroke: tone.past, strokeWidth: 1.75, strokeDasharray: "5 5" },
    });
  }

  const branchYs = [28, 116, 204];
  const outHandles = ["out-a", "out-b", "out-c"] as const;
  const midX = nowX + 128;
  const endX = midX + 128;

  data.candidates.forEach((c, i) => {
    const y = branchYs[i] ?? 116;
    const midId = `future-${c.nodes[0].id}`;
    const endId = `future-${c.nodes[1].id}`;
    const branchOn = c.id === activeCandidate;
    const outHandle = outHandles[i] ?? "out-b";

    nodes.push({
      id: midId,
      type: "wm",
      position: { x: midX, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        tone,
        kind: "future",
        label: c.nodes[0].label,
        sub: `情景 ${c.id}`,
        selected: selectedFuture === c.nodes[0].id,
        branchOn,
        selection: { kind: "future", candidateId: c.id, nodeId: c.nodes[0].id },
      },
      draggable: false,
      connectable: false,
    });
    nodes.push({
      id: endId,
      type: "wm",
      position: { x: endX, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        tone,
        kind: "future",
        label: c.nodes[1].label,
        sub: c.nodes[1].estimate,
        selected: selectedFuture === c.nodes[1].id,
        branchOn,
        selection: { kind: "future", candidateId: c.id, nodeId: c.nodes[1].id },
      },
      draggable: false,
      connectable: false,
    });

    const stroke = branchOn ? tone.sim : tone.simLine;
    const dash = "5 5";
    edges.push({
      id: `e-now-${c.id}`,
      source: "now",
      sourceHandle: outHandle,
      target: midId,
      targetHandle: "in",
      type: "straight",
      animated: true,
      style: {
        stroke,
        strokeWidth: branchOn ? 1.75 : 1.25,
        strokeDasharray: dash,
        opacity: branchOn ? 1 : 0.55,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 9, height: 9, color: stroke },
      zIndex: branchOn ? 2 : 1,
    });
    edges.push({
      id: `e-${c.id}-chain`,
      source: midId,
      sourceHandle: "out",
      target: endId,
      targetHandle: "in",
      type: "straight",
      animated: true,
      style: {
        stroke,
        strokeWidth: branchOn ? 1.75 : 1.25,
        strokeDasharray: dash,
        opacity: branchOn ? 1 : 0.55,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 9, height: 9, color: stroke },
      zIndex: branchOn ? 2 : 1,
    });
  });

  return { nodes, edges };
}

function FitOnce() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.16, maxZoom: 1.1, duration: 180 });
    }, 60);
    return () => window.clearTimeout(t);
  }, [fitView]);
  return null;
}

function FlowInner({
  data,
  tone,
  pastEvents,
  selection,
  activeCandidate,
  focusStage,
  onSelect,
  height,
}: {
  data: WmCanvasData;
  tone: WmTone;
  pastEvents: WmPastEvent[];
  selection: WmSelection | null;
  activeCandidate: "A" | "B" | "C";
  focusStage: string | null;
  onSelect: (next: WmSelection) => void;
  height: number;
}) {
  const stageNameById = useMemo(
    () => new Map(data.stages.map((s) => [s.id, s.name])),
    [data.stages],
  );

  const { nodes, edges } = useMemo(
    () => buildGraph(data, tone, pastEvents, selection, activeCandidate, focusStage, stageNameById),
    [data, tone, pastEvents, selection, activeCandidate, focusStage, stageNameById],
  );

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <div className="pointer-events-none absolute inset-0 z-0 flex">
        <div className="w-[42%]" style={{ background: tone.pastBand }} />
        <div className="w-[12%]" style={{ background: tone.stateBand }} />
        <div className="flex-1" style={{ background: tone.futureBand }} />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        edgesFocusable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        panOnScroll
        zoomOnScroll
        minZoom={0.4}
        maxZoom={1.55}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => {
          const sel = (n.data as WmFlowNodeData).selection;
          if (sel) onSelect(sel);
        }}
        onPaneClick={() => onSelect({ kind: "now" })}
        style={{ width: "100%", height: "100%", background: "transparent" }}
        className="z-[1]"
        defaultEdgeOptions={{ interactionWidth: 12 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={tone.lineStrong} />
        <Controls
          showInteractive={false}
          fitViewOptions={{ padding: 0.16, maxZoom: 1.1 }}
          className="!shadow-none"
        />
        <FitOnce />
      </ReactFlow>
    </div>
  );
}

export function WorldModelFlowGraph({
  data,
  tone,
  pastEvents,
  selection,
  activeCandidate,
  focusStage,
  onSelect,
  height = 300,
}: {
  data: WmCanvasData;
  tone: WmTone;
  pastEvents: WmPastEvent[];
  selection: WmSelection | null;
  activeCandidate: "A" | "B" | "C";
  focusStage: string | null;
  onSelect: (next: WmSelection) => void;
  height?: number;
}) {
  return (
    <div className="overflow-hidden border-b" style={{ borderColor: tone.line, background: tone.panel }}>
      <ReactFlowProvider>
        <FlowInner
          data={data}
          tone={tone}
          pastEvents={pastEvents}
          selection={selection}
          activeCandidate={activeCandidate}
          focusStage={focusStage}
          onSelect={onSelect}
          height={height}
        />
      </ReactFlowProvider>
    </div>
  );
}
