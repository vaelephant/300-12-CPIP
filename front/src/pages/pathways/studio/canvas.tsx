import type { RefObject } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  type OnEdgesChange,
  type OnNodesChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ValidationIssue } from "@/types";
import { ValidationPanel } from "@/components/pathway/validation-panel";
import type { StudioEdge, StudioNode } from "@/components/pathway/types";
import { INITIAL_VIEWPORT, minimapColor, nodeTypes } from "./graph-utils";

interface StudioCanvasProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  nodes: StudioNode[];
  edges: StudioEdge[];
  onNodesChange: OnNodesChange<StudioNode>;
  onEdgesChange: OnEdgesChange<StudioEdge>;
  onConnect: (connection: Connection) => void;
  onSelectNode: (rfId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onClearSelection: () => void;
  onNodeDragStop: (node: StudioNode) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  issues: ValidationIssue[];
  validationOpen: boolean;
  onToggleValidation: () => void;
  onJumpIssue: (issue: ValidationIssue) => void;
  onSimulateFix: (issue: ValidationIssue) => void;
}

export function StudioCanvas({
  canvasRef,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  onNodeDragStop,
  onDrop,
  onDragOver,
  issues,
  validationOpen,
  onToggleValidation,
  onJumpIssue,
  onSimulateFix,
}: StudioCanvasProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div ref={canvasRef} className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-3 rounded-md border border-line bg-card/92 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-card backdrop-blur">
          <span className="label-micro">CANVAS</span>
          <span className="flex items-center gap-1">
            <span className="h-px w-4 bg-line-strong" />
            顺序
          </span>
          <span className="flex items-center gap-1">
            <span className="h-px w-4 border-t border-dashed border-warn" />
            条件
          </span>
          <span className="flex items-center gap-1">
            <span className="h-px w-4 bg-info" />
            并行
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-risk" />
            必做
          </span>
        </div>

        <ReactFlow<StudioNode, StudioEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
          onPaneClick={onClearSelection}
          onNodeDragStop={(_, node) => onNodeDragStop(node)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          isValidConnection={(connection) => connection.source !== connection.target}
          deleteKeyCode={null}
          defaultViewport={INITIAL_VIEWPORT}
          minZoom={0.18}
          maxZoom={1.6}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: "var(--primary)", strokeWidth: 1.5 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
          className="bg-background"
          style={{ width: "100%", height: "100%" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line-strong)" />
          <Controls showInteractive={false} fitViewOptions={{ padding: 0.18, maxZoom: 1 }} className="!shadow-card" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => minimapColor(node as StudioNode)}
            nodeStrokeWidth={1}
            className="!border !border-line !shadow-card"
          />
        </ReactFlow>
      </div>

      <ValidationPanel
        issues={issues}
        open={validationOpen}
        onToggle={onToggleValidation}
        onJump={onJumpIssue}
        onSimulateFix={onSimulateFix}
      />
    </div>
  );
}
