import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Play, Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BackendPlan } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { useSessionStore } from "@/stores/session-store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  PENDING_APPROVAL: "待审核",
  APPROVED: "已审核",
  ACTIVE: "生效中",
  SUPERSEDED: "已被替代",
  COMPLETED: "已完成",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "warn",
  APPROVED: "info",
  ACTIVE: "ok",
  SUPERSEDED: "neutral",
  COMPLETED: "neutral",
};

const TASK_TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  COMPLETED: "ok",
  IN_PROGRESS: "info",
  READY: "warn",
  BLOCKED: "risk",
  PENDING: "neutral",
  CANCELLED: "neutral",
  SKIPPED: "neutral",
};

export default function ServerPlanningPage() {
  const { instanceId = "" } = useParams();
  const queryClient = useQueryClient();
  const sessionUser = useSessionStore((state) => state.user);
  const instanceQuery = useQuery({
    queryKey: ["backend", "instance", instanceId],
    queryFn: () => hccApi.getInstance(instanceId),
    enabled: Boolean(instanceId) && hccApi.hasToken(),
    retry: 0,
  });
  const plansQuery = useQuery({
    queryKey: ["backend", "instance-plans", instanceId],
    queryFn: () => hccApi.listInstancePlans(instanceId),
    enabled: Boolean(instanceId) && hccApi.hasToken(),
    retry: 0,
  });

  const plan: BackendPlan | undefined = useMemo(() => {
    const plans = plansQuery.data ?? [];
    return (
      plans.find((item) => item.status === "ACTIVE") ??
      plans.find((item) => item.status === "APPROVED") ??
      plans.find((item) => item.status === "PENDING_APPROVAL") ??
      plans.find((item) => item.status === "DRAFT") ??
      plans[0]
    );
  }, [plansQuery.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["backend", "instance", instanceId] });
    void queryClient.invalidateQueries({ queryKey: ["backend", "instance-plans", instanceId] });
    void queryClient.invalidateQueries({ queryKey: ["backend", "tasks"] });
  };

  const action = useMutation({
    mutationFn: (kind: "submit" | "approve" | "activate") => {
      if (!plan) throw new Error("no plan");
      if (kind === "submit") return hccApi.submitPlan(plan.plan_id);
      if (kind === "approve") return hccApi.approvePlan(plan.plan_id, "后端规划页审核");
      return hccApi.activatePlan(plan.plan_id);
    },
    onSuccess: () => {
      toast.success("计划状态已更新");
      invalidate();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : "计划操作失败";
      toast.error("后端拒绝操作", { description: message, duration: 5000 });
    },
  });

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <EmptyState icon={<ClipboardList />} title="需要后端登录" description="请从登录页使用 server 模式重新登录。" />
      </Page>
    );
  }
  if (instanceQuery.isLoading || plansQuery.isLoading) {
    return <Page><p className="py-16 text-center text-[11px] text-muted-foreground">读取服务端计划…</p></Page>;
  }
  if (instanceQuery.isError || plansQuery.isError) {
    return (
      <Page>
        <EmptyState
          icon={<AlertTriangle />}
          title="无法读取规划"
          action={<Button asChild variant="outline" size="sm"><Link to="/patients"><ArrowLeft className="size-3.5" /> 返回患者中心</Link></Button>}
        />
      </Page>
    );
  }

  const instance = instanceQuery.data!;
  const canReview = sessionUser?.role === "EXPERT" || sessionUser?.role === "MEDICAL_AFFAIRS";

  return (
    <Page>
      <PageHeader
        module="M06 · 个体化规划 · 后端计划视图"
        title="个体化路径规划"
        actions={<SyntheticTag />}
        meta={
          <>
            <PageMeta label="实例" value={instance.instance_id} mono />
            <PageMeta label="患者" value={instance.patient_id} mono />
            <PageMeta label="状态" value={instance.status} />
            <PageMeta label="当前阶段" value={instance.current_stage ?? "—"} />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <p className="label-micro">路径实例</p>
          <p className="mt-1 font-mono text-[14px]">{instance.instance_id}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">版本 {instance.pathway_version_id} · 完整度 {instance.data_completeness}%</p>
        </Card>
        <Card className="p-4">
          <p className="label-micro">当前计划</p>
          <p className="mt-1 text-[14px] font-medium">{plan?.version ?? "暂无"}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{plan ? `${plan.plan_id} · ${STATUS_LABEL[plan.status] ?? plan.status}` : "尚未生成"}</p>
        </Card>
        <Card className="p-4">
          <p className="label-micro">计划任务</p>
          <p className="mt-1 text-[14px] font-medium">{plan?.tasks.length ?? 0} 项</p>
          <p className="mt-1 text-[10px] text-muted-foreground">任务推进请前往任务中心</p>
        </Card>
      </div>

      {plan ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <SectionHead title={`候选计划 · ${plan.version}`} description={plan.summary} />
              <StatusBadge tone={STATUS_TONE[plan.status] ?? "neutral"}>{STATUS_LABEL[plan.status] ?? plan.status}</StatusBadge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>任务</TableHead><TableHead>阶段</TableHead><TableHead>角色</TableHead><TableHead>截止</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                <TableBody>
                  {plan.tasks.map((task) => (
                    <TableRow key={task.task_id}>
                      <TableCell className="text-[11px]">{task.name}<span className="ml-1 font-mono text-[8.5px] text-muted-foreground">{task.node_key}</span></TableCell>
                      <TableCell className="text-[10.5px]">{task.stage}</TableCell>
                      <TableCell className="font-mono text-[9.5px]">{task.role}</TableCell>
                      <TableCell className="font-mono text-[9.5px]">{task.due_at ? fmtDate(task.due_at, true) : "—"}</TableCell>
                      <TableCell><StatusBadge tone={TASK_TONE[task.status] ?? "neutral"} dot={false}>{task.status}</StatusBadge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {plan.status === "DRAFT" ? (
                  <Button size="sm" disabled={action.isPending} onClick={() => action.mutate("submit")}>
                    <Send className="size-3.5" /> 提交审核
                  </Button>
                ) : null}
                {plan.status === "PENDING_APPROVAL" ? (
                  canReview ? (
                    <Button size="sm" disabled={action.isPending} onClick={() => action.mutate("approve")}>
                      <ShieldCheck className="size-3.5" /> 审核通过
                    </Button>
                  ) : (
                    <Callout tone="warn" title="等待专家 / 医务处审核">当前账号无权审核计划；请切换具备审核权限的后端账号。</Callout>
                  )
                ) : null}
                {plan.status === "APPROVED" ? (
                  <Button size="sm" disabled={action.isPending} onClick={() => action.mutate("activate")}>
                    <Play className="size-3.5" /> 激活计划
                  </Button>
                ) : null}
                {plan.status === "ACTIVE" ? (
                  <p className="inline-flex items-center gap-1 text-[10.5px] text-ok"><CheckCircle2 className="size-3.5" /> 计划已生效；任务状态请到任务中心处理。</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-4">
            <CardHeader className="pb-2"><SectionHead title="状态流转" description="服务端强制规则" /></CardHeader>
            <CardContent className="space-y-2 text-[10.5px] text-muted-foreground">
              {[
                ["DRAFT", "草稿生成后可提交审核"],
                ["PENDING_APPROVAL", "必须由非提交人的专家/医务处审核"],
                ["APPROVED", "激活前重新检查安全规则"],
                ["ACTIVE", "任务可推进；原计划保留历史"],
              ].map(([key, text]) => (
                <div key={key} className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2">
                  <Badge variant="outline" className="mt-0.5 font-mono text-[8px]">{key}</Badge>
                  <span>{text}</span>
                </div>
              ))}
              <p className="border-t border-line pt-2 text-[9.5px]">
                计划生成与快照选择仍由后端接口完成；当前页面只做审核/激活与查看，不伪造规则结果。
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles />}
          title="尚无计划"
          action={<Button asChild variant="outline" size="sm"><Link to="/patients"><ArrowLeft className="size-3.5" /> 返回患者中心</Link></Button>}
        />
      )}
    </Page>
  );
}
