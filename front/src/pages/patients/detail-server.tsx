import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  RefreshCw,
  Route,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import type { BackendPatientDetail, BackendTask } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const TASK_TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  COMPLETED: "ok",
  IN_PROGRESS: "info",
  READY: "warn",
  BLOCKED: "risk",
  CANCELLED: "neutral",
  SKIPPED: "neutral",
  PENDING: "neutral",
};

function text(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function TaskRow({ task }: { task: BackendTask }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-line bg-card px-2.5 py-2">
      <div className="min-w-0">
        <p className="truncate text-[11.5px] font-medium">{task.name}</p>
        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
          {task.stage} · {task.role} {task.due_at ? `· 截止 ${fmtDate(task.due_at, true)}` : ""}
        </p>
      </div>
      <StatusBadge tone={TASK_TONE[task.status] ?? "neutral"} dot={false}>
        {task.status}
      </StatusBadge>
    </div>
  );
}

export default function ServerPatientDetailPage() {
  const { id = "" } = useParams();
  const query = useQuery<BackendPatientDetail>({
    queryKey: ["backend", "patient-detail", id],
    queryFn: () => hccApi.getPatientDetail(id),
    enabled: Boolean(id) && hccApi.hasToken(),
    retry: 0,
  });

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <EmptyState
          icon={<UserRound />}
          title="需要后端登录"
          description="当前为 server 模式，但浏览器中没有后端凭证。请从登录页重新登录。"
          action={
            <Button asChild size="sm">
              <Link to="/login">返回登录</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  if (query.isLoading) {
    return (
      <Page>
        <p className="py-16 text-center text-[12px] text-muted-foreground">正在读取后端患者聚合数据…</p>
      </Page>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Page>
        <EmptyState
          icon={<AlertTriangle />}
          title="无法读取患者详情"
          description="后端未返回该患者，或当前账号无对象级访问权限。"
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

  const data = query.data;
  const patient = data.patient;
  const assessment = data.assessment as
    | {
        staging?: Record<string, unknown>;
        liver_reserve?: Record<string, unknown>;
        performance_status?: Record<string, unknown>;
        tumor?: Record<string, unknown>;
        biomarkers?: Record<string, unknown>;
        hepatitis?: Record<string, unknown>;
        missing_fields?: string[];
        ruleset_version?: string;
      }
    | null;
  const instance = data.instance;
  const plan = data.plan;
  const missing = assessment?.missing_fields ?? [];
  const planTasks = plan?.tasks ?? [];

  return (
    <Page>
      <div className="mb-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <Link to="/patients" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> 返回患者中心
        </Link>
        <span className="text-line-strong">/</span>
        <span className="font-mono text-[11px]">{patient.patient_id}</span>
        <Badge variant="outline" className="ml-1 font-mono text-[8.5px]">
          BACKEND AGGREGATE
        </Badge>
      </div>

      <PageHeader
        module="M04 · 患者管理 · 后端聚合视图"
        title="患者详情"
        description="数据来自 HCC-CIP FastAPI 后端；仅展示当前账号有对象级权限的聚合内容，不含真实患者数据。"
        actions={
          <div className="flex items-center gap-2">
            <SyntheticTag />
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw className="size-3.5" /> 刷新
            </Button>
          </div>
        }
        meta={
          <>
            <PageMeta label="患者" value={`${patient.display_name} · ${patient.patient_id}`} mono />
            <PageMeta label="病区" value={text(data.encounters[0]?.ward)} />
            <PageMeta label="责任医生" value={text(data.encounters[0]?.attending_name)} />
            <PageMeta label="数据源" value="FastAPI · SQLite" mono />
          </>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <PatientAvatar name={patient.display_name} id={patient.patient_id} size="lg" />
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight">{patient.display_name}</h2>
              <span className="text-[11px] text-muted-foreground">
                {patient.sex === "M" ? "男" : "女"} · {patient.birth_date ?? "生日未知"}
              </span>
              <StatusBadge tone={patient.status === "ACTIVE" ? "ok" : "neutral"}>{patient.status}</StatusBadge>
              <Badge variant="info" className="font-mono text-[9px]">
                {patient.diagnosis_code} · {patient.diagnosis_name}
              </Badge>
              {assessment?.staging?.value ? <Badge variant="outline">{text(assessment.staging.value)}</Badge> : null}
              {assessment?.liver_reserve?.child_pugh ? (
                <Badge variant="outline">Child-Pugh {text(assessment.liver_reserve.child_pugh)}</Badge>
              ) : null}
            </div>
            <p className="mt-2 max-w-[780px] text-[12px] leading-relaxed text-muted-foreground">
              本页由 <code className="font-mono text-[10.5px]">GET /patients/{patient.patient_id}/overview</code> 聚合生成；
              观测值、评估缺失项、计划与状态均以服务端数据为准。UNKNOWN 不显示为正常值。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="size-3" /> {text(data.encounters[0]?.department_name)}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" /> 入院 {text(data.encounters[0]?.admitted_at && fmtDate(text(data.encounters[0].admitted_at), true))}
              </span>
              <span className="inline-flex items-center gap-1">
                <Route className="size-3" /> {instance?.instance_id ?? "暂无路径实例"}
              </span>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
            {[
              { label: "路径状态", value: instance?.status ?? "未入径" },
              { label: "当前阶段", value: instance?.current_stage ?? "—" },
              { label: "计划状态", value: plan?.status ?? "无计划" },
              { label: "缺失字段", value: String(missing.length) },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-line bg-secondary/25 px-3 py-2">
                <p className="font-mono text-[8.5px] tracking-wider text-muted-foreground uppercase">{item.label}</p>
                <p className="mt-1 text-[11.5px] font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader className="pb-2">
            <SectionHead title="专病评估" description="最新快照 · 规则集版本" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="分期" value={assessment?.staging ? `${text(assessment.staging.system)} ${text(assessment.staging.value)}` : "无快照"} />
              <Field label="ECOG" value={assessment?.performance_status ? text(assessment.performance_status.ecog) : "—"} />
              <Field label="肿瘤最大径" value={assessment?.tumor?.max_diameter_mm ? `${text(assessment.tumor.max_diameter_mm)} mm` : "—"} />
              <Field label="AFP" value={assessment?.biomarkers?.afp_ng_ml ? `${text(assessment.biomarkers.afp_ng_ml)} ng/mL` : "—"} />
              <Field label="血管侵犯" value={assessment?.tumor ? (assessment.tumor.vascular_invasion ? "是" : "否") : "—"} />
              <Field label="肝外转移" value={assessment?.tumor ? (assessment.tumor.extrahepatic_metastasis ? "是" : "否") : "—"} />
            </div>
            {missing.length ? (
              <Callout tone="warn" title={`${missing.length} 项数据缺失`}>
                {missing.join("、")}；系统按 UNKNOWN 处理，不自动视为满足条件。
              </Callout>
            ) : (
              <p className="text-[10px] text-muted-foreground">快照无缺失字段；规则集 {text(assessment?.ruleset_version)}。</p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader className="pb-2">
            <SectionHead title="观测记录" count={data.observations.length} description="服务端原始观测 · KNOWN / UNKNOWN" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.observations.slice(0, 10).map((observation) => (
              <div key={observation.observation_id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium">{observation.display}</p>
                  <p className="font-mono text-[8.5px] text-muted-foreground">
                    {observation.code} · {fmtDate(observation.occurred_at, true)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular font-mono text-[11px]">
                    {observation.value_status === "UNKNOWN"
                      ? "UNKNOWN"
                      : observation.value_num ?? observation.value_text ?? "—"}
                    {observation.unit && observation.value_status === "KNOWN" ? ` ${observation.unit}` : ""}
                  </p>
                  <Badge variant={observation.interpretation === "ABNORMAL" ? "warn" : "outline"} className="mt-0.5 text-[8px]">
                    {observation.interpretation}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader className="pb-2">
            <SectionHead title="计划与任务" count={planTasks.length} description="候选计划由规则+快照生成，审核后激活" />
          </CardHeader>
          <CardContent className="space-y-2">
            {plan ? (
              <>
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-secondary/25 px-3 py-2">
                  <Badge variant="outline" className="font-mono text-[9px]">{plan.version}</Badge>
                  <span className="text-[11.5px] font-medium">{plan.status}</span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{plan.summary}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{plan.plan_id}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {planTasks.map((task) => <TaskRow key={task.task_id} task={task} />)}
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-[11px] text-muted-foreground">该患者尚无计划；需先完成入径与计划生成。</p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader className="pb-2">
            <SectionHead title="变异 / 随访 / 结局" description="后端聚合 · 只读演示" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="label-micro mb-1">变异 {data.variations.length}</p>
              {data.variations.slice(0, 3).map((variation) => (
                <div key={variation.variation_id} className="mb-1 flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                  <span className="truncate text-[10.5px]">{variation.title}</span>
                  <StatusBadge tone={variation.severity === "HIGH" ? "risk" : variation.severity === "MEDIUM" ? "warn" : "neutral"} dot={false}>
                    {variation.severity}
                  </StatusBadge>
                </div>
              ))}
              {!data.variations.length ? <p className="text-[10px] text-muted-foreground">无变异记录</p> : null}
            </div>
            <div>
              <p className="label-micro mb-1">随访 {data.followups.length}</p>
              {data.followups.slice(0, 2).map((followup) => (
                <div key={followup.followup_id} className="mb-1 flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                  <span className="truncate text-[10.5px]">{followup.followup_id} · {followup.status}</span>
                  <StatusBadge tone={followup.risk_level === "HIGH" ? "risk" : "neutral"} dot={false}>{followup.risk_level}</StatusBadge>
                </div>
              ))}
              {!data.followups.length ? <p className="text-[10px] text-muted-foreground">无随访计划</p> : null}
            </div>
            <div>
              <p className="label-micro mb-1">结局 {data.outcomes.length}</p>
              {data.outcomes.slice(0, 2).map((outcome) => (
                <div key={outcome.outcome_id} className="mb-1 flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                  <span className="truncate text-[10.5px]">{outcome.treatment_type} · {outcome.response}</span>
                  <Badge variant="outline" className="text-[8px]">{outcome.recurrence}</Badge>
                </div>
              ))}
              {!data.outcomes.length ? <p className="text-[10px] text-muted-foreground">无结局记录</p> : null}
            </div>
            <div className="border-t border-line pt-2 text-[9.5px] text-muted-foreground">
              <ShieldCheck className="mr-1 inline size-3" />
              本页为后端聚合只读视图；变异/随访/结局操作仍应在对应工作流中完成。
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
