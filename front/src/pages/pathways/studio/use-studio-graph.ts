import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type XYPosition,
} from "@xyflow/react";
import { toast } from "sonner";
import { NODE_GROUPS, NODE_META, ROLE_LABELS } from "@/lib/clinical";
import type { NodeType, Pathway, PathwayEdge, PathwayNode, ValidationIssue } from "@/types";
import { getGraph, getStudioValidation } from "@/data";
import {
  makeStudioNode,
  nodeKeyOf,
  nodeRfId,
  type StudioEdge,
  type StudioNode,
} from "@/components/pathway/types";
import { NODE_LAYOUT_SCALE, styleEdge } from "./graph-utils";

export function useStudioGraph(pathway: Pathway) {
  const { fitView, screenToFlowPosition } = useReactFlow<StudioNode, StudioEdge>();
  const canvasRef = useRef<HTMLDivElement>(null);

  const graph = useMemo(() => getGraph(pathway.id), [pathway.id]);
  const pathwayIssues = useMemo(() => getStudioValidation(pathway.id), [pathway.id]);
  const expectedStages = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.stage))), [graph]);

  const initialNodes = useMemo(
    () =>
      graph.nodes.map((node) =>
        makeStudioNode(
          {
            ...node,
            position: { x: node.position.x * NODE_LAYOUT_SCALE, y: node.position.y * NODE_LAYOUT_SCALE },
          },
          pathwayIssues.filter((issue) => issue.nodeKey === node.nodeKey),
        ),
      ),
    [graph, pathwayIssues],
  );
  const initialEdges = useMemo(() => graph.edges.map(styleEdge), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<StudioEdge>(initialEdges);
  const [issues, setIssues] = useState<ValidationIssue[]>(pathwayIssues);
  const [dirty, setDirty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ nodeIds: string[]; edgeIds: string[] } | null>(null);

  const selectedNode = nodes.find((node) => node.selected)?.data.node ?? null;
  const selectedRfId = nodes.find((node) => node.selected)?.id ?? null;

  const errorCount = issues.filter((issue) => issue.level === "ERROR").length;
  const warningCount = issues.filter((issue) => issue.level === "WARNING").length;
  const infoCount = issues.filter((issue) => issue.level === "INFO").length;

  const currentStages = useMemo(() => Array.from(new Set(nodes.map((node) => node.data.node.stage))), [nodes]);
  const stageOptions = useMemo(
    () => Array.from(new Set([...expectedStages, ...currentStages])),
    [expectedStages, currentStages],
  );
  const stageCounts = useMemo(
    () =>
      stageOptions
        .map((stage) => ({ name: stage, count: nodes.filter((node) => node.data.node.stage === stage).length }))
        .filter((stage) => stage.count > 0),
    [stageOptions, nodes],
  );
  const nodeTypeCounts = useMemo(() => {
    const counts: Partial<Record<NodeType, number>> = {};
    nodes.forEach((node) => {
      const type = node.data.node.type;
      counts[type] = (counts[type] ?? 0) + 1;
    });
    return counts;
  }, [nodes]);

  const groupMix = useMemo(() => {
    const labelByGroup = new Map<string, string>(NODE_GROUPS.map((group) => [group.key, group.label]));
    labelByGroup.set("END", "结束");
    const colorByGroup: Record<string, string> = {
      ENTRY: "var(--ink-3)",
      ASSESS: "var(--chart-1)",
      DIAGNOSTIC: "var(--chart-4)",
      TREATMENT: "var(--chart-2)",
      NURSING: "var(--chart-3)",
      DECISION: "var(--warn)",
      COORDINATION: "var(--line-strong)",
      END: "var(--ink-3)",
    };
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      const group = NODE_META[node.data.node.type].group;
      counts[group] = (counts[group] ?? 0) + 1;
    });
    return [...NODE_GROUPS.map((group) => group.key as string), "END"]
      .filter((group) => (counts[group] ?? 0) > 0)
      .map((group) => ({
        name: labelByGroup.get(group) ?? group,
        value: counts[group],
        color: colorByGroup[group] ?? "var(--chart-1)",
      }));
  }, [nodes]);

  const stageCoverageRows = useMemo(
    () =>
      stageOptions.map((stage) => ({
        name: stage,
        count: nodes.filter((node) => node.data.node.stage === stage).length,
        expected: expectedStages.includes(stage),
      })),
    [expectedStages, nodes, stageOptions],
  );

  const stageCoverage = currentStages.filter((stage) => expectedStages.includes(stage)).length;

  const updateSelectedNode = useCallback(
    (patch: Partial<PathwayNode>) => {
      if (!selectedRfId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedRfId
            ? { ...node, data: { ...node.data, node: { ...node.data.node, ...patch } } }
            : node,
        ),
      );
      setDirty(true);
    },
    [selectedRfId, setNodes],
  );

  const updateTimeConstraint = useCallback(
    (tc: NonNullable<PathwayNode["timeConstraint"]> | undefined) => {
      updateSelectedNode({ timeConstraint: tc });
    },
    [updateSelectedNode],
  );

  const addEvidence = useCallback(
    (ref: string) => {
      if (!selectedNode) return;
      const refs = selectedNode.evidenceRefs ?? [];
      if (refs.includes(ref)) return;
      updateSelectedNode({ evidenceRefs: [...refs, ref] });
      toast.success(`已绑定证据 ${ref}`, { description: "保存草稿后写入当前路径版本的证据集。" });
    },
    [selectedNode, updateSelectedNode],
  );

  const removeEvidence = useCallback(
    (ref: string) => {
      if (!selectedNode) return;
      updateSelectedNode({ evidenceRefs: (selectedNode.evidenceRefs ?? []).filter((item) => item !== ref) });
    },
    [selectedNode, updateSelectedNode],
  );

  const selectNodeById = useCallback(
    (rfId: string, focus = false) => {
      setNodes((current) => current.map((node) => ({ ...node, selected: node.id === rfId })));
      setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
      if (focus) {
        void fitView({ nodes: [{ id: rfId }], duration: 520, padding: 2.4, maxZoom: 1.1 });
      }
    },
    [fitView, setEdges, setNodes],
  );

  const clearSelection = useCallback(() => {
    setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
  }, [setEdges, setNodes]);

  const addNode = useCallback(
    (type: NodeType, position?: XYPosition) => {
      const meta = NODE_META[type];
      let suffix = 1;
      let nodeKey = `${type.toLowerCase()}_${suffix}`;
      while (nodes.some((node) => node.data.node.nodeKey === nodeKey)) {
        suffix += 1;
        nodeKey = `${type.toLowerCase()}_${suffix}`;
      }

      let resolvedPosition = position;
      if (!resolvedPosition) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const center = screenToFlowPosition(
          rect
            ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        );
        const offset = (nodes.length % 7) * 26;
        resolvedPosition = { x: center.x + offset - 110, y: center.y + offset - 40 };
      }

      const node: PathwayNode = {
        id: nodeRfId(nodeKey),
        nodeKey,
        type,
        name: `${meta.label}节点 ${suffix}`,
        description: meta.description,
        required: type !== "START" && type !== "END",
        responsibleRole: meta.defaultRole,
        position: resolvedPosition,
        stage: expectedStages[0] ?? currentStages[0] ?? "术前评估",
        evidenceRefs: [],
      };

      setNodes((current) => [
        ...current.map((item) => ({ ...item, selected: false })),
        { ...makeStudioNode(node), selected: true },
      ]);
      setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
      setDirty(true);
      toast.success(`已添加节点「${node.name}」`, {
        description: `${meta.label} · 默认角色：${ROLE_LABELS[meta.defaultRole]}`,
      });
    },
    [currentStages, expectedStages, nodes, screenToFlowPosition, setEdges, setNodes],
  );

  const handlePaletteAdd = useCallback((type: NodeType) => addNode(type), [addNode]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const rawType = event.dataTransfer.getData("application/cpip-node");
      if (!rawType || !(rawType in NODE_META)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(rawType as NodeType, { x: position.x - 110, y: position.y - 40 });
    },
    [addNode, screenToFlowPosition],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("application/cpip-node")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      const pathEdge: PathwayEdge = {
        id: `edge-${nodeKeyOf(connection.source)}-${nodeKeyOf(connection.target)}-${Date.now()}`,
        source: nodeKeyOf(connection.source),
        target: nodeKeyOf(connection.target),
        type: "SEQUENCE",
      };
      setEdges((current) => addEdge(styleEdge(pathEdge), current));
      setDirty(true);
      toast.success("已添加顺序连线", {
        description: "默认连线类型为 SEQUENCE；条件分支需配置分支规则后改为 CONDITIONAL。",
      });
    },
    [setEdges],
  );

  const requestDelete = useCallback((nodeIds: string[] = [], edgeIds: string[] = []) => {
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    setPendingDelete({ nodeIds, edgeIds });
  }, []);

  const removeSelectedNode = useCallback(() => {
    if (!selectedRfId) return;
    requestDelete([selectedRfId], []);
  }, [requestDelete, selectedRfId]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    const nodeIds = new Set(pendingDelete.nodeIds);
    const edgeIds = new Set(pendingDelete.edgeIds);
    const removedEdges = edges.filter(
      (edge) => edgeIds.has(edge.id) || nodeIds.has(edge.source) || nodeIds.has(edge.target),
    ).length;
    setNodes((current) => current.filter((node) => !nodeIds.has(node.id)));
    setEdges((current) =>
      current.filter((edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target)),
    );
    setDirty(true);
    toast.success("已删除选中元素", {
      description: `${pendingDelete.nodeIds.length} 个节点 · ${removedEdges} 条关联连线，保存草稿后生效。`,
    });
    setPendingDelete(null);
  }, [edges, pendingDelete, setEdges, setNodes]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (pendingDelete) return;
      const selectedNodes = nodes.filter((node) => node.selected).map((node) => node.id);
      const selectedEdges = edges.filter((edge) => edge.selected).map((edge) => edge.id);
      if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
      event.preventDefault();
      requestDelete(selectedNodes, selectedEdges);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [edges, nodes, pendingDelete, requestDelete]);

  const simulateFix = useCallback(
    (issue: ValidationIssue) => {
      if (issue.level !== "ERROR") return;
      const next = issues.filter((item) => item.id !== issue.id);
      setIssues(next);
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          data: {
            ...node.data,
            issues: next.filter((item) => item.nodeKey === node.data.node.nodeKey),
          },
        })),
      );
      setDirty(true);
      toast.success("已模拟修复 1 项错误", {
        description: issue.nodeKey
          ? `已为节点 ${issue.nodeKey} 补充默认分支并标记为修复，可重新校验或直接提交审核。`
          : "该问题已标记为修复。",
      });
    },
    [issues, setNodes],
  );

  const jumpToIssue = useCallback(
    (issue: ValidationIssue) => {
      if (!issue.nodeKey) {
        toast("该提示不关联具体节点", { description: "版本类提示无需在画布中定位。" });
        return;
      }
      const target = nodes.find((node) => node.data.node.nodeKey === issue.nodeKey);
      if (!target) {
        toast.error("未找到关联节点", { description: `节点 ${issue.nodeKey} 不存在于当前画布。` });
        return;
      }
      selectNodeById(target.id, true);
    },
    [nodes, selectNodeById],
  );

  return {
    canvasRef,
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    issues,
    setIssues,
    dirty,
    setDirty,
    pendingDelete,
    setPendingDelete,
    selectedNode,
    selectedRfId,
    errorCount,
    warningCount,
    infoCount,
    expectedStages,
    stageOptions,
    stageCounts,
    nodeTypeCounts,
    groupMix,
    stageCoverageRows,
    stageCoverage,
    updateSelectedNode,
    updateTimeConstraint,
    addEvidence,
    removeEvidence,
    selectNodeById,
    clearSelection,
    handlePaletteAdd,
    handleDrop,
    handleDragOver,
    handleConnect,
    requestDelete,
    removeSelectedNode,
    confirmDelete,
    simulateFix,
    jumpToIssue,
    fitView,
  };
}

export type StudioGraphApi = ReturnType<typeof useStudioGraph>;
