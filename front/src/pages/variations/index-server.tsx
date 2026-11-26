import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Filter, GitBranch, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { BackendVariation } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "待评估",
  ASSESSING: "评估中",
  REPLAN_PENDING: "待重规划",
  RESOLVED: "已处置",
  CLOSED: "已关闭",
};

const TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  OPEN: "warn",
  ASSESSING: "info",
  REPLAN_PENDING: "risk",
  RESOLVED: "ok",
  CLOSED: "neutral",
};

const SEVERITY_LABEL: Record<string, string> = { LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重" };

export default function ServerVariationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<BackendVariation | null>(null);
  const [resolution, setResolution] = useState("");
  const [close, setClose] = useState(true);
  const variationsQuery = useQuery({
    queryKey: ["backend", "variations", status],
    queryFn: () => hccApi.listVariations({ status: status || undefined }),
    enabled: hccApi.hasToken(),
    retry: 0,
  });
  const items = variationsQuery.data?.items ?? [];
  const stats = useMemo(() => {
    const open = items.filter((item) => item.status !== "CLOSED" && item.status !== "RESOLVED").length;
    const high = items.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length;
    const closed = items.filter((item) => item.status === "CLOSED").length;
    return { open, high, closed };
  }, [items]);

  const resolve = useMutation({
    mutationFn: () => hccApi.resolveVariation(selected!.variation_id, { resolution: resolution.trim(), close }),
    onSuccess: () => {
      toast.success("变异已处置");
      setSelected(null);
      setResolution("");
      void queryClient.invalidateQueries({ queryKey: ["backend", "variations"] });
      void queryClient.invalidateQueries({ queryKey: ["backend", "patients"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : "处置失败";
      toast.error("后端拒绝操作", { description: message });
    },
  });

  return (
    <Page>
      <PageHeader
        module="M08 · 变异管理 · 后端"
        title="路径变异"
        description="读取服务端变异记录；处置与关闭由后端状态机校验。"
        actions={<SyntheticTag />}
        meta={
          <>
            <PageMeta label="数据源" value="FastAPI · SQLite" />
            <PageMeta label="条目" value={`${items.length}`} mono />
            <PageMeta label="未关闭" value={`${stats.open}`} mono />
          </>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          ["未关闭", stats.open, "warn"],
          ["高风险/严重", stats.high, "risk"],
          ["已关闭", stats.closed, "ok"],
        ].map(([label, value, tone]) => (
          <Card key={String(label)} className="px-4 py-3">
            <p className="label-micro">{label}</p>
            <p className={`mt-1 font-mono text-[22px] ${tone === "risk" ? "text-risk" : tone === "warn" ? "text-warn" : "text-ok"}`}>{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <SectionHead title="变异列表" description="按检测时间倒序；仅显示本科室范围" />
          <div className="flex items-center gap-1.5">
            <Filter className="size-3 text-muted-foreground" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-8 rounded-[4px] border border-line bg-background px-2 text-[11px]">
              <option value="">全部状态</option>
              <option value="OPEN">待评估</option>
              <option value="ASSESSING">评估中</option>
              <option value="REPLAN_PENDING">待重规划</option>
              <option value="RESOLVED">已处置</option>
              <option value="CLOSED">已关闭</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {variationsQuery.isLoading ? <p className="py-10 text-center text-[11px] text-muted-foreground">读取服务端变异…</p> : null}
          {variationsQuery.isError ? <EmptyState icon={<AlertTriangle />} title="无法读取变异" description="后端不可用或当前账号无权限。" /> : null}
          {!variationsQuery.isLoading && !variationsQuery.isError && items.length === 0 ? (
            <EmptyState icon={<GitBranch />} title="当前没有变异记录" description="路径执行中登记变异后会出现在此队列。" />
          ) : null}
          {items.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>患者</TableHead><TableHead>变异</TableHead><TableHead>严重度</TableHead><TableHead>状态</TableHead><TableHead>检测时间</TableHead><TableHead>来源</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.variation_id}>
                    <TableCell className="font-mono text-[10px]">{item.patient_id}</TableCell>
                    <TableCell><p className="text-[11px] font-medium">{item.title}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{item.type} · {item.affected_nodes.join(", ") || "—"}</p></TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px]">{SEVERITY_LABEL[item.severity] ?? item.severity}</Badge></TableCell>
                    <TableCell><StatusBadge tone={TONE[item.status] ?? "neutral"} dot={false}>{STATUS_LABEL[item.status] ?? item.status}</StatusBadge></TableCell>
                    <TableCell className="font-mono text-[9px]">{fmtDate(item.detected_at, true)}</TableCell>
                    <TableCell className="text-[9.5px]">{item.source}</TableCell>
                    <TableCell className="text-right">
                      {item.status !== "CLOSED" && item.status !== "RESOLVED" ? (
                        <Button size="sm" variant="outline" onClick={() => { setSelected(item); setResolution(""); setClose(true); }}>
                          处置 <ArrowRight className="size-3" />
                        </Button>
                      ) : <span className="text-[9px] text-muted-foreground">{item.resolution ?? "已结束"}</span>}
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
            <DialogTitle>处置变异</DialogTitle>
            <DialogDescription>{selected?.variation_id} · {selected?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>处置说明</Label>
              <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="记录临床判断、沟通和后续安排" className="min-h-20 w-full rounded-[4px] border border-line bg-background px-2.5 py-2 text-[11px] outline-none focus:border-accent" />
            </div>
            <label className="flex items-center gap-2 text-[11px]">
              <input type="checkbox" checked={close} onChange={(event) => setClose(event.target.checked)} />
              同时关闭该变异
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>取消</Button>
            <Button disabled={!resolution.trim() || resolve.isPending} onClick={() => resolve.mutate()}>
              <ShieldAlert className="size-3.5" /> 提交处置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
