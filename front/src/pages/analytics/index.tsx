import { IS_SERVER_MODE } from "@/lib/data-mode";
import ServerAnalyticsPage from "./index-server";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  ChevronDown,
  Download,
  Info,
  TriangleAlert,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Sparkline } from "@/components/app/sparkline";
import { CHART_COLOR, CHART_COLORS, HBarChart, TrendChart, VBarChart } from "@/components/charts/chart-kit";
import { GaugeRing, HeatmapGrid, QualityRadar, StackedAreaTrend } from "@/components/charts/advanced";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  KPIS,
  TREND_SERIES,
  LOS_SERIES,
  DEPARTMENT_METRICS,
  PATHWAY_RANKING,
  VARIATION_BY_TYPE,
  ENROLLMENT_FUNNEL,
  TASK_WORKLOAD,
  LOS_BUCKETS,
  ANALYTICS_PERIODS,
  LAST_SYNC,
} from "@/data";
import {
  DEPT_RADAR,
  DEPT_RADAR_SERIES,
  OVERDUE_HEATMAP,
  VARIATION_TREND,
  VARIATION_TREND_SERIES,
} from "@/data/visuals";
import { useUiStore } from "@/stores/ui-store";
import type { Kpi } from "@/types";
import { cn, fmt, fmtDate, fmtTime, pct } from "@/lib/utils";

/* ===========================================================================
 * M10 · 质量与运营分析
 * 指标；分母为 0 时返回「不可计算」，不得显示为 0%。
 * ========================================================================= */

const TREND_SERIES_DEF = [
  { key: "enrollment", label: "入径率", color: CHART_COLOR["chart-1"] },
  { key: "completion", label: "完成率", color: CHART_COLOR["chart-2"] },
  { key: "variation", label: "变异率", color: CHART_COLOR["chart-5"] },
];

const LOS_SERIES_DEF = [
  { key: "eras", label: "ERAS 路径", color: CHART_COLOR["chart-1"] },
  { key: "standard", label: "院内标准", color: CHART_COLOR["chart-2"] },
  { key: "national", label: "国家基线", color: CHART_COLOR["chart-4"], dashed: true },
];

const VARIATION_CHART_COLORS = [
  CHART_COLORS[2],
  CHART_COLORS[1],
  CHART_COLORS[0],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[4],
  CHART_COLORS[3],
];

function DefRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[10.5px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[11px] leading-snug text-foreground/80">{value ?? "—"}</dd>
    </div>
  );
}

/* ------------------------------ 单个 KPI ------------------------------ */

function KpiTile({ kpi }: { kpi: Kpi }) {
  const unavailable = kpi.unavailable ?? false;
  return (
    <StatCard
      label={kpi.label}
      value={kpi.value}
      unit={kpi.unit}
      delta={kpi.delta}
      deltaLabel={kpi.deltaLabel}
      trend={kpi.trend}
      hint={kpi.hint}
      tone={unavailable ? "risk" : "ok"}
      className={unavailable ? "border-warn/45 bg-warn-wash/40" : undefined}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-[3px] text-[10px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30">
                <Info className="size-3" />
                口径
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[300px]">
              <p className="label-micro">指标口径 · {kpi.label}</p>
              <dl className="mt-1.5 space-y-1.5">
                <DefRow label="分子" value={kpi.numerator} />
                <DefRow label="分母" value={kpi.denominator} />
                <DefRow label="统计周期" value={kpi.period} />
                <DefRow label="排除条件" value={kpi.exclusions} />
                <DefRow label="数据来源" value={kpi.source} />
              </dl>
              {unavailable && (
                <p className="mt-2 rounded-[3px] border border-warn/25 bg-warn-wash/50 px-1.5 py-1 text-[10px] leading-relaxed text-warn">
                  分母为 0，返回「不可计算」，不显示为 0%。
                </p>
              )}
            </PopoverContent>
          </Popover>
          {unavailable ? (
            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] text-warn">
              <TriangleAlert className="size-3" />
              分母 = 0
            </span>
          ) : (
            <span className="font-mono text-[9.5px] text-muted-foreground">{kpi.period}</span>
          )}
        </div>
      }
    />
  );
}

/* ------------------------------ 入径漏斗 ------------------------------ */

function EnrollmentFunnel() {
  const max = ENROLLMENT_FUNNEL[0]?.count ?? 0;
  return (
    <div>
      <div className="space-y-2.5">
        {ENROLLMENT_FUNNEL.map((stage, i) => {
          const prev = i === 0 ? null : ENROLLMENT_FUNNEL[i - 1].count;
          const overall = pct(stage.count, max);
          return (
            <div key={stage.stage}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11.5px] text-foreground/80">{stage.stage}</span>
                <span className="tabular font-mono text-[11.5px] text-foreground">{fmt(stage.count)}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(3, (stage.count / max) * 100)}%`, opacity: 1 - i * 0.16 }}
                />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 text-[10px] text-muted-foreground">
                <span className="truncate">{stage.note}</span>
                <span className="shrink-0 font-mono">
                  {prev === null ? `占筛查 ${overall}` : `环节转化 ${pct(stage.count, prev)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[10px] text-muted-foreground">
        <span>整体转化率（筛查 → 完成）</span>
        <span className="font-mono text-foreground/80">
          {pct(ENROLLMENT_FUNNEL[3]?.count ?? 0, max)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ 肝癌路径排名 ------------------------------ */

type RankKey = "instances" | "completion" | "variation" | "los" | "cost";

const RANK_COLUMNS: { key: RankKey; label: string; unit?: string }[] = [
  { key: "instances", label: "在径例数" },
  { key: "completion", label: "完成率", unit: "%" },
  { key: "variation", label: "变异率", unit: "%" },
  { key: "los", label: "平均住院日", unit: " 天" },
  { key: "cost", label: "次均费用" },
];

function DemoAnalyticsPage() {
  const period = useUiStore((s) => s.period);
  const setPeriod = useUiStore((s) => s.setPeriod);

  const [defOpen, setDefOpen] = useState(false);
  const [sort, setSort] = useState<{ key: RankKey; dir: "asc" | "desc" }>({ key: "completion", dir: "desc" });

  const sortedRanking = useMemo(() => {
    return [...PATHWAY_RANKING].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [sort]);

  const variationChart = useMemo(
    () =>
      VARIATION_BY_TYPE.map((item, i) => ({
        label: item.label.replace("变异", ""),
        value: item.count,
        display: `${item.count} · ${item.pct}%`,
        color: VARIATION_CHART_COLORS[i] ?? CHART_COLOR["chart-1"],
      })),
    [],
  );

  const losChart = useMemo(
    () => LOS_BUCKETS.map((bucket) => ({ label: bucket.bucket, value: bucket.count })),
    [],
  );

  /** 变异类型趋势的聚合解读（由 VARIATION_TREND 计算，非重复 KPI） */
  const variationTrendStats = useMemo(() => {
    const weeklyTotals = VARIATION_TREND.map((point) =>
      Object.values(point.values).reduce((acc, v) => acc + v, 0),
    );
    const total = weeklyTotals.reduce((acc, v) => acc + v, 0);
    const sumOf = (key: "safety" | "data") => VARIATION_TREND.reduce((acc, p) => acc + p.values[key], 0);
    return {
      lastWeek: weeklyTotals[weeklyTotals.length - 1] ?? 0,
      weeklyAvg: weeklyTotals.length ? total / weeklyTotals.length : 0,
      safety: sumOf("safety"),
      data: sumOf("data"),
      total,
    };
  }, []);

  const maxTasks = Math.max(...TASK_WORKLOAD.map((w) => w.tasks));

  function handleExport() {
    toast.success("报表导出已创建", {
      description: "脱敏 CSV / PDF 将生成；导出行为以 ANALYTICS_EXPORT 写入审计日志，导出内容不含患者身份信息。",
    });
  }

  function toggleSort(key: RankKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  }

  return (
    <Page wide>
      <PageHeader
        module="M10 · 质量与运营分析"
        title="质量与运营分析"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="统计周期" value={`${period}`} />
            <PageMeta label="最近同步" value={fmtDate(LAST_SYNC, true)} mono />
            <PageMeta label="指标数" value={`${KPIS.length} 项`} />
          </>
        }
        actions={
          <>
            <Select
              value={period}
              onValueChange={(v) => {
                setPeriod(v);
                toast("统计周期已切换", { description: `当前周期：${v}` });
              }}
            >
              <SelectTrigger size="sm" className="w-[116px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYTICS_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setDefOpen(true)}>
              <BookOpenCheck className="size-3.5" />
              指标口径说明
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              导出报表
            </Button>
          </>
        }
      />

      {/* ------------------------------- KPI ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Info className="size-3" />
          口径规则：分母为零返回「不可计算」，不得显示为 0%；缺失数据不推定、不插补。
        </span>
        <button className="text-primary hover:underline" onClick={() => setDefOpen(true)}>
          查看全部指标口径
        </button>
      </div>


      {/* --------------- 治疗组质量画像 / 任务超时分布 / 完成率仪表 --------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="flex flex-col gap-0 py-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="路径完成率" description="口径与 KPI 一致" />
            <StatusBadge tone="ok">达标</StatusBadge>
          </div>
          <CardContent className="flex flex-1 flex-col items-center justify-center px-4 py-4">
            <GaugeRing
              value={91.3}
              label="完成率"
              sublabel="189 / 207 例已结束路径正常完成"
              tone="ok"
              size={136}
            />
            <div className="mt-3 w-full rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
              目标 ≥ 90%；分母为已结束路径，排除已取消入径实例。
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="治疗组质量画像" description="六维质量评分" />
            <span className="font-mono text-[10px] text-muted-foreground">0–100</span>
          </div>
          <CardContent className="px-4 py-3">
            <QualityRadar data={DEPT_RADAR} series={DEPT_RADAR_SERIES} height={222} />
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              维度为治疗组聚合评分，用于横向比较；非患者级指标。
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="任务超时分布" description="治疗组 × 计划时段（近 30 天）" />
            <StatusBadge tone="warn">共 46 项</StatusBadge>
          </div>
          <CardContent className="px-4 py-3">
            <HeatmapGrid
              rows={OVERDUE_HEATMAP.rows}
              cols={OVERDUE_HEATMAP.cols}
              values={OVERDUE_HEATMAP.values}
              tone="warn"
              unit="项"
              rowWidth={104}
              footnote="格子越深表示超时任务越多"
            />
            <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-muted-foreground">
              超时仅标记提示，不改变任务执行状态；16–18 时段为全院超时高峰，建议核对交班与排期。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------ 图表行 ------------------------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="gap-0 py-0 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="入径 / 完成 / 变异趋势" description={`${period} · 周度`} />
            <span className="font-mono text-[10px] text-muted-foreground">12 周</span>
          </div>
          <CardContent className="px-4 py-3">
            <TrendChart data={TREND_SERIES} series={TREND_SERIES_DEF} height={200} unit="%" />
                      </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="患者入径漏斗" description="近 30 天" />
            <span className="font-mono text-[10px] text-muted-foreground">524 → 189</span>
          </div>
          <CardContent className="px-4 py-3">
            <EnrollmentFunnel />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="住院日趋势" description="院内标准 vs ERAS vs 国家基线" />
            <span className="font-mono text-[10px] text-muted-foreground">天</span>
          </div>
          <CardContent className="px-4 py-3">
            <TrendChart data={LOS_SERIES} series={LOS_SERIES_DEF} height={200} unit="天" digits={1} />
                      </CardContent>
        </Card>
      </div>

      {/* ------------------------------ 表格行 1 ------------------------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="gap-0 py-0 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="病区 / 治疗组运营指标" count={DEPARTMENT_METRICS.length} description="完成率与环比" />
            <span className="font-mono text-[10px] text-muted-foreground">按完成率</span>
          </div>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">病区 / 治疗组</TableHead>
                  <TableHead>完成率</TableHead>
                  <TableHead>趋势</TableHead>
                  <TableHead>环比</TableHead>
                  <TableHead className="pr-4">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEPARTMENT_METRICS.map((row) => {
                  const unavailable = row.value === "不可计算";
                  return (
                    <TableRow key={row.key} className={cn(unavailable && "bg-warn-wash/30")}>
                      <TableCell className="pl-4">
                        <p className="text-[12px] font-medium">{row.name}</p>
                        <p className="text-[10px] text-muted-foreground">{row.sub}</p>
                      </TableCell>
                      <TableCell>
                        {unavailable ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-warn">
                            <TriangleAlert className="size-3" />
                            不可计算
                          </span>
                        ) : (
                          <span className="tabular font-mono text-[12px]">{row.value}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.trend && row.trend.length > 1 ? (
                          <Sparkline
                            values={row.trend}
                            width={62}
                            height={22}
                            tone={row.status === "warn" ? "risk" : "ok"}
                          />
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.delta === undefined ? (
                          <span className="font-mono text-[10.5px] text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 font-mono text-[10.5px]",
                              row.delta >= 0 ? "text-ok" : "text-risk",
                            )}
                          >
                            {row.delta >= 0 ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
                            {Math.abs(row.delta).toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        {unavailable ? (
                          <StatusBadge tone="warn">无入径</StatusBadge>
                        ) : row.status === "ok" ? (
                          <StatusBadge tone="ok">达标</StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">关注</StatusBadge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t border-line px-4 py-2 text-[10px] text-muted-foreground">
              罕见亚型队列本周期无入径患者，分母为 0 → 显示「不可计算」而非 0%。
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="肝癌路径排名" count={PATHWAY_RANKING.length} description="点击表头可排序" />
            <span className="font-mono text-[10px] text-muted-foreground">
              排序：{RANK_COLUMNS.find((c) => c.key === sort.key)?.label} {sort.dir === "desc" ? "降序" : "升序"}
            </span>
          </div>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">#</TableHead>
                  <TableHead>路径名称</TableHead>
                  {RANK_COLUMNS.map((col) => (
                    <TableHead key={col.key}>
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 whitespace-nowrap outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        {col.label}
                        {sort.key === col.key ? (
                          sort.dir === "desc" ? (
                            <ChevronDown className="size-3 text-primary" />
                          ) : (
                            <ArrowUp className="size-3 text-primary" />
                          )
                        ) : (
                          <ChevronDown className="size-3 opacity-25" />
                        )}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRanking.map((row, i) => (
                  <TableRow key={row.name}>
                    <TableCell className="pl-4 font-mono text-[10.5px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <p className="text-[12px] font-medium">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground">{row.dept}</p>
                    </TableCell>
                    <TableCell className="tabular font-mono text-[11.5px]">{row.instances}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="tabular font-mono text-[11.5px]">{row.completion}%</span>
                        <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-secondary xl:block">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, row.completion)}%` }}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular font-mono text-[11.5px] text-warn">{row.variation}%</TableCell>
                    <TableCell className="tabular font-mono text-[11.5px]">{row.los} 天</TableCell>
                    <TableCell className="tabular pr-4 font-mono text-[11.5px]">
                      ¥{fmt(row.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-line px-4 py-2 text-[10px] text-muted-foreground">
              排名依据完成率排序；费用不含医保结算口径。
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------ 表格行 2 ------------------------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="gap-0 py-0 lg:col-span-4">
          <div className="border-b border-line px-4 py-3">
            <SectionHead title="变异类型构成" description="近 30 天变异分布" />
          </div>
          <CardContent className="px-4 py-3">
            <HBarChart data={variationChart} height={196} labelWidth={64} rightPad={64} />
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2 text-[10px] text-muted-foreground">
              <span>临床 + 时间变异占比</span>
              <span className="font-mono">65.0%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="任务工作量" description="按角色 · 近 30 天" />
            <StatusBadge tone="warn">18 项超时</StatusBadge>
          </div>
          <CardContent className="px-4 py-3">
            <ul className="space-y-2.5">
              {TASK_WORKLOAD.map((row) => (
                <li key={row.role}>
                  <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                    <span className="text-foreground/80">{row.role}</span>
                    <span className="tabular font-mono text-[11px] text-foreground">
                      {row.tasks} 项
                      <span className="ml-1.5 text-[10px] text-muted-foreground">均 {row.avgHours}h</span>
                    </span>
                  </div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="h-full bg-primary/80"
                      style={{ width: `${((row.tasks - row.overdue) / maxTasks) * 100}%` }}
                    />
                    <span className="h-full bg-risk" style={{ width: `${(row.overdue / maxTasks) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-primary/80" />
                      已完成 / 在办
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-risk" />
                        超时
                      </span>
                    </span>
                    <span className={cn("font-mono", row.overdue > 0 && "text-risk")}>{row.overdue} 项超时</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-muted-foreground">
              超时任务仅标记提示，不改变任务执行状态；取消需人工确认。
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="住院日分布" description="近 30 天出院患者" />
            <span className="font-mono text-[10px] text-muted-foreground">n = 276</span>
          </div>
          <CardContent className="px-4 py-3">
            <VBarChart data={losChart} height={196} unit="" />
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2 text-[10px] text-muted-foreground">
              <span>中位住院日</span>
              <span className="font-mono text-foreground/80">6 天</span>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* --------------------- 变异类型趋势与解读 --------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="gap-0 py-0 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="变异类型趋势" description="近 12 周新增变异（按类型堆叠）" />
            <span className="font-mono text-[10px] text-muted-foreground">单位：例</span>
          </div>
          <CardContent className="px-4 py-3">
            <StackedAreaTrend data={VARIATION_TREND} series={VARIATION_TREND_SERIES} height={214} unit="例" />
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              堆叠高度为每周新增变异例数；安全变异以红色单独标记，任何上升均需人工复核，不得由系统自动处置。
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-4">
          <div className="border-b border-line px-4 py-3">
            <SectionHead title="变异趋势解读" description="基于 12 周序列聚合" />
          </div>
          <CardContent className="px-4 py-2.5">
            <div className="divide-y divide-line">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11.5px] text-muted-foreground">本周新增变异</span>
                <span className="tabular font-mono text-[12px] text-foreground">{variationTrendStats.lastWeek} 例</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11.5px] text-muted-foreground">周均新增</span>
                <span className="tabular font-mono text-[12px] text-foreground">
                  {variationTrendStats.weeklyAvg.toFixed(1)} 例
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-risk" />
                  安全变异（12 周）
                </span>
                <span className="tabular font-mono text-[12px] text-risk">{variationTrendStats.safety} 例</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-info" />
                  数据变异（12 周）
                </span>
                <span className="tabular font-mono text-[12px] text-foreground">{variationTrendStats.data} 例</span>
              </div>
            </div>
            <Callout tone="warn" title="安全变异处理边界" className="mt-2.5">
              安全变异不参与自动重规划；须医生确认并发布新计划版本后方可继续执行。
            </Callout>
          </CardContent>
        </Card>
      </div>

      <Callout tone="neutral" title="数据说明与合规边界" className="mt-4">
        本页指标，不得用于等级评审、绩效考核或对外披露。指标口径遵循「分母为零返回不可计算」原则；
        患者级数据导出需单独授权，导出行为全量记入审计日志（M12）。
      </Callout>

      {/* ============================ 指标口径说明 ============================ */}
      <Dialog open={defOpen} onOpenChange={setDefOpen}>
        <DialogContent className="max-w-[880px] gap-0 p-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpenCheck className="size-4 text-primary" />
              指标口径说明
            </DialogTitle>
            <DialogDescription>
              所有指标统一定义分子、分母、统计周期、排除条件与数据来源；分母为零时返回「不可计算」。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto scrollbar-slim px-5 py-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[110px]">指标</TableHead>
                  <TableHead>分子</TableHead>
                  <TableHead>分母</TableHead>
                  <TableHead className="w-[72px]">统计周期</TableHead>
                  <TableHead>排除条件</TableHead>
                  <TableHead className="w-[110px]">数据来源</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {KPIS.map((kpi) => (
                  <TableRow key={kpi.key} className={cn(kpi.unavailable && "bg-warn-wash/30")}>
                    <TableCell>
                      <p className="text-[12px] font-medium">{kpi.label}</p>
                      <p className="font-mono text-[9.5px] text-muted-foreground">{kpi.key}</p>
                    </TableCell>
                    <TableCell className="text-[11px] text-foreground/80">{kpi.numerator}</TableCell>
                    <TableCell className="text-[11px] text-foreground/80">
                      {kpi.denominator}
                      {kpi.unavailable && (
                        <span className="ml-1 rounded-[3px] bg-warn-wash px-1 font-mono text-[9px] text-warn">= 0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[10.5px] text-muted-foreground">{kpi.period}</TableCell>
                    <TableCell className="text-[11px] text-foreground/70">{kpi.exclusions}</TableCell>
                    <TableCell className="text-[10.5px] text-muted-foreground">{kpi.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Callout tone="warn" title="零分母与缺失值规则" className="mt-3">
              <span className="font-mono">分母为零返回不可计算；不得显示为 0%</span>。缺失数据按「未知」呈现，不推定、
              不插补、不以 0 代替；UNKNOWN 与 FALSE 严格区分。
            </Callout>
          </div>
          <DialogFooter>
            <span className="mr-auto font-mono text-[10px] text-muted-foreground">
              最近同步 {fmtTime(LAST_SYNC)}
            </span>
            <Button variant="outline" size="sm" onClick={() => setDefOpen(false)}>
              关闭
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              导出说明
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}


export default function AnalyticsPage() {
  if (IS_SERVER_MODE) return <ServerAnalyticsPage />;
  return <DemoAnalyticsPage />;
}
