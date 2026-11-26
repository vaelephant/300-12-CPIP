import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLOR, CHART_THEME } from "./chart-theme";

export { CHART_COLOR, CHART_COLORS, CHART_SEMANTIC, CHART_THEME, chartColor, chartMix, heatFill, heatLegendStops } from "./chart-theme";
export type { ChartTone, ChartSemanticTone, HeatTone } from "./chart-theme";

/* ---------------------------------------------------------------------------
 * 图表基础组件（全站共用）
 * 规范：细描边、发丝网格、等宽数字、无 3D / 无重填充。
 * 颜色一律经 chart-theme token，禁止硬编码 hex / oklch。
 * ------------------------------------------------------------------------- */

/** 固定高度容器：ResponsiveContainer 必须有显式高度的父级，避免溢出错位。 */
export function ChartBox({
  height,
  children,
  className,
}: {
  height: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------- 浮层提示 ------------------------------- */

function tooltipNumber(value: unknown, digits: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return n.toFixed(digits);
}

export function ChartTooltipCard({
  title,
  rows,
  footnote,
}: {
  title?: ReactNode;
  rows: { name: ReactNode; value: ReactNode; color?: string }[];
  footnote?: ReactNode;
}) {
  return (
    <div className="min-w-[132px] rounded-md border border-line bg-popover px-2.5 py-2 shadow-pop">
      {title !== undefined && title !== "" && (
        <p className="mb-1.5 font-mono text-[10px] tracking-wide text-muted-foreground">{title}</p>
      )}
      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[11.5px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && <span className="size-1.5 rounded-full" style={{ background: row.color }} />}
              {row.name}
            </span>
            <span className="tabular font-mono text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
      {footnote && <p className="mt-1.5 border-t border-line pt-1 text-[10px] text-muted-foreground">{footnote}</p>}
    </div>
  );
}

interface ChartTooltipProps extends Partial<TooltipContentProps<number, string>> {
  unit?: string;
  digits?: number;
  footnote?: ReactNode;
}

/** recharts 自定义 tooltip：mono 数字 + 统一发丝卡片。 */
export function ChartTooltip({ active, payload, label, unit, digits = 0, footnote }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <ChartTooltipCard
      title={label === undefined ? undefined : String(label)}
      rows={payload.map((entry) => ({
        name: String(entry.name ?? ""),
        value: `${tooltipNumber(entry.value, digits)}${unit ?? ""}`,
        color: typeof entry.color === "string" ? entry.color : undefined,
      }))}
      footnote={footnote}
    />
  );
}

/* -------------------------------- 趋势图 -------------------------------- */

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  /** 图例数值单位（默认 %） */
  unit?: string;
}

export interface TrendPoint {
  label: string;
  values: Record<string, number>;
}

function compactNumber(n: number | undefined) {
  if (n === undefined || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function TrendLegend({
  series,
  data,
  tone = "default",
  unit = "%",
}: {
  series: TrendSeries[];
  data: TrendPoint[];
  tone?: "default" | "muted";
  unit?: string;
}) {
  const last = data[data.length - 1];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((s) => (
        <span
          key={s.key}
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px]",
            tone === "muted" ? "text-muted-foreground/80" : "text-muted-foreground",
          )}
        >
          <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: s.color }} />
          {s.label}
          {last && (
            <span className="tabular font-mono text-[10.5px] text-foreground/75">
              {compactNumber(last.values[s.key])}
              {s.unit ?? unit}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

interface TrendChartProps {
  data: TrendPoint[];
  series: TrendSeries[];
  height?: number;
  unit?: string;
  digits?: number;
  yDomain?: [number | "auto", number | "auto"];
  showLegend?: boolean;
  footnote?: ReactNode;
  className?: string;
}

/** 多序列折线图：细描边、发丝横向网格、mono 轴标签。 */
export function TrendChart({
  data,
  series,
  height = 200,
  unit = "%",
  digits = 0,
  yDomain,
  showLegend = true,
  footnote,
  className,
}: TrendChartProps) {
  const flat = data.map((point) => ({ label: point.label, ...point.values }));
  return (
    <div className={className}>
      <ChartBox height={height}>
        <LineChart data={flat} margin={{ top: 8, right: 22, bottom: 0, left: 0 }}>
          <CartesianGrid {...CHART_THEME.cartesianGrid} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={7}
            interval="preserveStartEnd"
            tick={CHART_THEME.tick}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={42}
            domain={yDomain}
            tick={CHART_THEME.tick}
            tickFormatter={(value: number) => `${value}${unit}`}
          />
          <Tooltip
            content={<ChartTooltip unit={unit} digits={digits} footnote={footnote} />}
            cursor={{ stroke: CHART_THEME.cursor, strokeWidth: 1 }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.6}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              dot={false}
              activeDot={{ r: 2.6, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartBox>
      {showLegend && <TrendLegend series={series} data={data} unit={unit} />}
    </div>
  );
}

/* ------------------------------- 横向条形图 ------------------------------- */

export interface HBarDatum {
  label: string;
  value: number;
  /** 右侧展示文本（默认显示数值，可带单位/百分比） */
  display?: string;
  color?: string;
}

interface HBarChartProps {
  data: HBarDatum[];
  height?: number;
  labelWidth?: number;
  rightPad?: number;
  barSize?: number;
  unit?: string;
  footnote?: ReactNode;
  className?: string;
}

/** 横向条形图（用于变异类型分布 / 科室构成等）。 */
export function HBarChart({
  data,
  height = 190,
  labelWidth = 80,
  rightPad = 56,
  barSize = 12,
  unit,
  footnote,
  className,
}: HBarChartProps) {
  return (
    <div className={className}>
      <ChartBox height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 2, right: rightPad, bottom: 2, left: 0 }}
          barCategoryGap={7}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10.5, fill: CHART_THEME.text }}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: CHART_THEME.secondary, opacity: 0.45 }} />
          <Bar dataKey="value" name="数量" barSize={barSize} radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? CHART_COLOR["chart-1"]} />
            ))}
            <LabelList
              dataKey="display"
              position="right"
              fill={CHART_THEME.text}
              fontSize={10}
              fontFamily={CHART_THEME.fontMono}
            />
          </Bar>
        </BarChart>
      </ChartBox>
      {footnote && <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">{footnote}</p>}
    </div>
  );
}

/* ------------------------------- 纵向条形图 ------------------------------- */

export interface VBarDatum {
  label: string;
  value: number;
  color?: string;
}

interface VBarChartProps {
  data: VBarDatum[];
  height?: number;
  unit?: string;
  color?: string;
  maxBarSize?: number;
  showLabels?: boolean;
  footnote?: ReactNode;
  className?: string;
}

/** 纵向条形图（用于住院日分布等）。 */
export function VBarChart({
  data,
  height = 180,
  unit,
  color = CHART_COLOR["chart-1"],
  maxBarSize = 30,
  showLabels = true,
  footnote,
  className,
}: VBarChartProps) {
  return (
    <div className={className}>
      <ChartBox height={height}>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...CHART_THEME.cartesianGrid} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={7}
            interval={0}
            tick={CHART_THEME.tick}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={38}
            tick={CHART_THEME.tick}
            tickFormatter={(value: number) => `${value}${unit ?? ""}`}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: CHART_THEME.secondary, opacity: 0.45 }} />
          <Bar dataKey="value" name="数量" fill={color} radius={[2, 2, 0, 0]} maxBarSize={maxBarSize} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? color} />
            ))}
            {showLabels && (
              <LabelList
                dataKey="value"
                position="top"
                fill={CHART_THEME.text}
                fontSize={9.5}
                fontFamily={CHART_THEME.fontMono}
              />
            )}
          </Bar>
        </BarChart>
      </ChartBox>
      {footnote && <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">{footnote}</p>}
    </div>
  );
}

/* ------------------------------- 图例样式 ------------------------------- */

export function LegendDot({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
