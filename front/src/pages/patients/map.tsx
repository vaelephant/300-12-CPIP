import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Download,
  FileText,
  Layers,
  List,
  MoreHorizontal,
  PlayCircle,
  Route,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Page } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { FilterPill } from "@/components/app/toolbar";
import { WorkspaceIdentity, WorkspacePage } from "@/components/patient/clinical-workspace";
import { AllergyChips } from "@/components/patient/ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { getPatient, EVIDENCE_ITEMS, TASKS } from "@/data";
import { getInstanceByPatient } from "@/data/runtime";
import { HCC_GRAPH, getGraph } from "@/data/pathways";
import { REPLAY_SNAPSHOTS } from "@/data/visualization-data";
import { INSTANCE_STATUS_META, NODE_META, ROLE_LABELS, TASK_STATUS_META } from "@/lib/clinical";
import { cn, fmtDate } from "@/lib/utils";
import { LivePathwayGraph, PATHWAY_STATE_META, PathwayStateLegend } from "@/visualization/pathway/LivePathwayGraph";
import type { PathwayNodeVisualState } from "@/visualization/core/types";
import type { PathwayNode } from "@/types";

const TIME_ANCHOR: Record<string, string> = {
  ENROLLMENT: "入径后",
  ADMISSION: "入院后",
  PREVIOUS_NODE: "前置节点后",
};

const CANVAS_MIN_H = "min-h-[min(586px,calc(100vh-11.5rem))]";
const CANVAS_H = "h-[calc(100vh-11.5rem)]";

function constraintLabel(node: PathwayNode) {
  const tc = node.timeConstraint;
  if (!tc) return "未设置时间约束";
  const window = tc.windowBeforeHours || tc.windowAfterHours ? " ± 窗口" : "";
  return `${TIME_ANCHOR[tc.anchor] ?? tc.anchor} ${tc.offsetHours}h${window}${tc.hard ? " · 硬约束" : ""}`;
}

/** 深工作页：进入收成 icon rail，离开恢复进入前状态 */
function CollapseSidebarOnEnter() {
  const { open, setOpen } = useSidebar();
  useEffect(() => {
    const previous = open;
    setOpen(false);
    return () => setOpen(previous);
    // 仅挂载/卸载时处理，避免 open 变化反复收起
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount lifecycle
  }, [setOpen]);
  return null;
}

export default function PatientMapPage() {
  const { id = "" } = useParams();
  const patient = getPatient(id);
  const instance = getInstanceByPatient(id);
  const [mode, setMode] = useState<"actual" | "planned">("actual");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(true);
  const [fitSignal, setFitSignal] = useState(0);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const graph = useMemo(() => (instance ? getGraph(instance.pathwayId) : HCC_GRAPH), [instance]);

  const actualState = REPLAY_SNAPSHOTS[3].nodeStates;
  const plannedState = useMemo(() => {
    const result: Record<string, PathwayNodeVisualState> = {};
    graph.nodes.forEach((node) => {
      result[node.nodeKey] = node.type === "START" ? "completed" : "pending";
    });
    return result;
  }, [graph]);
  const stateMap = mode === "actual" ? actualState : plannedState;

  const selectedNode = graph.nodes.find((n) => n.nodeKey === selectedKey) ?? null;
  const selectedMeta = selectedNode ? NODE_META[selectedNode.type] : null;
  const relatedTasks = TASKS.filter((t) => t.instanceId === instance?.id && t.nodeKey === selectedKey);
  const relatedEvidence = (selectedNode?.evidenceRefs ?? [])
    .map((ref) => EVIDENCE_ITEMS.find((e) => e.id === ref))
    .filter((e): e is (typeof EVIDENCE_ITEMS)[number] => Boolean(e));

  const variantNodes = graph.nodes.filter((n) => stateMap[n.nodeKey] === "variant");
  const activeNodes = graph.nodes.filter((n) => stateMap[n.nodeKey] === "active");
  const completedCount = graph.nodes.filter((n) => stateMap[n.nodeKey] === "completed").length;
  const pendingCount = graph.nodes.filter((n) => (stateMap[n.nodeKey] ?? "pending") === "pending").length;
  const activeNode = graph.nodes.find((n) => stateMap[n.nodeKey] === "active") ?? null;
  const decisionNode = graph.nodes.find((n) => n.type === "DECISION") ?? null;
  const decisionState = decisionNode ? (stateMap[decisionNode.nodeKey] ?? "pending") : "pending";
  const attentionNodes = graph.nodes.filter((n) =>
    ["variant", "blocked", "unknown"].includes(stateMap[n.nodeKey] ?? ""),
  );
  const unselectedCount = graph.nodes.filter((n) => stateMap[n.nodeKey] === "not_selected").length;

  if (!patient) {
    return (
      <Page>
        <EmptyState
          icon={<Route />}
          title="患者不存在"
          action={
            <Button asChild size="sm">
              <Link to="/patients">返回患者中心</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  if (!instance) {
    return (
      <Page>
        <EmptyState
          icon={<Route />}
          title="尚未进入临床路径"
          action={
            <Button asChild size="sm">
              <Link to={`/patients/${patient.id}`}>返回患者 360</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <WorkspacePage className="min-h-0 overflow-hidden pb-0">
      <CollapseSidebarOnEnter />

      <WorkspaceIdentity className="top-14 shrink-0 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to={`/patients/${patient.id}`}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> 详情
          </Link>

          <PatientAvatar name={patient.name} id={patient.id} size="sm" risk={patient.riskLevel} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-[16px] leading-5 font-semibold tracking-[-0.02em] text-ink">{patient.name}</h1>
              <span className="text-[12px] text-muted-foreground">
                {patient.gender === "M" ? "男" : "女"} · {patient.age} 岁
              </span>
              <StatusBadge tone={INSTANCE_STATUS_META[instance.status].tone}>
                {INSTANCE_STATUS_META[instance.status].label}
              </StatusBadge>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{patient.mrn}</span>
              {patient.allergy.length > 0 && <AllergyChips allergies={patient.allergy} />}
              <SyntheticTag />
            </div>
            <p className="mt-0.5 truncate text-[12px] leading-4 text-muted-foreground">
              <span className="text-ink">{instance.currentStage}</span>
              <span className="mx-1.5 text-line-strong">·</span>
              <span className="font-mono tabular-nums text-ink">{instance.progress}%</span>
              <span className="mx-1.5 text-line-strong">·</span>
              {patient.diagnosis}
              <span className="mx-1.5 text-line-strong">·</span>
              {patient.bed} 床
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link
                to={`/patients/${patient.id}?tab=observatory${
                  activeNode?.stage
                    ? `&stage=${encodeURIComponent(activeNode.stage)}`
                    : instance.currentStage
                      ? `&stage=${encodeURIComponent(instance.currentStage)}`
                      : ""
                }${selectedKey ? `&node=${encodeURIComponent(selectedKey)}` : activeNode ? `&node=${encodeURIComponent(activeNode.nodeKey)}` : ""}`}
              >
                观测台
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/patients/${patient.id}/pathway`}>执行</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/patients/${patient.id}/replay`}>
                <PlayCircle className="size-3.5" /> 回放
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>更多</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() =>
                    toast.success("已导出路径快照", {
                      description: "导出行为写入审计日志。",
                    })
                  }
                >
                  <Download /> 导出快照
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="font-mono text-[11px]">
                  {instance.id} · V{instance.version}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </WorkspaceIdentity>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        {/* 精简工具条 */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2 md:px-5">
          <FilterPill active={mode === "actual"} onClick={() => setMode("actual")}>
            实际执行
          </FilterPill>
          <FilterPill active={mode === "planned"} onClick={() => setMode("planned")}>
            计划路径
          </FilterPill>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <div className="flex items-center gap-0.5 rounded-md border border-line bg-secondary/40 p-0.5">
            <Button size="xs" variant={view === "graph" ? "secondary" : "ghost"} onClick={() => setView("graph")}>
              <Route className="size-3" /> 图
            </Button>
            <Button size="xs" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}>
              <List className="size-3" /> 列表
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setInspectorOpen((value) => !value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors",
              inspectorOpen
                ? "border-primary/25 bg-accent text-accent-foreground"
                : "border-line text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="size-3" /> 检查器
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                <MoreHorizontal className="size-3" /> 更多
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setShowEvidence((v) => !v)}>
                <FileText /> {showEvidence ? "隐藏证据标记" : "显示证据标记"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFitSignal((v) => v + 1)}>
                <Layers /> 适应画布
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto">
            <PathwayStateLegend compact includeBlocked />
          </div>
        </div>

        {/* 主面：画布 + Inspector */}
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 overflow-hidden",
            inspectorOpen && "xl:grid-cols-[minmax(0,1fr)_320px]",
          )}
        >
          <div className={cn("relative min-h-0 min-w-0", CANVAS_MIN_H, CANVAS_H)}>
            {view === "graph" ? (
              <>
                <LivePathwayGraph
                  nodes={graph.nodes}
                  edges={graph.edges}
                  stateMap={stateMap}
                  mode={mode}
                  selectedKey={selectedKey}
                  onNodeSelect={(key) => {
                    setSelectedKey(key);
                    if (key) setInspectorOpen(true);
                  }}
                  showEvidence={showEvidence}
                  showLegend={false}
                  showModeBadge={false}
                  showDemoLabel={false}
                  height="100%"
                  fitSignal={fitSignal}
                  showMiniMap
                  focusKey={selectedKey ?? activeNode?.nodeKey ?? null}
                  defaultViewport={{ x: 0, y: 10, zoom: 0.72 }}
                  className="rounded-none border-0"
                />
                {/* 有选中且检查器已开时收起，避免与 Inspector 重复挡图 */}
                {!(inspectorOpen && selectedKey) && (
                  <div className="pointer-events-none absolute top-2 left-2 z-10 flex max-w-[min(420px,70%)] flex-col gap-1.5">
                    <div className="rounded-md border border-line bg-card/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
                      <p className="text-[9.5px] tracking-[0.04em] text-muted-foreground uppercase">当前阶段</p>
                      <p className="text-[12px] font-medium text-ink">{instance.currentStage}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {activeNode ? `执行中：${activeNode.name}` : "当前无执行中节点"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "pointer-events-auto rounded-md border bg-card/95 px-2 py-1.5 text-left shadow-sm backdrop-blur-sm transition-colors hover:border-line-strong",
                        decisionState === "unknown" ? "border-warn/40" : "border-line",
                      )}
                      onClick={() => {
                        if (decisionNode) {
                          setSelectedKey(decisionNode.nodeKey);
                          setInspectorOpen(true);
                        }
                      }}
                    >
                      <p className="text-[9.5px] tracking-[0.04em] text-muted-foreground uppercase">关键决策</p>
                      <p className="text-[12px] font-medium text-ink">{decisionNode?.name ?? "未配置决策节点"}</p>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={cn("size-1.5 rounded-full", PATHWAY_STATE_META[decisionState].dotClass)} />
                        {PATHWAY_STATE_META[decisionState].label}
                      </span>
                    </button>
                    {attentionNodes.length > 0 && (
                      <div className="rounded-md border border-risk/30 bg-risk-wash/90 px-2 py-1.5 shadow-sm backdrop-blur-sm">
                        <p className="flex items-center gap-1 text-[10.5px] font-medium text-risk">
                          <TriangleAlert className="size-3" /> {attentionNodes.length} 个节点需关注
                        </p>
                        <p className="mt-0.5 text-[10px] text-foreground/70">
                          {attentionNodes.map((n) => n.name).slice(0, 2).join("、")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="scrollbar-slim h-full overflow-auto">
                <table className="w-full min-w-[620px] text-left text-[11px]">
                  <thead className="sticky top-0 z-10 border-b border-line bg-card text-[10px] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">节点</th>
                      <th className="px-3 py-2 font-medium">阶段</th>
                      <th className="px-3 py-2 font-medium">状态</th>
                      <th className="px-3 py-2 font-medium">角色</th>
                      <th className="px-3 py-2 font-medium">时间约束</th>
                      <th className="px-3 py-2 font-medium">证据</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graph.nodes.map((node) => {
                      const state = stateMap[node.nodeKey] ?? "pending";
                      const meta = PATHWAY_STATE_META[state];
                      return (
                        <tr
                          key={node.nodeKey}
                          onClick={() => {
                            setSelectedKey(node.nodeKey);
                            setInspectorOpen(true);
                          }}
                          className={cn(
                            "cursor-pointer border-b border-line/60 last:border-0 hover:bg-secondary/40",
                            selectedKey === node.nodeKey && "bg-accent/60",
                            state === "not_selected" && "text-muted-foreground",
                          )}
                        >
                          <td className="px-3 py-2">
                            <span className="font-medium">{node.name}</span>
                            <span className="ml-1 font-mono text-[9px] text-muted-foreground">{node.nodeKey}</span>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{node.stage}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-px text-[9.5px]",
                                meta.chipClass,
                              )}
                            >
                              <span className={cn("size-1 rounded-full", meta.dotClass)} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px]">{ROLE_LABELS[node.responsibleRole]}</td>
                          <td className="px-3 py-2 text-[9.5px] text-muted-foreground">{constraintLabel(node)}</td>
                          <td className="px-3 py-2 font-mono text-[9.5px]">{node.evidenceRefs?.length ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {inspectorOpen && (
            <aside className="scrollbar-slim min-h-0 overflow-y-auto border-t border-line xl:border-t-0 xl:border-l">
              <div className="border-b border-line px-4 py-3">
                <p className="text-[12px] leading-[18px] text-muted-foreground">节点检查器</p>
                <p className="mt-0.5 text-[15px] leading-6 font-semibold tracking-[-0.02em] text-ink">
                  {selectedNode ? selectedNode.name : "路径焦点"}
                </p>
              </div>

              {selectedNode && selectedMeta ? (
                <div className="space-y-3 p-4">
                  <div className="flex items-start gap-2.5">
                    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", selectedMeta.chip)}>
                      <selectedMeta.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] leading-[22px] font-semibold text-ink">{selectedNode.name}</p>
                      <p className="mt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                        {selectedNode.type} · {selectedNode.nodeKey}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <StatusBadge
                      tone={
                        stateMap[selectedNode.nodeKey] === "completed"
                          ? "ok"
                          : stateMap[selectedNode.nodeKey] === "active"
                            ? "warn"
                            : stateMap[selectedNode.nodeKey] === "variant"
                              ? "risk"
                              : "neutral"
                      }
                    >
                      {PATHWAY_STATE_META[stateMap[selectedNode.nodeKey] ?? "pending"].label}
                    </StatusBadge>
                    <StatusBadge tone="neutral" dot={false}>
                      {ROLE_LABELS[selectedNode.responsibleRole]}
                    </StatusBadge>
                    {selectedNode.required && (
                      <StatusBadge tone="info" dot={false}>
                        必需节点
                      </StatusBadge>
                    )}
                  </div>

                  {selectedNode.description && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{selectedNode.description}</p>
                  )}

                  <div className="divide-y divide-line/70 border-y border-line/70">
                    <Field label="所属阶段" value={selectedNode.stage} />
                    <Field label="时间约束" value={constraintLabel(selectedNode)} mono />
                    <Field label="完成规则" value={selectedNode.completionRule?.name ?? "未配置"} />
                    <Field
                      label="执行状态"
                      value={
                        stateMap[selectedNode.nodeKey] === "variant"
                          ? "受变异影响，需人工确认"
                          : stateMap[selectedNode.nodeKey] === "active"
                            ? "当前执行中"
                            : stateMap[selectedNode.nodeKey] === "completed"
                              ? "已完成并归档"
                              : "尚未开始"
                      }
                    />
                  </div>

                  {relatedTasks.length > 0 && (
                    <div>
                      <p className="label-micro mb-1.5">关联任务</p>
                      {relatedTasks.map((task) => (
                        <div key={task.id} className="rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium">{task.name}</span>
                            <StatusBadge tone={TASK_STATUS_META[task.status].tone} dot={false}>
                              {TASK_STATUS_META[task.status].label}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-[9.5px] text-muted-foreground">
                            {task.assignee} · 截止 {fmtDate(task.dueAt, true)} {task.overdue ? "· 已超时" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="label-micro mb-1.5">证据引用</p>
                    {relatedEvidence.length === 0 ? (
                      <p className="text-[10.5px] text-muted-foreground">该节点未绑定证据条目。</p>
                    ) : (
                      <div className="space-y-1">
                        {relatedEvidence.map((ev) => (
                          <div key={ev.id} className="rounded-md border border-line px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-muted-foreground">{ev.id}</span>
                              <span className="rounded-[2px] bg-info-wash px-1 text-[8.5px] text-info">{ev.grade} 级</span>
                            </div>
                            <p className="mt-0.5 text-[10.5px] leading-snug">{ev.title}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {ev.source} · {ev.year}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Callout tone="info" title="节点状态来源于执行实例">
                    状态由任务事件、临床事件与安全校验共同计算；UNKNOWN 不会被当作满足条件。
                  </Callout>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <SectionHead title="执行焦点" description="阶段 · 决策 · 需关注" />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "已完成", value: completedCount, tone: "text-primary" },
                      { label: "待执行", value: pendingCount, tone: "text-muted-foreground" },
                      { label: "变异", value: variantNodes.length, tone: "text-risk" },
                      { label: "执行中", value: activeNodes.length, tone: "text-warn" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                        <p className={cn("mt-0.5 tabular text-[18px] font-semibold", s.tone)}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md border border-line px-2.5 py-2">
                    <p className="text-[9.5px] text-muted-foreground">当前阶段</p>
                    <p className="mt-0.5 text-[12px] font-medium">{instance.currentStage}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {activeNode ? `正在执行：${activeNode.name}` : "当前无执行中节点"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md border px-2.5 py-2 text-left",
                      decisionState === "unknown" ? "border-warn/35 bg-warn-wash/30" : "border-line",
                    )}
                    onClick={() => decisionNode && setSelectedKey(decisionNode.nodeKey)}
                  >
                    <p className="text-[9.5px] text-muted-foreground">关键决策</p>
                    <p className="mt-0.5 text-[12px] font-medium">{decisionNode?.name ?? "未配置"}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", PATHWAY_STATE_META[decisionState].dotClass)} />
                      {PATHWAY_STATE_META[decisionState].label}
                    </p>
                  </button>

                  <div
                    className={cn(
                      "rounded-md border px-2.5 py-2",
                      attentionNodes.length > 0 ? "border-risk/25 bg-risk-wash/20" : "border-line",
                    )}
                  >
                    <p className="text-[9.5px] text-muted-foreground">需要关注</p>
                    <p className="mt-0.5 text-[12px] font-medium">
                      {attentionNodes.length > 0
                        ? `${attentionNodes.length} 个节点需要人工确认`
                        : "当前无变异或阻断节点"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {attentionNodes.length > 0
                        ? attentionNodes.map((n) => n.name).slice(0, 2).join("、")
                        : `${unselectedCount} 个未选分支不生成任务`}
                    </p>
                  </div>

                  {[...activeNodes, ...variantNodes].length > 0 && (
                    <div className="space-y-1.5">
                      <p className="label-micro">节点关注列表</p>
                      {[...activeNodes, ...variantNodes].slice(0, 6).map((node) => {
                        const meta = NODE_META[node.type];
                        const Icon = meta.icon;
                        const state = stateMap[node.nodeKey];
                        return (
                          <button
                            key={node.nodeKey}
                            type="button"
                            onClick={() => setSelectedKey(node.nodeKey)}
                            className="flex w-full items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left transition-colors hover:border-line-strong hover:bg-secondary/30"
                          >
                            <span className={cn("flex size-6 items-center justify-center rounded-[4px]", meta.chip)}>
                              <Icon className="size-3" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10.5px] font-medium">{node.name}</span>
                              <span className="block text-[9px] text-muted-foreground">{node.stage}</span>
                            </span>
                            <StatusBadge tone={state === "variant" ? "risk" : "warn"} dot={false}>
                              {state === "variant" ? "变异" : "执行中"}
                            </StatusBadge>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="rounded-md border border-ok/20 bg-ok-wash/60 px-2.5 py-2">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-ok">
                      <ShieldCheck className="size-3" /> 安全约束通过
                    </p>
                    <p className="mt-1 text-[10px] text-foreground/65">
                      RULE-005：INR 1.12、PLT 168×10⁹/L，手术任务未阻断。
                    </p>
                  </div>

                  <PathwayStateLegend />
                  <p className="text-[10px] text-muted-foreground">点击画布节点查看属性、时间约束与证据。</p>
                </div>
              )}
            </aside>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-1.5 text-[10px] text-muted-foreground md:px-5">
          <span className="flex items-center gap-1">
            <CircleDot className="size-2.5" /> 状态由运行时任务事件驱动；计划/实际切换不修改正式计划。
          </span>
          <span className="flex items-center gap-3">
            <span className="font-mono">VIS-001</span>
            <Link
              to={`/patients/${patient.id}/replay`}
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              病程回放 <ArrowRight className="size-3" />
            </Link>
          </span>
        </div>
      </div>
    </WorkspacePage>
  );
}
