import { useMemo, useState } from "react";
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
  PlayCircle,
  Route,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { FilterPill } from "@/components/app/toolbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

function constraintLabel(node: PathwayNode) {
  const tc = node.timeConstraint;
  if (!tc) return "未设置时间约束";
  const window = tc.windowBeforeHours || tc.windowAfterHours ? " ± 窗口" : "";
  return `${TIME_ANCHOR[tc.anchor] ?? tc.anchor} ${tc.offsetHours}h${window}${tc.hard ? " · 硬约束" : ""}`;
}

export default function PatientMapPage() {
  const { id = "" } = useParams();
  const patient = getPatient(id);
  const instance = getInstanceByPatient(id);
  const [mode, setMode] = useState<"actual" | "planned">("actual");
  const [selectedKey, setSelectedKey] = useState<string | null>("imaging");
  const [showEvidence, setShowEvidence] = useState(true);
  const [fitSignal, setFitSignal] = useState(0);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [inspectorOpen, setInspectorOpen] = useState(true);

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
  const attentionNodes = graph.nodes.filter((n) => ["variant", "blocked", "unknown"].includes(stateMap[n.nodeKey] ?? ""));
  const unselectedCount = graph.nodes.filter((n) => stateMap[n.nodeKey] === "not_selected").length;

  if (!patient) {
    return (
      <Page>
        <EmptyState
          icon={<Route />}
          title="患者不存在"
          description="无法找到对应患者档案，请返回患者中心重新选择。"
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
        <PageHeader
          module="VIS-001 · 动态临床路径图"
          title={`${patient.name} · 路径实时视图`}
          description="该患者尚未绑定路径实例，无法展示实时执行状态。"
          actions={<SyntheticTag />}
        />
        <EmptyState
          icon={<Route />}
          title="尚未进入临床路径"
          description="患者尚未确认入径或实例已结束。可先在患者中心完成入径匹配与医生确认。"
          action={
            <Button asChild size="sm">
              <Link to={`/patients/${patient.id}`}>返回患者详情</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page wide>
      <PageHeader
        module="VIS-001 · 动态临床路径图"
        eyebrow="HCC Clinical Intelligence · 患者执行视图"
        title={`${patient.name} · 路径实时视图`}
        description="以患者实例的实时执行状态驱动路径图：已完成、执行中、变异、待执行一目了然；支持计划 / 实际切换、节点证据追溯与版本锁定。"
        meta={
          <>
            <PageMeta label="路径实例" value={instance.id} mono />
            <PageMeta label="模板版本" value={`${instance.version} · 已锁定`} mono />
            <PageMeta label="当前阶段" value={instance.currentStage} />
            <PageMeta label="整体进度" value={`${instance.progress}%`} mono />
            <SyntheticTag />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to={`/patients/${patient.id}/pathway`}>
                <ArrowLeft className="size-3.5" /> 返回执行
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/patients/${patient.id}/replay`}>
                <PlayCircle className="size-3.5" /> 病程回放
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success("已导出路径快照（合成演示）", {
                  description: "PDF 将标注合成数据与版本信息，导出行为写入审计日志（演示）。",
                })
              }
            >
              <Download className="size-3.5" /> 导出
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <div className="flex min-w-[220px] items-center gap-3">
            <PatientAvatar name={patient.name} id={patient.id} size="lg" risk={patient.riskLevel} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{patient.name}</span>
                <span className="text-[11.5px] text-muted-foreground">
                  {patient.gender === "M" ? "男" : "女"} · {patient.age} 岁
                </span>
                <StatusBadge tone={INSTANCE_STATUS_META[instance.status].tone}>
                  {INSTANCE_STATUS_META[instance.status].label}
                </StatusBadge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {patient.diagnosis} · {patient.stage} · {patient.ward} · {patient.bed}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-2">
            <div className="min-w-[160px]">
              <p className="text-[9.5px] text-muted-foreground">路径进度</p>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={instance.progress} className="h-1.5 w-32" />
                <span className="tabular font-mono text-[11px]">{instance.progress}%</span>
              </div>
            </div>
            <div>
              <p className="text-[9.5px] text-muted-foreground">入径日期</p>
              <p className="mt-0.5 font-mono text-[11px]">{fmtDate(instance.enrolledAt)}</p>
            </div>
            <div>
              <p className="text-[9.5px] text-muted-foreground">责任医生</p>
              <p className="mt-0.5 text-[11px]">{instance.responsibleDoctor}</p>
            </div>
            <div>
              <p className="text-[9.5px] text-muted-foreground">数据完整度</p>
              <p className="mt-0.5 font-mono text-[11px]">{instance.dataCompleteness}%</p>
            </div>
            <div>
              <p className="text-[9.5px] text-muted-foreground">节点完成</p>
              <p className="mt-0.5 font-mono text-[11px]">
                {completedCount}/{graph.nodes.length}
              </p>
            </div>
            {patient.flags.slice(0, 2).map((flag) => (
              <span
                key={flag}
                className="rounded-[3px] border border-line bg-secondary/60 px-1.5 py-0.5 text-[9.5px] text-muted-foreground"
              >
                {flag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="px-4 py-3">
          <p className="label-micro">当前阶段</p>
          <p className="mt-1 text-[13px] font-semibold">{instance.currentStage}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {activeNode ? `正在执行：${activeNode.name}` : "当前无执行中节点"}
          </p>
        </Card>
        <Card className={cn("px-4 py-3", decisionState === "unknown" && "border-warn/35 bg-warn-wash/30")}>
          <p className="label-micro">关键决策</p>
          <p className="mt-1 text-[13px] font-semibold">{decisionNode?.name ?? "未配置决策节点"}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", PATHWAY_STATE_META[decisionState].dotClass)} />
            <span className="text-[10px] text-muted-foreground">{PATHWAY_STATE_META[decisionState].label} · 规则轨迹以服务端为准</span>
          </div>
        </Card>
        <Card className={cn("px-4 py-3", attentionNodes.length > 0 && "border-risk/25 bg-risk-wash/20")}>
          <p className="label-micro">需要关注</p>
          <p className="mt-1 text-[13px] font-semibold">
            {attentionNodes.length > 0 ? `${attentionNodes.length} 个节点需要人工确认` : "当前无变异或阻断节点"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {attentionNodes.length > 0
              ? attentionNodes.map((n) => n.name).slice(0, 2).join("、")
              : `${unselectedCount} 个未选分支不生成任务`}
          </p>
        </Card>
      </div>

      <div className={cn("grid grid-cols-1 gap-4", inspectorOpen && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="min-w-0">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
              <FilterPill active={mode === "actual"} onClick={() => setMode("actual")}>
                实际执行
              </FilterPill>
              <FilterPill active={mode === "planned"} onClick={() => setMode("planned")}>
                计划路径
              </FilterPill>
              <span className="mx-1 h-4 w-px bg-line" />
              <button
                onClick={() => setInspectorOpen((value) => !value)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors",
                  inspectorOpen ? "border-primary/25 bg-accent text-accent-foreground" : "border-line text-muted-foreground hover:text-foreground",
                )}
              >
                <FileText className="size-3" /> 检查器
              </button>
              <div className="flex items-center gap-1 rounded-md border border-line bg-secondary/40 p-0.5">
                <Button size="xs" variant={view === "graph" ? "secondary" : "ghost"} onClick={() => setView("graph")}>
                  <Route className="size-3" /> 图
                </Button>
                <Button size="xs" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}>
                  <List className="size-3" /> 列表
                </Button>
              </div>
              <button
                onClick={() => setShowEvidence((v) => !v)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors",
                  showEvidence
                    ? "border-primary/25 bg-accent text-accent-foreground"
                    : "border-line text-muted-foreground hover:text-foreground",
                )}
              >
                <FileText className="size-3" /> 证据标记
              </button>
              <button
                onClick={() => setFitSignal((v) => v + 1)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Layers className="size-3" /> 适应画布
              </button>
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/50 px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                V{instance.version} · 已锁定
              </span>
              <div className="ml-auto flex items-center gap-2">
                <PathwayStateLegend compact includeBlocked />
              </div>
            </div>

            <div className={cn("grid grid-cols-1", inspectorOpen && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
              {view === "graph" ? (
                <div className="relative border-b border-line lg:border-r lg:border-b-0">
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
                    height={586}
                    fitSignal={fitSignal}
                    showMiniMap
                    focusKey={selectedKey ?? activeNode?.nodeKey ?? null}
                    defaultViewport={{ x: 0, y: 10, zoom: 0.72 }}
                  />
                  <div className="pointer-events-none absolute top-2 left-2 rounded-[3px] border border-line bg-card/95 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {mode === "actual" ? "ACTUAL · D3 当前状态" : "PLANNED · 标准路径"}
                  </div>
                </div>
              ) : (
                <div className="scrollbar-slim max-h-[586px] overflow-auto border-b border-line lg:border-r lg:border-b-0">
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
                            onClick={() => setSelectedKey(node.nodeKey)}
                            className={cn(
                              "cursor-pointer border-b border-line/60 last:border-0 hover:bg-secondary/40",
                              selectedKey === node.nodeKey && "bg-accent/60",
                              state === "not_selected" && "text-muted-foreground",
                            )}
                          >
                            <td className="px-3 py-2"><span className="font-medium">{node.name}</span><span className="ml-1 font-mono text-[9px] text-muted-foreground">{node.nodeKey}</span></td>
                            <td className="px-3 py-2 text-[10px] text-muted-foreground">{node.stage}</td>
                            <td className="px-3 py-2"><span className={cn("inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-px text-[9.5px]", meta.chipClass)}><span className={cn("size-1 rounded-full", meta.dotClass)} />{meta.label}</span></td>
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

              {inspectorOpen && <div className="scrollbar-slim max-h-[640px] overflow-y-auto">
                <div className="border-b border-line px-4 py-3">
                  <p className="text-[12px] leading-[18px] text-muted-foreground">节点检查器</p>
                  <p className="mt-0.5 text-[16px] leading-6 font-semibold tracking-[-0.02em] text-ink">选中节点详情</p>
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
                        {stateMap[selectedNode.nodeKey] === "completed"
                          ? "已完成"
                          : stateMap[selectedNode.nodeKey] === "active"
                            ? "执行中"
                            : stateMap[selectedNode.nodeKey] === "variant"
                              ? "变异"
                              : "待执行"}
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
                  <div className="space-y-3 p-3.5">
                    <SectionHead title="患者与路径摘要" />
                    <div className="rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <PatientAvatar name={patient.name} id={patient.id} size="sm" />
                        <div>
                          <p className="text-[11px] font-medium">
                            {patient.name} · {patient.diagnosis}
                          </p>
                          <p className="text-[9.5px] text-muted-foreground">当前阶段：{instance.currentStage}</p>
                        </div>
                      </div>
                    </div>
                    <PathwayStateLegend />
                    <Callout tone="warn" title={`${variantNodes.length + activeNodes.length} 个节点需关注`}>
                      {variantNodes.length > 0 && <span className="block">变异节点：{variantNodes.map((n) => n.name).join("、")}</span>}
                      {activeNodes.length > 0 && <span className="block">执行中：{activeNodes.map((n) => n.name).join("、")}</span>}
                    </Callout>
                    <p className="text-[10px] text-muted-foreground">点击画布中的节点查看属性、时间约束与证据引用。</p>
                  </div>
                )}
              </div>}
            </div>
          </Card>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CircleDot className="size-2.5" /> 状态由运行时任务事件驱动；计划/实际切换不修改任何正式计划。
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono">VIS-001 · 合成演示数据</span>
              <Link to={`/patients/${patient.id}/replay`} className="inline-flex items-center gap-0.5 text-primary hover:underline">
                进入病程回放 <ArrowRight className="size-3" />
              </Link>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="执行概览" description="实时状态与风险提示" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "已完成节点", value: completedCount, tone: "text-primary" },
                  { label: "需关注节点", value: variantNodes.length + activeNodes.length, tone: "text-warn" },
                  { label: "变异节点", value: variantNodes.length, tone: "text-risk" },
                  { label: "待执行节点", value: pendingCount, tone: "text-muted-foreground" },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    <p className={cn("mt-0.5 tabular text-[18px] font-semibold", s.tone)}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-risk/25 bg-risk-wash/70 px-2.5 py-2">
                <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-risk">
                  <TriangleAlert className="size-3" /> 需要人工确认
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-foreground/65">
                  「影像检查」门静脉癌栓待复核；「术后镇痛」方案偏离路径。变异不会自动改变正式方案。
                </p>
              </div>
              <div className="rounded-md border border-ok/20 bg-ok-wash/60 px-2.5 py-2">
                <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-ok">
                  <ShieldCheck className="size-3" /> 安全约束通过
                </p>
                <p className="mt-1 text-[10px] text-foreground/65">RULE-005：INR 1.12、PLT 168×10⁹/L，手术任务未阻断。</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="节点关注列表" description="执行中 / 变异节点" />
            </CardHeader>
            <CardContent className="space-y-1.5">
              {[...activeNodes, ...variantNodes].slice(0, 6).map((node) => {
                const meta = NODE_META[node.type];
                const Icon = meta.icon;
                const state = stateMap[node.nodeKey];
                return (
                  <button
                    key={node.nodeKey}
                    onClick={() => setSelectedKey(node.nodeKey)}
                    className="flex w-full items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left transition-colors hover:border-line-strong hover:bg-secondary/30"
                  >
                    <span className={cn("flex size-6 items-center justify-center rounded-[4px]", meta.chip)}>
                      <Icon className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10.5px] font-medium">{node.name}</span>
                      <span className="block text-[9px] text-muted-foreground">
                        {node.stage} · {ROLE_LABELS[node.responsibleRole]}
                      </span>
                    </span>
                    <StatusBadge tone={state === "variant" ? "risk" : "warn"} dot={false}>
                      {state === "variant" ? "变异" : "执行中"}
                    </StatusBadge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="版本与数据" />
            </CardHeader>
            <CardContent>
              <Field label="模板版本" value={`V${instance.version}`} mono />
              <Field label="锁定时间" value={fmtDate(instance.enrolledAt)} mono />
              <Field label="实例修订" value={`R${instance.revision}`} mono />
              <Field label="数据完整度" value={`${instance.dataCompleteness}%`} />
              <p className="mt-2 text-[9.5px] leading-relaxed text-muted-foreground/70">
                路径图只读取实例与任务事件，不修改正式计划。所有节点证据均来自已发布版本。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
