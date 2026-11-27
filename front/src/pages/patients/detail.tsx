import { useEffect, useState } from "react";
import { IS_SERVER_MODE } from "@/lib/data-mode";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Download,
  ExternalLink,
  FlaskConical,
  GitBranch,
  History,
  Map as MapIcon,
  MoreHorizontal,
  PanelRight,
  PhoneCall,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { ClinicalEvent, Observation, Patient, Task } from "@/types";
import {
  CLINICAL_EVENTS,
  getClinicalEvents,
  getObservations,
  getPatient,
  getPlans,
  getVariations,
  addDays,
} from "@/data";
import {
  INSTANCE_STATUS_META,
  NODE_META,
  PLAN_STATUS_META,
  RISK_META,
  ROLE_LABELS,
  TASK_STATUS_META,
  VARIATION_TYPE_META,
} from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";
import { Page } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PatientHeaderCard } from "@/components/patient/patient-header";
import { ClinicalCopilot } from "@/components/patient/clinical-copilot";
import {
  WorkspaceColumns,
  WorkspacePage,
  WorkspacePanel,
  WorkspaceIdentity,
} from "@/components/patient/clinical-workspace";
import {
  CLINICAL_STAGES,
  StageStateBadge,
  deriveStageStates,
  getPatientInstance,
  isTerminalTask,
  usePatientTasks,
} from "@/components/patient/stages";
import { PathwayExecutionPanel } from "@/components/patient/pathway-execution";
import { OverviewGroupedSheet } from "@/components/patient/overview-grouped-sheet";
import { ClinicalObservatory } from "@/components/patient/clinical-observatory";
import {
  buildPatientCdssActions,
  buildPatientObservatoryData,
  stageIdFromClinicalName,
} from "@/components/patient/observatory-data";
import { getStateForPatient } from "@/components/patient/patient-state";
import { ObservationPanel } from "@/components/patient/observation-table";
import { KeyLabTrendsCard } from "@/components/patient/key-lab-trends";
import { PatientTimeline } from "@/visualization/patient/PatientTimeline";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import { ClinicalTrendLinkage } from "@/visualization/patient/ClinicalTrendLinkage";
import ServerPatientDetailPage from "./detail-server";

/* ------------------------------ 页脚小组件 ------------------------------ */

const VARIATION_STATUS_META: Record<string, { label: string; tone: "ok" | "warn" | "risk" | "neutral" | "info" }> = {
  OPEN: { label: "待处理", tone: "warn" },
  ASSESSING: { label: "评估中", tone: "info" },
  REPLAN_PENDING: { label: "待重规划", tone: "risk" },
  RESOLVED: { label: "已解决", tone: "ok" },
  CLOSED: { label: "已关闭", tone: "neutral" },
};

const VITAL_ORDER: Record<string, number> = {
  "VS-TEMP": 1,
  "VS-PULSE": 2,
  "VS-RR": 3,
  "VS-BP": 4,
  "VS-SPO2": 5,
};
const VITAL_LABEL: Record<string, string> = {
  "VS-TEMP": "体温",
  "VS-PULSE": "脉搏",
  "VS-RR": "呼吸",
  "VS-BP": "血压",
  "VS-SPO2": "血氧",
};

function latestVitals(observations: Observation[]) {
  const map = new Map<string, Observation>();
  observations
    .filter((o) => o.category === "VITAL")
    .forEach((o) => {
      const prev = map.get(o.code);
      if (!prev || +new Date(o.observedAt) > +new Date(prev.observedAt)) map.set(o.code, o);
    });
  return Array.from(map.values()).sort((a, b) => (VITAL_ORDER[a.code] ?? 9) - (VITAL_ORDER[b.code] ?? 9));
}

function TaskLine({ task }: { task: Task }) {
  const node = NODE_META[task.type];
  const Icon = node.icon;
  const status = TASK_STATUS_META[task.status];
  return (
    <div className="flex items-center gap-2 py-2">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate text-[13px] font-medium text-ink">{task.name}</span>
          {task.overdue && !isTerminalTask(task.status) && (
            <span className="shrink-0 text-[11px] text-risk">超时</span>
          )}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {ROLE_LABELS[task.role]} · {task.assignee} · {fmtDate(task.dueAt)} {fmtTime(task.dueAt)}
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{status.label}</span>
    </div>
  );
}

/* ------------------------------ 页面 ------------------------------ */

export default function PatientDetailPage() {
  const { id = "" } = useParams();
  if (IS_SERVER_MODE) {
    return <ServerPatientDetailPage />;
  }
  const patient = getPatient(id);

  if (!patient) {
    return (
      <Page>
        <EmptyState
          icon={<UserRound />}
          title="未找到该患者"
          description={`患者标识 ${id} 在在管病例集中不存在，可能已被移除或链接有误。`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/patients">
                <ArrowLeft className="size-3.5" /> 返回患者中心
              </Link>
            </Button>
          }
        />
      </Page>
    );
  }

  return <PatientDetailContent patient={patient} />;
}

function PatientDetailContent({ patient }: { patient: Patient }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const instance = getPatientInstance(patient);
  const { tasks, derived } = usePatientTasks(patient);
  const state = getStateForPatient(patient, instance);
  const observations = getObservations(patient.id);
  const rawEvents = getClinicalEvents(patient.id);
  const events: ClinicalEvent[] = rawEvents.length ? rawEvents : CLINICAL_EVENTS;
  const eventsAreFallback = rawEvents.length === 0;
  const variations = getVariations(patient.id);
  const plans = instance ? getPlans(instance.id) : [];
  const stageStates = deriveStageStates(tasks);
  const currentStage = CLINICAL_STAGES.find((s) => stageStates[s] === "ACTIVE");
  const vitals = latestVitals(observations);
  const abnormalVitals = vitals.filter((v) => v.flag === "HIGH" || v.flag === "LOW");
  const executionLink = `/patients/${patient.id}/pathway`;
  const planningLink = instance ? `/planning/${instance.id}` : null;

  const notifyDemo = (message: string) => toast.info(`${message}`);
  const openTasks = tasks.filter((t) => !isTerminalTask(t.status));
  const overdueTasks = openTasks.filter((t) => t.overdue);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [cdssOpen, setCdssOpen] = useState(false);
  const tabFromUrl = searchParams.get("tab");
  const [workspaceTab, setWorkspaceTab] = useState(tabFromUrl || "observatory");
  const [focusStage, setFocusStage] = useState(currentStage ?? "");
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>();
  const stageForTasks = focusStage || currentStage || "";
  const stageTasks = (stageForTasks ? tasks.filter((t) => t.stage === stageForTasks) : tasks).slice(0, 10);
  const deepStageId =
    stageIdFromClinicalName(searchParams.get("stage")) ?? searchParams.get("stageId");
  const deepNodeKey = searchParams.get("node");

  const cdssPending = (() => {
    const wm = buildPatientObservatoryData({ patient, instance, tasks, state });
    return buildPatientCdssActions({ data: wm, tasks }).filter((a) => a.severity !== "info").length;
  })();

  useEffect(() => {
    if (tabFromUrl) setWorkspaceTab(tabFromUrl);
  }, [tabFromUrl]);

  const onWorkspaceTabChange = (value: string) => {
    setWorkspaceTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === "observatory") next.set("tab", "observatory");
    else next.delete("tab");
    if (value !== "observatory") {
      next.delete("stage");
      next.delete("stageId");
      next.delete("node");
      setCdssOpen(false);
    }
    setSearchParams(next, { replace: true });
  };

  const openCdss = () => {
    onWorkspaceTabChange("observatory");
    setCdssOpen(true);
  };

  return (
    <WorkspacePage>
      <WorkspaceIdentity>
        <PatientHeaderCard
          patient={patient}
          currentStage={currentStage ?? "未开始"}
          dataAsOf={state.snapshotAt}
          meta={<SyntheticTag />}
          actions={
            <>
              <Button size="sm" onClick={() => setCopilotOpen(true)}>
                <Sparkles className="size-3.5" />
                副驾驶
                {overdueTasks.length > 0 && (
                  <span className="ml-1 font-mono text-[11px] tabular-nums">{overdueTasks.length}</span>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={openCdss}>
                <PanelRight className="size-3.5" />
                CDSS
                {cdssPending > 0 ? (
                  <span className="ml-1 font-mono text-[11px] tabular-nums">{cdssPending}</span>
                ) : null}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>更多</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to={executionLink}>
                      <Activity /> 执行中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/patients/${patient.id}/map`}>
                      <MapIcon /> 动态路径图
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/patients/${patient.id}/replay`}>
                      <History /> 病程回放
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {planningLink ? (
                    <DropdownMenuItem asChild>
                      <Link to={planningLink}>
                        <Sparkles /> 生成规划
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => notifyDemo("该患者尚无路径实例，无法生成规划")}>
                      <Sparkles /> 生成规划
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => notifyDemo("已导出患者档案（PDF）")}>
                    <Download /> 导出
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => notifyDemo("已登记人工变异记录")}>
                    <GitBranch /> 登记变异
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => notifyDemo("退出路径需在路径执行页填写理由")}>
                    <AlertTriangle /> 申请退出路径
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      </WorkspaceIdentity>

      <Tabs
        value={workspaceTab}
        onValueChange={onWorkspaceTabChange}
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0"
      >
        <div className="border-b border-line bg-surface px-4 md:px-5">
          <TabsList className="h-9 w-full justify-start gap-0 overflow-x-auto rounded-none border-0 bg-transparent p-0 scrollbar-slim">
            {(
              [
                { value: "observatory", label: "观测台" },
                { value: "overview", label: "本阶段" },
                { value: "pathway", label: "阶段任务" },
                { value: "observations", label: `检验 ${observations.length}` },
                { value: "timeline", label: "时间轴" },
                { value: "variations", label: variations.length ? `变异 ${variations.length}` : "变异" },
                { value: "followup", label: "随访" },
              ] as const
            ).map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={cn(
                  "h-9 rounded-none border-b-2 border-transparent px-3 text-[13px] data-[state=active]:border-ink data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  t.value === "observatory" && "data-[state=active]:border-[#2ec4b6]",
                )}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ------------------------------ 执行 · 路径甘特 + 本阶段任务 ------------------------------ */}
        <TabsContent value="overview" className="mt-0 flex min-h-0 w-full min-w-0 flex-1 flex-col data-[state=inactive]:hidden">
          <WorkspaceColumns
            left={
              <OverviewGroupedSheet
                facts={[
                  { label: "入院", value: fmtDate(patient.admissionAt), mono: true },
                  { label: "住院", value: `${patient.los}d`, mono: true },
                  { label: "床位", value: patient.bed, mono: true },
                  { label: "医生", value: patient.attending },
                  {
                    label: "完整度",
                    value: `${state.dataCompleteness}%`,
                    mono: true,
                    hint: state.fields.filter((f) => f.status === "UNKNOWN").length
                      ? `${state.fields.filter((f) => f.status === "UNKNOWN").length} UNKNOWN`
                      : undefined,
                    tone: state.fields.some((f) => f.status === "UNKNOWN") ? "warn" : "default",
                  },
                ]}
                staging={[
                  { label: "分期", value: patient.stage },
                  { label: "ICD", value: patient.diagnosisCode, mono: true },
                ]}
                missing={state.missingFields.map((f) => f.split(".").slice(-1)[0])}
                vitals={latestVitals(observations)
                  .slice(0, 5)
                  .map((v) => ({
                    code: v.code,
                    label: VITAL_LABEL[v.code] ?? v.name,
                    value: String(v.value),
                    unit: v.unit,
                    flag: v.flag,
                  }))}
              />
            }
            center={
              <>
                <WorkspacePanel
                  title="路径"
                  action={
                    <div className="flex items-center gap-3 text-[12px]">
                      <Link to={`/patients/${patient.id}/map`} className="text-muted-foreground hover:text-ink">
                        路径图
                      </Link>
                      <Link to={executionLink} className="text-muted-foreground hover:text-ink">
                        执行中心
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCopilotOpen(true)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-ink"
                      >
                        <Sparkles className="size-3" /> 副驾驶
                      </button>
                    </div>
                  }
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {(instance || patient.pathwayVersion) && (
                      <span className="font-mono text-[12px] text-muted-foreground">
                        V{instance?.version ?? patient.pathwayVersion}
                      </span>
                    )}
                    {instance && (
                      <StatusBadge tone={INSTANCE_STATUS_META[instance.status].tone}>
                        {INSTANCE_STATUS_META[instance.status].label}
                      </StatusBadge>
                    )}
                  </div>
                  {(instance || patient.pathwayName) ? (
                    <PathwayExecutionPanel
                      tasks={tasks}
                      progress={instance?.progress ?? patient.progress}
                      pathwayName={instance?.pathwayName ?? patient.pathwayName ?? undefined}
                      selectedStage={focusStage}
                      onSelectStage={setFocusStage}
                      selectedTaskId={focusTaskId}
                      onSelectTask={setFocusTaskId}
                    />
                  ) : (
                    <EmptyState
                      className="mt-2 py-8"
                      title="尚未入径"
                      icon={<GitBranch />}
                    />
                  )}
                  {derived && (
                    <p className="mt-2 text-[12px] text-muted-foreground">阶段由住院进度推演。</p>
                  )}
                </WorkspacePanel>

                <WorkspacePanel
                  title={stageForTasks ? `${stageForTasks} · 任务` : "本阶段任务"}
                  action={
                    <div className="flex items-center gap-2 text-[12px]">
                      {overdueTasks.filter((t) => !stageForTasks || t.stage === stageForTasks).length > 0 && (
                        <span className="text-risk">
                          超时 {overdueTasks.filter((t) => !stageForTasks || t.stage === stageForTasks).length}
                        </span>
                      )}
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {stageTasks.length}
                      </span>
                    </div>
                  }
                >
                  <div className="divide-y divide-line border-t border-line">
                    {stageTasks.map((t) => (
                      <div
                        key={t.id}
                        className={cn(focusTaskId === t.id && "bg-secondary/50")}
                      >
                        <TaskLine task={t} />
                      </div>
                    ))}
                    {!stageTasks.length && (
                      <p className="py-6 text-center text-[13px] text-muted-foreground">暂无任务</p>
                    )}
                  </div>
                </WorkspacePanel>

                {(plans[0] || patient.presentIllness) && (
                  <WorkspacePanel title="摘要" quiet>
                    {plans[0] && (
                      <p className="mb-2 text-[12px] leading-[18px] text-muted-foreground">
                        计划 {plans[0].version} · {PLAN_STATUS_META[plans[0].status].label}
                        {planningLink && (
                          <>
                            {" · "}
                            <Link to={planningLink} className="text-ink hover:underline">
                              打开规划
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                    <p className="max-w-3xl text-[13px] leading-[20px] text-muted-foreground">
                      {patient.presentIllness}
                    </p>
                    {abnormalVitals.length > 0 && (
                      <p className="mt-2 text-[12px] text-warn">
                        体征异常 {abnormalVitals.length} · 见检验页
                      </p>
                    )}
                  </WorkspacePanel>
                )}
              </>
            }
          />
        </TabsContent>

        {/* ------------------------------ 观测台 · 路径 × CDSS × 世界模型 ------------------------------ */}
        <TabsContent
          value="observatory"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto bg-canvas p-3 md:p-4 data-[state=inactive]:hidden"
        >
          <ClinicalObservatory
            embedded
            showPillars={false}
            patient={patient}
            instance={instance}
            tasks={tasks}
            state={state}
            initialStageId={deepStageId}
            initialNodeKey={deepNodeKey}
            cdssOpen={cdssOpen}
            onCdssOpenChange={setCdssOpen}
            pathwayLabel={(() => {
              const name = instance?.pathwayName ?? patient.pathwayName;
              if (!name) return undefined;
              const ver = instance?.version ?? patient.pathwayVersion;
              return ver ? `${name} · V${ver}` : name;
            })()}
          />
        </TabsContent>

        {/* ------------------------------ 临床路径 ------------------------------ */}
        <TabsContent value="pathway" className="mt-0 space-y-4 bg-canvas p-4 md:p-5 data-[state=inactive]:hidden">
          {derived && (
            <Callout tone="info" title="推演任务">
              该患者未关联实时执行任务，以下任务按住院进度推导生成，仅用于界面展示；实际执行请以路径实例任务为准。
            </Callout>
          )}
          <Card>
            <CardHeader>
              <SectionHead
                title="阶段与任务"
                description={`${CLINICAL_STAGES.filter((s) => tasks.some((t) => t.stage === s)).length} 个阶段 · 共 ${tasks.length} 项任务`}
                action={
                  <Button size="sm" variant="outline" asChild>
                    <Link to={executionLink}>
                      <Activity className="size-3.5" /> 前往执行中心
                    </Link>
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {CLINICAL_STAGES.map((stage) => {
                const list = tasks.filter((t) => t.stage === stage);
                if (!list.length) return null;
                const stateForStage = stageStates[stage];
                return (
                  <div key={stage}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold">{stage}</span>
                      <StageStateBadge state={stateForStage} />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {list.filter((t) => t.status === "COMPLETED").length}/{list.length} 完成
                      </span>
                    </div>
                    <div className="divide-y divide-line/70 rounded-md border border-line bg-card px-3">
                      {list.map((t) => (
                        <TaskLine key={t.id} task={t} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {plans.length > 0 && (
            <Card>
              <CardHeader>
                <SectionHead
                  title="计划版本"
                  count={plans.length}
                  action={
                    planningLink ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={planningLink}>
                          <Sparkles className="size-3.5" /> 规划工作台
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              </CardHeader>
              <CardContent className="space-y-2">
                {plans.map((plan) => {
                  const meta = PLAN_STATUS_META[plan.status];
                  return (
                    <div key={plan.id} className="rounded-md border border-line bg-secondary/20 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {plan.version}
                        </Badge>
                        <StatusBadge tone={meta.tone} dot={false}>
                          {meta.label}
                        </StatusBadge>
                        <span className="font-mono text-[9.5px] text-muted-foreground">{plan.id}</span>
                        <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">
                          {fmtDate(plan.createdAt, true)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{plan.summary}</p>
                      <p className="mt-1 font-mono text-[9.5px] text-muted-foreground/80">
                        创建 {plan.createdBy}
                        {plan.approvedBy ? ` · 审核 ${plan.approvedBy} @ ${fmtDate(plan.approvedAt ?? plan.createdAt, true)}` : ""}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------------------------------ 检验检查 ------------------------------ */}
        <TabsContent value="observations" className="mt-0 space-y-4 bg-canvas p-4 md:p-5 data-[state=inactive]:hidden">
          <VisualFrame
            title="多模态临床指标联动"
            english="MULTIMODAL MONITORING"
            actions={
              <Button variant="ghost" size="xs" asChild>
                <Link to={`/patients/${patient.id}/replay`}>
                  病程回放 <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            }
            footnote="事件标记、参考区间与游标用于可视化对照；UNKNOWN / 异常值不等同于临床诊断。"
            contentClassName="pt-2"
          >
            <ClinicalTrendLinkage height={280} showZoom />
          </VisualFrame>
          <KeyLabTrendsCard />
          <ObservationPanel observations={observations} />
        </TabsContent>

        {/* ------------------------------ 病程时间轴 ------------------------------ */}
        <TabsContent value="timeline" className="mt-0 space-y-4 bg-canvas p-4 md:p-5 data-[state=inactive]:hidden">
          {eventsAreFallback && (
            <Callout tone="neutral" title="通用事件流">
              该患者暂无独立事件流记录，以下为通用事件流（与患者档案关联展示）。
            </Callout>
          )}
          <Card>
            <CardHeader>
              <SectionHead
                title="病程时间轴"
                count={events.length}
              />
            </CardHeader>
            <CardContent>
              <PatientTimeline events={events} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ 变异记录 ------------------------------ */}
        <TabsContent value="variations" className="mt-0 space-y-4 bg-canvas p-4 md:p-5 data-[state=inactive]:hidden">
          {variations.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <EmptyState
                  icon={<GitBranch />}
                  title="暂无变异记录"
                  action={
                    <Button size="sm" variant="outline" onClick={() => notifyDemo("已提交人工变异登记入口请求")}>
                      <GitBranch className="size-3.5" /> 登记变异
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-card px-3 py-2.5">
                  <div className="label-micro">变异总数</div>
                  <div className="mt-1 font-mono text-[20px] font-semibold tabular">{variations.length}</div>
                </div>
                <div className="rounded-lg border border-line bg-card px-3 py-2.5">
                  <div className="label-micro">未闭环</div>
                  <div className="mt-1 font-mono text-[20px] font-semibold tabular text-warn">
                    {variations.filter((v) => v.status !== "RESOLVED" && v.status !== "CLOSED").length}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-card px-3 py-2.5">
                  <div className="label-micro">高风险</div>
                  <div className="mt-1 font-mono text-[20px] font-semibold tabular text-risk">
                    {variations.filter((v) => v.severity === "HIGH").length}
                  </div>
                </div>
              </div>
              {variations.map((v) => {
                const typeMeta = VARIATION_TYPE_META[v.type];
                const statusMeta = VARIATION_STATUS_META[v.status];
                const severityTone = RISK_META[v.severity].tone;
                return (
                  <Card key={v.id}>
                    <CardHeader className="pb-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{v.id}</span>
                          <StatusBadge tone={typeMeta.tone} dot={false}>
                            {typeMeta.label}
                          </StatusBadge>
                          <StatusBadge tone={severityTone} dot={false}>
                            {RISK_META[v.severity].label}
                          </StatusBadge>
                          <StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>
                          <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">
                            {fmtDate(v.detectedAt, true)} · {relTime(v.detectedAt)}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-[13px] font-semibold">{v.title}</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <p className="text-[11.5px] leading-relaxed text-muted-foreground">{v.description}</p>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                        <Field label="发现来源" value={v.source} />
                        <Field label="规则引用" value={v.ruleRef} mono />
                        <Field label="影响范围" value={v.impact} className="sm:col-span-2" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10.5px] text-muted-foreground">受影响节点</span>
                        {v.affectedNodes.map((n) => (
                          <Badge key={n} variant="outline" className="font-mono text-[9.5px]">
                            {n}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-start gap-2 rounded-md border border-line bg-secondary/25 px-2.5 py-1.5">
                        <span className="text-[10.5px] text-muted-foreground">证据</span>
                        {v.evidence.map((e) => (
                          <Badge key={e} variant="secondary" className="text-[10px] font-normal">
                            {e}
                          </Badge>
                        ))}
                      </div>
                      {v.resolution && (
                        <Callout tone="ok" title={`已处理 · ${v.resolvedBy ?? "系统"}`}>
                          {v.resolution}
                        </Callout>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* ------------------------------ 随访 ------------------------------ */}
        <TabsContent value="followup" className="mt-0 space-y-4 bg-canvas p-4 md:p-5 data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <SectionHead
                title="随访计划"
                description="路径完成后自动生成，未完成前保持待生成状态"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.warning("路径尚未完成，随访计划暂不可生成")}
                  >
                    <PhoneCall className="size-3.5" /> 生成随访计划
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                {
                  title: "出院后 24–48 小时电话随访",
                  desc: "由责任护士电话确认体温、切口、疼痛与用药依从性。",
                  at: addDays(patient.admissionAt, patient.los + 2),
                  icon: PhoneCall,
                },
                {
                  title: "30 天复查增强 MRI / CT",
                  desc: "影像复查评估肿瘤复发与手术区域恢复情况，关联 PACS 报告。",
                  at: addDays(patient.admissionAt, 30),
                  icon: FlaskConical,
                },
                {
                  title: "90 天门诊复诊",
                  desc: "责任医生门诊复诊，评估肝功能、肿瘤标志物与生活质量。",
                  at: addDays(patient.admissionAt, 90),
                  icon: Stethoscope,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3 rounded-md border border-dashed border-line-strong bg-secondary/15 px-3 py-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-medium text-foreground/90">{item.title}</span>
                        <StatusBadge tone="neutral" dot={false} className="text-[9.5px]">
                          待生成
                        </StatusBadge>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.desc}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground/80">
                        计划时间 {fmtDate(item.at)} · 由路径完成事件触发
                      </p>
                    </div>
                  </div>
                );
              })}
              <Callout tone="info" title="路径完成后自动生成">
                随访任务将在「出院标准评估」任务完成且路径实例进入「已完成」状态后自动创建；当前患者路径
                进度 {patient.progress}%，尚未触发随访生成。
              </Callout>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHead title="随访记录" description="暂无历史随访记录" />
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<CalendarDays />}
                title="暂无随访记录"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 text-[12px] leading-[18px] text-muted-foreground md:px-5">
        <Link to={executionLink} className="inline-flex items-center gap-0.5 text-ink hover:underline">
          进入路径执行中心 <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <Sheet open={copilotOpen} onOpenChange={setCopilotOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[360px]">
          <SheetHeader>
            <SheetTitle className="text-[15px]">临床副驾驶</SheetTitle>
            <SheetDescription>绑定当前患者 · AI 辅助非医嘱 · 请用上方芯片提问</SheetDescription>
          </SheetHeader>
          <SheetBody className="px-4 py-3">
            <ClinicalCopilot
              patient={patient}
              currentStage={currentStage ?? "未开始"}
              dataAsOf={state.snapshotAt}
              openTasks={openTasks}
              overdueTasks={overdueTasks}
              variations={variations}
              missingFields={state.missingFields}
              unknownConditions={state.unknownConditions}
              executionLink={executionLink}
              planningLink={planningLink}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </WorkspacePage>
  );
}
