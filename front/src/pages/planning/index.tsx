import { IS_SERVER_MODE } from "@/lib/data-mode";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  CircleHelp,
  ClipboardCheck,
  FileText,
  GitBranch,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { PathwayInstance, Patient } from "@/types";
import {
  EVIDENCE_ITEMS,
  HCC_PLAN_DRAFT,
  TASKS,
  addHours,
  getInstance,
  getPatient,
  getPlans,
  type DraftTask,
} from "@/data";
import {
  INSTANCE_STATUS_META,
  PLAN_STATUS_META,
  ROLE_LABELS,
} from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSessionStore } from "@/stores/session-store";
import { getStateForPatient, fieldLabel } from "@/components/patient/patient-state";
import { FieldStatusBadge } from "@/components/patient/ui";
import { GanttChart, type GanttRow } from "@/components/charts/advanced";
import { DecisionEvidenceGraph } from "@/visualization/knowledge/DecisionEvidenceGraph";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import ServerPlanningPage from "./index-server";

/* ------------------------------ 规划草案 · 转化治疗后手术（INST-HCC-002） ------------------------------ */

const CONVERSION_PLAN_DRAFT: DraftTask[] = [
  { nodeKey: "admission", name: "入院评估与转化疗效复核", stage: "术前评估", role: "DOCTOR", required: true, dependsOn: [], offsetHours: 2, windowHours: 4, evidence: ["EV-002"] },
  { nodeKey: "imaging", name: "增强 MRI / mRECIST 疗效评估", stage: "术前检查", role: "DOCTOR", required: true, dependsOn: ["admission"], offsetHours: 8, windowHours: 8, evidence: ["EV-001"] },
  { nodeKey: "liver", name: "肝功能与 ICG R15 复评", stage: "术前检查", role: "DOCTOR", required: true, dependsOn: ["admission"], offsetHours: 12, windowHours: 8, evidence: [], issue: "Child-Pugh B 级，需二次评估" },
  { nodeKey: "mdt", name: "肝癌 MDT 再评估", stage: "治疗方案确认", role: "DOCTOR", required: true, dependsOn: ["imaging", "liver"], offsetHours: 24, windowHours: 12, evidence: ["EV-007"] },
  { nodeKey: "decision", name: "手术切除范围判断", stage: "治疗方案确认", role: "DOCTOR", required: true, dependsOn: ["mdt"], offsetHours: 30, windowHours: 6, evidence: [], issue: "最终切除范围待病理确认" },
  { nodeKey: "surgery", name: "转化后肝切除术", stage: "手术及术后", role: "SURGEON", required: true, dependsOn: ["decision"], offsetHours: 48, windowHours: 24, evidence: ["EV-002"] },
  { nodeKey: "pathology", name: "术后病理与切缘评估", stage: "手术及术后", role: "DOCTOR", required: true, dependsOn: ["surgery"], offsetHours: 52, windowHours: 8, evidence: [] },
  { nodeKey: "follow", name: "出院后 30 天随访", stage: "出院与随访", role: "NURSE", required: true, dependsOn: ["pathology"], offsetHours: 120, windowHours: 48, evidence: ["EV-003"] },
];

const STEPS = [
  { key: 1, label: "患者状态快照", icon: UserRound },
  { key: 2, label: "规则计算", icon: GitBranch },
  { key: 3, label: "候选计划", icon: FileText },
  { key: 4, label: "安全校验", icon: ShieldCheck },
  { key: 5, label: "医生审核", icon: UserCheck },
  { key: 6, label: "计划生效", icon: CheckCircle2 },
];

const VALIDATION_META = {
  PASS: { tone: "ok" as const, icon: CheckCircle2, label: "PASS" },
  WARNING: { tone: "warn" as const, icon: AlertTriangle, label: "WARNING" },
  UNKNOWN: { tone: "warn" as const, icon: CircleHelp, label: "UNKNOWN" },
  BLOCKED: { tone: "risk" as const, icon: XCircle, label: "BLOCKED" },
};

/* ------------------------------ 页面入口 ------------------------------ */

function DemoPlanningPage() {
  const { instanceId = "" } = useParams();
  const instance = getInstance(instanceId);
  const patient = instance ? getPatient(instance.patientId) : undefined;

  if (!instance || !patient) {
    return (
      <Page>
        <EmptyState
          icon={<GitBranch />}
          title="未找到路径实例"
          description={`实例 ${instanceId} 不存在或已归档，无法打开个体化规划工作台。`}
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

  return <PlanningWorkbench instance={instance} patient={patient} />;
}

/* ------------------------------ 工作台 ------------------------------ */

function PlanningWorkbench({ instance, patient }: { instance: PathwayInstance; patient: Patient }) {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const actor = user?.name ?? "责任医生";

  const plans = useMemo(() => getPlans(instance.id), [instance.id]);
  const activePlan = plans.find((p) => p.status === "ACTIVE");
  const candidate = useMemo(
    () => plans.find((p) => p.status === "PENDING_APPROVAL") ?? plans.find((p) => p.version === "P2") ?? plans[plans.length - 1],
    [plans],
  );
  const draftTemplate = instance.id === "INST-HCC-002" ? CONVERSION_PLAN_DRAFT : HCC_PLAN_DRAFT;
  const state = getStateForPatient(patient, instance);

  const [step, setStep] = useState(4);
  const [draftCount, setDraftCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [activateOpen, setActivateOpen] = useState(false);
  const [activated, setActivated] = useState(false);

  const validation = candidate?.validation ?? [];
  const blocked = validation.some((v) => v.level === "BLOCKED");
  const unknownCount = validation.filter((v) => v.level === "UNKNOWN").length;
  const warnCount = validation.filter((v) => v.level === "WARNING").length;
  const passCount = validation.filter((v) => v.level === "PASS").length;
  const canActivate = approved && !blocked && !activated;
  const activationReason = !approved
    ? "计划尚未通过医生审核，不能激活"
    : blocked
      ? "存在 BLOCKED 安全校验项，不可进入正式执行"
      : "";

  const plannedRows = useMemo(() => {
    const nameByKey = Object.fromEntries(draftTemplate.map((t) => [t.nodeKey, t.name])) as Record<string, string>;
    const actualTasks = TASKS.filter((t) => t.instanceId === instance.id);
    return draftTemplate.map((t) => {
      const start = addHours(instance.enrolledAt, t.offsetHours);
      const end = addHours(start, t.windowHours);
      const actual = actualTasks.find((a) => a.nodeKey === t.nodeKey);
      const ganttStatus: GanttRow["status"] = actual
        ? actual.overdue
          ? "overdue"
          : actual.status === "COMPLETED"
            ? "done"
            : actual.status === "IN_PROGRESS"
              ? "active"
              : "pending"
        : "pending";
      return {
        ...t,
        start,
        end,
        actual,
        ganttStatus,
        dependencyNames: t.dependsOn.map((key) => nameByKey[key] ?? key),
      };
    });
  }, [draftTemplate, instance.enrolledAt, instance.id]);

  /** 阶段计划窗口：按阶段聚合的计划窗口 + 实例实际执行状态叠加（任务明细见下表）。 */
  const planGanttRows = useMemo<GanttRow[]>(() => {
    const stages = Array.from(new Set(plannedRows.map((r) => r.stage)));
    return stages.map((stage) => {
      const rows = plannedRows.filter((r) => r.stage === stage);
      const start = rows.reduce((min, r) => (+new Date(r.start) < +new Date(min) ? r.start : min), rows[0].start);
      const end = rows.reduce((max, r) => (+new Date(r.end) > +new Date(max) ? r.end : max), rows[0].end);
      const done = rows.filter((r) => r.ganttStatus === "done").length;
      const active = rows.some((r) => r.ganttStatus === "active");
      const overdue = rows.some((r) => r.ganttStatus === "overdue");
      const started = rows
        .map((r) => r.actual?.startedAt)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => +new Date(a) - +new Date(b));
      const finished = rows
        .map((r) => r.actual?.completedAt)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => +new Date(a) - +new Date(b));
      const status: GanttRow["status"] = overdue ? "overdue" : done === rows.length ? "done" : active || done > 0 ? "active" : "pending";
      return {
        id: `stage-${stage}`,
        name: stage,
        role: `${done}/${rows.length} 项完成`,
        start,
        end,
        actualStart: started[0],
        actualEnd: done === rows.length ? finished[finished.length - 1] : undefined,
        status,
        note: `阶段计划窗口 ${rows.length} 项任务；${done} 项已完成${overdue ? "，存在超时任务" : ""}`,
      };
    });
  }, [plannedRows]);

  const evidenceItems = useMemo(() => {
    const refs = Array.from(new Set(plannedRows.flatMap((r) => r.evidence).concat(candidate?.evidence.map((e) => e.ref) ?? [])));
    return refs
      .map((ref) => EVIDENCE_ITEMS.find((e) => e.id === ref))
      .filter((e): e is (typeof EVIDENCE_ITEMS)[number] => Boolean(e));
  }, [plannedRows, candidate]);

  if (!candidate) {
    return (
      <Page>
        <PageHeader
          module="M06 · 个体化规划"
          title={`${patient.name} · 个体化路径规划`}
          description={`${instance.pathwayName} · 实例 ${instance.id}`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}/pathway`}>
                <ArrowLeft className="size-3.5" /> 返回执行
              </Link>
            </Button>
          }
          meta={<SyntheticTag />}
        />
        <EmptyState
          icon={<FileText />}
          title="该实例暂无候选计划"
          action={
            <Button size="sm" onClick={() => toast.info("生成草案需由责任医生发起")}>
              <Sparkles className="size-3.5" /> 生成规划草案
            </Button>
          }
        />
      </Page>
    );
  }

  const planStatus = PLAN_STATUS_META[candidate.status];

  const handleGenerate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      setDraftCount((c) => c + 1);
      setStep(3);
      toast.success(`已生成规划草案 D${draftCount + 1}`);
      toast.info("草案不会自动生效，需完成安全校验与医生审核");
    }, 900);
  };

  const handleValidate = () => {
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      setStep(5);
      toast.success(`安全校验完成 · ${passCount} 项 PASS / ${warnCount} 项 WARNING / ${unknownCount} 项 UNKNOWN`);
      if (unknownCount > 0) toast.warning("存在 UNKNOWN 数据，需补充资料后重新校验；不会被自动视为通过");
    }, 700);
  };

  const handleApprove = () => {
    setApproved(true);
    setStep(6);
    setApproveOpen(false);
    toast.success(`计划 ${candidate.version} 已审核通过（审核人 ${actor}）`);
    toast.info("计划已批准但尚未生效，需手动激活");
  };

  const handleActivate = () => {
    setActivated(true);
    setActivateOpen(false);
    toast.success(`计划 ${candidate.version} 已激活，路径实例切换至新版本`);
    window.setTimeout(() => navigate(`/patients/${patient.id}/pathway`), 700);
  };

  return (
    <Page>
      <PageHeader
        module="M06 · 个体化规划"
        title={`${patient.name} · 个体化路径规划`}
        description={`${patient.diagnosis}（${patient.diagnosisCode}）· ${instance.pathwayName} · 实例 ${instance.id}`}
        actions={
          <>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {generating ? "生成中…" : "生成规划草案"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleValidate} disabled={validating}>
              {validating ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              {validating ? "校验中…" : "校验"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}/pathway`}>
                <ArrowLeft className="size-3.5" /> 返回执行
              </Link>
            </Button>
          </>
        }
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="实例" value={instance.id} mono />
            <StatusBadge tone={INSTANCE_STATUS_META[instance.status].tone}>
              {INSTANCE_STATUS_META[instance.status].label}
            </StatusBadge>
            <PageMeta label="模板版本" value={`V${instance.version} 已锁定`} mono />
            <PageMeta label="候选计划" value={`${candidate.version} · ${planStatus.label}`} mono />
            <PageMeta label="状态快照" value={`${fmtDate(state.snapshotAt, true)} · ${relTime(state.snapshotAt)}`} mono />
            <PageMeta label="本地草案" value={`D${draftCount}`} mono />
          </>
        }
      />

      {/* 步骤条 */}
      <div className="mb-4 overflow-x-auto rounded-lg border border-line bg-card px-4 py-3 shadow-card scrollbar-slim">
        <div className="flex min-w-[860px] items-center">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step - 1 || (activated && i <= 5);
            const current = i === step - 1 && !activated;
            return (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border text-[10px] font-semibold",
                      done && "border-primary/30 bg-accent text-accent-foreground",
                      current && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_3px_var(--accent)]",
                      !done && !current && "border-line bg-secondary/60 text-muted-foreground",
                    )}
                  >
                    {done ? <CheckCircle2 className="size-3.5" /> : current ? <Icon className="size-3" /> : s.key}
                  </span>
                  <span
                    className={cn(
                      "text-[11.5px] whitespace-nowrap",
                      current ? "font-semibold text-foreground" : done ? "text-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {current && <span className="rounded-[3px] bg-accent px-1 font-mono text-[8.5px] text-accent-foreground">当前</span>}
                </div>
                {i < STEPS.length - 1 && (
                  <span className={cn("mx-2 h-px flex-1", done ? "bg-primary/40" : "bg-line")} aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ------------------------------ 左列：状态快照 ------------------------------ */}
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <SectionHead
                title="患者状态快照"
                description={`${fmtDate(state.snapshotAt, true)} · ${relTime(state.snapshotAt)}`}
                action={
                  <Badge variant="outline" className="font-mono text-[9px]">
                    {state.patientId}
                  </Badge>
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">数据完整度</span>
                  <span className="font-mono font-semibold tabular">{state.dataCompleteness}%</span>
                </div>
                <Progress
                  value={state.dataCompleteness}
                  className="mt-1 h-1.5"
                  indicatorClassName={state.dataCompleteness < 80 ? "bg-warn" : "bg-primary"}
                />
              </div>

              <div className="max-h-[330px] space-y-0 overflow-y-auto scrollbar-slim rounded-md border border-line bg-card px-2.5">
                {state.fields.map((f) => (
                  <div key={f.field} className="flex items-center justify-between gap-2 border-b border-line/60 py-1.5 last:border-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[11px] text-foreground/85">{f.label}</span>
                        <FieldStatusBadge status={f.status} />
                      </div>
                      <div className="font-mono text-[8.5px] text-muted-foreground/60">{f.field}</div>
                    </div>
                    <span
                      className={cn(
                        "max-w-[106px] shrink-0 truncate text-right text-[11px] font-medium",
                        f.status === "UNKNOWN" && "text-warn italic",
                        f.status === "STALE" && "text-info",
                        f.status === "KNOWN" && "text-foreground/85",
                      )}
                      title={f.value ?? "未知/待补充"}
                    >
                      {f.value ?? "未知 / 待补充"}
                    </span>
                  </div>
                ))}
              </div>

              {state.missingFields.length > 0 && (
                <Callout tone="warn" title="待补充资料">
                  <div className="flex flex-wrap gap-1">
                    {state.missingFields.map((f) => (
                      <span
                        key={f}
                        className="rounded-[3px] border border-warn/25 bg-card px-1.5 py-px text-[10px] text-warn"
                      >
                        {fieldLabel(state, f)} · 待补充
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">缺失值不视为满足条件，相关规则保持 UNKNOWN。</p>
                </Callout>
              )}

              <div>
                <p className="label-micro mb-1">未知条件</p>
                <ul className="space-y-1">
                  {state.unknownConditions.map((c) => (
                    <li key={c} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warn" /> {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="label-micro mb-1">治疗目标</p>
                <ul className="space-y-1">
                  {state.goals.map((g) => (
                    <li key={g} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-ok" /> {g}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="label-micro mb-1">患者偏好</p>
                <ul className="space-y-1">
                  {state.preferences.map((p) => (
                    <li key={p} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-info" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="规划确定性说明" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Callout tone="info" title="相同输入与版本 → 语义一致计划">
                在模板版本、规则包版本与状态快照一致的前提下，规划引擎应产生语义一致的候选计划；差异仅来自版本与快照变化。
              </Callout>
              <Callout tone="warn" title="缺失值不视为满足条件">
                UNKNOWN / STALE 字段不会命中任何条件分支，也不会被自动补齐。需由医生补录资料后重新计算。
              </Callout>
              <p className="font-mono text-[9px] leading-relaxed text-muted-foreground/70">
                planning.engine · deterministic=true · clinical_use=false
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------ 中列：候选计划 ------------------------------ */}
        <div className="space-y-4 xl:col-span-6">
          <Card>
            <CardHeader className="border-b border-line pb-2.5">
              <SectionHead
                title={`候选计划 · ${candidate.version}`}
                description={candidate.summary}
                action={
                  <div className="flex items-center gap-1.5">
                    <StatusBadge tone={planStatus.tone}>{planStatus.label}</StatusBadge>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      {candidate.id}
                    </Badge>
                  </div>
                }
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3" /> 模板 V{instance.version} 已锁定
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3" /> 规则 RULE-001@1.2.0
                </span>
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3" /> 创建 {candidate.createdBy} · {fmtDate(candidate.createdAt, true)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3" /> 快照 {relTime(state.snapshotAt)}
                </span>
                {draftCount > 0 && (
                  <Badge variant="secondary" className="font-mono text-[9px]">
                    本地已生成 D{draftCount} 次草案
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {candidate.differences && (
                <Callout tone="info" title="与当前生效计划的差异">
                  {candidate.differences.note}（新增 {candidate.differences.added} · 移除 {candidate.differences.removed} · 变更{" "}
                  {candidate.differences.changed}）
                </Callout>
              )}

              <div>
                <SectionHead
                  title="阶段计划窗口"
                  count={plannedRows.length}
                  action={
                    <Badge variant="outline" className="font-mono text-[9px]">
                      投影
                    </Badge>
                  }
                />
                <div className="mt-2">
                  <GanttChart
                    rows={planGanttRows}
                    now={new Date().toISOString()}
                    maxHeight={280}
                    labelWidth={170}
                  />
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  时间轴以入径时间为锚点计算；候选计划为投影方案，未激活前不生成执行任务。UNKNOWN
                  相关任务保持待补充状态，不按默认值补齐。
                </p>
              </div>

              <div>
                <SectionHead title="计划任务" count={plannedRows.length} description="时间窗口以入径时间为锚点计算" />
                <div className="mt-2 overflow-hidden rounded-md border border-line">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[64px]">阶段</TableHead>
                        <TableHead className="min-w-[150px]">任务</TableHead>
                        <TableHead className="min-w-[54px]">角色</TableHead>
                        <TableHead className="min-w-[96px]">依赖</TableHead>
                        <TableHead className="min-w-[132px]">时间窗口</TableHead>
                        <TableHead className="min-w-[64px]">证据</TableHead>
                        <TableHead className="min-w-[76px]">风险</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plannedRows.map((row) => {
                        const unresolved = Boolean(row.issue);
                        return (
                          <TableRow key={row.nodeKey} className={cn(unresolved && "bg-warn-wash/35 hover:bg-warn-wash/50")}>
                            <TableCell className="text-[10.5px] text-muted-foreground">{row.stage}</TableCell>
                            <TableCell className="whitespace-normal">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11.5px] font-medium text-foreground/90">{row.name}</span>
                                {row.required && (
                                  <span className="font-mono text-[8.5px] text-muted-foreground/70">必需</span>
                                )}
                              </div>
                              {row.issue && (
                                <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-warn">
                                  <AlertTriangle className="size-2.5" /> {row.issue}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-[10.5px]">{ROLE_LABELS[row.role]}</TableCell>
                            <TableCell className="whitespace-normal">
                              {row.dependencyNames.length ? (
                                <div className="flex flex-wrap gap-0.5">
                                  {row.dependencyNames.slice(0, 2).map((d) => (
                                    <span
                                      key={d}
                                      className="max-w-[110px] truncate rounded-[3px] border border-line bg-secondary/50 px-1 text-[9px] text-muted-foreground"
                                      title={d}
                                    >
                                      {d}
                                    </span>
                                  ))}
                                  {row.dependencyNames.length > 2 && (
                                    <span className="font-mono text-[9px] text-muted-foreground">
                                      +{row.dependencyNames.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-[9.5px] whitespace-normal text-muted-foreground">
                              {fmtDate(row.start)} {fmtTime(row.start)}
                              <span className="mx-1 text-line-strong">→</span>
                              {fmtDate(row.end)} {fmtTime(row.end)}
                            </TableCell>
                            <TableCell>
                              {row.evidence.length ? (
                                <div className="flex flex-wrap gap-0.5">
                                  {row.evidence.map((ev) => {
                                    const item = EVIDENCE_ITEMS.find((e) => e.id === ev);
                                    return (
                                      <Tooltip key={ev}>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-help font-mono text-[9px] text-info underline decoration-dotted underline-offset-2">
                                            {ev}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-[280px]">{item?.title ?? ev}</p>
                                          <p className="mt-1 text-[10px] text-white/60">{item?.source}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {unresolved ? (
                                <Badge variant="warn" className="text-[9px]">
                                  UNKNOWN
                                </Badge>
                              ) : row.required ? (
                                <Badge variant="outline" className="text-[9px]">
                                  常规
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  标记 UNKNOWN 的任务行表示依赖数据缺失，需补充资料后才能确定执行时间；不会按默认值自动补齐。
                </p>
              </div>

              <div>
                <SectionHead title="计划警告" count={candidate.warnings.length} />
                <div className="mt-2 space-y-2">
                  {candidate.warnings.map((w) => (
                    <Callout key={w.id} tone={w.level === "RISK" ? "risk" : "warn"} title={`${w.id} · ${w.level}`} icon>
                      {w.message}
                    </Callout>
                  ))}
                  {candidate.warnings.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">当前计划未产生警告。</p>
                  )}
                </div>
              </div>

              <div>
                <SectionHead title="证据引用" count={evidenceItems.length} description="计划生成与规则判定所依据的证据条目" />
                <div className="mt-2 space-y-1.5">
                  {evidenceItems.map((e) => (
                    <div key={e.id} className="flex items-start gap-2 rounded-md border border-line bg-secondary/20 px-2.5 py-1.5">
                      <span className="font-mono text-[9.5px] text-info">{e.id}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground/85">{e.title}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">
                          {e.source} · {e.year} · 等级 {e.grade}
                        </p>
                      </div>
                    </div>
                  ))}
                  {evidenceItems.length === 0 && <p className="text-[11px] text-muted-foreground">暂无证据引用。</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button size="sm" variant="outline" onClick={handleValidate} disabled={validating}>
                  {validating ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                  校验草案
                </Button>
                <Button size="sm" variant="outline" onClick={() => setApproveOpen(true)} disabled={approved}>
                  <UserCheck className="size-3.5" />
                  {approved ? "已审核通过" : "审核通过"}
                </Button>
                {canActivate ? (
                  <Button size="sm" onClick={() => setActivateOpen(true)}>
                    <CheckCircle2 className="size-3.5" /> 激活计划
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex"
                        onClick={() => {
                          if (!activated) toast.warning(activationReason || "计划当前不可激活");
                        }}
                      >
                        <Button size="sm" disabled className="pointer-events-none">
                          <CheckCircle2 className="size-3.5" /> 激活计划
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{activated ? "计划已激活" : activationReason}</TooltipContent>
                  </Tooltip>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="size-3" /> 本计划不会自动生效，必须经医生审核
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------ 右列：安全校验 / 审批 ------------------------------ */}
        <div className="scrollbar-slim space-y-4 xl:sticky xl:top-4 xl:col-span-3 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:pr-0.5">
          <Card>
            <CardHeader className="pb-2">
              <SectionHead
                title="安全校验"
                description={`${passCount} PASS · ${warnCount} WARNING · ${unknownCount} UNKNOWN`}
                action={
                  <Button variant="ghost" size="xs" onClick={handleValidate} disabled={validating}>
                    {validating ? <Loader2 className="size-3 animate-spin" /> : "重新校验"}
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  blocked ? "border-risk/25 bg-risk-wash" : unknownCount > 0 ? "border-warn/30 bg-warn-wash" : "border-ok/25 bg-ok-wash",
                )}
              >
                <p className={cn("text-[11.5px] font-semibold", blocked ? "text-risk" : unknownCount > 0 ? "text-warn" : "text-ok")}>
                  {blocked
                    ? "BLOCKED · 关键 UNKNOWN 不可进入正式执行"
                    : unknownCount > 0
                      ? `可审核，存在 ${unknownCount} 项 UNKNOWN 待补充`
                      : "校验通过，可提交医生审核"}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-foreground/60">
                  {blocked
                    ? "存在关键 UNKNOWN 或安全阻断项，激活被禁止；需补充资料并重新校验。"
                    : "UNKNOWN 项不会被视为 PASS；未闭合前相关任务保持待补充状态，激活需医生确认。"}
                </p>
              </div>

              {validation.map((v) => {
                const meta = VALIDATION_META[v.level];
                const Icon = meta.icon;
                return (
                  <div key={v.label} className="flex items-start gap-2 rounded-md border border-line bg-secondary/20 px-2.5 py-2">
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        v.level === "PASS" && "text-ok",
                        v.level === "WARNING" && "text-warn",
                        v.level === "UNKNOWN" && "text-warn",
                        v.level === "BLOCKED" && "text-risk",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11.5px] font-medium">{v.label}</span>
                        <span
                          className={cn(
                            "font-mono text-[8.5px] tracking-wider",
                            v.level === "PASS" && "text-ok",
                            (v.level === "WARNING" || v.level === "UNKNOWN") && "text-warn",
                            v.level === "BLOCKED" && "text-risk",
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">{v.detail}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="审批流程" description="提交 → 医务处 / 专家审核 → 生效" />
            </CardHeader>
            <CardContent className="space-y-0">
              {[
                {
                  label: "提交审核",
                  desc: `${candidate.createdBy} · ${fmtDate(candidate.createdAt, true)}`,
                  done: true,
                  current: false,
                },
                {
                  label: "医务处 / 专家审核",
                  desc: approved ? `${actor} · 已审核通过` : "待审核 · 需填写审核意见",
                  done: approved,
                  current: !approved,
                },
                {
                  label: "计划生效",
                  desc: activated ? "已激活，执行切换到新版本" : "未生效 · 需审核通过后手动激活",
                  done: activated,
                  current: approved && !activated,
                },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex gap-2.5">
                  <div className="flex w-4 shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 items-center justify-center rounded-full border text-[8px]",
                        item.done
                          ? "border-ok/30 bg-ok text-white"
                          : item.current
                            ? "border-warn/40 bg-warn-wash text-warn"
                            : "border-line bg-secondary text-muted-foreground",
                      )}
                    >
                      {item.done ? <CheckCircle2 className="size-2.5" /> : item.current ? <CircleDashed className="size-2.5" /> : i + 1}
                    </span>
                    {i < arr.length - 1 && <span className={cn("my-0.5 w-px flex-1", item.done ? "bg-ok/35" : "bg-line")} />}
                  </div>
                  <div className="min-w-0 flex-1 pb-3">
                    <p className={cn("text-[11.5px] font-medium", !item.done && !item.current && "text-muted-foreground")}>
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="space-y-1.5 border-t border-line pt-2.5">
                <Button size="sm" className="w-full" onClick={() => setApproveOpen(true)} disabled={approved}>
                  <UserCheck className="size-3.5" />
                  {approved ? "已审核通过" : "审核通过"}
                </Button>
                {canActivate ? (
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => setActivateOpen(true)}>
                    <CheckCircle2 className="size-3.5" /> 激活计划
                  </Button>
                ) : (
                  <span
                    className="inline-flex w-full"
                    onClick={() => {
                      if (!activated) toast.warning(activationReason || "计划当前不可激活");
                    }}
                  >
                    <Button size="sm" variant="secondary" className="pointer-events-none w-full" disabled>
                      <CheckCircle2 className="size-3.5" /> 激活计划
                    </Button>
                  </span>
                )}
                {!canActivate && !activated && (
                  <p className="text-[10px] leading-relaxed text-warn">{activationReason}</p>
                )}
                <p className="flex items-start gap-1 text-[10px] leading-relaxed text-muted-foreground">
                  <Info className="mt-px size-3 shrink-0" />
                  本计划不会自动生效，必须经医生审核并手动激活；审核意见记录在计划版本中。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="当前生效计划" />
            </CardHeader>
            <CardContent>
              {activePlan ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] font-semibold">{activePlan.version}</span>
                    <StatusBadge tone={PLAN_STATUS_META[activePlan.status].tone} dot={false}>
                      {PLAN_STATUS_META[activePlan.status].label}
                    </StatusBadge>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-muted-foreground">{activePlan.summary}</p>
                  <div className="divide-y divide-line/70">
                    <Field label="审核人" value={activePlan.approvedBy ?? "—"} />
                    <Field label="生效时间" value={activePlan.approvedAt ? fmtDate(activePlan.approvedAt, true) : "—"} mono />
                  </div>
                  <Button size="xs" variant="outline" asChild className="mt-1">
                    <Link to={`/patients/${patient.id}/pathway`}>
                      查看执行 <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">该实例暂无生效计划。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------------------- VIS-010 决策依据图谱 ---------------------- */}
      <VisualFrame
        className="mt-4"
        title="决策依据图谱"
        english="Decision Evidence Graph"
        badge={
          <span className="rounded-[3px] border border-info/25 bg-info-wash px-1.5 py-px font-mono text-[9px] tracking-wide text-info">
            VIS-010
          </span>
        }
        actions={
          <Button variant="outline" size="xs" asChild>
            <Link to="/knowledge">
              查看规则与证据库 <ArrowRight className="size-3" />
            </Link>
          </Button>
        }
        footnote="图谱展示实际规则与证据引用关系，不是大语言模型生成的解释文本；当前为。"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <DecisionEvidenceGraph height={330} />
          </div>
          <div className="xl:col-span-4">
            <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">关键计算依据</p>
            <div className="space-y-1.5">
              {[
                { code: "RULE-001@1.2.0", label: "准入规则 · 肝细胞癌 C22.0", result: "TRUE", tone: "ok" as const },
                { code: "RULE-002@1.1.0", label: "排除规则 · 肝功能失代偿", result: "FALSE", tone: "ok" as const },
                { code: "RULE-004@1.3.0", label: "分支规则 · ICG R15 12.4% ≤ 15%", result: "TRUE", tone: "ok" as const },
                { code: "RULE-005@1.0.0", label: "安全约束 · INR 1.12 / PLT 168", result: "PASS", tone: "ok" as const },
                { code: "RULE-003@1.0.3", label: "完成规则 · 营养风险 NRS 2002", result: "UNKNOWN", tone: "warn" as const },
              ].map((row) => (
                <div key={row.code} className="flex items-start justify-between gap-2 rounded-md border border-line bg-card px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="font-mono text-[9.5px] text-muted-foreground">{row.code}</p>
                    <p className="truncate text-[11px] text-foreground/85">{row.label}</p>
                  </div>
                  <StatusBadge tone={row.tone}>{row.result}</StatusBadge>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-md border border-line bg-secondary/30 px-2.5 py-2 text-[9.5px] leading-relaxed text-muted-foreground">
              证据条目：EV-001（2024 肝癌指南）、EV-002（肝切除围术期共识）、EV-005（ERAS 共识）、EV-007（MDT 共识）。
              UNKNOWN 项不会被当作满足条件，相关任务保持待补充。
            </div>
          </div>
        </div>
      </VisualFrame>

      {/* 审核对话框 */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" /> 审核个体化计划 {candidate.version}
            </DialogTitle>
            <DialogDescription>
              {patient.name} · {instance.pathwayName} · 实例 {instance.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 px-5 py-4">
            <div className="rounded-md border border-warn/25 bg-warn-wash/50 px-2.5 py-2 text-[11px] leading-relaxed text-warn">
              审核通过后计划状态变为「已批准」，但不会自动生效；需在审批流程中手动激活。
              {unknownCount > 0 && ` 当前仍有 ${unknownCount} 项 UNKNOWN 待补充，相关任务将保持待补充状态。`}
            </div>
            <label className="text-[12px] font-medium text-foreground/80" htmlFor="approve-comment">
              审核意见 <span className="text-risk">*</span>
            </label>
            <Textarea
              id="approve-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="例如：同意按调整后计划执行；术前需完成 NRS 2002 筛查并复核门静脉癌栓影像"
            />
            <p className="text-[10px] text-muted-foreground">审核人：{actor} · 意见将写入计划版本与审计日志。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)}>
              取消
            </Button>
            <Button size="sm" disabled={comment.trim().length < 4} onClick={handleApprove}>
              确认审核通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 激活对话框 */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 激活计划 {candidate.version}
            </DialogTitle>
            <DialogDescription>激活后将切换到新的个体化计划，当前计划 {activePlan?.version ?? "—"} 将被取代。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 px-5 py-4">
            <div className="rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              激活后路径实例按新计划生成执行任务；已完成任务与历史记录保留。此操作会写入路径事件流与审计日志。
            </div>
            {unknownCount > 0 && (
              <div className="rounded-md border border-warn/25 bg-warn-wash/50 px-2.5 py-2 text-[11px] leading-relaxed text-warn">
                注意：仍有 {unknownCount} 项 UNKNOWN（营养风险等）未闭合。激活后不会自动视为满足条件，相关任务将保持「待补充资料」状态。
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">激活人：{actor}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActivateOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleActivate}>
              确认激活
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Info className="size-3 text-muted-foreground/70" />
          规划引擎：相同输入与版本产生语义一致计划；UNKNOWN 不参与条件命中。
        </span>
        <Link to={`/patients/${patient.id}/pathway`} className="inline-flex items-center gap-0.5 text-primary hover:underline">
          返回路径执行 <ArrowRight className="size-3" />
        </Link>
      </div>
    </Page>
  );
}



export default function PlanningPage() {
  if (IS_SERVER_MODE) return <ServerPlanningPage />;
  return <DemoPlanningPage />;
}
