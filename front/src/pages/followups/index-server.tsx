import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import type { BackendFollowup } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "待随访",
  ACTIVE: "随访中",
  PENDING_ACTION: "待处置",
  CLOSED: "已关闭",
  DECLINED: "拒绝随访",
};

const TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  PLANNED: "info",
  ACTIVE: "info",
  PENDING_ACTION: "risk",
  CLOSED: "neutral",
  DECLINED: "neutral",
};

export default function ServerFollowupsPage() {
  const queryClient = useQueryClient();
  const [risk, setRisk] = useState("");
  const [selected, setSelected] = useState<BackendFollowup | null>(null);
  const [reason, setReason] = useState("");
  const followupsQuery = useQuery({
    queryKey: ["backend", "followups", risk],
    queryFn: () => hccApi.listFollowups({ risk: risk || undefined }),
    enabled: hccApi.hasToken(),
    retry: 0,
  });
  const items = followupsQuery.data?.items ?? [];
  const stats = useMemo(() => ({
    high: items.filter((item) => item.risk_level === "HIGH").length,
    pending: items.filter((item) => item.status === "PENDING_ACTION").length,
    closed: items.filter((item) => item.status === "CLOSED").length,
  }), [items]);
  const close = useMutation({
    mutationFn: () => hccApi.closeFollowup(selected!.followup_id, reason.trim()),
    onSuccess: () => {
      toast.success("随访已关闭");
      setSelected(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["backend", "followups"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : "关闭失败";
      toast.error("后端拒绝关闭", { description: message });
    },
  });

  return (
    <Page>
      <PageHeader
        module="M10 · 随访管理 · 后端"
        title="随访队列"
        actions={<SyntheticTag />}
        meta={
          <>
            <PageMeta label="数据源" value="FastAPI · SQLite" />
            <PageMeta label="条目" value={`${items.length}`} mono />
            <PageMeta label="待处置" value={`${stats.pending}`} mono />
          </>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="px-4 py-3"><p className="label-micro">高风险</p><p className="mt-1 font-mono text-[22px] text-risk">{stats.high}</p></Card>
        <Card className="px-4 py-3"><p className="label-micro">待处置</p><p className="mt-1 font-mono text-[22px] text-warn">{stats.pending}</p></Card>
        <Card className="px-4 py-3"><p className="label-micro">已关闭</p><p className="mt-1 font-mono text-[22px] text-ok">{stats.closed}</p></Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <SectionHead title="随访计划" description="按风险等级与窗口结束时间排序" />
          <select value={risk} onChange={(event) => setRisk(event.target.value)} className="h-8 rounded-[4px] border border-line bg-background px-2 text-[11px]">
            <option value="">全部风险</option>
            <option value="HIGH">高风险</option>
            <option value="MEDIUM">中风险</option>
            <option value="LOW">低风险</option>
          </select>
        </CardHeader>
        <CardContent>
          {followupsQuery.isLoading ? <p className="py-10 text-center text-[11px] text-muted-foreground">读取服务端随访…</p> : null}
          {followupsQuery.isError ? <EmptyState icon={<AlertTriangle />} title="无法读取随访" description="后端不可用或当前账号无权限。" /> : null}
          {!followupsQuery.isLoading && !followupsQuery.isError && items.length === 0 ? (
            <EmptyState icon={<CalendarClock />} title="当前没有随访计划" description="患者完成治疗后创建随访窗口。" />
          ) : null}
          {items.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>患者</TableHead><TableHead>窗口</TableHead><TableHead>渠道</TableHead><TableHead>风险</TableHead><TableHead>状态</TableHead><TableHead>负责人</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.followup_id}>
                    <TableCell className="font-mono text-[10px]">{item.patient_id}</TableCell>
                    <TableCell className="font-mono text-[9px]">{fmtDate(item.window_start)} → {fmtDate(item.window_end)}</TableCell>
                    <TableCell className="text-[9.5px]">{item.channel}</TableCell>
                    <TableCell><StatusBadge tone={item.risk_level === "HIGH" ? "risk" : item.risk_level === "MEDIUM" ? "warn" : "ok"} dot={false}>{item.risk_level}</StatusBadge></TableCell>
                    <TableCell><StatusBadge tone={TONE[item.status] ?? "neutral"} dot={false}>{STATUS_LABEL[item.status] ?? item.status}</StatusBadge></TableCell>
                    <TableCell className="text-[9.5px]">{item.owner}</TableCell>
                    <TableCell className="text-right">
                      {item.status !== "CLOSED" && item.status !== "DECLINED" ? (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(item); setReason(""); }}>
                          <CheckCircle2 className="size-3" /> 关闭
                        </Button>
                      ) : <span className="text-[9px] text-muted-foreground">已结束</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关闭随访</DialogTitle>
            <DialogDescription>{selected?.followup_id} · {selected?.patient_id}；存在未关闭预警时后端会拒绝。</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>关闭原因</Label>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-20 w-full rounded-[4px] border border-line bg-background px-2.5 py-2 text-[11px] outline-none focus:border-accent" placeholder="记录随访完成、失访或转诊等原因" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
            <Button disabled={!reason.trim() || close.isPending} onClick={() => close.mutate()}>
              <HeartPulse className="size-3.5" /> 确认关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
