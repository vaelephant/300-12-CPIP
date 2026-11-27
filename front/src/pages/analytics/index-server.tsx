import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ServerAnalyticsPage() {
  const [period, setPeriod] = useState("last_30_days");
  const summaryQuery = useQuery({
    queryKey: ["backend", "analytics", period],
    queryFn: () => hccApi.analyticsSummary(period),
    enabled: hccApi.hasToken(),
    retry: 0,
  });
  const metrics = summaryQuery.data?.metrics ?? [];

  return (
    <Page>
      <PageHeader
        module="M14 · 运营分析 · 后端聚合"
        title="质量与运营指标"
        actions={
          <div className="flex items-center gap-2">
            <SyntheticTag />
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-8 rounded-[4px] border border-line bg-background px-2 text-[11px]">
              <option value="last_30_days">近 30 天</option>
              <option value="last_90_days">近 90 天</option>
              <option value="all">全部</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => void summaryQuery.refetch()} disabled={summaryQuery.isFetching}>
              <RefreshCw className={`size-3.5 ${summaryQuery.isFetching ? "animate-spin" : ""}`} /> 刷新
            </Button>
          </div>
        }
        meta={
          <>
            <PageMeta label="数据源" value="FastAPI · SQLite" />
            <PageMeta label="周期" value={period} mono />
            <PageMeta label="生成时间" value={summaryQuery.data ? new Date(summaryQuery.data.generated_at).toLocaleString("zh-CN") : "—"} />
          </>
        }
      />
      {summaryQuery.isLoading ? <p className="py-16 text-center text-[11px] text-muted-foreground">读取服务端聚合指标…</p> : null}
      {summaryQuery.isError ? (
        <EmptyState
          icon={<AlertTriangle />}
          title={summaryQuery.error instanceof ApiError && summaryQuery.error.status === 403 ? "当前角色无权查看聚合指标" : "无法读取聚合指标"}
        />
      ) : null}
      {metrics.length > 0 ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.key} className="px-4 py-3">
                <p className="label-micro">{metric.label}</p>
                <p className="mt-1 font-mono text-[24px] leading-none">{metric.value}</p>
                <p className="mt-1.5 text-[9px] text-muted-foreground">{metric.definition}</p>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <SectionHead title="指标定义与分母" description={summaryQuery.data?.note} />
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>指标</TableHead><TableHead>数值</TableHead><TableHead>分子/分母</TableHead><TableHead>周期</TableHead><TableHead>定义</TableHead></TableRow></TableHeader>
                <TableBody>
                  {metrics.map((metric) => (
                    <TableRow key={metric.key}>
                      <TableCell className="font-mono text-[9.5px]">{metric.key}</TableCell>
                      <TableCell className="font-mono text-[11px]">{metric.value}</TableCell>
                      <TableCell className="font-mono text-[9.5px]">{metric.numerator} / {metric.denominator}</TableCell>
                      <TableCell className="text-[9.5px]">{metric.period}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{metric.definition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Page>
  );
}
