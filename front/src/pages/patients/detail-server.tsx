import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  RefreshCw,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { BackendPatientDetail, BackendTask } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { cn, fmtDate, relTime } from "@/lib/utils";
import { Page } from "@/components/app/page-header";
import { Callout, EmptyState, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  WorkspaceColumns,
  WorkspaceFact,
  WorkspaceIdentity,
  WorkspacePage,
  WorkspacePanel,
} from "@/components/patient/clinical-workspace";

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
    <div className="flex items-start justify-between gap-2 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-[14px] leading-[22px] font-medium text-ink">{task.name}</p>
        <p className="mt-0.5 text-[12px] leading-[18px] text-muted-foreground">
          {task.stage} · {task.role}
          {task.due_at ? ` · 截止 ${fmtDate(task.due_at, true)}` : ""}
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
        <p className="py-16 text-center text-[14px] text-muted-foreground">正在读取后端患者聚合数据…</p>
      </Page>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Page>
        <EmptyState
          icon={<AlertTriangle />}
          title="无法读取患者 360"
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
  const openTasks = planTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "SKIPPED");
  const encounter = data.encounters[0];
  const asOf = data.observations[0]?.occurred_at;

  return (
    <WorkspacePage>
      <WorkspaceIdentity>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] leading-[18px] text-muted-foreground">
          <Link to="/patients" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> 返回患者中心
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] tabular-nums">{patient.patient_id}</span>
            <Badge variant="outline" className="font-mono text-[12px]">
              BACKEND
            </Badge>
            <SyntheticTag />
            {asOf && (
              <span>
                数据 · {fmtDate(asOf, true)} · {relTime(asOf)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <PatientAvatar name={patient.display_name} id={patient.patient_id} size="lg" />
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.025em] text-ink">{patient.display_name}</h1>
              <span className="text-[14px] leading-[22px] text-muted-foreground">
                {patient.sex === "M" ? "男" : "女"}
                {patient.birth_date ? ` · ${patient.birth_date}` : ""}
              </span>
              <StatusBadge tone={patient.status === "ACTIVE" ? "ok" : "neutral"}>{patient.status}</StatusBadge>
              {assessment?.staging?.value ? (
                <Badge variant="outline">{text(assessment.staging.value)}</Badge>
              ) : null}
              {assessment?.liver_reserve?.child_pugh ? (
                <Badge variant="outline">Child-Pugh {text(assessment.liver_reserve.child_pugh)}</Badge>
              ) : null}
            </div>
            <p className="mt-1.5 text-[14px] leading-[22px] text-ink">
              {patient.diagnosis_name}
              <span className="ml-2 font-mono text-[13px] tabular-nums text-muted-foreground">{patient.diagnosis_code}</span>
              <span className="mx-2 text-line-strong">·</span>
              <span>
                当前阶段{" "}
                <span className="font-medium">{instance?.current_stage ?? "未入径"}</span>
              </span>
            </p>
            <p className="mt-2 max-w-[780px] text-[12px] leading-[18px] text-muted-foreground">
              后端聚合视图 · GET /patients/{patient.patient_id}/overview · UNKNOWN 不显示为正常值
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button size="sm" asChild>
              <Link to={`/patients/${patient.patient_id}/pathway`}>
                <Activity className="size-3.5" /> 查看患者路径
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patients/${patient.patient_id}/map`}>
                <Route className="size-3.5" /> 动态路径图
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw className="size-3.5" /> 刷新
            </Button>
          </div>
        </div>
      </WorkspaceIdentity>

      <WorkspaceColumns
        left={
          <>
            <WorkspacePanel title="专病评估">
              <WorkspaceFact
                label="分期"
                value={
                  assessment?.staging
                    ? `${text(assessment.staging.system)} ${text(assessment.staging.value)}`
                    : "无快照"
                }
              />
              <WorkspaceFact
                label="ECOG"
                value={assessment?.performance_status ? text(assessment.performance_status.ecog) : "—"}
              />
              <WorkspaceFact
                label="肝储备"
                value={
                  assessment?.liver_reserve?.child_pugh
                    ? `Child-Pugh ${text(assessment.liver_reserve.child_pugh)}`
                    : "—"
                }
              />
              <WorkspaceFact
                label="肿瘤最大径"
                value={assessment?.tumor?.max_diameter_mm ? `${text(assessment.tumor.max_diameter_mm)} mm` : "—"}
              />
              <WorkspaceFact
                label="AFP"
                value={assessment?.biomarkers?.afp_ng_ml ? `${text(assessment.biomarkers.afp_ng_ml)} ng/mL` : "—"}
              />
              <WorkspaceFact
                label="血管侵犯"
                value={assessment?.tumor ? (assessment.tumor.vascular_invasion ? "是" : "否") : "—"}
              />
              <WorkspaceFact
                label="肝外转移"
                value={assessment?.tumor ? (assessment.tumor.extrahepatic_metastasis ? "是" : "否") : "—"}
              />
              {missing.length ? (
                <Callout tone="warn" title={`${missing.length} 项数据缺失`} className="mt-3">
                  {missing.join("、")}；系统按 UNKNOWN 处理。
                </Callout>
              ) : (
                <p className="mt-3 text-[12px] leading-[18px] text-muted-foreground">
                  快照无缺失字段 · 规则集 {text(assessment?.ruleset_version)}
                </p>
              )}
            </WorkspacePanel>

            <WorkspacePanel title="就诊上下文">
              <WorkspaceFact label="科室" value={text(encounter?.department_name)} />
              <WorkspaceFact label="病区" value={text(encounter?.ward)} />
              <WorkspaceFact
                label="入院"
                value={encounter?.admitted_at ? fmtDate(text(encounter.admitted_at), true) : "—"}
                mono
              />
              <WorkspaceFact label="责任医生" value={text(encounter?.attending_name)} />
            </WorkspacePanel>
          </>
        }
        center={
          <>
            <WorkspacePanel
              title="动态临床路径"
              action={
                <Button variant="ghost" size="xs" asChild>
                  <Link to={`/patients/${patient.patient_id}/pathway`}>
                    执行中心 <ArrowUpRight className="size-3" />
                  </Link>
                </Button>
              }
            >
              <div className="rounded-md border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">
                    {instance
                      ? `实例 ${instance.instance_id}`
                      : "暂无路径实例"}
                  </span>
                  {instance?.status && (
                    <StatusBadge tone={instance.status === "ACTIVE" ? "ok" : "neutral"}>
                      {instance.status}
                    </StatusBadge>
                  )}
                  <span className="ml-auto text-[12px] text-muted-foreground">
                    当前阶段 ·{" "}
                    <span className="font-medium text-ink">{instance?.current_stage ?? "—"}</span>
                  </span>
                </div>
                {instance?.instance_id && (
                  <p className="mt-2 font-mono text-[12px] tabular-nums text-muted-foreground">
                    {instance.instance_id}
                  </p>
                )}
                {!instance && (
                  <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
                    该患者尚未入径；入径与计划生成完成后将显示阶段轨道与节点。
                  </p>
                )}
              </div>
            </WorkspacePanel>

            <WorkspacePanel
              title="任务"
              action={
                <Badge variant="outline" className="text-[12px]">
                  {openTasks.length} 项
                </Badge>
              }
            >
              {plan ? (
                <>
                  <p className="mb-2 text-[12px] text-muted-foreground">
                    {plan.version} · {plan.status} · {plan.summary}
                  </p>
                  <div className="divide-y divide-line border-t border-line">
                    {(openTasks.length ? openTasks : planTasks).slice(0, 8).map((task) => (
                      <TaskRow key={task.task_id} task={task} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground">尚无计划；需先入径与计划生成。</p>
              )}
              <Button variant="ghost" size="sm" className="mt-2 px-0" asChild>
                <Link to={`/patients/${patient.patient_id}/pathway`}>
                  <ClipboardList className="size-3.5" /> 打开任务执行
                </Link>
              </Button>
            </WorkspacePanel>

            <WorkspacePanel title="观测" action={<Badge variant="outline" className="text-[12px]">{data.observations.length}</Badge>}>
              <div className="divide-y divide-line border-t border-line">
                {data.observations.slice(0, 10).map((observation) => (
                  <div
                    key={observation.observation_id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{observation.display}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {observation.code} · {fmtDate(observation.occurred_at, true)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 font-mono text-[13px] tabular-nums",
                        observation.interpretation === "ABNORMAL" ? "text-risk" : "text-ink",
                      )}
                    >
                      {observation.value_status === "UNKNOWN"
                        ? "UNKNOWN"
                        : (observation.value_num ?? observation.value_text ?? "—")}
                      {observation.unit && observation.value_status === "KNOWN" ? ` ${observation.unit}` : ""}
                    </p>
                  </div>
                ))}
                {!data.observations.length && (
                  <p className="py-4 text-[13px] text-muted-foreground">暂无观测</p>
                )}
              </div>
            </WorkspacePanel>

            {(data.variations.length > 0 || data.followups.length > 0) && (
              <WorkspacePanel title="变异 / 随访" quiet>
                {data.variations.slice(0, 3).map((variation) => (
                  <div key={variation.variation_id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="truncate text-[12px] text-ink">{variation.title}</span>
                    <StatusBadge
                      tone={
                        variation.severity === "HIGH" ? "risk" : variation.severity === "MEDIUM" ? "warn" : "neutral"
                      }
                      dot={false}
                    >
                      {variation.severity}
                    </StatusBadge>
                  </div>
                ))}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="mr-1 inline size-3" />
                  只读聚合 · 操作在对应工作流完成
                </p>
              </WorkspacePanel>
            )}
          </>
        }
      />
    </WorkspacePage>
  );
}
