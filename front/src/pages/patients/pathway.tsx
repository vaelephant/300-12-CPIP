import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  GitBranch,
  History,
  Info,
  LogOut,
  Pause,
  Play,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import type { InstanceStatus, Patient, Task } from "@/types";
import {
  TASK_EVENTS,
  getClinicalEvents,
  getInstance,
  getInstanceByPatient,
  getObservations,
  getPatient,
  getPlans,
} from "@/data";
import {
  INSTANCE_STATUS_META,
  NODE_META,
  PLAN_STATUS_META,
  ROLE_LABELS,
  TASK_STATUS_META,
} from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useRuntimeStore } from "@/stores/runtime-store";
import {
  CLINICAL_STAGES,
  StageProgressStrip,
  StageStateBadge,
  deriveStageStates,
  getPatientInstance,
  isTerminalTask,
  stageCounts,
} from "@/components/patient/stages";
import { TaskActions } from "@/components/patient/task-actions";
import { EventFeed, TaskEventFeed } from "@/components/timeline/clinical-timeline";
import { GanttChart, type GanttRow } from "@/components/charts/advanced";

/* --------------------------- 执行分析摘要单元 --------------------------- */

function SummaryCell({
  label,
  value,
  hint,
  tone = "neutral",
  small = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "risk" | "warn" | "ok" | "neutral";
  small?: boolean;
}) {
  return (
    <div className="bg-card px-3.5 py-2.5">
      <div className="label-micro">{label}</div>
      <div
        className={cn(
          "mt-1 font-semibold tracking-tight tabular",
          small ? "text-[11px] leading-relaxed" : "font-mono text-[15px]",
          tone === "risk" && "text-risk",
          tone === "warn" && "text-warn",
          tone === "ok" && "text-ok",
          tone === "neutral" && "text-foreground/85",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ------------------------------ 任务行 ------------------------------ */

function TaskRow({ task }: { task: Task }) {
  const node = NODE_META[task.type];
  const Icon = node.icon;
  const status = TASK_STATUS_META[task.status];
  const overdue = task.overdue && !isTerminalTask(task.status);
  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5">
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[6px]", node.chip)}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[12.5px] font-medium text-foreground/90">{task.name}</span>
          <StatusBadge tone={status.tone} dot={false}>
            {status.label}
          </StatusBadge>
          {overdue && (
            <Badge variant="risk" className="gap-0.5 text-[9.5px]">
              <Timer className="size-2.5" /> 已超时
            </Badge>
          )}
          {!task.required && (
            <Badge variant="outline" className="text-[9.5px]">
              非必需
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
          <span>{node.label}</span>
          <span>{ROLE_LABELS[task.role]}</span>
          <span>执行人 {task.assignee}</span>
          <span className="font-mono">
            窗口 {fmtDate(task.earliestStartAt)} {fmtTime(task.earliestStartAt)} → {fmtDate(task.dueAt)} {fmtTime(task.dueAt)}
          </span>
          <span className="font-mono text-muted-foreground/70">{task.id}</span>
        </div>
        {task.summary && <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground/85">{task.summary}</p>}
        {task.result && (
          <p className="mt-1 rounded border border-ok/20 bg-ok-wash/40 px-2 py-1 text-[10.5px] text-ok">
            执行结果：{task.result}
          </p>
        )}
      </div>
      <TaskActions task={task} />
    </div>
  );
}

/* ------------------------------ 页面 ------------------------------ */

export default function PatientPathwayPage() {
  const { id = "" } = useParams();
  const patient = getPatient(id);

  if (!patient) {
    return (
      <Page>
        <EmptyState
          icon={<GitBranch />}
          title="未找到该患者"
          description={`患者标识 ${id} 不存在，无法加载路径实例。`}
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

  return <PathwayExecutionContent patient={patient} />;
}

function PathwayExecutionContent({ patient }: { patient: Patient }) {
  const instance =
    getPatientInstance(patient) ?? (patient.instanceId ? getInstance(patient.instanceId) : undefined);
  const storeTasks = useRuntimeStore((s) => s.tasks);
  const storeEvents = useRuntimeStore((s) => s.events);
  const [statusOverride, setStatusOverride] = useState<InstanceStatus | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");

  const allTasks = useMemo(() => (instance ? storeTasks.filter((t) => t.instanceId === instance.id) : []), [storeTasks, instance]);
  const plans = useMemo(() => (instance ? getPlans(instance.id) : []), [instance]);
  const activePlan = plans.find((p) => p.status === "ACTIVE") ?? plans[0];
  const effectivePlanId = selectedPlanId ?? activePlan?.id;
  const tasks = useMemo(
    () => (effectivePlanId ? allTasks.filter((t) => t.planId === effectivePlanId) : allTasks),
    [allTasks, effectivePlanId],
  );
  const selectedPlan = plans.find((p) => p.id === effectivePlanId);
  const stageStates = deriveStageStates(tasks);
  const planPending = selectedPlan?.status === "PENDING_APPROVAL" || selectedPlan?.status === "DRAFT";
  const status: InstanceStatus = statusOverride ?? instance?.status ?? "PENDING";
  const statusMeta = INSTANCE_STATUS_META[status];
  const terminal = status === "EXITED" || status === "COMPLETED" || status === "CANCELLED";

  const taskIds = useMemo(() => new Set(allTasks.map((t) => t.id)), [allTasks]);
  const taskFeed = useMemo(
    () =>
      [...storeEvents.filter((e) => taskIds.has(e.taskId)), ...TASK_EVENTS.filter((e) => taskIds.has(e.taskId))].sort(
        (a, b) => +new Date(b.at) - +new Date(a.at),
      ),
    [storeEvents, taskIds],
  );
  const taskNames = useMemo(
    () => Object.fromEntries(allTasks.map((t) => [t.id, t.name])) as Record<string, string>,
    [allTasks],
  );
  const clinicalEvents = useMemo(() => getClinicalEvents(patient.id).slice(0, 6), [patient.id]);

  /** 计划窗口 vs 实际执行：按阶段排序后交给 GanttChart 绘制。 */
  const ganttRows = useMemo<GanttRow[]>(() => {
    const stageOrder: Record<string, number> = Object.fromEntries(CLINICAL_STAGES.map((stage, i) => [stage, i]));
    return [...allTasks]
      .sort(
        (a, b) =>
          (stageOrder[a.stage] ?? 99) - (stageOrder[b.stage] ?? 99) ||
          +new Date(a.earliestStartAt) - +new Date(b.earliestStartAt),
      )
      .map((t) => ({
        id: t.id,
        name: t.name,
        group: t.stage,
        role: ROLE_LABELS[t.role],
        start: t.earliestStartAt,
        end: t.dueAt,
        actualStart: t.startedAt,
        actualEnd: t.completedAt,
        status: (t.overdue
          ? "overdue"
          : t.status === "IN_PROGRESS"
            ? "active"
            : t.status === "COMPLETED"
              ? "done"
              : "pending") as GanttRow["status"],
        note: t.summary,
      }));
  }, [allTasks]);

  /** 执行分析摘要：计划住院日 / 实际住院日 / 偏差 / 关键路径任务 / 主要延迟原因（合成演示推算）。 */
  const executionSummary = useMemo(() => {
    if (!instance) return null;
    const latestDue = allTasks.reduce((max, t) => Math.max(max, +new Date(t.dueAt)), 0);
    const plannedDays = allTasks.length
      ? Math.max(1, Math.round((latestDue - +new Date(instance.enrolledAt)) / 86_400_000))
      : 9;
    const overdueTasks = allTasks
      .filter((t) => t.overdue && !isTerminalTask(t.status))
      .sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt));
    const requiredTasks = allTasks.filter((t) => t.required).length;
    const delayReason =
      allTasks.length === 0
        ? "暂无执行任务数据"
        : overdueTasks.length > 0
          ? `${overdueTasks[0].name} 超出「${overdueTasks[0].stage}」时间窗口`
          : "暂无超时任务";
    return {
      plannedDays,
      actualDays: patient.los,
      deviationDays: overdueTasks.length,
      requiredTasks,
      totalTasks: allTasks.length,
      delayReason,
      hasTasks: allTasks.length > 0,
    };
  }, [instance, allTasks, patient.los]);

  const observations = getObservations(patient.id);
  const fever = observations
    .filter((o) => o.code === "VS-TEMP" && o.flag === "HIGH")
    .sort((a, b) => +new Date(b.observedAt) - +new Date(a.observedAt))[0];

  if (!instance) {
    return (
      <Page>
        <PageHeader
          module="M07 · 路径执行"
          title={`${patient.name} · 路径执行`}
          description={`${patient.diagnosis}（${patient.diagnosisCode}）· ${patient.departmentName} ${patient.ward} ${patient.bed} 床`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}`}>
                <ArrowLeft className="size-3.5" /> 返回患者详情
              </Link>
            </Button>
          }
          meta={<SyntheticTag />}
        />
        <EmptyState
          icon={<GitBranch />}
          title="未找到路径实例"
          description="该患者尚未确认入径或路径实例尚未创建，无法进入执行中心。请先在患者中心完成智能入径匹配。"
          action={
            <Button asChild size="sm">
              <Link to="/patients">前往患者中心</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const doneCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const activeCounts = stageCounts(tasks, instance.currentStage);

  return (
    <Page>
      <PageHeader
        module="M07 · 路径执行"
        title={`${patient.name} · 路径执行`}
        description={`${patient.diagnosis}（${patient.diagnosisCode}，${patient.stage}）· ${instance.pathwayName} V${instance.version} · 入径 ${fmtDate(instance.enrolledAt)}`}
        actions={
          <>
            <Button size="sm" asChild>
              <Link to={`/planning/${instance.id}`}>
                <Sparkles className="size-3.5" /> 重新规划
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}/map`}>
                <Route className="size-3.5" /> 动态路径图
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}/replay`}>
                <History className="size-3.5" /> 病程回放
              </Link>
            </Button>
            {status === "PAUSED" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusOverride("ACTIVE");
                  toast.success("路径已恢复执行");
                }}
              >
                <Play className="size-3.5" /> 恢复路径
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled={terminal} onClick={() => setPauseOpen(true)}>
                <Pause className="size-3.5" /> 暂停路径
              </Button>
            )}
            <Button variant="destructive-outline" size="sm" disabled={terminal} onClick={() => setExitOpen(true)}>
              <LogOut className="size-3.5" /> 退出路径
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/patients/${patient.id}`}>
                <ArrowLeft className="size-3.5" /> 返回患者详情
              </Link>
            </Button>
          </>
        }
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="实例" value={instance.id} mono />
            <StatusBadge tone={statusMeta.tone} pulse={status === "ACTIVE"}>
              {statusMeta.label}
            </StatusBadge>
            <PageMeta label="整体进度" value={`${instance.progress}%`} mono />
            <PageMeta label="当前阶段" value={instance.currentStage} />
            <PageMeta label="责任医生" value={instance.responsibleDoctor} />
            <PageMeta label="修订" value={`R${instance.revision}`} mono />
            <PageMeta label="角色" value="临床医生（执行演示）" />
          </>
        }
      />

      {terminal && (
        <Callout tone="risk" title={`该路径实例已${statusMeta.label}`} className="mb-4">
          实例已进入终态，任务不可再执行。如需继续诊疗请重新入径或生成新的路径实例。
        </Callout>
      )}
      {status === "REPLAN_REQUIRED" && (
        <Callout tone="warn" title="实例需要重新规划" className="mb-4">
          检测到病情变异或计划变更，已生成待审核调整草案。请前往规划工作台完成审核后再执行新计划。
        </Callout>
      )}

      <Card className="mb-4">
        <CardContent className="space-y-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-micro">执行计划版本</span>
              <Select
                value={effectivePlanId ?? ""}
                onValueChange={(v) => setSelectedPlanId(v)}
              >
                <SelectTrigger size="sm" className="w-[210px]">
                  <SelectValue placeholder="选择计划版本" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.version} · {PLAN_STATUS_META[p.status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan && (
                <StatusBadge tone={PLAN_STATUS_META[selectedPlan.status].tone}>
                  {PLAN_STATUS_META[selectedPlan.status].label}
                </StatusBadge>
              )}
              <Badge variant="outline" className="font-mono text-[9.5px]">
                {activeCounts.done}/{tasks.length} 任务完成
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                当前阶段 <span className="font-medium text-foreground/85">{instance.currentStage}</span>
              </span>
              <span className="text-line-strong">|</span>
              <span>
                超时任务{" "}
                <span className="font-mono text-risk">
                  {tasks.filter((t) => t.overdue && !isTerminalTask(t.status)).length}
                </span>
              </span>
              <span className="text-line-strong">|</span>
              <span>
                数据完整度 <span className="font-mono text-foreground/85">{instance.dataCompleteness}%</span>
              </span>
            </div>
          </div>
          <StageProgressStrip tasks={allTasks} progress={instance.progress} />
          <div className="flex items-center gap-2">
            <Progress value={instance.progress} className="h-1.5" />
            <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground tabular">{instance.progress}%</span>
          </div>
        </CardContent>
      </Card>

      {executionSummary && (
        <Card className="mb-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-secondary/25 px-4 py-2">
            <SectionHead title="执行分析摘要" description="计划 vs 实际住院日与关键路径偏差 · 合成演示" />
            <Badge variant="outline" className="font-mono text-[9px]">
              SYNTHETIC · 执行分析
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 xl:grid-cols-5">
            <SummaryCell
              label="计划住院日"
              value={`${executionSummary.plannedDays} 天`}
              hint={executionSummary.hasTasks ? "入径至末项任务计划窗口" : "模板标准住院日（无任务数据）"}
            />
            <SummaryCell
              label="实际住院日"
              value={`${executionSummary.actualDays} 天`}
              hint={`当前住院中 · 入院 ${fmtDate(patient.admissionAt)}`}
            />
            <SummaryCell
              label="偏差"
              value={executionSummary.deviationDays > 0 ? `+${executionSummary.deviationDays} 天` : "0 天"}
              hint="按超时任务数预估（合成）"
              tone={executionSummary.deviationDays > 0 ? "risk" : "ok"}
            />
            <SummaryCell
              label="关键路径任务"
              value={`${executionSummary.requiredTasks} 项`}
              hint={`必需任务 / 共 ${executionSummary.totalTasks} 项`}
            />
            <SummaryCell
              label="主要延迟原因"
              value={executionSummary.delayReason}
              hint="来自超时任务与执行窗口"
              tone={executionSummary.deviationDays > 0 ? "warn" : "neutral"}
              small
            />
          </div>
          <p className="border-t border-line px-4 py-1.5 text-[9.5px] text-muted-foreground">
            计划住院日由路径任务时间窗口推算；偏差为基于超时任务数的合成演示估算，不作为真实住院日预测。
          </p>
        </Card>
      )}

      {allTasks.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <SectionHead
              title="任务计划 vs 实际"
              description="计划窗口（浅色）与实际执行记录（实色）对照 · 实例级全部任务"
              action={
                <Badge variant="outline" className="font-mono text-[9px]">
                  SYNTHETIC · GANTT
                </Badge>
              }
            />
          </CardHeader>
          <CardContent>
            <GanttChart rows={ganttRows} now={new Date().toISOString()} maxHeight={300} labelWidth={190} />
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              红色标记为已超时任务；竖线为当前时间。超时仅作标记、不自动改变执行状态；甘特图为合成演示计划与实际记录。
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* 主区：任务 */}
        <div className="space-y-4">
          {planPending && (
            <Callout tone="warn" title="所选计划版本尚未生效">
              该版本仍在审核流程中，不能用于任务执行。切换到已生效版本（如 P1）后继续执行。
            </Callout>
          )}

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <EmptyState
                  icon={<ClipboardList />}
                  title={planPending ? "该计划版本暂无执行任务" : "该实例暂无可执行任务"}
                  description={
                    planPending
                      ? "计划处于待审核状态，激活后任务才会生成。请前往规划工作台完成审核与激活。"
                      : "路径实例已创建但尚无生效计划任务。可在规划工作台生成并审核个体化计划。"
                  }
                  action={
                    <div className="flex items-center gap-2">
                      <Button size="sm" asChild>
                        <Link to={`/planning/${instance.id}`}>
                          <Sparkles className="size-3.5" /> 前往规划工作台
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/patients/${patient.id}`}>返回患者详情</Link>
                      </Button>
                    </div>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            CLINICAL_STAGES.filter((stage) => tasks.some((t) => t.stage === stage)).map((stage) => {
              const list = tasks.filter((t) => t.stage === stage);
              const counts = stageCounts(tasks, stage);
              return (
                <Card key={stage} className="overflow-hidden">
                  <CardHeader className="border-b border-line pb-2.5">
                    <SectionHead
                      title={stage}
                      description={`${counts.done}/${counts.total} 完成 · ${counts.running} 执行中${counts.overdue ? ` · 超时 ${counts.overdue}` : ""}`}
                      action={<StageStateBadge state={stageStates[stage]} />}
                    />
                  </CardHeader>
                  <div className="divide-y divide-line/70">
                    {list.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </div>
                </Card>
              );
            })
          )}

          <div className="flex items-center justify-between px-1 text-[10.5px] text-muted-foreground">
            <span>任务操作由运行时状态机校验，非法转换会被拒绝并提示原因。</span>
            <Link to="/tasks" className="inline-flex items-center gap-0.5 text-primary hover:underline">
              任务中心 <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* 右栏 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionHead
                title="计划版本"
                count={plans.length}
                action={
                  <Button variant="ghost" size="xs" asChild>
                    <Link to={`/planning/${instance.id}`}>
                      规划 <ArrowUpRight className="size-3" />
                    </Link>
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {plans.length === 0 && <p className="py-2 text-[11px] text-muted-foreground">暂无计划版本记录。</p>}
              {plans.map((plan) => {
                const meta = PLAN_STATUS_META[plan.status];
                const selected = plan.id === effectivePlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                      selected ? "border-primary/30 bg-accent/40" : "border-line bg-secondary/20 hover:border-line-strong",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold">{plan.version}</span>
                      <StatusBadge tone={meta.tone} dot={false} className="text-[9.5px]">
                        {meta.label}
                      </StatusBadge>
                      {plan.id === activePlan?.id && (
                        <Badge variant="ok" className="text-[8.5px]">
                          当前执行
                        </Badge>
                      )}
                      <span className="ml-auto font-mono text-[9px] text-muted-foreground">{fmtDate(plan.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">{plan.summary}</p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground/75">
                      创建 {plan.createdBy}
                      {plan.approvedBy ? ` · 审核 ${plan.approvedBy}` : " · 待审核"}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="临床事件" description="最近 6 条 · 实时聚合" />
            </CardHeader>
            <CardContent>
              <EventFeed events={clinicalEvents} limit={6} emptyText="暂无临床事件" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="任务操作事件" description="本次会话的运行时记录" />
            </CardHeader>
            <CardContent>
              <TaskEventFeed events={taskFeed} taskNames={taskNames} limit={5} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="安全提示" description="执行前请确认以下风险" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {fever && (
                <Callout tone="warn" title={`近 24 小时体温升高 ${fever.value}${fever.unit ?? ""}`}>
                  采集于 {relTime(fever.observedAt)}，来源 {fever.source}。术前 24h 仍需复测；若持续异常需暂停手术任务。
                </Callout>
              )}
              {instance.unknownConditions.length > 0 && (
                <Callout tone="warn" title="存在未知条件">
                  {instance.unknownConditions.join("；")}。规划按 UNKNOWN 处理，未闭合前不会自动视为满足条件。
                </Callout>
              )}
              {patient.allergy.length > 0 && (
                <Callout tone="risk" title="过敏风险">
                  {patient.allergy.join("、")} 过敏：围术期用药、皮试与输血需双人核对。
                </Callout>
              )}
              {selectedPlan && selectedPlan.warnings.length > 0 && (
                <div className="rounded-md border border-line bg-secondary/25 px-2.5 py-2">
                  <p className="label-micro mb-1">当前计划警告</p>
                  <ul className="space-y-1">
                    {selectedPlan.warnings.map((w) => (
                      <li key={w.id} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
                        <span
                          className={cn(
                            "mt-1 size-1 shrink-0 rounded-full",
                            w.level === "RISK" ? "bg-risk" : "bg-warn",
                          )}
                        />
                        {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="实例信息" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="divide-y divide-line/70">
                <Field label="实例 ID" value={instance.id} mono />
                <Field label="路径模板" value={`${instance.pathwayName} V${instance.version}`} />
                <Field label="模板版本 ID" value={instance.versionId} mono />
                <Field label="入径时间" value={fmtDate(instance.enrolledAt, true)} mono />
                <Field label="当前阶段" value={instance.currentStage} />
                <Field label="修订版本" value={`R${instance.revision}`} mono />
                <Field label="数据完整度" value={`${instance.dataCompleteness}%`} mono />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="xs" variant="outline" asChild>
                  <Link to={`/patients/${patient.id}`}>
                    <ArrowLeft className="size-3" /> 患者详情
                  </Link>
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => toast.info("已请求同步外部系统最新状态（演示）")}
                >
                  <RefreshCw className="size-3" /> 同步状态
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 暂停确认 */}
      <AlertDialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pause className="size-4 text-warn" /> 暂停路径执行？
            </AlertDialogTitle>
            <AlertDialogDescription>
              暂停后该实例的任务将不可开始，已执行任务保留状态；恢复后可继续。暂停操作会记录到路径事件流。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setStatusOverride("PAUSED");
                toast.success(`路径实例 ${instance.id} 已暂停`);
              }}
            >
              确认暂停
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退出路径 */}
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="size-4 text-risk" /> 退出路径
            </DialogTitle>
            <DialogDescription>
              退出将终止路径实例 {instance.id}，未完成任务不再执行。该操作需记录原因并纳入质控分析。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-5 py-4">
            <label className="text-[12px] font-medium text-foreground/80" htmlFor="exit-reason">
              退出原因 <span className="text-risk">*</span>
            </label>
            <Textarea
              id="exit-reason"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="例如：患者要求转院治疗 / 出现排除条件需退出路径（演示输入）"
            />
            <p className="text-[10.5px] text-muted-foreground">
              退出原因将写入路径变异与质控台账（演示环境仅保存在本地会话）。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExitOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={exitReason.trim().length < 4}
              onClick={() => {
                setStatusOverride("EXITED");
                setExitOpen(false);
                toast.success(`路径实例 ${instance.id} 已退出，原因已记录`);
              }}
            >
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ShieldAlert className="size-3 text-muted-foreground/70" />
          任务状态变更由运行时引擎校验（TASK_TRANSITIONS），演示数据不写入真实病历。
        </span>
        <span className="inline-flex items-center gap-1">
          <Timer className="size-3" /> 超时仅标记，不自动改变执行状态
        </span>
      </div>
    </Page>
  );
}
