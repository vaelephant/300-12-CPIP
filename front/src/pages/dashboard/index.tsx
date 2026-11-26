import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListFilter,
  PieChart,
  ShieldAlert,
  Sparkles,
  Workflow,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Callout, EmptyState, SyntheticTag } from "@/components/app/section";
import { FilterPill, CountBadge } from "@/components/app/toolbar";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { DonutChart, GaugeRing, SankeyFlow } from "@/components/charts/advanced";
import { DISEASE_MIX, PATHWAY_SANKEY_COMPACT } from "@/data/visuals";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useSessionStore } from "@/stores/session-store";
import { useRuntimeStore } from "@/stores/runtime-store";
import { APPROVALS, DEPARTMENT_METRICS, LAST_SYNC, PATIENT_SUMMARY, TREND_SERIES, VARIATIONS, PATIENTS } from "@/data";
import { patientNameForInstance } from "@/lib/instance";
import {
  NODE_META,
  PATIENT_STATUS_META,
  RISK_META,
  TASK_STATUS_META,
  VARIATION_TYPE_META,
} from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";

const DEPT_BEDS: Record<string, number> = { ward1: 50, ward2: 40, ward3: 36, mdt: 20, followup: 12 };

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
  const [chartMode, setChartMode] = useState<"enroll" | "variation">("enroll");

  const hour = new Date().getHours();

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "COMPLETED" && (isToday(t.dueAt) || t.overdue))
        .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
    [tasks],
  );
  const myTasks = todayTasks.filter((t) => t.assignee === user?.name);
  const shownTasks = (taskTab === "mine" && myTasks.length ? myTasks : todayTasks).slice(0, 6);
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

  const alerts = VARIATIONS.filter((v) => ["OPEN", "ASSESSING", "REPLAN_PENDING"].includes(v.status)).slice(0, 3);
  const pendingApprovals = APPROVALS.filter((a) => a.status === "PENDING");
  const depts = DEPARTMENT_METRICS.filter((d) => d.numeric !== undefined).slice(0, 3);
  const focusPatients = useMemo(() => {
    const conversion = PATIENTS.find((p) => p.id === "HCC-DEMO-002");
    const others = PATIENTS.filter(
      (p) => p.riskLevel === "HIGH" && p.status === "IN_PATHWAY" && p.id !== "HCC-DEMO-002",
    ).slice(0, 3);
    return [conversion, ...others].filter(Boolean) as typeof PATIENTS;
  }, []);

  return (
    <Page wide>
      <PageHeader
        module="M00 · 工作台"
        eyebrow={`${user?.departmentName ?? "仁和医院"} · 临床路径`}
        title={`${greeting(hour)}，${user?.name ?? "医生"}`}
        description="今日有 4 项审批待处理、1 项安全变异需人工介入。系统不会自动改变正式诊疗方案，所有路径调整均需医生审核。"
        meta={
          <>
            <PageMeta label="当前班次" value="日班 · 08:00 – 17:00" />
            <PageMeta label="数据同步" value={`${fmtTime(LAST_SYNC)} · 合成数据`} />
            <PageMeta label="模板版本" value="V0.5 · 研发演示" mono />
            <SyntheticTag className="ml-1" />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/approvals">
                <ListFilter className="size-3.5" />
                审核中心
                <span className="ml-0.5 rounded-[3px] bg-warn-wash px-1 font-mono text-[9px] text-warn">
                  {pendingApprovals.length}
                </span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/patients/HCC-DEMO-001/pathway">
                进入今日诊疗
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      {/* 风险提示 */}
      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Callout
          tone="risk"
          title="1 项安全变异阻断手术任务，需人工处置"
          action={
            <Button asChild variant="destructive-outline" size="xs">
              <Link to="/variations">处置</Link>
            </Button>
          }
        >
          赵海峰（肝胆外科）INR 1.68、PLT 62×10⁹/L，触发 RULE-005 安全约束，手术相关任务已暂停推进并通知责任医生。
        </Callout>
        <Callout
          tone="warn"
          title={`${pendingApprovals.length} 项审批待处理，其中 2 项今日到期`}
          action={
            <Button asChild variant="outline" size="xs">
              <Link to="/approvals">查看</Link>
            </Button>
          }
        >
          陈志远 · 个体化计划 P2 截止今日 17:00；肝癌手术临床路径 V1.4.0 截止明日 18:00。
        </Callout>
      </div>

      {/* KPI */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="肝癌中心在径患者"
          value={String(PATIENT_SUMMARY.inPathway)}
          unit="例"
          delta={3}
          deltaLabel="较昨日"
          deltaUnit="例"
          trend={[196, 202, 207, 211, 214, 218, 222, 226, 229, PATIENT_SUMMARY.inPathway]}
          hint="肝癌中心当前处于 IN_PATHWAY 状态的合成病例数量"
          footer={`其中高风险 ${PATIENT_SUMMARY.highRisk} 例 · 待入径确认 ${PATIENT_SUMMARY.pendingAdmission} 例`}
        />
        <StatCard
          label="今日待办任务"
          value={String(todayTasks.length)}
          unit="项"
          delta={-1}
          deltaLabel="较昨日"
          deltaUnit="项"
          deltaPolarity="down"
          trend={[14, 12, 13, 11, 12, 10, 11, 9, 10, todayTasks.length]}
          tone="info"
          hint="今日到期或已超时且未完成的任务"
          footer={
            <>
              已超时 <span className="font-medium text-risk">{overdue}</span> 项 · 护理任务占 46%
            </>
          }
        />
        <StatCard
          label="待审核事项"
          value={String(pendingApprovals.length)}
          unit="项"
          delta={0}
          deltaLabel="较昨日"
          deltaUnit="项"
          trend={[3, 4, 3, 5, 4, 4, 3, 4, 4, 4]}
          tone="neutral"
          hint="路径版本、患者计划与变异重规划待审核总数"
          footer="路径版本 2 · 患者计划 2"
        />
        <StatCard
          label="路径完成率"
          value="93.8"
          unit="%"
          delta={1.2}
          deltaLabel="较上月"
          trend={[88, 89, 91, 90, 92, 93, 92, 93.8]}
          hint="已结束路径中正常完成的比例；分子 189 / 分母 207（演示口径）"
          footer="正常完成 189 例 · 退出 8 例"
        />
        <StatCard
          label="平均住院日"
          value="9.2"
          unit="天"
          delta={-0.4}
          deltaLabel="较上月"
          deltaUnit="天"
          deltaPolarity="down"
          trend={[10.4, 10.2, 10.0, 9.8, 9.9, 9.6, 9.5, 9.4, 9.3, 9.2]}
          hint="肝癌手术路径出院患者平均住院时间（合成数据）"
          footer="目标 ≤ 10 天 · 国家基线 9.8 天"
        />
      </div>

      {/* 主区 */}
      <div className="grid grid-cols-12 gap-4">
        {/* 今日任务 */}
        <Card className="col-span-12 overflow-hidden xl:col-span-8">
          <CardHeader className="pb-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-3.5 text-muted-foreground" />
                今日任务
                <CountBadge count={todayTasks.length} />
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                按最迟完成时间排序 · 超时作为独立标记，不替代执行状态
              </p>
            </div>
            <CardAction>
              <div className="flex items-center gap-1">
                <FilterPill active={taskTab === "all"} onClick={() => setTaskTab("all")}>
                  全科任务
                </FilterPill>
                <FilterPill active={taskTab === "mine"} onClick={() => setTaskTab("mine")}>
                  我的任务
                </FilterPill>
                <Button asChild variant="ghost" size="xs" className="ml-1 text-muted-foreground">
                  <Link to="/tasks">
                    任务中心 <ArrowUpRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0 pt-3">
            {shownTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                title="今日任务已全部完成"
                description="当前账号没有待处理任务。可前往任务中心查看全科任务队列。"
              />
            ) : (
              <div className="divide-y divide-line/70 border-t border-line">
                {shownTasks.map((t) => {
                  const meta = NODE_META[t.type];
                  const Icon = meta.icon;
                  const patient = patientNameForInstance(t.instanceId, t.summary);
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/40"
                    >
                      <div className="w-12 shrink-0 text-right">
                        <div
                          className={cn(
                            "font-mono text-[11.5px] tabular",
                            t.overdue ? "text-risk" : "text-foreground/80",
                          )}
                        >
                          {fmtTime(t.dueAt)}
                        </div>
                        <div className={cn("text-[9px]", t.overdue ? "text-risk/80" : "text-muted-foreground/60")}>
                          {t.overdue
                            ? isToday(t.dueAt)
                              ? "今日已超时"
                              : `${fmtDate(t.dueAt).slice(5)} 超时`
                            : isToday(t.dueAt)
                              ? "今日截止"
                              : fmtDate(t.dueAt).slice(5)}
                        </div>
                      </div>
                      <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-[5px]", meta.chip)}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-medium">{t.name}</span>
                          {t.overdue && <StatusBadge tone="risk">超时</StatusBadge>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span className="truncate">{patient}</span>
                          <span className="text-line-strong">·</span>
                          <span className="shrink-0">{t.stage}</span>
                          <span className="text-line-strong">·</span>
                          <span className="shrink-0">{t.assignee}</span>
                        </div>
                      </div>
                      <StatusBadge tone={TASK_STATUS_META[t.status].tone} dot={false}>
                        {TASK_STATUS_META[t.status].label}
                      </StatusBadge>
                      <Button
                        asChild
                        variant="ghost"
                        size="xs"
                        className="text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Link to="/tasks">处理</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line bg-secondary/25 px-4 py-2">
              <span className="text-[10.5px] text-muted-foreground">
                可执行任务 {tasks.filter((t) => t.status === "READY").length} 项 · 执行中{" "}
                {tasks.filter((t) => t.status === "IN_PROGRESS").length} 项
              </span>
              <Link to="/tasks" className="flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline">
                查看全部 {todayTasks.length} 项 <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 路径阶段 */}
        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>路径阶段进度</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">陈志远 · 肝癌手术临床路径 V1.3.0</p>
            </div>
            <CardAction>
              <StatusBadge tone="ok" pulse>
                执行中
              </StatusBadge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageProgress.map((s) => (
              <div key={s.stage}>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        s.state === "done" ? "bg-ok" : s.state === "active" ? "bg-primary" : "bg-line-strong",
                      )}
                    />
                    <span className={s.state === "pending" ? "text-muted-foreground" : "font-medium"}>{s.stage}</span>
                  </span>
                  <span className="tabular text-[10.5px] text-muted-foreground">
                    {s.done}/{s.total} · {s.state === "done" ? "已完成" : s.state === "active" ? "执行中" : "待执行"}
                  </span>
                </div>
                <Progress
                  value={s.pct}
                  className="h-1"
                  indicatorClassName={
                    s.state === "done" ? "bg-ok" : s.state === "active" ? "bg-primary" : "bg-line-strong"
                  }
                />
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between rounded-md border border-line bg-secondary/40 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <PatientAvatar name="陈志远" id="HCC-DEMO-001" size="sm" />
                <div>
                  <p className="text-[11px] font-medium">陈志远 · 58 岁 · Ⅰb 期</p>
                  <p className="text-[9.5px] text-muted-foreground">入院第 3 天 · 03-12 床</p>
                </div>
              </div>
              <Button asChild variant="ghost" size="xs">
                <Link to="/patients/HCC-DEMO-001/pathway">
                  详情 <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 趋势 */}
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader className="pb-2">
            <div>
              <CardTitle>入径与变异趋势</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">近 12 周 · 合成演示数据 · 不构成真实统计</p>
            </div>
            <CardAction>
              <div className="flex items-center gap-1">
                <FilterPill active={chartMode === "enroll"} onClick={() => setChartMode("enroll")}>
                  入径 / 完成
                </FilterPill>
                <FilterPill active={chartMode === "variation"} onClick={() => setChartMode("variation")}>
                  变异率
                </FilterPill>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="mb-2 flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[var(--chart-1)]" /> 入径例数
              </span>
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[var(--chart-4)]" /> 完成例数
              </span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">单位：例 / 周</span>
            </div>
            <div className="h-[196px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_SERIES} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dash-enroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dash-complete" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <ChartTooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      boxShadow: "var(--shadow-pop)",
                      background: "var(--card)",
                    }}
                    labelStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                  />
                  {chartMode === "enroll" ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="values.enrollment"
                        name="入径例数"
                        stroke="var(--chart-1)"
                        strokeWidth={1.6}
                        fill="url(#dash-enroll)"
                      />
                      <Area
                        type="monotone"
                        dataKey="values.completion"
                        name="完成例数"
                        stroke="var(--chart-4)"
                        strokeWidth={1.4}
                        fill="url(#dash-complete)"
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="values.variation"
                      name="变异例数"
                      stroke="var(--chart-5)"
                      strokeWidth={1.6}
                      fill="url(#dash-enroll)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 grid grid-cols-3 divide-x divide-line rounded-md border border-line bg-secondary/30">
              {[
                { label: "本周入径", value: "63 例", note: "较上周 +5.0%" },
                { label: "本周完成", value: "58 例", note: "完成率 92.1%" },
                { label: "本周变异", value: "11 例", note: "变异率 17.5%" },
              ].map((s) => (
                <div key={s.label} className="px-3 py-2">
                  <p className="text-[9.5px] tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="tabular text-[14px] font-semibold">{s.value}</span>
                    <span className="text-[9px] text-muted-foreground">{s.note}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 变异预警 + 科室 */}
        <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
          <Card className="flex-1">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  变异预警
                  <span className="tabular rounded-[3px] bg-risk-wash px-1 font-mono text-[9.5px] text-risk">
                    {alerts.length}
                  </span>
                </CardTitle>
                <p className="mt-0.5 text-[11px] text-muted-foreground">安全相关变异阻止自动推进</p>
              </div>
              <CardAction>
                <Button asChild variant="ghost" size="xs">
                  <Link to="/variations">
                    全部 <ArrowUpRight className="size-3" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {alerts.map((v) => (
                <Link
                  key={v.id}
                  to="/variations"
                  className="group flex gap-2.5 rounded-md border border-line bg-card px-2.5 py-2 transition-colors hover:border-line-strong hover:bg-secondary/30"
                >
                  <span
                    className={cn(
                      "mt-0.5 w-[2px] shrink-0 rounded-full",
                      v.severity === "HIGH" ? "bg-risk" : "bg-warn",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11.5px] font-medium">{v.title}</p>
                      <span className="shrink-0 text-[9px] text-muted-foreground">{relTime(v.detectedAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusBadge tone={VARIATION_TYPE_META[v.type].tone} dot={false}>
                        {VARIATION_TYPE_META[v.type].label}
                      </StatusBadge>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {v.patientName} · {v.pathwayName}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted-foreground" /> 病区负荷
                </CardTitle>
                <p className="mt-0.5 text-[11px] text-muted-foreground">病区床位占用与在径患者</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {depts.map((d) => {
                const active = Number(d.sub?.match(/\d+/)?.[0] ?? 0);
                const beds = DEPT_BEDS[d.key] ?? 50;
                const rate = Math.round((active / beds) * 100);
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium">{d.name}</span>
                      <span className="tabular text-[10px] text-muted-foreground">
                        {active}/{beds} 床 · {rate}%
                      </span>
                    </div>
                    <Progress value={rate} className="h-1" indicatorClassName={rate > 80 ? "bg-warn" : "bg-primary"} />
                  </div>
                );
              })}
              <p className="pt-1 text-[9.5px] text-muted-foreground/70">病区数据为演示占位，不接入真实床位系统。</p>
            </CardContent>
          </Card>
        </div>

        {/* 路径流转与分期结构 */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="size-3.5 text-muted-foreground" />
                患者路径流转
                <span className="rounded-[3px] bg-secondary px-1 font-mono text-[9px] text-muted-foreground">SANKEY</span>
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                筛查 → 准入 → 入径 → 路径执行 → 结局 · 近 30 天 · 合成演示数据
              </p>
            </div>
            <CardAction>
              <Button asChild variant="ghost" size="xs" className="text-muted-foreground">
                <Link to="/analytics">
                  运营分析 <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0">
            <SankeyFlow data={PATHWAY_SANKEY_COMPACT} height={238} />
          </CardContent>
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="size-3.5 text-muted-foreground" />
                分期构成与完成质量
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">300 例原发肝癌合成病例 · 分期构成</p>
            </div>
            <CardAction>
              <StatusBadge tone="ok" dot={false}>合成数据</StatusBadge>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <DonutChart data={DISEASE_MIX} height={140} centerLabel="合成病例" centerValue={300} unit="例" />
              <GaugeRing
                value={91.3}
                label="路径完成率"
                sublabel="189 / 207 · 近 30 天"
                size={124}
                tone="ok"
                className="pr-1"
              />
            </div>
          </CardContent>
          <CardContent className="grid grid-cols-3 divide-x divide-line border-t border-line py-2.5">
            {[
              { label: "患者入径率", value: "82.4%", hint: "268 / 325" },
              { label: "路径变异率", value: "18.6%", hint: "58 / 312" },
              { label: "平均住院日", value: "6.8", hint: "天 · 全院" },
            ].map((s) => (
              <div key={s.label} className="px-3 first:pl-0 last:pr-0">
                <p className="text-[9.5px] text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 tabular text-[15px] font-semibold">{s.value}</p>
                <p className="text-[9px] text-muted-foreground/70">{s.hint}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 重点关注患者 */}
        <Card className="col-span-12 overflow-hidden xl:col-span-8">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-3.5 text-risk" />
                重点关注患者
                <CountBadge count={focusPatients.length} tone="risk" />
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                高风险 / 发生临床变异 / 数据缺失的在径患者
              </p>
            </div>
            <CardAction>
              <Button asChild variant="ghost" size="xs" className="text-muted-foreground">
                <Link to="/patients">
                  患者中心 <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>患者</TableHead>
                  <TableHead>诊断 / 路径</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead className="w-[130px]">路径进度</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {focusPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PatientAvatar name={p.name} id={p.id} size="sm" risk={p.riskLevel} />
                        <div>
                          <Link to={`/patients/${p.id}`} className="text-[12px] font-medium hover:text-primary">
                            {p.name}
                          </Link>
                          <div className="font-mono text-[9.5px] text-muted-foreground">{p.mrn}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[11.5px]">
                        {p.diagnosis} · {p.stage}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{p.pathwayName ?? "未入径"}</span>
                        {p.flags[2] && (
                          <span className="rounded-[2px] bg-warn-wash px-1 text-[9px] text-warn">{p.flags[2]}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={PATIENT_STATUS_META[p.status].tone}>
                        {PATIENT_STATUS_META[p.status].label}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={RISK_META[p.riskLevel].tone} dot={false}>
                        {RISK_META[p.riskLevel].label}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1 w-16" />
                        <span className="tabular text-[10px] text-muted-foreground">{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="xs">
                        <Link to={p.instanceId ? `/planning/${p.instanceId}` : `/patients/${p.id}`}>
                          {p.instanceId ? "规划" : "详情"} <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 待审核 */}
        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-muted-foreground" /> 待审核
                <CountBadge count={pendingApprovals.length} tone="warn" />
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">医生审核是计划生效的必要条件</p>
            </div>
            <CardAction>
              <Button asChild variant="ghost" size="xs">
                <Link to="/approvals">
                  进入 <ArrowUpRight className="size-3" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {pendingApprovals.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                to="/approvals"
                className="flex items-start gap-2.5 rounded-md border border-line px-2.5 py-2 transition-colors hover:border-line-strong hover:bg-secondary/30"
              >
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-warn-wash text-warn">
                  <CalendarClock className="size-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium">
                    {a.title} · {a.version}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {a.pathwayName}
                    {a.patientName ? ` · ${a.patientName}` : ""}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[9.5px] text-muted-foreground">
                      {a.submittedBy} · {relTime(a.submittedAt)}
                    </span>
                    {a.deadline && (
                      <span className="ml-auto font-mono text-[9px] text-warn">
                        截止 {fmtDate(a.deadline)} {fmtTime(a.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            <div className="flex items-center gap-1.5 pt-1 text-[9.5px] text-muted-foreground">
              <Clock className="size-2.5" /> 平均处理时长 3.6 小时 · SLA 24 小时
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-[10px] text-muted-foreground/70">
          工作台指标为合成演示数据；路径执行、变异与审批均按角色权限与数据范围过滤。
        </p>
        <SyntheticTag />
      </div>
    </Page>
  );
}
