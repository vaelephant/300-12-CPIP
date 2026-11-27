import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Inbox, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { fmtDate, cn } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { StatCard } from "@/components/app/stat-card";
import { FilterPill } from "@/components/app/toolbar";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPE_LABEL: Record<string, string> = {
  PATHWAY_VERSION: "路径版本",
  PLAN: "患者计划",
  VARIATION_REPLAN: "变异重规划",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  PENDING: "warn",
  APPROVED: "ok",
  REJECTED: "risk",
};

export default function ServerApprovalsPage() {
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const [showProcessed, setShowProcessed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [publishAfter, setPublishAfter] = useState(false);

  const query = useQuery({
    queryKey: ["backend", "approvals"],
    queryFn: () => hccApi.listApprovals({ pageSize: 100 }),
    enabled: hccApi.hasToken(),
    retry: 0,
  });

  const items = query.data?.items ?? [];
  const pending = useMemo(() => items.filter((a) => a.status === "PENDING"), [items]);
  const scope = showProcessed ? items : pending;
  const selected = scope.find((a) => a.approval_id === selectedId) ?? scope[0];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["backend", "approvals"] });
    void queryClient.invalidateQueries({ queryKey: ["backend", "pathway-versions"] });
    void queryClient.invalidateQueries({ queryKey: ["backend", "pathways"] });
  };

  const decide = useMutation({
    mutationFn: async (kind: "approve" | "reject") => {
      if (!selected) throw new Error("no approval");
      if (kind === "reject") {
        if (comment.trim().length < 4) throw new Error("请填写至少 4 字退回意见");
        return hccApi.rejectRequest(selected.approval_id, comment.trim());
      }
      const result = await hccApi.approveRequest(selected.approval_id, comment.trim() || "审核通过");
      if (publishAfter && selected.object_type === "PATHWAY_VERSION" && user?.role === "MEDICAL_AFFAIRS") {
        await hccApi.publishPathwayVersion(selected.object_id);
      }
      return result;
    },
    onSuccess: (_data, kind) => {
      toast.success(kind === "approve" ? "已通过" : "已退回");
      setApproveOpen(false);
      setRejectOpen(false);
      setComment("");
      setPublishAfter(false);
      invalidate();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : "操作失败";
      toast.error("后端拒绝操作", { description: message, duration: 5000 });
    },
  });

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <PageHeader module="M04 · 审核中心" title="审核中心" actions={<SyntheticTag />} />
        <EmptyState icon={<ShieldCheck className="size-4" />} title="需要后端登录" description="Server 模式从 /approvals 读取真实审批队列。" />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        module="M04 · 审核中心"
        title="审核中心"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="数据源" value="GET /approvals" mono />
            <PageMeta label="待审" value={`${pending.length}`} mono />
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={cn("size-3.5", query.isFetching && "animate-spin")} />
            刷新
          </Button>
        }
      />

      <Callout tone="info" title="真实审批队列" className="mb-4">
        Server 模式：审批写入后端。路径版本通过后需医务处执行发布；计划通过后仍须在规划页激活。AI 建议不会自动生效。
      </Callout>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="待审" value={String(pending.length)} unit="件" tone="risk" />
        <StatCard label="全部" value={String(items.length)} unit="件" tone="info" />
        <StatCard
          label="路径版本"
          value={String(items.filter((a) => a.object_type === "PATHWAY_VERSION").length)}
          unit="件"
          tone="neutral"
        />
        <StatCard label="患者计划" value={String(items.filter((a) => a.object_type === "PLAN").length)} unit="件" tone="neutral" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterPill active={!showProcessed} onClick={() => setShowProcessed(false)}>
          仅待审
        </FilterPill>
        <FilterPill active={showProcessed} onClick={() => setShowProcessed(true)}>
          含已处理
        </FilterPill>
      </div>

      {query.isError ? (
        <EmptyState
          icon={<XCircle className="size-4" />}
          title="无法读取审批队列"
          description={query.error instanceof ApiError ? `${query.error.code} · ${query.error.message}` : "请确认角色为专家 / 医务处 / 管理员"}
        />
      ) : scope.length === 0 ? (
        <EmptyState icon={<Inbox className="size-4" />} title="暂无审批" description="提交路径版本或患者计划后会出现在此队列。" />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-line bg-card">
            <div className="border-b border-line px-3 py-2">
              <SectionHead title="队列" description={`${scope.length} 条`} />
            </div>
            <ul className="max-h-[560px] overflow-y-auto">
              {scope.map((item) => (
                <li key={item.approval_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.approval_id)}
                    className={cn(
                      "w-full border-b border-line/70 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-secondary/40",
                      selected?.approval_id === item.approval_id && "bg-secondary/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-medium">{TYPE_LABEL[item.object_type] ?? item.object_type}</span>
                      <StatusBadge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</StatusBadge>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{item.object_id}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(item.requested_at, true)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selected && (
            <div className="rounded-lg border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold">{TYPE_LABEL[selected.object_type] ?? selected.object_type}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{selected.approval_id}</p>
                </div>
                <StatusBadge tone={STATUS_TONE[selected.status] ?? "neutral"}>{selected.status}</StatusBadge>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">对象</dt>
                  <dd className="font-mono">{selected.object_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">风险</dt>
                  <dd>{selected.risk}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">申请人</dt>
                  <dd className="font-mono">{selected.requested_by}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">申请时间</dt>
                  <dd>{fmtDate(selected.requested_at, true)}</dd>
                </div>
                {selected.reviewer && (
                  <div>
                    <dt className="text-muted-foreground">审核人</dt>
                    <dd className="font-mono">{selected.reviewer}</dd>
                  </div>
                )}
                {selected.comment && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">意见</dt>
                    <dd>{selected.comment}</dd>
                  </div>
                )}
              </dl>

              {selected.object_type === "PLAN" && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  计划对象可在{" "}
                  <Link className="text-primary hover:underline" to="/tasks">
                    任务中心
                  </Link>{" "}
                  / 规划页继续激活。
                </p>
              )}

              {selected.status === "PENDING" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setComment("");
                      setPublishAfter(selected.object_type === "PATHWAY_VERSION" && user?.role === "MEDICAL_AFFAIRS");
                      setApproveOpen(true);
                    }}
                  >
                    <CheckCircle2 className="size-3.5" />
                    通过
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setComment("");
                      setRejectOpen(true);
                    }}
                  >
                    <XCircle className="size-3.5" />
                    退回
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认通过</DialogTitle>
            <DialogDescription>审核人不能是提交人；计划通过后不会自动激活。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-comment">意见（可选）</Label>
            <Textarea id="approve-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            {selected?.object_type === "PATHWAY_VERSION" && user?.role === "MEDICAL_AFFAIRS" && (
              <label className="flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={publishAfter} onChange={(e) => setPublishAfter(e.target.checked)} />
                通过后立即发布该路径版本
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              取消
            </Button>
            <Button disabled={decide.isPending} onClick={() => decide.mutate("approve")}>
              确认通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退回申请</DialogTitle>
            <DialogDescription>请说明需补充或修改的内容（至少 4 字）。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-comment">退回意见</Label>
            <Textarea id="reject-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" disabled={decide.isPending} onClick={() => decide.mutate("reject")}>
              确认退回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
