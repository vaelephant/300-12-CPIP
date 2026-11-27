import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type NodeTypes,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import {
  ArrowLeft,
  CircleDot,
  Download,
  Frame,
  History,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { NODE_GROUPS, NODE_META, ROLE_LABELS, VERSION_STATUS_META } from "@/lib/clinical";
import type { NodeType, Pathway, PathwayEdge, PathwayNode, ValidationIssue, VersionStatus } from "@/types";
import { getGraph, getPathway, getStudioValidation, getVersions } from "@/data";
import { useCustomPathway } from "@/stores/studio-store";
import { Page, PageHeader } from "@/components/app/page-header";
import { EmptyState, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PathwayNodeCard } from "@/components/pathway/node-card";
import { NodePalette } from "@/components/pathway/palette";
import { NodeInspector } from "@/components/pathway/inspector";
import { ValidationPanel } from "@/components/pathway/validation-panel";
import {
  makeStudioNode,
  nodeKeyOf,
  nodeRfId,
  type StudioEdge,
  type StudioNode,
} from "@/components/pathway/types";

const nodeTypes = { clinical: PathwayNodeCard } satisfies NodeTypes;

const EDGE_STROKE: Record<PathwayEdge["type"], string> = {
  SEQUENCE: "var(--line-strong)",
  CONDITIONAL: "var(--warn)",
  PARALLEL: "var(--info)",
};

/**
 * fixture 中的节点坐标按窄卡片（约 150px）排布，而临床节点卡片宽 218px。
 * 画布加载时将坐标等比放大，避免相邻卡片重叠；仅影响画布布局，不改变路径语义。
 */
const NODE_LAYOUT_SCALE = 1.55;
const INITIAL_VIEWPORT = { x: 0, y: 8, zoom: 0.7 };

function styleEdge(edge: PathwayEdge): StudioEdge {
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

function minimapColor(node: StudioNode): string {
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

/* ------------------------------ 页面入口 ------------------------------ */

export default function PathwayStudioPage() {
  const { id = "" } = useParams();
  const customPathway = useCustomPathway(id);
  const pathway = getPathway(id) ?? customPathway;

  if (!pathway) {
    return (
      <Page>
        <PageHeader
          module="M03 · 路径设计"
          title="路径设计器"
          description="未找到对应路径模板"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/pathways">
                <ArrowLeft className="size-3.5" />
                返回路径库
              </Link>
            </Button>
          }
        />
        <div className="rounded-lg border border-line bg-card">
          <EmptyState
            icon={<History className="size-4" />}
            title="路径不存在"
            description={`未找到路径 ID「${id}」。该路径可能已停用或未登记。`}
            action={
              <Button asChild size="sm">
                <Link to="/pathways">返回路径库</Link>
              </Button>
            }
          />
        </div>
      </Page>
    );
  }

  return (
    <ReactFlowProvider>
      <StudioWorkspace key={pathway.id} pathway={pathway} />
    </ReactFlowProvider>
  );
}

/* ------------------------------ 设计器工作区 ------------------------------ */

function StudioWorkspace({ pathway }: { pathway: Pathway }) {
  const { fitView, screenToFlowPosition, setViewport } = useReactFlow<StudioNode, StudioEdge>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const versions = useMemo(() => getVersions(pathway.id), [pathway.id]);
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const activeVersion = versions.find((version) => version.id === versionId) ?? versions[0];
  const [versionStatus, setVersionStatus] = useState<VersionStatus>(activeVersion?.status ?? "DRAFT");

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
    [graph],
  );
  const initialEdges = useMemo(() => graph.edges.map(styleEdge), [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<StudioEdge>(initialEdges);

  const [issues, setIssues] = useState<ValidationIssue[]>(pathwayIssues);
  const [dirty, setDirty] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ nodeIds: string[]; edgeIds: string[] } | null>(null);
  const [submitBlockedOpen, setSubmitBlockedOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

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

  /** 结构分析：按 NODE_GROUPS 归并的节点类型构成（用于检查器默认态环形图） */
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

  /** 阶段覆盖：预期阶段优先，自定义阶段追加在后 */
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

  /* ---------------------------- 状态更新 ---------------------------- */

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

  /* ---------------------------- 新增节点 ---------------------------- */

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

  /* ---------------------------- 连线 ---------------------------- */

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

  /* ---------------------------- 删除 ---------------------------- */

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

  /* ---------------------------- 版本与保存 ---------------------------- */

  const handleVersionChange = useCallback(
    (nextId: string) => {
      const next = versions.find((version) => version.id === nextId);
      if (!next) return;
      setVersionId(nextId);
      setVersionStatus(next.status);
      setDirty(false);
      toast(`已切换至版本 ${next.version}`, {
        description: `${VERSION_STATUS_META[next.status].label} · 画布加载该版本图快照。`,
      });
    },
    [versions],
  );

  const saveDraft = useCallback(() => {
    setDirty(false);
    toast.success("已保存草稿", {
      description: `${nodes.length} 个节点 · ${edges.length} 条连线 · 版本 ${activeVersion?.version ?? "—"}`,
    });
  }, [activeVersion?.version, edges.length, nodes.length]);

  const exportJson = useCallback(() => {
    const payload = {
      pathwayId: pathway.id,
      pathwayCode: pathway.code,
      version: activeVersion?.version ?? null,
      exportedAt: new Date().toISOString(),
      clinical_use: false,
      nodes: nodes.map((node) => node.data.node),
      edges: edges.flatMap((edge) => (edge.data ? [edge.data.edge] : [])),
    };
    void navigator.clipboard
      ?.writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        toast.success("已导出路径 JSON", {
          description: `${nodes.length} 个节点 · ${edges.length} 条连线已复制到剪贴板。`,
        });
      })
      .catch(() => {
        toast.error("导出失败", { description: "浏览器未授予剪贴板权限，请检查站点权限。" });
      });
  }, [activeVersion?.version, edges, nodes, pathway.code, pathway.id]);

  /* ---------------------------- 校验与提交 ---------------------------- */

  const runValidation = useCallback(() => {
    if (validating) return;
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      setValidationOpen(true);
      const errors = issues.filter((issue) => issue.level === "ERROR").length;
      const warnings = issues.filter((issue) => issue.level === "WARNING").length;
      const infos = issues.filter((issue) => issue.level === "INFO").length;
      if (errors > 0) {
        toast.warning(`校验完成：${errors} 项错误需修复`, {
          description: `${warnings} 项警告 · ${infos} 项提示，详见底部校验面板。`,
        });
      } else {
        toast.success("校验完成：未发现阻断性错误", {
          description:
            warnings > 0
              ? `仍有 ${warnings} 项警告，可提交审核并在审核意见中说明。`
              : "图结构、规则与证据校验均通过。",
        });
      }
    }, 800);
  }, [issues, validating]);

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

  const submitForReview = useCallback(() => {
    if (versionStatus === "IN_REVIEW" || versionStatus === "PUBLISHED") return;
    if (errorCount > 0) {
      setValidationOpen(true);
      setSubmitBlockedOpen(true);
      return;
    }
    setSubmitConfirmOpen(true);
  }, [errorCount, versionStatus]);

  const confirmSubmit = useCallback(() => {
    setSubmitConfirmOpen(false);
    setVersionStatus("IN_REVIEW");
    setDirty(false);
    toast.success("已提交审核", {
      description: `版本 ${activeVersion?.version ?? "—"} 已进入医务处审核队列，审核通过后方可发布（模拟）。`,
    });
  }, [activeVersion?.version]);

  const submitDisabled = versionStatus === "IN_REVIEW" || versionStatus === "PUBLISHED";

  /* ---------------------------- 渲染 ---------------------------- */

  return (
    <div className="flex h-[calc(100vh-52px)] min-h-0 flex-col overflow-hidden bg-background">
      {/* 顶部工具栏 */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-card px-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="返回路径库">
          <Link to="/pathways">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold">{pathway.name}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{pathway.code}</span>
            <SyntheticTag />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground">
            <span>{pathway.departmentName}</span>
            <span className="text-line-strong">·</span>
            <span className="font-mono">
              {nodes.length} 节点 / {edges.length} 连线
            </span>
            <span className="text-line-strong">·</span>
            <span>负责人 {pathway.ownerName}</span>
          </div>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {versions.length > 0 ? (
            <Select value={versionId} onValueChange={handleVersionChange}>
              <SelectTrigger size="sm" className="w-[104px] font-mono">
                <SelectValue placeholder="版本" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id} className="font-mono">
                    {version.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="rounded-md border border-line bg-secondary/40 px-2 py-1 font-mono text-[10.5px] text-muted-foreground">
              {pathway.currentVersion}
            </span>
          )}
          <StatusBadge tone={VERSION_STATUS_META[versionStatus].tone}>
            {VERSION_STATUS_META[versionStatus].label}
          </StatusBadge>
          {dirty && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-[3px] border border-warn/25 bg-warn-wash px-1.5 py-px text-[10px] font-medium text-warn">
              <CircleDot className="size-2.5" />
              未保存
            </span>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fitView({ padding: 0.18, maxZoom: 1, duration: 420 })}
            title="缩放至完整路径图（最大 100%）"
          >
            <Frame className="size-3.5" />
            适应画布
          </Button>
          <Button variant="outline" size="sm" onClick={runValidation} disabled={validating}>
            {validating ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            {validating ? "校验中…" : "校验"}
          </Button>
          <Button variant="ghost" size="sm" onClick={saveDraft}>
            <Save className="size-3.5" />
            保存
          </Button>
          <Button
            size="sm"
            onClick={submitForReview}
            disabled={submitDisabled}
            title={
              submitDisabled
                ? versionStatus === "PUBLISHED"
                  ? "已发布版本不可再次提交审核"
                  : "该版本已在审核流程中"
                : errorCount > 0
                  ? "存在阻断性错误，需先修复"
                  : "提交医务处审核"
            }
          >
            <Send className="size-3.5" />
            提交审核
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[196px]">
              <DropdownMenuLabel>路径操作</DropdownMenuLabel>
              <DropdownMenuItem onClick={exportJson}>
                <Download />
                导出 JSON
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/pathways/${pathway.id}/versions`}>
                  <History />
                  版本管理
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void fitView({ padding: 0.18, maxZoom: 1, duration: 420 })}>
                <Frame />
                适应画布
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void setViewport(INITIAL_VIEWPORT, { duration: 400 })}
              >
                <RefreshCw />
                恢复初始视图
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 工作区 */}
      <div className="flex min-h-0 flex-1">
        <NodePalette counts={nodeTypeCounts} stages={stageCounts} onAdd={handlePaletteAdd} />

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
              onConnect={handleConnect}
              onNodeClick={(_, node) => selectNodeById(node.id)}
              onEdgeClick={(_, edge) => {
                setNodes((current) => current.map((node) => ({ ...node, selected: false })));
                setEdges((current) => current.map((item) => ({ ...item, selected: item.id === edge.id })));
              }}
              onPaneClick={clearSelection}
              onNodeDragStop={(_, node) => {
                setNodes((current) =>
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
                setDirty(true);
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
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
              <Controls
                showInteractive={false}
                fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
                className="!shadow-card"
              />
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
            onToggle={() => setValidationOpen((current) => !current)}
            onJump={jumpToIssue}
            onSimulateFix={simulateFix}
          />
        </div>

        <NodeInspector
          node={selectedNode}
          stageOptions={stageOptions}
          structure={{ groups: groupMix, stages: stageCoverageRows }}
          summary={{
            nodeCount: nodes.length,
            edgeCount: edges.length,
            stageCoverage,
            totalStages: expectedStages.length,
            errors: errorCount,
            warnings: warningCount,
            infos: infoCount,
          }}
          onChange={updateSelectedNode}
          onChangeTimeConstraint={updateTimeConstraint}
          onRemoveSelected={removeSelectedNode}
          onAddEvidence={addEvidence}
          onRemoveEvidence={removeEvidence}
        />
      </div>

      {/* 删除确认 */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除选中元素？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {pendingDelete?.nodeIds.length ?? 0} 个节点与 {pendingDelete?.edgeIds.length ?? 0}{" "}
              条连线，并同步移除关联连线。该操作仅作用于当前草稿，保存后不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/92"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 提交被阻断 */}
      <AlertDialog open={submitBlockedOpen} onOpenChange={setSubmitBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提交审核已被阻断</AlertDialogTitle>
            <AlertDialogDescription>
              当前版本存在 {errorCount} 项阻断性错误，路径不可提交审核。请在校验面板中定位问题节点并修复；
              可使用「模拟修复」完成结构校验后继续审核。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回修复</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSubmitBlockedOpen(false);
                setValidationOpen(true);
              }}
            >
              查看校验详情
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 提交确认 */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提交版本审核？</AlertDialogTitle>
            <AlertDialogDescription>
              版本 {activeVersion?.version ?? "—"} 将提交医务处审核，审核通过后由具备发布权限的角色发布生效。
              提交后当前设计器进入只读审核视图，如需继续修改请创建新版本。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>提交审核</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
