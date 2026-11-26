import { IS_SERVER_MODE } from "@/lib/data-mode";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  History,
  MoreHorizontal,
  PhoneCall,
  Route,
  Sparkles,
  Stethoscope,
  Thermometer,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { ClinicalEvent, Encounter, Observation, Patient, Task } from "@/types";
import {
  CLINICAL_EVENTS,
  getClinicalEvents,
  getEncounters,
  getObservations,
  getPatient,
  getPlans,
  getVariations,
  addDays,
} from "@/data";
import {
  INSTANCE_STATUS_META,
  NODE_META,
  PATIENT_STATUS_META,
  PLAN_STATUS_META,
  RISK_META,
  ROLE_LABELS,
  TASK_STATUS_META,
  VARIATION_TYPE_META,
} from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagChips, AllergyChips, SubNote } from "@/components/patient/ui";
import { PatientHeaderCard } from "@/components/patient/patient-header";
import { StateSnapshot } from "@/components/clinical/state-snapshot";
import {
  CLINICAL_STAGES,
  StageProgressStrip,
  StageStateBadge,
  deriveStageStates,
  getPatientInstance,
  isTerminalTask,
  usePatientTasks,
} from "@/components/patient/stages";
import { getStateForPatient } from "@/components/patient/patient-state";
import { DataCompletenessCard } from "@/components/patient/data-completeness";
import { ObservationPanel } from "@/components/patient/observation-table";
import { VitalsTrendCard } from "@/components/patient/vitals-trends";
import { KeyLabTrendsCard } from "@/components/patient/key-lab-trends";
import { PatientTimeline } from "@/visualization/patient/PatientTimeline";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import { PatientStateRadar } from "@/visualization/patient/PatientStateRadar";
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
  "VS-SPO2": "血氧饱和度",
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

function vitalTone(flag: Observation["flag"]) {
  return flag === "HIGH" ? "text-risk" : flag === "LOW" ? "text-warn" : "text-foreground";
}

function VitalsStrip({ observations }: { observations: Observation[] }) {
  const list = latestVitals(observations);
  if (!list.length) return <p className="text-[11.5px] text-muted-foreground">暂无生命体征数据。</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {list.map((v) => (
        <div key={v.code} className="rounded-md border border-line bg-card px-2.5 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-muted-foreground">{VITAL_LABEL[v.code] ?? v.name}</span>
            {v.flag === "HIGH" || v.flag === "LOW" ? (
              <StatusBadge tone={v.flag === "HIGH" ? "risk" : "warn"} dot={false} className="text-[9px]">
                {v.flag === "HIGH" ? "偏高" : "偏低"}
              </StatusBadge>
            ) : (
              <span className="font-mono text-[9px] text-ok">正常</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={cn("font-mono text-[16px] leading-none font-semibold tabular", vitalTone(v.flag))}>
              {v.value}
            </span>
            <span className="text-[9.5px] text-muted-foreground">{v.unit}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-muted-foreground">
            <span>{relTime(v.observedAt)}</span>
            <span>{v.source}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskLine({ task }: { task: Task }) {
  const node = NODE_META[task.type];
  const Icon = node.icon;
  const status = TASK_STATUS_META[task.status];
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px]", node.chip)}>
        <Icon className="size-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[12px] font-medium text-foreground/90">{task.name}</span>
          {task.overdue && !isTerminalTask(task.status) && (
            <StatusBadge tone="risk" dot={false} className="text-[9.5px]">
              已超时
            </StatusBadge>
          )}
          {!task.required && (
            <Badge variant="outline" className="text-[9px]">
              非必需
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
          <span>{ROLE_LABELS[task.role]}</span>
          <span>{task.assignee}</span>
          <span className="font-mono">
            {fmtDate(task.dueAt)} {fmtTime(task.dueAt)} 前
          </span>
          <span>{task.id}</span>
        </div>
      </div>
      <StatusBadge tone={status.tone} dot={false}>
        {status.label}
      </StatusBadge>
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
          description={`患者标识 ${id} 在合成病例集中不存在，可能已被移除或链接有误。`}
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
  const encList: Encounter[] = getEncounters(patient.id).length
    ? getEncounters(patient.id)
    : [
        {
          id: `ENC-${patient.id}`,
          patientId: patient.id,
          type: "INPATIENT",
          admittedAt: patient.admissionAt,
          department: patient.departmentName,
          attending: patient.attending,
          diagnosis: `${patient.diagnosis}（${patient.diagnosisCode}，${patient.stage}）`,
          bed: patient.bed,
        },
      ];
  const vitals = latestVitals(observations);
  const abnormalVitals = vitals.filter((v) => v.flag === "HIGH" || v.flag === "LOW");
  const riskMeta = RISK_META[patient.riskLevel];
  const executionLink = `/patients/${patient.id}/pathway`;
  const planningLink = instance ? `/planning/${instance.id}` : null;

  const notifyDemo = (message: string) => toast.info(`${message}（演示环境，未连接真实系统）`);

  return (
    <Page>
      <div className="mb-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <Link to="/patients" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> 返回患者中心
        </Link>
        <span className="text-line-strong">/</span>
        <span className="font-mono text-[11px]">{patient.id}</span>
      </div>

      <PageHeader
        module="M04 · 患者管理"
        title="患者详情"
        description={patient.presentIllness}
        actions={<SyntheticTag />}
        meta={
          <>
            <PageMeta label="患者" value={`${patient.name} · ${patient.mrn}`} mono />
            <PageMeta label="病区" value={`${patient.departmentName} · ${patient.ward} · ${patient.bed} 床`} />
            <PageMeta label="责任医生" value={patient.attending} />
            <PageMeta label="路径实例" value={instance?.id ?? "未创建"} mono />
          </>
        }
      />

      <PatientHeaderCard
        patient={patient}
        actions={
          <>
            <Button size="sm" asChild>
              <Link to={executionLink}>
                <Activity className="size-3.5" />
                查看患者路径
              </Link>
            </Button>
            {planningLink ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={planningLink}>
                  <Sparkles className="size-3.5" />
                  生成规划
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => notifyDemo("该患者尚无路径实例，无法生成规划")}>
                <Sparkles className="size-3.5" />
                生成规划
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => notifyDemo("已导出患者档案（PDF 合成模板）")}>
              <Download className="size-3.5" />
              导出
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}/map`}>
                <Route className="size-3.5" />
                动态路径图
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.id}/replay`}>
                <History className="size-3.5" />
                病程回放
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>患者操作</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => notifyDemo("已登记人工变异记录")}>
                  <GitBranch /> 登记变异
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => notifyDemo("已请求重新同步患者观测数据")}>
                  <History /> 重新同步观测
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => notifyDemo("退出路径需在路径执行页填写理由")}>
                  <AlertTriangle /> 申请退出路径
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        meta={<span className="font-mono text-[9.5px] text-muted-foreground/70">SYNTHETIC PATIENT · {patient.id}</span>}
      />
      <StateSnapshot
        stage={currentStage ?? "未开始"}
        risk={patient.riskLevel}
        completeness={state.dataCompleteness}
        asOf={state.snapshotAt}
      />

      <Tabs defaultValue="overview" className="mt-4 gap-3">
        <TabsList className="w-full overflow-x-auto scrollbar-slim">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="pathway">临床路径</TabsTrigger>
          <TabsTrigger value="observations">
            检验检查
            <Badge variant="outline" className="ml-0.5 font-mono text-[9px]">
              {observations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">病程时间轴</TabsTrigger>
          <TabsTrigger value="variations">
            变异记录
            {variations.length > 0 && (
              <Badge variant="warn" className="ml-0.5 font-mono text-[9px]">
                {variations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="followup">随访</TabsTrigger>
        </TabsList>

        {/* ------------------------------ 概览 ------------------------------ */}
        <TabsContent value="overview" className="mt-3">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
            {/* 左列 */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-1.5">
                  <SectionHead title="基本信息" />
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="divide-y divide-line/70">
                    <Field label="患者 ID" value={patient.id} mono />
                    <Field label="病历号" value={patient.mrn} mono />
                    <Field label="性别 / 年龄" value={`${patient.gender === "M" ? "男" : "女"} · ${patient.age} 岁`} />
                    <Field label="出生日期" value={fmtDate(patient.birthDate)} mono />
                    <Field label="入院时间" value={fmtDate(patient.admissionAt, true)} mono />
                    <Field label="住院天数" value={`${patient.los} 天`} mono />
                    <Field label="科室 / 病区" value={`${patient.departmentName} · ${patient.ward}`} />
                    <Field label="床位" value={patient.bed} mono />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1.5">
                  <SectionHead title="就诊信息" count={encList.length} />
                </CardHeader>
                <CardContent className="space-y-2 pt-1">
                  {encList.map((enc) => (
                    <div key={enc.id} className="rounded-md border border-line bg-secondary/25 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={enc.type === "INPATIENT" ? "info" : "secondary"} className="text-[9.5px]">
                          {enc.type === "INPATIENT" ? "住院" : enc.type === "OUTPATIENT" ? "门诊" : "急诊"}
                        </Badge>
                        <span className="font-mono text-[9.5px] text-muted-foreground">{fmtDate(enc.admittedAt)}</span>
                      </div>
                      <p className="mt-1 text-[11.5px] font-medium text-foreground/85">{enc.department}</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">{enc.diagnosis}</p>
                      <p className="mt-1 font-mono text-[9.5px] text-muted-foreground/80">
                        {enc.attending} · {enc.bed} 床 · {enc.id}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1.5">
                  <SectionHead title="医疗团队" />
                </CardHeader>
                <CardContent className="space-y-2 pt-1">
                  {[
                    { role: "责任医生", name: patient.attending, tone: "bg-accent text-accent-foreground" },
                    { role: "责任护士", name: patient.nurse, tone: "bg-warn-wash text-warn" },
                    { role: "路径协调员", name: "系统自动分派", tone: "bg-secondary text-secondary-foreground" },
                  ].map((m) => (
                    <div key={m.role} className="flex items-center gap-2.5">
                      <span className={cn("flex size-7 items-center justify-center rounded-full text-[10px] font-medium", m.tone)}>
                        {m.name.slice(0, 1)}
                      </span>
                      <div>
                        <div className="text-[11.5px] font-medium">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">{m.role}</div>
                      </div>
                    </div>
                  ))}
                  <SubNote>团队成员来自合成组织数据；真实环境按权限与排班动态分派。</SubNote>
                </CardContent>
              </Card>
            </div>

            {/* 中列 */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <SectionHead
                    title="路径阶段进度"
                    description={`当前阶段 · ${currentStage ?? "未开始"}`}
                    action={
                      <Button variant="ghost" size="xs" asChild>
                        <Link to={executionLink}>
                          执行中心 <ArrowUpRight className="size-3" />
                        </Link>
                      </Button>
                    }
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  <StageProgressStrip tasks={tasks} progress={patient.progress} />
                  <div className="flex items-center gap-2">
                    <Progress value={patient.progress} className="h-1.5" />
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular">
                      整体 {patient.progress}%
                    </span>
                  </div>
                  {derived && (
                    <SubNote>该患者无实时执行任务，阶段状态由住院进度合成推演，仅用于界面展示。</SubNote>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionHead
                    title="生命体征"
                    description="最近一次采集值 · 生命体征异常以颜色标注"
                    action={
                      abnormalVitals.length > 0 ? (
                        <Badge variant="warn" className="gap-1 text-[10px]">
                          <AlertTriangle className="size-3" /> 异常 {abnormalVitals.length}
                        </Badge>
                      ) : (
                        <Badge variant="ok" className="text-[10px]">
                          全部正常
                        </Badge>
                      )
                    }
                  />
                </CardHeader>
                <CardContent>
                  <VitalsStrip observations={observations} />
                  {abnormalVitals.some((v) => v.code === "VS-TEMP") && (
                    <Callout tone="warn" title="近 24 小时体温升高 37.6°C" className="mt-3">
                      护理系统于 {relTime(abnormalVitals.find((v) => v.code === "VS-TEMP")?.observedAt ?? new Date().toISOString())}
                      上报体温 37.6°C（阈值 37.3°C）。当前未达病情变异标准，需术前复测并观察感染指标。
                    </Callout>
                  )}
                </CardContent>
              </Card>

              <VitalsTrendCard />

              <DataCompletenessCard state={state} description="状态快照聚合 · UNKNOWN 不视为满足条件" />

              <Card>
                <CardHeader className="pb-2">
                  <SectionHead
                    title="当前路径"
                    action={
                      instance ? (
                        <Badge variant="outline" className="font-mono text-[9.5px]">
                          {instance.id}
                        </Badge>
                      ) : undefined
                    }
                  />
                </CardHeader>
                <CardContent>
                  {instance ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-medium">{instance.pathwayName}</span>
                        <Badge variant="outline" className="font-mono text-[9.5px]">
                          V{instance.version}
                        </Badge>
                        <StatusBadge tone={INSTANCE_STATUS_META[instance.status].tone}>
                          {INSTANCE_STATUS_META[instance.status].label}
                        </StatusBadge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <Field label="入径时间" value={fmtDate(instance.enrolledAt, true)} mono />
                        <Field label="责任医生" value={instance.responsibleDoctor} />
                        <Field label="当前阶段" value={instance.currentStage} />
                        <Field label="修订版本" value={`R${instance.revision}`} mono />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={instance.progress} className="h-1.5" />
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular">
                          {instance.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="xs" asChild>
                          <Link to={executionLink}>打开执行中心</Link>
                        </Button>
                        {planningLink && (
                          <Button size="xs" variant="outline" asChild>
                            <Link to={planningLink}>规划工作台</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : patient.pathwayName ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-medium">{patient.pathwayName}</span>
                        <Badge variant="outline" className="font-mono text-[9.5px]">
                          V{patient.pathwayVersion}
                        </Badge>
                        <StatusBadge tone={PATIENT_STATUS_META[patient.status].tone}>
                          {PATIENT_STATUS_META[patient.status].label}
                        </StatusBadge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <Field label="入径时间" value={patient.enrolledAt ? fmtDate(patient.enrolledAt, true) : "—"} mono />
                        <Field label="责任医生" value={patient.attending} />
                        <Field label="当前阶段" value="合成推演" />
                        <Field label="实例 ID" value={patient.instanceId ?? "—"} mono />
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={patient.progress} className="h-1.5" />
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular">
                          {patient.progress}%
                        </span>
                      </div>
                      <Callout tone="neutral" title="执行实例未同步">
                        该患者来自批量合成数据，未关联可交互的执行实例；执行中心将展示按住院进度推导的合成推演任务。
                      </Callout>
                      <Button size="xs" variant="outline" asChild>
                        <Link to={executionLink}>打开执行中心</Link>
                      </Button>
                    </div>
                  ) : (
                    <EmptyState
                      title="尚未创建路径实例"
                      description="该患者尚未确认入径。可在患者中心使用「智能入径匹配」完成三态评估后确认入径。"
                      icon={<GitBranch />}
                      action={
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/patients">返回患者中心</Link>
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionHead title="病情摘要" />
                </CardHeader>
                <CardContent>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{patient.presentIllness}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <FlagChips flags={patient.flags} max={4} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右列 */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <SectionHead
                    title="风险与提示"
                    action={
                      <StatusBadge tone={riskMeta.tone} dot={false}>
                        {riskMeta.label}
                      </StatusBadge>
                    }
                  />
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div>
                    <p className="label-micro mb-1.5">过敏信息</p>
                    <AllergyChips allergies={patient.allergy} />
                  </div>
                  <div>
                    <p className="label-micro mb-1.5">风险标记</p>
                    <FlagChips flags={patient.flags} max={3} />
                  </div>
                  {state.missingFields.length > 0 && (
                    <Callout tone="warn" title="数据缺失">
                      关键字段未采集：{state.missingFields.map((f) => f.split(".").slice(-1)[0]).join("、")}。
                      规划按 UNKNOWN 处理，进入执行前需补录。
                    </Callout>
                  )}
                  {patient.allergy.length > 0 && (
                    <Callout tone="risk" title="过敏风险">
                      患者对 {patient.allergy.join("、")} 过敏，围术期用药与皮试需重点核对。
                    </Callout>
                  )}
                  {patient.riskLevel === "HIGH" && (
                    <Callout tone="risk" title="高风险患者">
                      病情变异 / 任务超时或安全约束触发，需责任医生每日查房并记录变异评估。
                    </Callout>
                  )}
                  {patient.riskLevel !== "HIGH" && !state.missingFields.length && patient.allergy.length === 0 && (
                    <Callout tone="ok" title="暂未发现活跃风险">
                      当前无活跃安全约束；仍需按路径节点完成评估与复测。
                    </Callout>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <SectionHead
                    title="状态快照"
                    description={`${fmtDate(state.snapshotAt, true)} · ${relTime(state.snapshotAt)}`}
                    action={
                      planningLink ? (
                        <Button variant="ghost" size="xs" asChild>
                          <Link to={planningLink}>
                            规划 <ArrowUpRight className="size-3" />
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Progress value={state.dataCompleteness} className="h-1.5" indicatorClassName="bg-primary" />
                    <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground tabular">
                      {state.dataCompleteness}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "KNOWN", count: state.fields.filter((f) => f.status === "KNOWN").length, tone: "text-ok" },
                      { label: "UNKNOWN", count: state.fields.filter((f) => f.status === "UNKNOWN").length, tone: "text-warn" },
                      { label: "STALE", count: state.fields.filter((f) => f.status === "STALE").length, tone: "text-info" },
                    ].map((s) => (
                      <div key={s.label} className="rounded border border-line bg-secondary/30 px-2 py-1 text-center">
                        <div className={cn("font-mono text-[14px] font-semibold tabular", s.tone)}>{s.count}</div>
                        <div className="font-mono text-[8.5px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="label-micro mb-1">未知条件</p>
                    {state.unknownConditions.length ? (
                      <ul className="space-y-1">
                        {state.unknownConditions.map((c) => (
                          <li key={c} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warn" /> {c}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">无未知条件</p>
                    )}
                  </div>
                  <SubNote>快照用于个体化规划输入；缺失值以 UNKNOWN 标记，不参与条件命中。</SubNote>
                </CardContent>
              </Card>

              <VisualFrame
                title="患者状态画像"
                english="PATIENT STATE RADAR"
                description="入院基线 vs 当前状态 vs 参考范围 · 六维状态向量（0–100）"
                badge={
                  <Badge variant="outline" className="font-mono text-[8.5px]">
                    SYNTHETIC
                  </Badge>
                }
                footnote="评分用于演示状态向量映射，不代表临床量表结论。"
                dense
              >
                <PatientStateRadar compact showFootnote={false} height={208} />
                <p className="mt-1 px-0.5 text-[9.5px] leading-relaxed text-muted-foreground">
                  肝功能、肾功能、营养、体能、炎症负荷与凝血六个维度按合成状态向量归一化；灰色虚线为演示参考范围。
                </p>
              </VisualFrame>

              <Card>
                <CardHeader className="pb-2">
                  <SectionHead title="快捷入口" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-1.5">
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link to={executionLink}>
                      <ClipboardList className="size-3.5" /> 任务执行
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link to="/tasks">
                      <Clock3 className="size-3.5" /> 任务中心
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start" asChild>
                    <Link to="/variations">
                      <GitBranch className="size-3.5" /> 变异管理
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => notifyDemo("已生成患者病程摘要（合成文本）")}
                  >
                    <FileText className="size-3.5" /> 生成病程摘要
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------ 临床路径 ------------------------------ */}
        <TabsContent value="pathway" className="mt-3 space-y-4">
          {derived && (
            <Callout tone="info" title="合成推演任务">
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
        <TabsContent value="observations" className="mt-3 space-y-4">
          <VisualFrame
            title="多模态临床指标联动"
            english="MULTIMODAL MONITORING"
            description="检验指标趋势 · 参考区间 · 临床事件 · 回放游标共用时间轴；点击指标可切换 AFP / ALT / ALB / CRP"
            badge={
              <Badge variant="outline" className="font-mono text-[8.5px]">
                SYNTHETIC
              </Badge>
            }
            actions={
              <Button variant="ghost" size="xs" asChild>
                <Link to={`/patients/${patient.id}/replay`}>
                  病程回放 <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            }
            footnote="事件标记、参考区间与游标仅用于可视化演示；UNKNOWN / 异常值不等同于临床诊断。"
            contentClassName="pt-2"
          >
            <ClinicalTrendLinkage height={280} showZoom />
          </VisualFrame>
          <KeyLabTrendsCard />
          <ObservationPanel observations={observations} />
        </TabsContent>

        {/* ------------------------------ 病程时间轴 ------------------------------ */}
        <TabsContent value="timeline" className="mt-3 space-y-4">
          {eventsAreFallback && (
            <Callout tone="neutral" title="通用合成事件流">
              该患者暂无独立事件流记录，以下为演示通用事件（与患者档案关联展示）。
            </Callout>
          )}
          <Card>
            <CardHeader>
              <SectionHead
                title="病程时间轴"
                count={events.length}
                description="由 HIS / EMR / LIS / PACS 与 HCC-CIP 运行引擎聚合的临床事件"
                action={
                  <Badge variant="outline" className="font-mono text-[9.5px]">
                    {eventsAreFallback ? "SYNTHETIC" : "REALTIME DEMO"}
                  </Badge>
                }
              />
            </CardHeader>
            <CardContent>
              <PatientTimeline events={events} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ 变异记录 ------------------------------ */}
        <TabsContent value="variations" className="mt-3 space-y-4">
          {variations.length === 0 ? (
            <Card>
              <CardContent className="pt-4">
                <EmptyState
                  icon={<GitBranch />}
                  title="暂无变异记录"
                  description="该患者在路径执行中未登记病情、时间、资源或数据类变异。变异记录会在任务超时、安全约束触发或医生主动登记时生成。"
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
        <TabsContent value="followup" className="mt-3 space-y-4">
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
                进度 {patient.progress}%，尚未触发随访生成。演示环境不会创建真实随访任务。
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
                description="患者仍在院执行路径，尚无出院后随访记录。"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3 text-muted-foreground/70" />
          本页展示内容均来自 V0.6.1 合成演示数据集，不代表真实患者诊疗信息。
        </span>
        <Link to={executionLink} className="inline-flex items-center gap-0.5 text-primary hover:underline">
          进入路径执行中心 <ExternalLink className="size-3" />
        </Link>
      </div>
    </Page>
  );
}
