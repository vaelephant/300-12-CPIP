// ---------------------------------------------------------------------------
// CPIP · 高级临床可视化组件
// Sankey 流转 / 环形构成 / 质量雷达 / 堆叠趋势 / 热力图 / 任务甘特 /
// 不确定性扇形图 / 环形仪表 / 成本-效果散点 / 分组柱图
// 规范：细描边、发丝网格、CSS 变量取色、等宽数字、无装饰性动效。
// ---------------------------------------------------------------------------
import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Sankey,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { SankeyNodeProps } from "recharts";
import { cn } from "@/lib/utils";
import { ChartBox, ChartTooltip, ChartTooltipCard } from "./chart-kit";

/* ===========================================================================
 * 1. 环形构成图
 * ========================================================================= */

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  height?: number;
  centerLabel?: string;
  centerValue?: ReactNode;
  unit?: string;
  showLegend?: boolean;
  className?: string;
  footnote?: ReactNode;
}

export function DonutChart({
  data,
  height = 168,
  centerLabel,
  centerValue,
  unit = "例",
  showLegend = true,
  className,
  footnote,
}: DonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color ?? "var(--chart-1)"} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9.5px] text-muted-foreground">{centerLabel ?? "合计"}</span>
          <span className="tabular text-[20px] leading-tight font-semibold tracking-tight">
            {centerValue ?? total}
            <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>
          </span>
        </div>
      </div>
      {showLegend && (
        <div className="min-w-0 flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-[11.5px]">
              <span className="size-2 shrink-0 rounded-[2px]" style={{ background: d.color ?? "var(--chart-1)" }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.name}</span>
              <span className="tabular font-mono text-[11px] text-foreground/85">{d.value}</span>
              <span className="tabular w-9 text-right font-mono text-[9.5px] text-muted-foreground/70">
                {total ? `${Math.round((d.value / total) * 100)}%` : "—"}
              </span>
            </div>
          ))}
          {footnote && <p className="pt-1 text-[9.5px] leading-relaxed text-muted-foreground/70">{footnote}</p>}
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
 * 2. 患者路径流转 Sankey
 * ========================================================================= */

const SANKEY_COLOR: Record<string, string> = {
  筛查患者: "#aeb4bc",
  符合准入: "var(--chart-4)",
  未入径: "#c7c9c4",
  待补充资料: "var(--warn)",
  入径确认: "var(--chart-1)",
  术前评估: "var(--chart-2)",
  术前检查: "var(--chart-4)",
  治疗方案确认: "var(--chart-3)",
  手术及术后: "var(--chart-1)",
  变异调整: "var(--warn)",
  出院随访: "#5c7a94",
  正常完成: "var(--ok)",
  路径退出: "var(--risk)",
};

function sankeyColor(name: string) {
  return SANKEY_COLOR[name] ?? "var(--chart-1)";
}

interface SankeyFlowProps {
  data: { nodes: { name: string }[]; links: { source: number; target: number; value: number }[] };
  height?: number;
  className?: string;
}

export function SankeyFlow({ data, height = 300, className }: SankeyFlowProps) {
  const maxDepth = useMemo(() => {
    const depth = new Map<number, number>();
    data.nodes.forEach((_, i) => depth.set(i, 0));
    for (let pass = 0; pass < data.nodes.length; pass++) {
      let changed = false;
      for (const link of data.links) {
        const next = (depth.get(link.source) ?? 0) + 1;
        if (next > (depth.get(link.target) ?? 0)) {
          depth.set(link.target, next);
          changed = true;
        }
      }
      if (!changed) break;
    }
    return Math.max(...Array.from(depth.values()), 1);
  }, [data]);

  const renderNode = (props: SankeyNodeProps) => {
    const { x, y, width, height: h, payload } = props;
    const name = String((payload as { name?: string }).name ?? "");
    const value = (payload as { value?: number }).value ?? 0;
    const depth = (payload as { depth?: number }).depth ?? 0;
    const color = sankeyColor(name);
    const labelLeft = depth > Math.ceil(maxDepth / 2);
    const showValue = h >= 20;
    return (
      <g>
        <title>{`${name} · ${value} 例`}</title>
        <rect x={x} y={y} width={width} height={h} rx={2} fill={color} fillOpacity={0.85} />
        <text
          x={labelLeft ? x - 7 : x + width + 7}
          y={y + h / 2 + (showValue ? -3.5 : 3)}
          textAnchor={labelLeft ? "end" : "start"}
          fontSize={10.5}
          fill="var(--foreground)"
        >
          {name}
        </text>
        {showValue && (
          <text
            x={labelLeft ? x - 7 : x + width + 7}
            y={y + h / 2 + 8}
            textAnchor={labelLeft ? "end" : "start"}
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill="var(--muted-foreground)"
          >
            {value} 例
          </text>
        )}
      </g>
    );
  };

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodeWidth={9}
          nodePadding={16}
          linkCurvature={0.5}
          iterations={48}
          node={renderNode}
          link={{ stroke: "var(--line-strong)", strokeOpacity: 0.32 }}
          margin={{ top: 8, right: 96, bottom: 8, left: 4 }}
        />
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-line-strong" /> 流转例数（近 30 天，合成）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-ok" /> 正常完成
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-risk" /> 退出 / 未完成
        </span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">524 例筛查 → 189 例完成</span>
      </div>
    </div>
  );
}

/* ===========================================================================
 * 3. 质量雷达图
 * ========================================================================= */

export interface RadarSeries {
  key: string;
  label: string;
  color: string;
}

function RadarLegend({ series }: { series: RadarSeries[] }) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="size-1.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

interface QualityRadarProps {
  data: Record<string, number | string>[];
  series: RadarSeries[];
  height?: number;
  domain?: [number, number];
  className?: string;
}

export function QualityRadar({ data, series, height = 236, domain = [60, 100], className }: QualityRadarProps) {
  return (
    <div className={className}>
      <ChartBox height={height}>
        <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 20, bottom: 4, left: 20 }}>
          <PolarGrid stroke="var(--line)" strokeDasharray="2 3" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <PolarRadiusAxis
            angle={90}
            domain={domain}
            tickCount={4}
            axisLine={false}
            tick={{ fontSize: 8.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          {series.map((s) => (
            <Radar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.5}
              fill={s.color}
              fillOpacity={0.08}
              isAnimationActive={false}
            />
          ))}
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <ChartTooltipCard
                  title={String(label ?? "")}
                  rows={payload.map((p) => ({
                    name: String(p.name ?? ""),
                    value: `${p.value} 分`,
                    color: typeof p.color === "string" ? p.color : undefined,
                  }))}
                />
              ) : null
            }
          />
        </RadarChart>
      </ChartBox>
      <RadarLegend series={series} />
    </div>
  );
}

/* ===========================================================================
 * 4. 堆叠面积趋势（变异类型等）
 * ========================================================================= */

export interface StackedSeries {
  key: string;
  label: string;
  color: string;
}

interface StackedAreaTrendProps {
  data: { label: string; values: Record<string, number> }[];
  series: StackedSeries[];
  height?: number;
  unit?: string;
  showLegend?: boolean;
  className?: string;
}

export function StackedAreaTrend({
  data,
  series,
  height = 210,
  unit = "例",
  showLegend = true,
  className,
}: StackedAreaTrendProps) {
  const flat = data.map((point) => ({ label: point.label, ...point.values }));
  return (
    <div className={className}>
      <ChartBox height={height}>
        <AreaChart data={flat} margin={{ top: 8, right: 18, bottom: 0, left: 0 }} stackOffset="none">
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={7}
            interval="preserveStartEnd"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={34}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId="a"
              stroke={s.color}
              strokeWidth={1}
              fill={s.color}
              fillOpacity={0.32}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartBox>
      {showLegend && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <span className="size-1.5 rounded-[1px]" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
 * 5. 热力图
 * ========================================================================= */

const HEAT_HUE = {
  warn: { l: 0.72, c: 0.13, h: 78, text: "var(--warn)" },
  risk: { l: 0.56, c: 0.19, h: 27, text: "var(--risk)" },
  primary: { l: 0.33, c: 0.04, h: 255, text: "var(--primary)" },
};

interface HeatmapGridProps {
  rows: string[];
  cols: string[];
  values: number[][];
  tone?: keyof typeof HEAT_HUE;
  unit?: string;
  rowWidth?: number;
  className?: string;
  footnote?: ReactNode;
}

export function HeatmapGrid({
  rows,
  cols,
  values,
  tone = "warn",
  unit = "项",
  rowWidth = 76,
  className,
  footnote,
}: HeatmapGridProps) {
  const palette = HEAT_HUE[tone];
  const max = Math.max(...values.flat(), 1);
  const gridTemplate = `${rowWidth}px repeat(${cols.length}, minmax(0, 1fr))`;
  return (
    <div className={className}>
      <div className="grid items-center gap-1" style={{ gridTemplateColumns: gridTemplate }}>
        <span />
        {cols.map((col) => (
          <span key={col} className="text-center font-mono text-[9.5px] text-muted-foreground">
            {col}
          </span>
        ))}
        {rows.map((row, ri) => (
          <div key={row} className="contents">
            <span className="truncate pr-1 text-[10.5px] text-muted-foreground">{row}</span>
            {cols.map((col, ci) => {
              const value = values[ri]?.[ci] ?? 0;
              const alpha = value === 0 ? 0.04 : 0.1 + (value / max) * 0.72;
              return (
                <div
                  key={`${row}-${col}`}
                  title={`${row} · ${col}：${value} ${unit}`}
                  className="flex h-7 items-center justify-center rounded-[3px] font-mono text-[10px] tabular transition-colors"
                  style={{
                    background: `oklch(${palette.l} ${palette.c} ${palette.h} / ${alpha})`,
                    color: alpha > 0.5 ? "#ffffff" : value === 0 ? "var(--muted-foreground)" : "var(--foreground)",
                  }}
                >
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
          <span>低</span>
          {[0.12, 0.28, 0.46, 0.64, 0.82].map((a) => (
            <span
              key={a}
              className="size-2.5 rounded-[1px]"
              style={{ background: `oklch(${palette.l} ${palette.c} ${palette.h} / ${a})` }}
            />
          ))}
          <span>高</span>
          <span className="ml-1 font-mono">max {max} {unit}</span>
        </div>
        {footnote && <span className="text-[9.5px] text-muted-foreground/70">{footnote}</span>}
      </div>
    </div>
  );
}

/* ===========================================================================
 * 6. 任务甘特图
 * ========================================================================= */

export type GanttStatus = "done" | "active" | "pending" | "overdue";

export interface GanttRow {
  id: string;
  name: string;
  group?: string;
  role?: string;
  start: string;
  end: string;
  actualStart?: string;
  actualEnd?: string;
  status: GanttStatus;
  note?: string;
}

const GANTT_STATUS: Record<GanttStatus, { planned: string; actual: string; label: string; dot: string }> = {
  done: { planned: "bg-primary/12", actual: "bg-primary", label: "已完成", dot: "bg-primary" },
  active: { planned: "bg-warn/15", actual: "bg-warn", label: "执行中", dot: "bg-warn" },
  pending: { planned: "bg-line-strong/25", actual: "bg-line-strong", label: "待执行", dot: "bg-line-strong" },
  overdue: { planned: "bg-risk/15", actual: "bg-risk", label: "已超时", dot: "bg-risk" },
};

function shortDay(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDateTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

interface GanttChartProps {
  rows: GanttRow[];
  maxHeight?: number;
  now?: string;
  className?: string;
  labelWidth?: number;
}

export function GanttChart({ rows, maxHeight = 420, now, className, labelWidth = 196 }: GanttChartProps) {
  const domain = useMemo(() => {
    const times: number[] = [];
    for (const r of rows) {
      times.push(+new Date(r.start), +new Date(r.end));
      if (r.actualStart) times.push(+new Date(r.actualStart));
      if (r.actualEnd) times.push(+new Date(r.actualEnd));
    }
    if (now) times.push(+new Date(now));
    const min = Math.min(...times);
    const max = Math.max(...times);
    const pad = Math.max((max - min) * 0.03, 3600_000);
    return { start: min - pad, end: max + pad };
  }, [rows, now]);

  const span = domain.end - domain.start;
  const pct = (ts: number) => ((ts - domain.start) / span) * 100;

  const dayTicks = useMemo(() => {
    const ticks: { ts: number; label: string }[] = [];
    const start = new Date(domain.start);
    start.setHours(0, 0, 0, 0);
    const cursor = new Date(start.getTime() + 86_400_000);
    while (cursor.getTime() < domain.end) {
      ticks.push({ ts: cursor.getTime(), label: shortDay(cursor.getTime()) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return ticks;
  }, [domain]);

  const tickStep = Math.max(1, Math.ceil(dayTicks.length / 7));
  const nowTs = now ? +new Date(now) : null;
  let lastGroup: string | undefined;

  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-card", className)}>
      {/* 轴头 */}
      <div className="flex border-b border-line bg-secondary/30" style={{ height: 28 }}>
        <div className="flex shrink-0 items-center border-r border-line px-3 font-mono text-[9.5px] tracking-wide text-muted-foreground uppercase" style={{ width: labelWidth }}>
          任务 / 时间轴
        </div>
        <div className="relative flex-1">
          {dayTicks.map((tick, i) =>
            i % tickStep === 0 ? (
              <span
                key={tick.ts}
                className="absolute top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground"
                style={{ left: `${pct(tick.ts)}%` }}
              >
                {tick.label}
              </span>
            ) : null,
          )}
          {nowTs !== null && nowTs > domain.start && nowTs < domain.end && (
            <span className="absolute top-0 bottom-0 border-l border-dashed border-risk/70" style={{ left: `${pct(nowTs)}%` }} />
          )}
        </div>
      </div>

      <div className="scrollbar-slim overflow-y-auto" style={{ maxHeight }}>
        {rows.map((row) => {
          const meta = GANTT_STATUS[row.status];
          const showGroup = row.group && row.group !== lastGroup;
          if (row.group) lastGroup = row.group;
          const start = +new Date(row.start);
          const end = +new Date(row.end);
          const actualStart = row.actualStart ? +new Date(row.actualStart) : null;
          const actualEnd = row.actualEnd ? +new Date(row.actualEnd) : null;
          const left = pct(start);
          const width = Math.max(pct(end) - left, 0.8);
          const actualLeft = actualStart !== null ? pct(actualStart) : left;
          const actualWidth =
            actualStart !== null && actualEnd !== null ? Math.max(pct(actualEnd) - actualLeft, 0.8) : Math.max(width * (row.status === "active" ? 0.55 : 0), 0.8);
          return (
            <div key={row.id}>
              {showGroup && (
                <div className="border-t border-line bg-secondary/25 px-3 py-1 text-[9.5px] font-medium tracking-wide text-muted-foreground">
                  {row.group}
                </div>
              )}
              <div
                className="flex items-center border-t border-line/60 transition-colors hover:bg-secondary/25"
                style={{ height: 36 }}
                title={`${row.name}｜计划 ${shortDateTime(start)} → ${shortDateTime(end)}${
                  actualStart ? `｜实际 ${shortDateTime(actualStart)}${actualEnd ? ` → ${shortDateTime(actualEnd)}` : " 起"}` : ""
                }${row.note ? `｜${row.note}` : ""}`}
              >
                <div className="flex shrink-0 items-center gap-2 border-r border-line/60 px-3" style={{ width: labelWidth }}>
                  <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-foreground/90">{row.name}</p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {meta.label}
                      {row.role ? ` · ${row.role}` : ""}
                    </p>
                  </div>
                </div>
                <div className="relative h-full flex-1">
                  {dayTicks.map((tick) => (
                    <span
                      key={tick.ts}
                      className="absolute top-0 bottom-0 border-l border-dashed border-line/70"
                      style={{ left: `${pct(tick.ts)}%` }}
                    />
                  ))}
                  {nowTs !== null && nowTs > domain.start && nowTs < domain.end && (
                    <span className="absolute top-0 bottom-0 border-l border-risk/60" style={{ left: `${pct(nowTs)}%` }} />
                  )}
                  {/* 计划窗口 */}
                  <span
                    className={cn("absolute top-[11px] h-[8px] rounded-[2px]", meta.planned)}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: 8 }}
                  />
                  {/* 实际/当前进度 */}
                  {row.status !== "pending" && actualWidth > 0 && (
                    <span
                      className={cn("absolute top-[19px] h-[5px] rounded-[2px]", meta.actual)}
                      style={{ left: `${actualLeft}%`, width: `${actualWidth}%`, minWidth: 6 }}
                    />
                  )}
                  {row.status === "overdue" && (
                    <span
                      className="absolute top-[10px] h-[14px] w-px bg-risk/50"
                      style={{ left: `${pct(nowTs ?? end)}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-secondary/20 px-3 py-1.5 text-[9.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-[5px] w-5 rounded-[1px] bg-line-strong/40" /> 计划窗口
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[4px] w-5 rounded-[1px] bg-primary" /> 实际执行
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[4px] w-5 rounded-[1px] bg-warn" /> 执行中
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[4px] w-5 rounded-[1px] bg-risk" /> 超时
        </span>
        {now && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-risk/60" /> 当前时间
          </span>
        )}
        <span className="ml-auto font-mono">Gantt · 合成演示计划</span>
      </div>
    </div>
  );
}

/* ===========================================================================
 * 7. 不确定性扇形图
 * ========================================================================= */

export interface FanSeries {
  key: string;
  bandKey: string;
  label: string;
  color: string;
}

interface FanChartProps {
  data: Record<string, number | string | [number, number]>[];
  series: FanSeries[];
  height?: number;
  unit?: string;
  yDomain?: [number, number];
  className?: string;
}

export function FanChart({ data, series, height = 220, unit = "%", yDomain = [0, 100], className }: FanChartProps) {
  return (
    <div className={className}>
      <ChartBox height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={7}
            interval={1}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={38}
            domain={yDomain}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => `${v}${unit}`}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          {series.map((s) => (
            <Area
              key={s.bandKey}
              type="monotone"
              dataKey={s.bandKey}
              name={`${s.label} · 不确定性区间`}
              stroke="none"
              fill={s.color}
              fillOpacity={0.13}
              isAnimationActive={false}
              activeDot={false}
            />
          ))}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.7}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartBox>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 rounded-full" style={{ background: s.color }} />
            {s.label}（中位数 + P10–P90 区间）
          </span>
        ))}
        <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">合成推演 · 非临床预测</span>
      </div>
    </div>
  );
}

/* ===========================================================================
 * 8. 环形仪表
 * ========================================================================= */

const GAUGE_TONE = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  risk: "var(--risk)",
  info: "var(--info)",
};

interface GaugeRingProps {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  unit?: string;
  size?: number;
  tone?: keyof typeof GAUGE_TONE;
  className?: string;
}

export function GaugeRing({
  value,
  max = 100,
  label,
  sublabel,
  unit = "%",
  size = 132,
  tone = "primary",
  className,
}: GaugeRingProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const color = GAUGE_TONE[tone];
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${circumference * pct} ${circumference}`}
          />
          {/* 刻度 */}
          {Array.from({ length: 28 }, (_, i) => {
            const angle = (i / 28) * 2 * Math.PI;
            const x1 = 60 + Math.cos(angle) * 63;
            const y1 = 60 + Math.sin(angle) * 63;
            const x2 = 60 + Math.cos(angle) * 66;
            const y2 = 60 + Math.sin(angle) * 66;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-strong)" strokeWidth="0.8" />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-[25px] leading-none font-semibold tracking-tight">
            {Number.isInteger(value) ? value : value.toFixed(1)}
            <span className="text-[11px] font-normal text-muted-foreground">{unit}</span>
          </span>
          <span className="mt-1 text-[10px] text-muted-foreground">{label}</span>
        </div>
      </div>
      {sublabel && <p className="mt-1 text-[9.5px] text-muted-foreground/70">{sublabel}</p>}
    </div>
  );
}

/* ===========================================================================
 * 9. 成本-效果散点图
 * ========================================================================= */

export interface CostEffectPoint {
  plan: string;
  cost: number;
  completion: number;
  cohort?: number;
  recommended?: boolean;
}

interface CostEffectScatterProps {
  points: CostEffectPoint[];
  height?: number;
  targetCost?: number;
  targetCompletion?: number;
  className?: string;
}

export function CostEffectScatter({
  points,
  height = 250,
  targetCost,
  targetCompletion,
  className,
}: CostEffectScatterProps) {
  const recommended = points.filter((p) => p.recommended);
  const normal = points.filter((p) => !p.recommended);
  const avgCost = Math.round(points.reduce((a, p) => a + p.cost, 0) / points.length);
  const avgCompletion = points.reduce((a, p) => a + p.completion, 0) / points.length;

  return (
    <div className={className}>
      <ChartBox height={height}>
        <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="cost"
            name="次均费用"
            domain={["dataMin - 2000", "dataMax + 2000"]}
            tickFormatter={(v: number) => `¥${Math.round(v / 1000)}k`}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="completion"
            name="完成率"
            domain={[88, 95]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <ZAxis type="number" dataKey="cohort" range={[70, 150]} />
          <ReferenceLine
            x={targetCost ?? avgCost}
            stroke="var(--line-strong)"
            strokeDasharray="3 4"
            label={{ value: "目标费用", position: "insideTopRight", fontSize: 9, fill: "var(--muted-foreground)" }}
          />
          <ReferenceLine
            y={targetCompletion ?? avgCompletion}
            stroke="var(--line-strong)"
            strokeDasharray="3 4"
            label={{ value: "目标完成率", position: "insideBottomLeft", fontSize: 9, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--line-strong)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as CostEffectPoint;
              return (
                <ChartTooltipCard
                  title={point.plan}
                  rows={[
                    { name: "次均费用", value: `¥${point.cost.toLocaleString("zh-CN")}` },
                    { name: "路径完成率", value: `${point.completion}%` },
                    { name: "合成队列", value: `n = ${point.cohort ?? 100}` },
                  ]}
                  footnote={point.recommended ? "模型推荐候选（合成推演）" : "候选方案"}
                />
              );
            }}
          />
          <Scatter data={normal} fill="var(--chart-4)" fillOpacity={0.85} stroke="var(--card)" strokeWidth={1.5} isAnimationActive={false} />
          <Scatter data={recommended} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} isAnimationActive={false} />
        </ScatterChart>
      </ChartBox>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-1)]" /> 推荐候选
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-4)]" /> 其他候选
        </span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">气泡 = 合成队列规模 · 虚线 = 目标基线</span>
      </div>
    </div>
  );
}

/* ===========================================================================
 * 10. 分组柱状图（版本规模 / 结构对比）
 * ========================================================================= */

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

interface GroupedBarChartProps {
  data: (Record<string, number | string> & { label: string })[];
  series: BarSeries[];
  height?: number;
  stacked?: boolean;
  unit?: string;
  className?: string;
}

export function GroupedBarChart({ data, series, height = 200, stacked = false, unit = "", className }: GroupedBarChartProps) {
  return (
    <div className={className}>
      <ChartBox height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={7}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={30}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "var(--secondary)", opacity: 0.4 }} />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[2, 2, 0, 0]}
              stackId={stacked ? "a" : undefined}
              maxBarSize={22}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartBox>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span className="size-1.5 rounded-[1px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================================
 * 11. 临床趋势线（支持双轴与参考区间）
 * ========================================================================= */

export interface ClinicalSeries {
  key: string;
  label: string;
  color: string;
  unit?: string;
  axis?: "left" | "right";
  dashed?: boolean;
}

export interface ClinicalBand {
  low: number;
  high: number;
  label?: string;
  color?: string;
}

interface ClinicalTrendChartProps {
  data: Record<string, string | number>[];
  series: ClinicalSeries[];
  bands?: ClinicalBand[];
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
  yRightDomain?: [number | "auto", number | "auto"];
  className?: string;
  /** Optional numeric time axis key (milliseconds) for true temporal spacing. */
  xKey?: string;
  xTickFormatter?: (value: number) => string;
  xTooltipFormatter?: (value: number) => string;
}

/** 生命体征 / 检验指标趋势：双 Y 轴 + 参考区间底色 + 发丝网格。 */
export function ClinicalTrendChart({
  data,
  series,
  bands = [],
  height = 190,
  yDomain,
  yRightDomain,
  className,
  xKey,
  xTickFormatter,
  xTooltipFormatter,
}: ClinicalTrendChartProps) {
  const hasRight = series.some((s) => s.axis === "right");
  return (
    <div className={className}>
      <ChartBox height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: hasRight ? 8 : 18, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
          <XAxis
            dataKey={xKey ?? "label"}
            type={xKey ? "number" : "category"}
            domain={xKey ? ["dataMin", "dataMax"] : undefined}
            scale={xKey ? "time" : undefined}
            axisLine={false}
            tickLine={false}
            tickMargin={7}
            interval="preserveStartEnd"
            tickFormatter={xKey ? xTickFormatter : undefined}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            width={40}
            domain={yDomain}
            tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          {hasRight && (
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={36}
              domain={yRightDomain}
              tick={{ fontSize: 9.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            />
          )}
          {bands.map((band, i) => (
            <ReferenceArea
              key={i}
              yAxisId="left"
              y1={band.low}
              y2={band.high}
              fill={band.color ?? "var(--ok)"}
              fillOpacity={0.07}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ))}
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <ChartTooltipCard
                  title={xKey && typeof label === "number" ? xTooltipFormatter?.(label) ?? String(label) : String(label ?? "")}
                  rows={payload.map((entry) => {
                    const def = series.find((s) => s.label === entry.name);
                    return {
                      name: String(entry.name ?? ""),
                      value: `${entry.value}${def?.unit ?? ""}`,
                      color: typeof entry.color === "string" ? entry.color : undefined,
                    };
                  })}
                />
              ) : null
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              yAxisId={s.axis ?? "left"}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.6}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              connectNulls={false}
              dot={{ r: 2, strokeWidth: 0, fill: s.color }}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ChartBox>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
            {s.unit ? <span className="font-mono text-[9px] text-muted-foreground/60">({s.unit})</span> : null}
          </span>
        ))}
        {bands.map((band, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-[1px]" style={{ background: band.color ?? "var(--ok)", opacity: 0.15 }} />
            {band.label ?? `参考区间 ${band.low}–${band.high}`}
          </span>
        ))}
      </div>
    </div>
  );
}
