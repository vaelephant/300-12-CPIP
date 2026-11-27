import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileClock, RefreshCw, ShieldAlert } from "lucide-react";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { cn, fmtDate } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { SearchInput, Toolbar } from "@/components/app/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RESULT_TONE: Record<string, "ok" | "risk" | "warn" | "neutral"> = {
  SUCCESS: "ok",
  DENIED: "risk",
  FAILED: "warn",
};

const PAGE_SIZE = 20;

export default function ServerAuditPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ["backend", "audit-events", page],
    queryFn: () => hccApi.listAuditEvents({ page, pageSize: PAGE_SIZE }),
    enabled: hccApi.hasToken(),
    retry: 0,
  });

  const items = auditQuery.data?.items ?? [];
  const total = auditQuery.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (result !== "ALL" && item.result !== result) return false;
      if (!q) return true;
      const hay = `${item.actor_id} ${item.actor_role} ${item.action} ${item.object_type} ${item.object_id} ${item.detail ?? ""} ${item.event_id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, result]);

  const denied = items.filter((i) => i.result === "DENIED").length;

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <PageHeader module="M12 · 系统审计" title="审计日志" actions={<SyntheticTag />} />
        <EmptyState icon={<FileClock className="size-4" />} title="需要后端登录" description="Server 模式从 GET /audit-events 读取。" />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        module="M12 · 系统审计"
        title="审计日志"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="数据源" value="GET /audit-events" mono />
            <PageMeta label="总数" value={`${total}`} mono />
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void auditQuery.refetch()} disabled={auditQuery.isFetching}>
            <RefreshCw className={cn("size-3.5", auditQuery.isFetching && "animate-spin")} />
            刷新
          </Button>
        }
      />

      <Callout tone="info" title="服务端审计" className="mb-4">
        仅管理员与医务处可查看。不记录明文密码或令牌；被拒绝请求同样留痕。备份操作请使用服务端 make backup，本页不再模拟写入。
      </Callout>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="本页事件" value={String(items.length)} unit="条" tone="info" />
        <StatCard label="本页拒绝" value={String(denied)} unit="条" tone="risk" />
        <StatCard label="服务端总数" value={String(total)} unit="条" tone="neutral" />
      </div>

      <Card className="mb-3 gap-0 py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="w-[280px]">
            <SearchInput
              value={query}
              onChange={(v) => setQuery(v)}
              placeholder="搜索操作人 / 动作 / 对象 / 详情"
            />
          </div>
          <Toolbar>
            <Select
              value={result}
              onValueChange={(v) => setResult(v)}
            >
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue placeholder="结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部结果</SelectItem>
                <SelectItem value="SUCCESS">成功</SelectItem>
                <SelectItem value="DENIED">已拒绝</SelectItem>
                <SelectItem value="FAILED">失败</SelectItem>
              </SelectContent>
            </Select>
          </Toolbar>
        </CardContent>
      </Card>

      {auditQuery.isError ? (
        <EmptyState
          icon={<ShieldAlert className="size-4" />}
          title="无法读取审计事件"
          description={
            auditQuery.error instanceof ApiError
              ? `${auditQuery.error.code} · ${auditQuery.error.message}`
              : "请使用管理员或医务处账号"
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>对象</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.event_id}>
                    <TableCell className="whitespace-nowrap font-mono text-[10.5px]">{fmtDate(item.occurred_at, true)}</TableCell>
                    <TableCell>
                      <div className="text-[11.5px]">{item.actor_id}</div>
                      <div className="font-mono text-[9.5px] text-muted-foreground">{item.actor_role}</div>
                    </TableCell>
                    <TableCell className="font-mono text-[10.5px]">{item.action}</TableCell>
                    <TableCell>
                      <div className="text-[11px]">{item.object_type}</div>
                      <div className="font-mono text-[9.5px] text-muted-foreground">{item.object_id}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={RESULT_TONE[item.result] ?? "neutral"}>{item.result}</StatusBadge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-[11px] text-muted-foreground">
                      {item.detail ?? "—"}
                      {item.ip_masked ? ` · ${item.ip_masked}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-[12px] text-muted-foreground">
                      无匹配审计事件
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              第 {page} / {pageCount} 页
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-3.5" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                下一页
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
