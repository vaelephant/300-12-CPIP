import type { Pathway } from "@/types";
import { NodePalette } from "@/components/pathway/palette";
import { NodeInspector } from "@/components/pathway/inspector";
import { StudioToolbar } from "./toolbar";
import { StudioCanvas } from "./canvas";
import { StudioDialogs } from "./dialogs";
import { useStudioGraph } from "./use-studio-graph";
import { useStudioLifecycle } from "./use-studio-lifecycle";

export function StudioWorkspace({ pathway }: { pathway: Pathway }) {
  const graph = useStudioGraph(pathway);
  const life = useStudioLifecycle({
    pathway,
    nodes: graph.nodes,
    edges: graph.edges,
    issues: graph.issues,
    setIssues: graph.setIssues,
    setDirty: graph.setDirty,
    errorCount: graph.errorCount,
  });

  return (
    <div className="flex h-[calc(100vh-52px)] min-h-0 flex-col overflow-hidden bg-background">
      <StudioToolbar
        pathway={pathway}
        versions={life.versions}
        versionId={life.versionId}
        versionStatus={life.versionStatus}
        dirty={graph.dirty}
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        errorCount={graph.errorCount}
        validating={life.validating}
        backendBusy={life.backendBusy}
        submitDisabled={life.submitDisabled}
        onVersionChange={life.handleVersionChange}
        onValidate={() => void life.runValidation()}
        onSave={() => void life.saveDraft()}
        onSubmit={life.submitForReview}
        onExport={life.exportJson}
      />

      <div className="flex min-h-0 flex-1">
        <NodePalette counts={graph.nodeTypeCounts} stages={graph.stageCounts} onAdd={graph.handlePaletteAdd} />

        <StudioCanvas
          canvasRef={graph.canvasRef}
          nodes={graph.nodes}
          edges={graph.edges}
          onNodesChange={graph.onNodesChange}
          onEdgesChange={graph.onEdgesChange}
          onConnect={graph.handleConnect}
          onSelectNode={graph.selectNodeById}
          onSelectEdge={(edgeId) => {
            graph.setNodes((current) => current.map((node) => ({ ...node, selected: false })));
            graph.setEdges((current) => current.map((item) => ({ ...item, selected: item.id === edgeId })));
          }}
          onClearSelection={graph.clearSelection}
          onNodeDragStop={(node) => {
            graph.setNodes((current) =>
              current.map((item) =>
                item.id === node.id
                  ? {
                      ...item,
                      data: {
                        ...item.data,
                        node: { ...item.data.node, position: { x: node.position.x, y: node.position.y } },
                      },
                    }
                  : item,
              ),
            );
            graph.setDirty(true);
          }}
          onDrop={graph.handleDrop}
          onDragOver={graph.handleDragOver}
          issues={graph.issues}
          validationOpen={life.validationOpen}
          onToggleValidation={() => life.setValidationOpen((current) => !current)}
          onJumpIssue={graph.jumpToIssue}
          onSimulateFix={graph.simulateFix}
        />

        <NodeInspector
          node={graph.selectedNode}
          stageOptions={graph.stageOptions}
          structure={{ groups: graph.groupMix, stages: graph.stageCoverageRows }}
          summary={{
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            stageCoverage: graph.stageCoverage,
            totalStages: graph.expectedStages.length,
            errors: graph.errorCount,
            warnings: graph.warningCount,
            infos: graph.infoCount,
          }}
          onChange={graph.updateSelectedNode}
          onChangeTimeConstraint={graph.updateTimeConstraint}
          onRemoveSelected={graph.removeSelectedNode}
          onAddEvidence={graph.addEvidence}
          onRemoveEvidence={graph.removeEvidence}
        />
      </div>

      <StudioDialogs
        pendingDelete={graph.pendingDelete}
        onPendingDeleteOpenChange={(open) => !open && graph.setPendingDelete(null)}
        onConfirmDelete={graph.confirmDelete}
        submitBlockedOpen={life.submitBlockedOpen}
        onSubmitBlockedOpenChange={life.setSubmitBlockedOpen}
        errorCount={graph.errorCount}
        onViewValidation={() => {
          life.setSubmitBlockedOpen(false);
          life.setValidationOpen(true);
        }}
        submitConfirmOpen={life.submitConfirmOpen}
        onSubmitConfirmOpenChange={life.setSubmitConfirmOpen}
        versionLabel={life.activeVersion?.version ?? "—"}
        onConfirmSubmit={() => void life.confirmSubmit()}
      />
    </div>
  );
}
