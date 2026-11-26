import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, ClipboardList, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import type { BackendTaskOverview } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { cn, fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendTaskOverview } from "@/queries/backend";

const STATUS_TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  PENDING: "neutral",
  READY: "info",
  IN_PROGRESS: "warn",
  BLOCKED: "risk",
  COMPLETED: "ok",
  CANCELLED: "neutral",
  SKIPPED: "neutral",
};

const FILTERS = ["ALL", "READY", "IN_PROGRESS", "PENDING", "COMPLETED", "OVERDUE"] as const;
const FILTER_LABEL: Record<string, string> = {
  ALL: "全部",
  READY: "可执行",
  IN_PROGRESS: "执行中",
  PENDING: "待执行",
  COMPLETED: "已完成",
  OVERDUE: "超时",
};
type Filter = (typeof FILTERS)[number];

export default function ServerTasksPage() {
  const query = useBackendTaskOverview();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [completeTask, setCompleteTask] = useState<BackendTaskOverview | null>(null);
  const [resultSummary, setResultSummary] = useState("");

  const tasks = query.data?.items ?? [];
  const filtered = useMemo(() => {
    if (filter === "ALL") return tasks;
    if (filter === "OVERDUE") return tasks.filter((task) => task.overdue);
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      ready: tasks.filter((task) => task.status === "READY").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      overdue: tasks.filter((task) => task.overdue).length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [tasks],
  );

  const transition = useMutation({
    mutationFn: ({ task, to, result }: { task: BackendTaskOverview; to: string; result?: string }) =>
      hccApi.transitionTask(task.task_id, {
        to_status: to,
        expected_version: task.version,
        result_summary: result,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["backend", "tasks"] });
      toast.success(`任务已更新：${variables.to}`, { description: variables.task.name });
      setCompleteTask(null);
      setResultSummary("");
    },
    onError: (error) => {
      const message =
        error instanceof ApiError
          ? `${error.code} · ${error.message}${error.requestId ? `（${error.requestId}）` : ""}`
          : "任务状态转换失败";
      toast.error("后端拒绝任务转换", { description: message, duration: 5000 });
    },
  });

  const nextAction = (task: BackendTaskOverview) => {
    if (task.status === "PENDING") return { label: "标记可执行", to: "READY" };
    if (task.status === "READY") return { label: "开始执行", to: "IN_PROGRESS" };
    return null;
  };

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <EmptyState icon={<ClipboardList />} title="需要后端登录" description="请从登录页使用 server 模式重新登录。" />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        module="M07 · 任务执行 · 后端工作队列"
        title="任务中心"
        description="任务来自服务端计划与状态机；依赖、角色、乐观锁和必需结果均由后端校验。"
        actions={<SyntheticTag />}
        meta={
          <>
            <PageMeta label="任务" value={`${counts.all} 项`} mono />
            <PageMeta label="数据源" value="FastAPI · SQLite" mono />
            <PageMeta label="最近同步" value={new Date().toLocaleTimeString("zh-CN", { hour12: false })} />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "全部任务", value: counts.all, icon: ClipboardList, tone: "text-foreground" },
          { label: "可执行", value: counts.ready, icon: CircleDot, tone: "text-info" },
          { label: "执行中", value: counts.inProgress, icon: Loader2, tone: "text-warn" },
          { label: "超时", value: counts.overdue, icon: Timer, tone: "text-risk" },
          { label: "已完成", value: counts.completed, icon: CheckCircle2, tone: "text-ok" },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-wide text-muted-foreground">{item.label}</p>
              <item.icon className={cn("size-3.5", item.tone)} />
            </div>
            <p className="mt-1 font-mono text-[22px] font-medium">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] transition-colors",
                filter === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {FILTER_LABEL[key]}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground">显示 {filtered.length} 项</span>
        </div>

        {query.isLoading ? (
          <p className="py-12 text-center text-[11px] text-muted-foreground">读取服务端任务队列…</p>
        ) : filtered.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务</TableHead>
                <TableHead>患者 / 路径</TableHead>
                <TableHead>阶段</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>截止</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => {
                const action = nextAction(task);
                return (
                  <TableRow key={task.task_id}>
                    <TableCell>
                      <p className="text-[11.5px] font-medium">{task.name}</p>
                      <p className="font-mono text-[9px] text-muted-foreground">
                        {task.task_id} · {task.node_key} {task.required ? "· 必做" : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10.5px]">{task.patient_name ?? task.patient_id}</p>
                      <p className="font-mono text-[9px] text-muted-foreground">{task.pathway_name ?? task.instance_id}</p>
                    </TableCell>
                    <TableCell className="text-[10.5px]">{task.stage}</TableCell>
                    <TableCell className="font-mono text-[9.5px]">{task.role}</TableCell>
                    <TableCell className={cn("font-mono text-[9.5px]", task.overdue && "text-risk")}>
                      {task.due_at ? fmtDate(task.due_at, true) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge tone={STATUS_TONE[task.status] ?? "neutral"} dot={false}>{task.status}</StatusBadge>
                        {task.overdue ? <span className="text-[9px] text-risk">已超时</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {action ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={transition.isPending || !task.dependencies_completed}
                          title={!task.dependencies_completed ? "依赖任务未完成" : undefined}
                          onClick={() => transition.mutate({ task, to: action.to })}
                        >
                          {action.label} <ArrowRight className="size-3" />
                        </Button>
                      ) : task.status === "IN_PROGRESS" ? (
                        <Button
                          size="sm"
                          disabled={transition.isPending}
                          onClick={() => {
                            setCompleteTask(task);
                            setResultSummary("");
                          }}
                        >
                          完成
                        </Button>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">无操作</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12">
            <EmptyState
              icon={<AlertTriangle />}
              title="没有匹配任务"
              description="当前筛选条件下无任务；可切换状态或等待计划激活后生成任务。"
            />
          </div>
        )}
      </Card>

      <Callout tone="neutral" title="任务状态机由后端执行" className="mt-3">
        依赖未完成、角色不匹配、版本冲突或缺少结果摘要都会返回 409/403；前端只发起过渡，不能绕过服务端校验。
      </Callout>

      <Dialog open={Boolean(completeTask)} onOpenChange={(open) => !open && setCompleteTask(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>完成任务</DialogTitle>
            <DialogDescription>
              {completeTask?.name} · {completeTask?.patient_name}。完成必须记录结果摘要。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={resultSummary}
            onChange={(event) => setResultSummary(event.target.value)}
            placeholder="填写执行结果、来源与异常情况（必填）…"
            className="min-h-[110px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTask(null)}>取消</Button>
            <Button
              disabled={!resultSummary.trim() || transition.isPending}
              onClick={() => completeTask && transition.mutate({ task: completeTask, to: "COMPLETED", result: resultSummary.trim() })}
            >
              确认完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
