import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  Columns3,
  List,
  RotateCcw,
  SlidersHorizontal,
  Timer,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { ClinicalRole, RoleKey, Task, TaskStatus } from "@/types";
import { INSTANCES, getPatient } from "@/data";
import { NODE_META, ROLE_LABELS, ROLE_SYSTEM_LABELS, TASK_STATUS_META } from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { SearchInput, Toolbar, CountBadge } from "@/components/app/toolbar";
import { Card } from "@/components/ui/card";
import { DonutChart, GroupedBarChart } from "@/components/charts/advanced";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRuntimeStore } from "@/stores/runtime-store";
import { useSessionStore } from "@/stores/session-store";
import { TaskActions } from "@/components/patient/task-actions";
import { Pagination } from "@/components/patient/ui";
import { isTerminalTask } from "@/components/patient/stages";
import ServerTasksPage from "./index-server";

const PAGE_SIZE = 24;

type TabKey = "mine" | "all" | "overdue";
type ViewMode = "list" | "board";

const ROLE_OPTIONS: ClinicalRole[] = ["DOCTOR", "NURSE", "SURGEON", "ANESTHESIOLOGIST", "PHARMACIST", "COORDINATOR"];
const STAGE_OPTIONS = ["术前评估", "术前检查", "治疗方案确认", "手术及术后", "出院与随访"];

const ROLE_QUEUE: Partial<Record<RoleKey, ClinicalRole>> = {
  DOCTOR: "DOCTOR",
  EXPERT: "DOCTOR",
  MEDICAL_AFFAIRS: "DOCTOR",
  NURSE: "NURSE",
};

const BOARD_COLUMNS: { key: TaskStatus; label: string; hint: string; tone: "info" | "warn" | "neutral" | "ok" }[] = [
  { key: "READY", label: "可执行", hint: "前置任务已完成", tone: "info" },
  { key: "IN_PROGRESS", label: "执行中", hint: "已开始、待完成", tone: "warn" },
  { key: "PENDING", label: "待执行", hint: "前置任务未完成", tone: "neutral" },
  { key: "COMPLETED", label: "已完成", hint: "含本会话操作", tone: "ok" },
];

interface ResolvedPatient {
  name: string;
  patientId?: string;
  diagnosis?: string;
  pathway?: string;
}

function resolveTaskPatient(task: Task): ResolvedPatient {
  const instance = INSTANCES.find((i) => i.id === task.instanceId);
  if (instance) {
    const patient = getPatient(instance.patientId);
    if (patient) {
      return { name: patient.name, patientId: patient.id, diagnosis: patient.diagnosis, pathway: instance.pathwayName };
    }
    return { name: instance.patientName, pathway: instance.pathwayName };
  }
  const parts = (task.summary ?? "").split("·").map((p) => p.trim());
  return { name: parts[0] || "—", diagnosis: parts[1], pathway: parts[2] };
}

function TaskTypeChip({ task }: { task: Task }) {
  const node = NODE_META[task.type];
  const Icon = node.icon;
  return (
    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-[5px]", node.chip)} title={node.label}>
      <Icon className="size-3" />
    </span>
  );
}

/* ------------------------------ 列表行 ------------------------------ */

function TaskTableRow({ task }: { task: Task }) {
  const patient = resolveTaskPatient(task);
  const status = TASK_STATUS_META[task.status];
  const overdue = task.overdue && !isTerminalTask(task.status);
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex items-start gap-2.5">
          <TaskTypeChip task={task} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-medium text-foreground/90">{task.name}</span>
              {!task.required && (
                <Badge variant="outline" className="text-[9px]">
                  非必需
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[9.5px] text-muted-foreground/80">
              <span>{task.id}</span>
              <span className="text-line-strong">|</span>
              <span>{NODE_META[task.type].label}</span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="text-[11.5px] text-foreground/85">
          {patient.patientId ? (
            <Link to={`/patients/${patient.patientId}`} className="hover:text-primary hover:underline">
              {patient.name}
            </Link>
          ) : (
            patient.name
          )}
        </div>
        <div className="mt-0.5 max-w-[210px] truncate text-[10px] text-muted-foreground" title={task.summary}>
          {patient.diagnosis ?? patient.pathway ?? task.summary ?? "—"}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px]">
          {task.stage}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-[11.5px] text-foreground/85">{ROLE_LABELS[task.role]}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">{task.assignee}</div>
      </TableCell>
      <TableCell className="font-mono text-[10px] whitespace-normal text-muted-foreground">
        <div>
          {fmtDate(task.earliestStartAt)} <span className="text-foreground/70">{fmtTime(task.earliestStartAt)}</span>
        </div>
        <div>
          → {fmtDate(task.dueAt)} <span className={cn("text-foreground/70", overdue && "text-risk")}>{fmtTime(task.dueAt)}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={status.tone} dot={false}>
            {status.label}
          </StatusBadge>
          {overdue && (
            <Badge variant="risk" className="gap-0.5 text-[9px]">
              <Timer className="size-2.5" /> 已超时
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <TaskActions task={task} />
      </TableCell>
    </TableRow>
  );
}

/* ------------------------------ 看板卡片 ------------------------------ */

function BoardCard({ task }: { task: Task }) {
  const patient = resolveTaskPatient(task);
  const overdue = task.overdue && !isTerminalTask(task.status);
  return (
    <div
      className={cn(
        "rounded-md border bg-card px-2.5 py-2 shadow-card transition-colors",
        overdue ? "border-risk/30" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-start gap-2">
        <TaskTypeChip task={task} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[11.5px] leading-snug font-medium text-foreground/90">{task.name}</span>
            {overdue && (
              <Badge variant="risk" className="shrink-0 gap-0.5 text-[8.5px]">
                <Timer className="size-2" /> 超时
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={patient.diagnosis ?? patient.pathway}>
            {patient.patientId ? (
              <Link to={`/patients/${patient.patientId}`} className="hover:text-primary hover:underline">
                {patient.name}
              </Link>
            ) : (
              patient.name
            )}
            {patient.diagnosis ? ` · ${patient.diagnosis}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px] text-muted-foreground">
        <span className="rounded-[3px] border border-line bg-secondary/50 px-1 py-px">{task.stage}</span>
        <span>{ROLE_LABELS[task.role]}</span>
        <span className="truncate">{task.assignee}</span>
        <span className="ml-auto font-mono text-muted-foreground/80">{relTime(task.dueAt)}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-line/70 pt-1.5">
        <span className="font-mono text-[9px] text-muted-foreground/70">{task.id}</span>
        <TaskActions task={task} compact />
      </div>
    </div>
  );
}

/* ------------------------------ 页面 ------------------------------ */

function DemoTasksPage() {
  const user = useSessionStore((s) => s.user);
  const tasks = useRuntimeStore((s) => s.tasks);
  const [tab, setTab] = useState<TabKey>("mine");
  const [view, setView] = useState<ViewMode>("list");
  const [role, setRole] = useState<"ALL" | ClinicalRole>("ALL");
  const [stage, setStage] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const stats = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === "PENDING").length,
      ready: tasks.filter((t) => t.status === "READY").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      overdue: tasks.filter((t) => t.overdue && !isTerminalTask(t.status)).length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
    }),
    [tasks],
  );

  const mine = useMemo(() => {
    if (!user) return { list: [] as Task[], fallback: false };
    const direct = tasks.filter((t) => t.assignee === user.name);
    if (direct.length) return { list: direct, fallback: false };
    const mapped = ROLE_QUEUE[user.role];
    return { list: mapped ? tasks.filter((t) => t.role === mapped) : tasks, fallback: true };
  }, [tasks, user]);

  const tabTasks = useMemo(() => {
    if (tab === "mine") return mine.list;
    if (tab === "overdue") return tasks.filter((t) => t.overdue && !isTerminalTask(t.status));
    return tasks;
  }, [tab, mine.list, tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabTasks.filter((t) => {
      const patient = resolveTaskPatient(t);
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        patient.name.toLowerCase().includes(q) ||
        (t.summary ?? "").toLowerCase().includes(q);
      const matchesRole = role === "ALL" || t.role === role;
      const matchesStage = stage === "ALL" || t.stage === stage;
      return matchesQuery && matchesRole && matchesStage;
    });
  }, [tabTasks, search, role, stage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setRole("ALL");
    setStage("ALL");
    setSearch("");
    setPage(1);
  };

  const setTabAndReset = (next: string) => {
    setTab(next as TabKey);
    setPage(1);
  };

  return (
    <Page>
      <PageHeader
        module="M07 · 路径执行"
        title="任务中心"
        description="跨路径实例的诊疗任务队列：我的任务、科室任务与超时任务统一调度；任务状态由运行时状态机校验。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("任务分派需进入患者执行页或由护士长批量分派（演示）")}
            >
              <UserRound className="size-3.5" />
              分派任务
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-3.5" />
              重置筛选
            </Button>
          </>
        }
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="当前账号" value={user ? `${user.name} · ${ROLE_SYSTEM_LABELS[user.role]}` : "未登录"} />
            <PageMeta label="科室" value={user?.departmentName ?? "—"} />
            <PageMeta label="数据范围" value={user?.dataScope ?? "—"} mono />
            <PageMeta label="任务总数" value={`${tasks.length} 项`} mono />
            <PageMeta label="最近刷新" value={relTime(new Date().toISOString())} mono />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="待执行"
          value={String(stats.pending)}
          unit="项"
          hint="前置任务尚未完成，当前不可开始的任务"
          tone="neutral"
          footer="等待前置节点完成或依赖检查通过"
        />
        <StatCard
          label="可执行"
          value={String(stats.ready)}
          unit="项"
          hint="前置任务已完成，可立即开始执行的任务"
          tone="info"
          footer={`其中超时 ${stats.overdue} 项需优先处理`}
        />
        <StatCard
          label="执行中"
          value={String(stats.inProgress)}
          unit="项"
          hint="已开始但尚未完成的任务"
          tone="ok"
          footer="完成时需填写执行结果"
        />
        <StatCard
          label="超时"
          value={String(stats.overdue)}
          unit="项"
          hint="超过最迟完成时间且未完成的任务；超时仅标记，不改变执行状态"
          tone="risk"
          footer={`已完成 ${stats.completed} 项 · 超时任务需质控复核`}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="px-4 py-3 xl:col-span-1">
          <SectionHead title="任务状态构成" count={tasks.length} description="运行时状态机快照，超时独立标记" />
          <div className="pt-3">
            <DonutChart
              data={[
                { name: "待执行", value: stats.pending, color: "#c7c9c4" },
                { name: "可执行", value: stats.ready, color: "var(--chart-4)" },
                { name: "执行中", value: stats.inProgress, color: "var(--chart-3)" },
                { name: "已完成", value: stats.completed, color: "var(--chart-1)" },
                { name: "超时未完成", value: stats.overdue, color: "var(--risk)" },
              ]}
              height={128}
              centerLabel="任务"
              centerValue={tasks.length}
              unit="项"
              footnote="超时任务可能同时处于待执行 / 执行中状态，此图按主状态归类。"
            />
          </div>
        </Card>
        <Card className="px-4 py-3 xl:col-span-2">
          <SectionHead
            title="阶段任务负荷"
            description="按 5 个路径阶段统计任务总量、完成与超时；用于识别瓶颈阶段"
          />
          <div className="pt-3">
            <GroupedBarChart
              data={STAGE_OPTIONS.map((stage) => {
                const list = tasks.filter((t) => t.stage === stage);
                return {
                  label: stage,
                  total: list.length,
                  completed: list.filter((t) => t.status === "COMPLETED").length,
                  overdue: list.filter((t) => t.overdue && t.status !== "COMPLETED").length,
                };
              })}
              series={[
                { key: "total", label: "任务总量", color: "var(--chart-2)" },
                { key: "completed", label: "已完成", color: "var(--chart-1)" },
                { key: "overdue", label: "超时", color: "var(--chart-5)" },
              ]}
              height={152}
              unit="项"
            />
          </div>
        </Card>
      </div>

      {stats.overdue > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-risk/25 bg-risk-wash/70 px-4 py-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk" />
            <div>
              <p className="text-[12.5px] font-medium text-risk">存在 {stats.overdue} 项超时任务</p>
              <p className="mt-0.5 text-[11px] text-foreground/60">
                超时任务不会自动改变状态，需责任医生评估是否继续、跳过或登记变异。
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive-outline"
            onClick={() => setTabAndReset("overdue")}
          >
            <Timer className="size-3.5" />
            仅看超时任务
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 pt-1">
          <Tabs value={tab} onValueChange={setTabAndReset}>
            <TabsList className="h-9 gap-5 border-b-0">
              <TabsTrigger value="mine">
                我的任务
                <CountBadge count={mine.list.length} />
              </TabsTrigger>
              <TabsTrigger value="all">
                全部任务
                <CountBadge count={tasks.length} />
              </TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:text-risk">
                超时任务
                <CountBadge count={stats.overdue} tone="risk" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <Toolbar className="w-full">
            <div className="w-[240px] max-w-full">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="搜索任务 / 患者 / 执行人 / 编号…"
              />
            </div>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as "ALL" | ClinicalRole);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="全部角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部角色</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stage}
              onValueChange={(v) => {
                setStage(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="全部阶段" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部阶段</SelectItem>
                {STAGE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-3.5" /> 重置
            </Button>
            <div className="ml-auto flex items-center gap-1 rounded-md border border-line bg-secondary/50 p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors",
                  view === "list" ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3" /> 列表
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors",
                  view === "board" ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Columns3 className="size-3" /> 看板
              </button>
            </div>
          </Toolbar>
        </div>

        {tab === "mine" && mine.fallback && (
          <div className="border-b border-line px-4 py-2.5">
            <Callout tone="info" title="当前账号无直接指派任务">
              已按您的角色（{user ? ROLE_SYSTEM_LABELS[user.role] : "未登录"}）展示角色队列，共 {mine.list.length} 项。
            </Callout>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="没有符合条件的任务"
            description={
              tab === "overdue"
                ? "当前没有超时任务，所有任务均在时间窗口内。"
                : "当前搜索与筛选组合无结果，可尝试重置筛选条件。"
            }
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-3.5" /> 重置筛选
              </Button>
            }
          />
        ) : view === "list" ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">任务</TableHead>
                  <TableHead className="min-w-[150px]">患者 / 路径</TableHead>
                  <TableHead className="min-w-[96px]">阶段</TableHead>
                  <TableHead className="min-w-[96px]">角色 / 执行人</TableHead>
                  <TableHead className="min-w-[150px]">时间窗口</TableHead>
                  <TableHead className="min-w-[130px]">状态</TableHead>
                  <TableHead className="min-w-[130px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TaskTableRow key={t.id} task={t} />
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={safePage}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="项"
            />
          </>
        ) : (
          <div className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <SlidersHorizontal className="size-3" />
                看板按状态分列 · 显示筛选结果 {filtered.length} 项
              </span>
              <span className="font-mono text-[10px]">READY / IN_PROGRESS / PENDING / COMPLETED</span>
            </div>
            <div className="overflow-x-auto pb-1 scrollbar-slim">
              <div className="grid min-w-[980px] grid-cols-4 gap-3">
                {BOARD_COLUMNS.map((col) => {
                  const list = filtered.filter((t) => t.status === col.key);
                  return (
                    <div key={col.key} className="flex min-h-[420px] flex-col rounded-lg border border-line bg-secondary/25">
                      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              col.tone === "info" && "bg-info",
                              col.tone === "warn" && "bg-warn",
                              col.tone === "ok" && "bg-ok",
                              col.tone === "neutral" && "bg-muted-foreground/50",
                            )}
                          />
                          <span className="text-[12px] font-semibold">{col.label}</span>
                          <CountBadge count={list.length} />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{col.hint}</span>
                      </div>
                      <div className="max-h-[62vh] flex-1 space-y-2 overflow-y-auto scrollbar-slim p-2">
                        {list.length === 0 ? (
                          <p className="px-1 py-6 text-center text-[10.5px] text-muted-foreground">该列暂无任务</p>
                        ) : (
                          <>
                            {list.slice(0, 30).map((t) => (
                              <BoardCard key={t.id} task={t} />
                            ))}
                            {list.length > 30 && (
                              <p className="px-1 pt-1 text-center text-[10px] text-muted-foreground">
                                仅显示前 30 项，共 {list.length} 项
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3 text-muted-foreground/70" />
          当前账号：{user?.name ?? "未登录"} · {user ? ROLE_SYSTEM_LABELS[user.role] : "—"} · 任务操作仅影响当前浏览器会话的演示运行时。
        </span>
        <Link to="/patients" className="inline-flex items-center gap-0.5 text-primary hover:underline">
          前往患者中心
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Page>
  );
}


export default function TasksPage() {
  if (import.meta.env.VITE_HCC_API_MODE === "server") return <ServerTasksPage />;
  return <DemoTasksPage />;
}
