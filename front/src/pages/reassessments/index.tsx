import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { IS_SERVER_MODE } from "@/lib/data-mode";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { cn, fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { StatCard } from "@/components/app/stat-card";
import { FilterPill } from "@/components/app/toolbar";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_TONE: Record<string, "ok" | "warn" | "risk" | "neutral" | "info"> = {
  OPEN: "warn",
  REPLAN_DRAFTED: "info",
  DISMISSED: "neutral",
  RESOLVED: "ok",
};

export default function ReassessmentsPage() {
  if (!IS_SERVER_MODE) {
    return (
      <Page>
        <PageHeader
          module="M07 · 事件重评"
          title="重评队列"
          meta={<SyntheticTag />}
        />
        <Callout tone="warn" title="Demo 模式为研究预览占位">
          事件驱动重评仅在 Server 模式接入后端。请设置 VITE_DATA_MODE=server 后演示「导入事件 → 重评 → DRAFT 重规划」。
        </Callout>
        <EmptyState
          icon={<Activity className="size-4" />}
          title="切换到 Server 模式"
          description="融资主演示必须使用同一套服务端状态，避免 mock 与真实闭环混淆。"
        />
      </Page>
    );
  }

  return <ServerReassessmentsPage />;
}

function ServerReassessmentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN">("OPEN");
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importPatientId, setImportPatientId] = useState("HCC-DEMO-001");
  const [importInstanceHint, setImportInstanceHint] = useState("");

  const query = useQuery({
    queryKey: ["backend", "reassessments"],
    queryFn: () => hccApi.listReassessments(),
    enabled: hccApi.hasToken(),
    retry: 0,
  });

  const items = query.data?.items ?? [];
  const openCount = items.filter((i) => i.status === "OPEN").length;
  const list = useMemo(
    () => (statusFilter === "OPEN" ? items.filter((i) => i.status === "OPEN") : items),
    [items, statusFilter],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["backend", "reassessments"] });
    void queryClient.invalidateQueries({ queryKey: ["backend", "instance-plans"] });
  };

  const dismiss = useMutation({
    mutationFn: () => {
      if (!dismissId) throw new Error("missing id");
      if (dismissReason.trim().length < 4) throw new Error("请填写至少 4 字原因");
      return hccApi.dismissReassessment(dismissId, dismissReason.trim());
    },
    onSuccess: () => {
      toast.success("已忽略该重评");
      setDismissId(null);
      setDismissReason("");
      invalidate();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : String(error);
      toast.error("忽略失败", { description: message });
    },
  });

  const replan = useMutation({
    mutationFn: (id: string) => hccApi.replanReassessment(id),
    onSuccess: (plan) => {
      toast.success("已生成 DRAFT 重规划", {
        description: `plan ${plan.plan_id} · 原 ACTIVE 计划保持不变，需医生审核后激活`,
      });
      invalidate();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : "重规划失败";
      toast.error("后端拒绝重规划", { description: message });
    },
  });

  const importEvents = useMutation({
    mutationFn: async () => {
      const occurred = new Date().toISOString();
      return hccApi.importClinicalEvents({
        source_system: "SYNTHETIC-DEMO",
        idempotency_key: `financing-demo-${Date.now()}`,
        events: [
          {
            patient_id: importPatientId.trim(),
            event_type: "ObservationImported",
            occurred_at: occurred,
            recorded_at: occurred,
            source_system: "SYNTHETIC-DEMO",
            payload: {
              note: "融资演示：合成观测导入触发重评",
              clinical_use: false,
              hint: importInstanceHint || undefined,
            },
          },
        ],
      });
    },
    onSuccess: (result) => {
      toast.success("事件已导入", {
        description: `imported=${result.imported} · duplicates=${result.duplicates} · 若存在 ACTIVE 实例将生成重评`,
      });
      setImportOpen(false);
      invalidate();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : "导入失败";
      toast.error("事件导入失败", { description: message });
    },
  });

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <PageHeader module="M07 · 事件重评" title="重评队列" actions={<SyntheticTag />} />
        <EmptyState icon={<Activity className="size-4" />} title="需要后端登录" description="请先以临床角色登录 Server 模式。" />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        module="M07 · 事件重评"
        title="重评队列"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="数据源" value="GET /reassessments" mono />
            <PageMeta label="待处理" value={`${openCount}`} mono />
          </>
        }
        actions={
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Sparkles className="size-3.5" />
              导入合成事件
            </Button>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={cn("size-3.5", query.isFetching && "animate-spin")} />
              刷新
            </Button>
          </div>
        }
      />

      <Callout tone="info" title="融资讲稿高潮" className="mb-4">
        临床事件导入 → 自动生成 OPEN 重评 → 生成 DRAFT 重规划（原 ACTIVE 不变）→ 医生审核激活。系统不自动改治疗方案。
      </Callout>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="待处理" value={String(openCount)} unit="件" tone="risk" />
        <StatCard label="全部" value={String(items.length)} unit="件" tone="info" />
        <StatCard
          label="已出草案"
          value={String(items.filter((i) => i.plan_id).length)}
          unit="件"
          tone="ok"
        />
      </div>

      <div className="mb-3 flex gap-2">
        <FilterPill active={statusFilter === "OPEN"} onClick={() => setStatusFilter("OPEN")}>
          仅 OPEN
        </FilterPill>
        <FilterPill active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
          全部
        </FilterPill>
      </div>

      {query.isError ? (
        <EmptyState
          title="无法读取重评队列"
          description={query.error instanceof ApiError ? `${query.error.code} · ${query.error.message}` : "请使用临床角色"}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Activity className="size-4" />}
          title="暂无重评事项"
          description="可先确保患者有 ACTIVE 实例，再点击「导入合成事件」。"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>创建时间</TableHead>
                <TableHead>患者</TableHead>
                <TableHead>触发</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item.reassessment_id}>
                  <TableCell className="whitespace-nowrap font-mono text-[10.5px]">{fmtDate(item.created_at, true)}</TableCell>
                  <TableCell>
                    <Link className="text-[12px] text-primary hover:underline" to={`/patients/${item.patient_id}`}>
                      {item.patient_id}
                    </Link>
                    <div className="font-mono text-[9.5px] text-muted-foreground">{item.instance_id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[10.5px]">{item.trigger_type}</TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-[11px] text-muted-foreground">{item.reason}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.status === "OPEN" && (
                        <>
                          <Button size="sm" variant="outline" disabled={replan.isPending} onClick={() => replan.mutate(item.reassessment_id)}>
                            生成重规划
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDismissId(item.reassessment_id);
                              setDismissReason("");
                            }}
                          >
                            忽略
                          </Button>
                        </>
                      )}
                      {item.plan_id && (
                        <Link className="text-[11px] text-primary hover:underline" to={`/planning/${item.instance_id}`}>
                          查看计划
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(dismissId)} onOpenChange={(open) => !open && setDismissId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>忽略重评</DialogTitle>
            <DialogDescription>忽略不会修改 ACTIVE 计划，仅关闭本条重评事项。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dismiss-reason">原因</Label>
            <Textarea id="dismiss-reason" value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissId(null)}>
              取消
            </Button>
            <Button disabled={dismiss.isPending} onClick={() => dismiss.mutate()}>
              确认忽略
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入合成临床事件</DialogTitle>
            <DialogDescription>
              调用 POST /clinical-events/import。仅用于演示触发重评，clinical_use=false。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="import-patient">患者 ID</Label>
            <input
              id="import-patient"
              className="flex h-8 w-full rounded-md border border-line bg-background px-2 text-[12px]"
              value={importPatientId}
              onChange={(e) => setImportPatientId(e.target.value)}
            />
            <Label htmlFor="import-hint">备注（可选）</Label>
            <input
              id="import-hint"
              className="flex h-8 w-full rounded-md border border-line bg-background px-2 text-[12px]"
              value={importInstanceHint}
              onChange={(e) => setImportInstanceHint(e.target.value)}
              placeholder="融资演示备注"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button disabled={importEvents.isPending} onClick={() => importEvents.mutate()}>
              导入并触发重评
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
