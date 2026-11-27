import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { Page, PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, SyntheticTag } from "@/components/app/section";
import { FilterPill } from "@/components/app/toolbar";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSessionStore } from "@/stores/session-store";
import { useRuntimeStore } from "@/stores/runtime-store";
import { APPROVALS, PATIENT_SUMMARY, VARIATIONS, PATIENTS } from "@/data";
import { patientNameForInstance } from "@/lib/instance";
import { NODE_META, RISK_META, TASK_STATUS_META, VARIATION_TYPE_META } from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";

const CLINICAL_STAGES = ["术前评估", "术前检查", "治疗方案确认", "手术及术后", "出院与随访"] as const;

function greeting(hour: number) {
  if (hour < 6) return "凌晨好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function riskRank(level: string) {
  if (level === "HIGH") return 0;
  if (level === "MEDIUM") return 1;
  return 2;
}

export default function DashboardPage() {
  const user = useSessionStore((s) => s.user);
  const has = useSessionStore((s) => s.has);
  const tasks = useRuntimeStore((s) => s.tasks);
  const [taskTab, setTaskTab] = useState<"mine" | "all">("mine");
  const hour = new Date().getHours();

  const canViewTasks = has("task.view");
  const canViewPatients = has("patient.view");
  const canViewVariations = has("variation.view");
  const canApprove = has("plan.approve") || has("pathway.approve");

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "SKIPPED")
        .filter((t) => isToday(t.dueAt) || t.overdue)
        .sort((a, b) => {
          if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
          return +new Date(a.dueAt) - +new Date(b.dueAt);
        }),
    [tasks],
  );
  const myTasks = todayTasks.filter((t) => t.assignee === user?.name);
  const taskPool = taskTab === "mine" ? myTasks : todayTasks;
  const shownTasks = taskPool.slice(0, 12);
  const overdue = tasks.filter((t) => t.overdue && t.status !== "COMPLETED").length;

  /** 全科在途任务的阶段分布（非单患者硬编码样例） */
  const stageProgress = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "SKIPPED");
    return CLINICAL_STAGES.map((stage) => {
      const list = open.filter((t) => t.stage === stage);
      const overdueCount = list.filter((t) => t.overdue).length;
      const active = list.filter((t) => t.status === "IN_PROGRESS" || t.status === "READY").length;
      return {
        stage,
        total: list.length,
        overdue: overdueCount,
        active,
        pct: open.length ? Math.round((list.length / open.length) * 100) : 0,
      };
    });
  }, [tasks]);

  const alerts = useMemo(
    () =>
      VARIATIONS.filter((v) => ["OPEN", "ASSESSING", "REPLAN_PENDING"].includes(v.status)).sort((a, b) => {
        if (a.severity !== b.severity) return riskRank(a.severity) - riskRank(b.severity);
        return +new Date(b.detectedAt) - +new Date(a.detectedAt);
      }),
    [],
  );
  const pendingApprovals = APPROVALS.filter((a) => a.status === "PENDING");

  /** 重点患者：高风险在径优先，其次中风险且有超时任务线索；不置顶固定 demo ID */
  const focusPatients = useMemo(() => {
    const overdueInstanceIds = new Set(
      tasks.filter((t) => t.overdue && t.status !== "COMPLETED").map((t) => t.instanceId),
    );
    return PATIENTS.filter((p) => p.status === "IN_PATHWAY" && (p.riskLevel === "HIGH" || p.riskLevel === "MEDIUM"))
      .map((p) => ({
        patient: p,
        hasOverdue: p.instanceId ? overdueInstanceIds.has(p.instanceId) : false,
      }))
      .sort((a, b) => {
        const r = riskRank(a.patient.riskLevel) - riskRank(b.patient.riskLevel);
        if (r !== 0) return r;
        if (a.hasOverdue !== b.hasOverdue) return a.hasOverdue ? -1 : 1;
        return a.patient.progress - b.patient.progress;
      })
      .slice(0, 8)
      .map((x) => x);
  }, [tasks]);

  const metrics = [
    {
      label: "在径患者",
      value: PATIENT_SUMMARY.inPathway,
      hint: `高风险 ${PATIENT_SUMMARY.highRisk}`,
      to: canViewPatients ? "/patients" : undefined,
      show: canViewPatients,
    },
    {
      label: "今日待办",
      value: todayTasks.length,
      hint: overdue ? `超时 ${overdue}` : "按截止排序",
      to: canViewTasks ? "/tasks" : undefined,
      show: canViewTasks,
    },
    {
      label: "待审核",
      value: pendingApprovals.length,
      hint: "路径 / 计划",
      to: canApprove ? "/approvals" : undefined,
      show: canApprove,
    },
    {
      label: "开放变异",
      value: alerts.length,
      hint: "需处置",
      to: canViewVariations ? "/variations" : undefined,
      show: canViewVariations,
    },
  ].filter((m) => m.show);

  return (
    <Page className="bg-canvas">
      <PageHeader
        module="工作台"
        title={`${greeting(hour)}，${user?.name ?? "同事"}`}
        description="以今日待办与风险患者为主；审批与变异按权限显示。合成演示数据，不可用于临床决策。"
        actions={
          <div className="flex items-center gap-2">
            <SyntheticTag />
            {canViewTasks && (
              <Button asChild size="sm">
                <Link to="/tasks">
                  打开任务中心
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* 临床副驾驶入口提示 · 仍落在患者上下文，非独立 Chat 页 */}
      {canViewPatients && focusPatients[0] && (
        <Link
          to={`/patients/${focusPatients[0].patient.id}`}
          className="mb-3 flex items-center gap-2 border-b border-line pb-3 text-[13px] transition-colors hover:text-ink"
        >
          <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            副驾驶 · 打开「{focusPatients[0].patient.name}」右栏提问
            <span className="text-muted-foreground/70"> · AI 非医嘱</span>
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {/* 精简指标条 · 可下钻 */}
      {metrics.length > 0 && (
        <div className="mb-4 grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-md border border-line bg-surface sm:grid-cols-4 sm:divide-y-0">
          {metrics.map((m) => {
            const body = (
              <div className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] leading-[18px] text-muted-foreground">{m.label}</span>
                  <span className="text-[12px] leading-[18px] text-muted-foreground">{m.hint}</span>
                </div>
                <p className="mt-1 font-mono text-[24px] leading-8 font-semibold tracking-[-0.03em] tabular-nums text-ink">
                  {m.value}
                </p>
              </div>
            );
            return m.to ? (
              <Link key={m.label} to={m.to} className="transition-colors hover:bg-canvas">
                {body}
              </Link>
            ) : (
              <div key={m.label}>{body}</div>
            );
          })}
        </div>
      )}

      {/* 主区：待办 + 风险患者 · 辅区：阶段 / 变异 / 审核 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_300px]">
        {canViewTasks && (
          <section className="min-w-0 overflow-hidden rounded-md border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[16px] leading-6 font-semibold tracking-[-0.02em] text-ink">今日待办</h2>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{taskPool.length}</span>
                <span className="text-[12px] text-muted-foreground">
                  {taskTab === "mine" ? "指派给我 · 超时优先" : "全科队列 · 超时优先"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FilterPill active={taskTab === "mine"} onClick={() => setTaskTab("mine")}>
                  我的{myTasks.length ? ` ${myTasks.length}` : ""}
                </FilterPill>
                <FilterPill active={taskTab === "all"} onClick={() => setTaskTab("all")}>
                  全科
                </FilterPill>
                <Link
                  to="/tasks"
                  className="ml-1 inline-flex items-center gap-0.5 text-[12px] text-muted-foreground hover:text-ink"
                >
                  全部 <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
            {shownTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                title={taskTab === "mine" ? "我的今日任务已完成" : "今日任务已完成"}
                description="可切换「全科」或前往任务中心查看后续队列。"
                action={
                  taskTab === "mine" ? (
                    <Button size="sm" variant="outline" onClick={() => setTaskTab("all")}>
                      查看全科
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/tasks">任务中心</Link>
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {shownTasks.map((t) => {
                  const meta = NODE_META[t.type];
                  const Icon = meta.icon;
                  const patient = patientNameForInstance(t.instanceId, t.summary);
                  return (
                    <li key={t.id}>
                      <Link to="/tasks" className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas">
                        <span
                          className={cn(
                            "w-11 shrink-0 text-right font-mono text-[13px] tabular-nums",
                            t.overdue ? "text-risk" : "text-muted-foreground",
                          )}
                        >
                          {fmtTime(t.dueAt)}
                        </span>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-canvas text-muted-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-[14px] leading-[22px] font-medium text-ink">{t.name}</span>
                            {t.overdue && (
                              <StatusBadge tone="risk" dot={false}>
                                超时
                              </StatusBadge>
                            )}
                          </span>
                          <span className="block truncate text-[12px] leading-[18px] text-muted-foreground">
                            {patient} · {t.stage} · {t.assignee}
                          </span>
                        </span>
                        <StatusBadge tone={TASK_STATUS_META[t.status].tone} dot={false}>
                          {TASK_STATUS_META[t.status].label}
                        </StatusBadge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {canViewPatients && (
          <section className="min-w-0 overflow-hidden rounded-md border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[16px] leading-6 font-semibold tracking-[-0.02em] text-ink">重点风险患者</h2>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{focusPatients.length}</span>
              </div>
              <Link
                to="/patients"
                className="inline-flex items-center gap-0.5 text-[12px] text-muted-foreground hover:text-ink"
              >
                患者中心 <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <p className="border-b border-line bg-canvas/60 px-4 py-2 text-[12px] leading-[18px] text-muted-foreground">
              排序：高风险 → 中风险 → 关联超时任务 → 路径进度较低
            </p>
            {focusPatients.length === 0 ? (
              <EmptyState title="暂无重点患者" description="当前无在径高/中风险患者。" />
            ) : (
              <ul className="divide-y divide-line">
                {focusPatients.map(({ patient: p, hasOverdue }) => (
                  <li key={p.id}>
                    <Link
                      to={`/patients/${p.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas"
                    >
                      <PatientAvatar name={p.name} id={p.id} size="sm" risk={p.riskLevel} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[14px] leading-[22px] font-medium text-ink">{p.name}</span>
                          <StatusBadge tone={RISK_META[p.riskLevel].tone}>{RISK_META[p.riskLevel].label}</StatusBadge>
                          {hasOverdue && (
                            <StatusBadge tone="risk" dot={false}>
                              有超时任务
                            </StatusBadge>
                          )}
                        </span>
                        <span className="block truncate text-[12px] leading-[18px] text-muted-foreground">
                          {p.diagnosis} · {p.stage} · {p.ward}
                        </span>
                      </span>
                      <span className="w-14 shrink-0">
                        <Progress value={p.progress} className="h-1.5" indicatorClassName="bg-ink" />
                        <span className="mt-1 block text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                          {p.progress}%
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <aside className="flex min-w-0 flex-col gap-4">
          {canViewTasks && (
            <section className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[16px] leading-6 font-semibold tracking-[-0.02em] text-ink">阶段负荷</h2>
                <Link to="/tasks" className="text-[12px] text-muted-foreground hover:text-ink">
                  任务中心
                </Link>
              </div>
              <div className="space-y-3 px-4 py-3">
                <p className="text-[12px] leading-[18px] text-muted-foreground">
                  未完成任务按临床阶段分布（全科聚合，非单患者样例）
                </p>
                {stageProgress.map((s) => (
                  <div key={s.stage}>
                    <div className="mb-1 flex justify-between gap-2 text-[13px] leading-[18px]">
                      <span className={s.total === 0 ? "text-muted-foreground" : "font-medium text-ink"}>{s.stage}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {s.total}
                        {s.overdue > 0 ? ` · 超时 ${s.overdue}` : ""}
                      </span>
                    </div>
                    <Progress value={s.pct} className="h-1.5" indicatorClassName="bg-ink" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {canViewVariations && (
            <section className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="size-3.5 text-muted-foreground" />
                  <h2 className="text-[16px] leading-6 font-semibold tracking-[-0.02em] text-ink">开放变异</h2>
                </div>
                <Link to="/variations" className="text-[12px] text-muted-foreground hover:text-ink">
                  全部
                </Link>
              </div>
              {alerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-[14px] text-muted-foreground">暂无开放变异</p>
              ) : (
                <ul className="divide-y divide-line">
                  {alerts.slice(0, 5).map((v) => (
                    <li key={v.id}>
                      <Link to="/variations" className="block px-4 py-2.5 hover:bg-canvas">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge tone={RISK_META[v.severity].tone} dot={false}>
                            {RISK_META[v.severity].label}
                          </StatusBadge>
                          <StatusBadge tone={VARIATION_TYPE_META[v.type].tone} dot={false}>
                            {VARIATION_TYPE_META[v.type].label}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 truncate text-[14px] leading-[22px] font-medium text-ink">{v.title}</p>
                        <p className="truncate text-[12px] leading-[18px] text-muted-foreground">
                          {v.patientName} · {relTime(v.detectedAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {canApprove && (
            <section className="min-h-0 flex-1 overflow-hidden rounded-md border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  <h2 className="text-[16px] leading-6 font-semibold tracking-[-0.02em] text-ink">待审核</h2>
                </div>
                <Link to="/approvals" className="text-[12px] text-muted-foreground hover:text-ink">
                  进入
                </Link>
              </div>
              {pendingApprovals.length === 0 ? (
                <p className="px-4 py-6 text-center text-[14px] text-muted-foreground">暂无待审核项</p>
              ) : (
                <ul className="divide-y divide-line">
                  {pendingApprovals.slice(0, 5).map((a) => (
                    <li key={a.id}>
                      <Link to="/approvals" className="block px-4 py-2.5 hover:bg-canvas">
                        <p className="truncate text-[14px] leading-[22px] font-medium text-ink">
                          {a.title}{" "}
                          <span className="font-mono text-[12px] font-normal text-muted-foreground">{a.version}</span>
                        </p>
                        <p className="truncate text-[12px] leading-[18px] text-muted-foreground">
                          {a.patientName ?? a.pathwayName}
                          {a.deadline ? ` · 截止 ${fmtDate(a.deadline)}` : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {!canViewTasks && !canViewPatients && !canViewVariations && !canApprove && (
            <section className="rounded-md border border-line bg-surface p-6">
              <EmptyState
                icon={<ClipboardList />}
                title="当前角色无可展示工作台模块"
                description="请联系管理员确认权限，或切换具备 task / patient / variation / approve 权限的演示账号。"
              />
            </section>
          )}
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px] leading-[18px] text-muted-foreground">
        <span>合成演示数据 · 指标来自本地演示集聚合，非真实院内统计</span>
        <div className="flex flex-wrap items-center gap-3">
          {canViewTasks && (
            <Link to="/tasks" className="hover:text-ink">
              任务中心
            </Link>
          )}
          {canViewPatients && (
            <Link to="/patients" className="hover:text-ink">
              患者中心
            </Link>
          )}
          {canViewVariations && (
            <Link to="/variations" className="hover:text-ink">
              变异管理
            </Link>
          )}
          {canApprove && (
            <Link to="/approvals" className="hover:text-ink">
              审核中心
            </Link>
          )}
        </div>
      </div>
    </Page>
  );
}
