import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
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
import { NODE_META, PATIENT_STATUS_META, RISK_META, TASK_STATUS_META } from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";

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

export default function DashboardPage() {
  const user = useSessionStore((s) => s.user);
  const tasks = useRuntimeStore((s) => s.tasks);
  const [taskTab, setTaskTab] = useState<"mine" | "all">("all");
  const hour = new Date().getHours();

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "COMPLETED" && (isToday(t.dueAt) || t.overdue))
        .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
    [tasks],
  );
  const myTasks = todayTasks.filter((t) => t.assignee === user?.name);
  const shownTasks = (taskTab === "mine" && myTasks.length ? myTasks : todayTasks).slice(0, 10);
  const overdue = tasks.filter((t) => t.overdue && t.status !== "COMPLETED").length;

  const stageProgress = useMemo(() => {
    const demo = tasks.filter((t) => t.instanceId === "INST-HCC-001");
    const stages = ["术前评估", "术前检查", "治疗方案确认", "手术及术后", "出院与随访"];
    return stages.map((stage) => {
      const list = demo.filter((t) => t.stage === stage);
      const done = list.filter((t) => t.status === "COMPLETED").length;
      const active = list.some((t) => t.status === "IN_PROGRESS" || t.status === "READY");
      return {
        stage,
        total: list.length,
        done,
        pct: list.length ? Math.round((done / list.length) * 100) : 0,
        state: done === list.length && list.length > 0 ? "done" : active ? "active" : "pending",
      };
    });
  }, [tasks]);

  const alerts = VARIATIONS.filter((v) => ["OPEN", "ASSESSING", "REPLAN_PENDING"].includes(v.status)).slice(0, 4);
  const pendingApprovals = APPROVALS.filter((a) => a.status === "PENDING");
  const focusPatients = useMemo(() => {
    const conversion = PATIENTS.find((p) => p.id === "HCC-DEMO-002");
    const others = PATIENTS.filter(
      (p) => p.riskLevel === "HIGH" && p.status === "IN_PATHWAY" && p.id !== "HCC-DEMO-002",
    ).slice(0, 5);
    return [conversion, ...others].filter(Boolean) as typeof PATIENTS;
  }, []);

  const metrics = [
    { label: "在径", value: PATIENT_SUMMARY.inPathway, hint: `高风险 ${PATIENT_SUMMARY.highRisk}` },
    { label: "今日任务", value: todayTasks.length, hint: `超时 ${overdue}` },
    { label: "待审核", value: pendingApprovals.length, hint: "路径 / 计划", to: "/approvals" },
    { label: "开放变异", value: alerts.length, hint: "需处置", to: "/variations" },
  ];

  return (
    <Page>
      <PageHeader
        module="工作台"
        title={`${greeting(hour)}，${user?.name ?? "医生"}`}
        description="优先处理审批与安全变异；路径调整需人工审核。"
        actions={
          <Button asChild size="sm">
            <Link to="/patients/HCC-DEMO-001/pathway">
              进入诊疗
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {/* 指标条：铺满一行，无空白卡片 */}
      <div className="mb-3 grid grid-cols-2 divide-x divide-y divide-line border border-line bg-card sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((m) => {
          const body = (
            <div className="px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] text-muted-foreground">{m.label}</span>
                <span className="text-[11px] text-muted-foreground">{m.hint}</span>
              </div>
              <p className="mt-0.5 tabular text-[22px] leading-none font-semibold tracking-[-0.03em]">{m.value}</p>
            </div>
          );
          return m.to ? (
            <Link key={m.label} to={m.to} className="transition-colors hover:bg-secondary/50">
              {body}
            </Link>
          ) : (
            <div key={m.label}>{body}</div>
          );
        })}
      </div>

      {/* 三栏铺满：任务 | 患者 | 侧栏 */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_260px]">
        <section className="min-w-0 border border-line bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-[13px] font-semibold">今日任务</h2>
              <span className="text-[12px] text-muted-foreground">{todayTasks.length}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <FilterPill active={taskTab === "all"} onClick={() => setTaskTab("all")}>
                全科
              </FilterPill>
              <FilterPill active={taskTab === "mine"} onClick={() => setTaskTab("mine")}>
                我的
              </FilterPill>
              <Link to="/tasks" className="ml-1 text-[12px] text-muted-foreground hover:text-foreground">
                全部 <ArrowUpRight className="inline size-3" />
              </Link>
            </div>
          </div>
          {shownTasks.length === 0 ? (
            <EmptyState icon={<CheckCircle2 />} title="今日任务已完成" description="前往任务中心查看全科队列。" />
          ) : (
            <ul className="divide-y divide-line">
              {shownTasks.map((t) => {
                const meta = NODE_META[t.type];
                const Icon = meta.icon;
                const patient = patientNameForInstance(t.instanceId, t.summary);
                return (
                  <li key={t.id}>
                    <Link to="/tasks" className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/40">
                      <span
                        className={cn(
                          "w-9 shrink-0 text-right font-mono text-[11px] tabular",
                          t.overdue ? "text-risk" : "text-muted-foreground",
                        )}
                      >
                        {fmtTime(t.dueAt)}
                      </span>
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground">
                        <Icon className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium">{t.name}</span>
                          {t.overdue && (
                            <StatusBadge tone="risk" dot={false}>
                              超时
                            </StatusBadge>
                          )}
                        </span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {patient} · {t.stage}
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

        <section className="min-w-0 border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-[13px] font-semibold">重点患者</h2>
              <span className="text-[12px] text-muted-foreground">{focusPatients.length}</span>
            </div>
            <Link to="/patients" className="text-[12px] text-muted-foreground hover:text-foreground">
              患者中心 <ArrowUpRight className="inline size-3" />
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {focusPatients.map((p) => (
              <li key={p.id}>
                <Link
                  to={p.instanceId ? `/planning/${p.instanceId}` : `/patients/${p.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/40"
                >
                  <PatientAvatar name={p.name} id={p.id} size="sm" risk={p.riskLevel} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-medium">{p.name}</span>
                      <StatusBadge tone={RISK_META[p.riskLevel].tone}>{RISK_META[p.riskLevel].label}</StatusBadge>
                    </span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {p.diagnosis} · {p.stage}
                    </span>
                  </span>
                  <span className="w-14 shrink-0">
                    <Progress value={p.progress} className="h-1" indicatorClassName="bg-foreground" />
                    <span className="mt-0.5 block text-right font-mono text-[10px] text-muted-foreground">
                      {p.progress}%
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-col gap-3">
          <section className="border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="text-[13px] font-semibold">路径阶段</h2>
              <Link to="/patients/HCC-DEMO-001/pathway" className="text-[12px] text-muted-foreground hover:text-foreground">
                详情
              </Link>
            </div>
            <div className="space-y-2.5 px-3 py-2.5">
              <p className="text-[11.5px] text-muted-foreground">陈志远 · 肝癌手术路径</p>
              {stageProgress.map((s) => (
                <div key={s.stage}>
                  <div className="mb-0.5 flex justify-between text-[12px]">
                    <span className={s.state === "pending" ? "text-muted-foreground" : "font-medium"}>{s.stage}</span>
                    <span className="tabular text-muted-foreground">
                      {s.done}/{s.total}
                    </span>
                  </div>
                  <Progress
                    value={s.pct}
                    className="h-1"
                    indicatorClassName={s.state === "pending" ? "bg-line-strong" : "bg-foreground"}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="text-[13px] font-semibold">变异</h2>
              <Link to="/variations" className="text-[12px] text-muted-foreground hover:text-foreground">
                全部
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {alerts.map((v) => (
                <li key={v.id}>
                  <Link to="/variations" className="block px-3 py-2 hover:bg-secondary/40">
                    <p className="truncate text-[12.5px] font-medium">{v.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {v.patientName} · {relTime(v.detectedAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="min-h-0 flex-1 border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="text-[13px] font-semibold">待审核</h2>
              <Link to="/approvals" className="text-[12px] text-muted-foreground hover:text-foreground">
                进入
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {pendingApprovals.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to="/approvals" className="block px-3 py-2 hover:bg-secondary/40">
                    <p className="truncate text-[12.5px] font-medium">
                      {a.title} <span className="font-normal text-muted-foreground">{a.version}</span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.patientName ?? a.pathwayName}
                      {a.deadline ? ` · ${fmtDate(a.deadline)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>合成演示数据 · 不用于临床决策</span>
        <SyntheticTag />
      </div>
    </Page>
  );
}
