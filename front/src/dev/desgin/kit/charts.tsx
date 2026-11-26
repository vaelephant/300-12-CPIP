import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { VIZ, VIZ_AXIS, mix, seriesColor, sharePct, compactNum } from "./tokens";
import { MetricTile, VizBox, VizDelta, VizTooltip } from "./primitives";

/* ----------------------------- Sparkline ----------------------------- */

/** Thin 1.5px spark — no fill; muted when idle, accent when selected */
export function VizSparkline({
  values,
  width = 72,
  height = 28,
  color = VIZ.muted,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padX = 0.5;
  const padY = 2;
  const step = (width - padX * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = padX + i * step;
    const y = height - padY - ((v - min) / span) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Keep export for demos; prefer VizSparkline in KPI */
export function VizMiniBars({
  values,
  height = 22,
  active = false,
}: {
  values: number[];
  height?: number;
  active?: boolean;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="min-w-[2px] flex-1 rounded-sm"
          style={{
            height: Math.max(2, (v / max) * height),
            background: active && i === values.length - 1 ? VIZ.accent : mix(VIZ.accent, active ? 0.35 : 0.18),
          }}
        />
      ))}
    </div>
  );
}

/* ----------------------------- Line / Area ----------------------------- */

export function VizLineTrend({
  data,
  series,
  height = 200,
  unit = "",
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string; dashed?: boolean }>;
  height?: number;
  unit?: string;
}) {
  return (
    <VizBox height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid {...VIZ_AXIS.grid} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={VIZ_AXIS.tick} interval="preserveStartEnd" />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={36}
          tick={VIZ_AXIS.tick}
          tickFormatter={(v: number) => compactNum(v)}
        />
        <VizTooltip unit={unit} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.dashed ? VIZ.muted : seriesColor(i)}
            strokeWidth={s.dashed ? 1.2 : 1.75}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: s.dashed ? VIZ.muted : seriesColor(i) }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </VizBox>
  );
}

export function VizAreaTrend({
  data,
  dataKey,
  name = "值",
  height = 200,
  unit = "",
  prevKey,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  name?: string;
  height?: number;
  unit?: string;
  /** previous period — grey dashed, no fill */
  prevKey?: string;
}) {
  const gid = `viz-fill-${dataKey}`;
  return (
    <VizBox height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIZ.accent} stopOpacity={0.16} />
            <stop offset="100%" stopColor={VIZ.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...VIZ_AXIS.grid} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={VIZ_AXIS.tick} />
        <YAxis axisLine={false} tickLine={false} width={36} tick={VIZ_AXIS.tick} tickFormatter={(v: number) => compactNum(v)} />
        <VizTooltip unit={unit} />
        {prevKey && (
          <Line
            type="monotone"
            dataKey={prevKey}
            name="上期"
            stroke={VIZ.muted}
            strokeWidth={1.2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={VIZ.accent}
          strokeWidth={1.75}
          fill={`url(#${gid})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </VizBox>
  );
}

/* ----------------------------- Bars: pastel + solid cap / one lit ----------------------------- */

/** Vertical bars: pale fill + solid top cap; one bar can be lit */
export function VizVBar({
  data,
  height = 180,
  unit = "",
  litIndex,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  unit?: string;
  /** which bar is solid / highlighted; default = last */
  litIndex?: number;
}) {
  const lit = litIndex ?? data.length - 1;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-full items-end gap-1.5 px-1" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * (height - 28));
        const on = i === lit;
        return (
          <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${d.label}: ${d.value}${unit}`}>
            <div className="relative w-full max-w-[36px]" style={{ height: h }}>
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-[6px]"
                style={{
                  height: "100%",
                  background: on ? VIZ.accent : mix(VIZ.accent, 0.18),
                }}
              />
              {!on && (
                <div
                  className="absolute inset-x-0 top-0 h-[5px] rounded-t-[6px]"
                  style={{ background: mix(VIZ.accent, 0.55) }}
                />
              )}
            </div>
            <span className={cn("text-[11px] tabular-nums", on ? "font-medium text-[#17171a]" : "text-[#66666d]")}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function VizHBar({
  data,
}: {
  data: Array<{ label: string; value: number; display?: string; tone?: "accent" | "warn" | "down" | "muted" }>;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const toneMap = {
    accent: VIZ.accent,
    warn: VIZ.warn,
    down: VIZ.down,
    muted: VIZ.series[2],
  };
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const c = d.tone ? toneMap[d.tone] : VIZ.accent;
        const problem = d.tone === "warn" || d.tone === "down";
        return (
          <li key={d.label} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2.5 text-[13px]">
            <span className="truncate text-[#48484d]">{d.label}</span>
            <div className="relative h-3 overflow-hidden rounded-full" style={{ background: mix(VIZ.ink, 0.05) }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: problem ? c : mix(c, 0.2),
                  boxShadow: problem ? undefined : `inset -5px 0 0 ${c}`,
                }}
              />
            </div>
            <span className="text-right tabular-nums text-[#17171a]">{d.display ?? d.value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function VizGroupedBar({
  data,
  series,
  height = 180,
  unit = "",
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string }>;
  height?: number;
  unit?: string;
}) {
  return (
    <VizBox height={height}>
      <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barGap={3} barCategoryGap="30%">
        <CartesianGrid {...VIZ_AXIS.grid} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={VIZ_AXIS.tick} />
        <YAxis axisLine={false} tickLine={false} width={32} tick={VIZ_AXIS.tick} />
        <VizTooltip unit={unit} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={i === 0 ? mix(VIZ.accent, 0.85) : mix(VIZ.ink, 0.18 + i * 0.08)}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </VizBox>
  );
}

/* ----------------------------- Donut + segmented share ----------------------------- */

export function VizDonut({
  data,
  height = 148,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number; tone?: "accent" | "ink" | "muted" | "down" | "warn" | "up" }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const toneMap = {
    accent: VIZ.accent,
    ink: VIZ.ink,
    muted: VIZ.series[3],
    down: VIZ.down,
    warn: VIZ.warn,
    up: VIZ.up,
  };
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <VizBox height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="72%"
              outerRadius="92%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.tone ? toneMap[d.tone] : seriesColor(i)} />
              ))}
            </Pie>
            <VizTooltip />
          </PieChart>
        </VizBox>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-nums text-[22px] font-semibold tracking-[-0.03em] text-[#17171a]">
            {centerValue ?? total}
          </span>
          {centerLabel && <span className="mt-0.5 text-[11px] text-[#66666d]">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[13px]">
            <span className="size-2 shrink-0 rounded-full" style={{ background: d.tone ? toneMap[d.tone] : seriesColor(i) }} />
            <span className="min-w-0 flex-1 truncate text-[#48484d]">{d.name}</span>
            <span className="tabular-nums text-[#17171a]">{d.value}</span>
            <span className="w-9 text-right tabular-nums text-[12px] text-[#66666d]">
              {sharePct(total ? (d.value / total) * 100 : 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Segmented share bar — ordered parts as rounded pills (legend optional; avoid saying it twice) */
export function VizShareBar({
  parts,
  showLegend = true,
}: {
  parts: Array<{ label: string; value: number; color?: string }>;
  showLegend?: boolean;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex gap-1.5" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts
          .filter((p) => p.value > 0)
          .map((p, i) => (
            <span
              key={p.label}
              title={`${p.label}: ${p.value} · ${sharePct((100 * p.value) / total)}`}
              className="h-2.5 min-w-2.5 rounded-full"
              style={{ flex: p.value, background: p.color ?? seriesColor(i) }}
            />
          ))}
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {parts.map((p, i) => (
            <li key={p.label} className="flex items-center gap-1.5 text-[12px]">
              <span className="size-1.5 rounded-full" style={{ background: p.color ?? seriesColor(i) }} />
              <span className="text-[#48484d]">{p.label}</span>
              <span className="tabular-nums text-[#17171a]">{p.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------- Heatmap (pill cells, classed tiers) ----------------------------- */

export function VizHeatmap({
  rows,
  cols,
  values,
  /** lower-is-better thresholds relative to max: pale → warn */
  problemAt = 0.7,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  problemAt?: number;
}) {
  const max = Math.max(...values.flat(), 1);

  const tierStyle = (v: number) => {
    if (v === 0) return { background: mix(VIZ.ink, 0.03), color: VIZ.muted, warn: false };
    const t = v / max;
    if (t >= problemAt) return { background: mix(VIZ.warn, 0.3), color: VIZ.ink, warn: true };
    if (t >= problemAt * 0.75) return { background: mix(VIZ.accent, 0.25), color: VIZ.ink, warn: false };
    if (t >= problemAt * 0.45) return { background: mix(VIZ.accent, 0.15), color: VIZ.ink, warn: false };
    return { background: mix(VIZ.accent, 0.07), color: VIZ.ink2, warn: false };
  };

  return (
    <div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(0, 1fr))` }}
        role="table"
      >
        <span />
        {cols.map((c, i) => (
          <span key={c} className="text-center text-[12px] text-[#66666d]">
            {c}
            {i === cols.length - 1 && <b className="mt-0.5 block text-[13px] tabular-nums text-[#3e63dd]">·</b>}
          </span>
        ))}
        {rows.map((row, ri) => (
          <div key={row} className="contents">
            <span className="truncate self-center text-[13px] font-medium text-[#48484d]">{row}</span>
            {cols.map((col, ci) => {
              const v = values[ri]?.[ci] ?? 0;
              const st = tierStyle(v);
              return (
                <div
                  key={`${row}-${col}`}
                  title={`${row} · ${col}：${v}`}
                  tabIndex={0}
                  className={cn(
                    "grid h-9 place-items-center rounded-[10px] text-[13px] font-semibold tabular-nums",
                    st.warn && "underline decoration-2 underline-offset-2",
                  )}
                  style={{ background: st.background, color: st.color }}
                >
                  {v || "·"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#66666d]">
        {[
          { a: 0.07, t: "低" },
          { a: 0.15, t: "中" },
          { a: 0.25, t: "高" },
        ].map((x) => (
          <span key={x.t} className="inline-flex items-center gap-1">
            <span className="size-3 rounded-[4px]" style={{ background: mix(VIZ.accent, x.a) }} />
            {x.t}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-[4px]" style={{ background: mix(VIZ.warn, 0.3) }} />
          超阈
        </span>
      </div>
    </div>
  );
}

/* ----------------------------- Bullet (Few) + tick target ----------------------------- */

export function VizBullet({
  label,
  value,
  target,
  max,
  ranges,
  unit = "",
  invert = false,
}: {
  label: string;
  value: number;
  target: number;
  max?: number;
  /** ends of poor / fair / good bands */
  ranges?: [number, number, number];
  unit?: string;
  invert?: boolean;
}) {
  const m = max ?? Math.max(value, target) * 1.2;
  const pct = (v: number) => `${Math.min(100, (v / m) * 100)}%`;
  const bands = ranges ?? [m * 0.5, m * 0.75, m];
  const shade = [mix(VIZ.ink, 0.12), mix(VIZ.ink, 0.07), mix(VIZ.ink, 0.035)];
  const ok = invert ? value <= target : value >= target;

  return (
    <div className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-3">
      <span className="truncate text-[13px] text-[#48484d]">{label}</span>
      <div className="relative isolate h-6" role="img" aria-label={`${label}: ${value} / ${target}`}>
        {bands.map((r, i) => (
          <span key={i} className="absolute inset-y-0 left-0" style={{ width: pct(r), background: shade[i], zIndex: -i }} />
        ))}
        <span
          className="absolute top-1/3 left-0 h-1/3 rounded-sm"
          style={{ width: pct(value), background: ok ? VIZ.ink : VIZ.warn }}
        />
        <span className="absolute inset-y-1 w-0.5 bg-[#17171a]" style={{ left: pct(target) }} title={`目标 ${target}`} />
      </div>
      <span className="text-right text-[13px] tabular-nums text-[#17171a]">
        {value}
        {unit}
      </span>
    </div>
  );
}

/** Target tile with tick bar (2026 wave) */
export function VizTickTarget({
  label,
  value,
  goal,
  unit = "",
  leftLabel,
}: {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  leftLabel?: string;
}) {
  const pct = Math.min(1, value / (goal || 1));
  const ticks = 56;
  const filled = Math.round(ticks * pct);
  const ok = value >= goal;

  return (
    <div className="rounded-[14px] border p-3" style={{ background: VIZ.soft, borderColor: VIZ.line }}>
      <div className="mb-2 flex items-baseline justify-between text-[13px] text-[#48484d]">
        <span>{label}</span>
        <span>目标</span>
      </div>
      <div className="rounded-xl border bg-white px-3.5 py-3" style={{ borderColor: VIZ.line }}>
        <p className="flex items-baseline gap-1.5">
          <span className="tabular-nums text-[32px] font-medium leading-none tracking-[-0.03em] text-[#17171a]">
            {value}
            {unit}
          </span>
          <span className="text-[13px] text-[#66666d]">
            of {goal}
            {unit}
          </span>
        </p>
        <div className="mt-3 flex h-7 gap-[3px]" aria-hidden>
          {Array.from({ length: ticks }, (_, i) => (
            <span
              key={i}
              className="w-[2px] flex-1 rounded-full"
              style={{
                background: i < filled ? (ok ? VIZ.accent : VIZ.warn) : mix(VIZ.ink, 0.1),
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-baseline justify-between text-[13px] tabular-nums">
          <span className="text-[#48484d]">{leftLabel ?? `${Math.max(0, +(goal - value).toFixed(1))}${unit} to go`}</span>
          <span className="text-[#17171a]">{Math.round(pct * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Radar ----------------------------- */

export function VizRadar({
  data,
  series,
  height = 220,
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string }>;
  height?: number;
}) {
  return (
    <VizBox height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke={VIZ.line} />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: VIZ.muted }} />
        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
        <VizTooltip />
        {series.map((s, i) => (
          <Radar
            key={s.key}
            name={s.label}
            dataKey={s.key}
            stroke={i === 0 ? VIZ.accent : VIZ.muted}
            fill={i === 0 ? VIZ.accent : VIZ.muted}
            fillOpacity={i === 0 ? 0.12 : 0.04}
            strokeWidth={1.5}
            strokeDasharray={i === 0 ? undefined : "4 3"}
            isAnimationActive={false}
          />
        ))}
      </RadarChart>
    </VizBox>
  );
}

/* ----------------------------- Ranked list (3px share bar) ----------------------------- */

export function VizRankedList({
  items,
  header,
}: {
  items: Array<{ name: string; value: string | number; share: number; detail?: string }>;
  header?: { left: string; right: string };
}) {
  return (
    <div>
      {header && (
        <div className="mb-1 flex items-center justify-between px-3 text-[12px] text-[#66666d]">
          <span>{header.left}</span>
          <span>{header.right}</span>
        </div>
      )}
      <ul>
        {items.map((it) => (
          <li key={it.name}>
            <button
              type="button"
              className="group relative flex h-11 w-full items-center gap-3 rounded-[10px] px-3 pb-1.5 text-left text-[14px] hover:bg-[#f1f1ef]/60"
            >
              <span
                aria-hidden
                className="absolute inset-x-3 bottom-[5px] h-[3px] overflow-hidden rounded-full"
                style={{ background: mix(VIZ.ink, 0.06) }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full opacity-75 transition-opacity group-hover:opacity-100"
                  style={{ width: `${Math.max(1.5, Math.min(100, it.share))}%`, background: VIZ.accent }}
                />
              </span>
              <span className="relative min-w-0 flex-1 truncate text-[#17171a]">
                {it.name}
                {it.detail && <span className="ml-1.5 text-[12px] text-[#66666d]">{it.detail}</span>}
              </span>
              <span className="relative tabular-nums text-[#17171a]">{it.value}</span>
              <span className="relative w-10 text-right tabular-nums text-[13px] text-[#66666d]">
                {sharePct(it.share)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- KPI strip ----------------------------- */

export function VizKpiStrip({
  items,
  selected,
  onSelect,
  className,
}: {
  items: Array<{
    id: string;
    label: string;
    value: string | number;
    unit?: string;
    cur: number;
    prev: number;
    invert?: boolean;
    vs?: string;
    spark?: number[];
    title?: string;
  }>;
  selected?: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("grid overflow-hidden rounded-[14px] border bg-white", className)}
      style={{
        borderColor: VIZ.line,
        boxShadow: VIZ.shadowCard,
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      {items.map((it, i) => {
        const isOn = selected === it.id || !onSelect;
        const vs = it.vs ?? "vs 上周";
        return (
          <div
            key={it.id}
            className="min-w-0"
            style={{ borderRight: i < items.length - 1 ? `1px solid ${VIZ.line}` : undefined }}
          >
            <MetricTile
              label={it.label}
              value={it.value}
              unit={it.unit}
              title={it.title ?? `${it.label} · ${vs}`}
              selected={selected === it.id}
              onSelect={onSelect ? () => onSelect(it.id) : undefined}
              delta={<VizDelta cur={it.cur} prev={it.prev} invert={it.invert} vs={vs} />}
              spark={
                it.spark ? (
                  <VizSparkline
                    values={it.spark}
                    color={isOn ? VIZ.ink : VIZ.series[3]}
                    width={64}
                    height={24}
                  />
                ) : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Line with goal ----------------------------- */

export function VizLineWithGoal({
  data,
  dataKey,
  goal,
  height = 180,
  unit = "%",
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  goal: number;
  height?: number;
  unit?: string;
}) {
  const gid = `goal-fill-${dataKey}`;
  return (
    <VizBox height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIZ.accent} stopOpacity={0.14} />
            <stop offset="100%" stopColor={VIZ.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...VIZ_AXIS.grid} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={VIZ_AXIS.tick} />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={36}
          tick={VIZ_AXIS.tick}
          domain={[Math.max(0, goal - 25), 100]}
        />
        <ReferenceLine y={goal} stroke={VIZ.lineStrong} strokeDasharray="3 4" />
        <VizTooltip unit={unit} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name="实际"
          stroke={VIZ.accent}
          strokeWidth={1.75}
          fill={`url(#${gid})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </VizBox>
  );
}

/* ----------------------------- Quiet ring (replaces toy gauge) ----------------------------- */

export function VizRing({
  value,
  max = 100,
  label,
  size = 112,
  problemBelow,
}: {
  value: number;
  max?: number;
  label: string;
  size?: number;
  /** if value below this → warn colour */
  problemBelow?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = 40;
  const c = 2 * Math.PI * r;
  const problem = problemBelow !== undefined && value < problemBelow;
  const color = problem ? VIZ.warn : VIZ.accent;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={mix(VIZ.ink, 0.06)} strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular-nums text-[22px] font-semibold tracking-[-0.03em] text-[#17171a]">
          {value}
          <span className="text-[11px] font-normal text-[#66666d]">%</span>
        </span>
        <span className="mt-0.5 text-[11px] text-[#66666d]">{label}</span>
      </div>
    </div>
  );
}

/* re-export aliases for old Gallery names */
export const VizGauge = VizRing;
