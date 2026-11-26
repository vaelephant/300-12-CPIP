import type { ReactNode } from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { VIZ, compactNum } from "./tokens";

/** Card shell: soft shadow, hairline, quiet header as label + number takeaway */
export function VizFrame({
  label,
  value,
  unit,
  action,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  value?: string | number;
  unit?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn("flex flex-col overflow-hidden rounded-[14px] border bg-white", className)}
      style={{ borderColor: VIZ.line, boxShadow: VIZ.shadowCard }}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
        <div className="min-w-0">
          <p className="text-[13px] text-[#48484d]">{label}</p>
          {value !== undefined && (
            <p className="mt-0.5 flex items-baseline gap-1">
              <span className="tabular-nums text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#17171a]">
                {value}
              </span>
              {unit && <span className="text-[13px] text-[#66666d]">{unit}</span>}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className={cn("min-h-0 flex-1 px-3.5 pb-3.5 pt-2", bodyClassName)}>{children}</div>
    </section>
  );
}

export function VizBox({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

/** Dark tip: big exact value first, muted label under */
export function VizTip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const primary = payload[0];
  const n = typeof primary?.value === "number" ? primary.value : Number(primary?.value);
  const big = Number.isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString("zh-CN") : n.toFixed(1)) : String(primary?.value ?? "—");

  return (
    <div
      className="min-w-[112px] rounded-[10px] px-3 py-2.5"
      style={{ background: VIZ.tip, color: VIZ.tipText, boxShadow: VIZ.shadowPop }}
    >
      <p className="tabular-nums text-[20px] font-semibold leading-none tracking-[-0.03em]">
        {big}
        {unit && <span className="ml-0.5 text-[12px] font-normal opacity-70">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[11px] opacity-60">
        {label !== undefined ? String(label) : ""}
        {primary?.name ? `${label !== undefined ? " · " : ""}${primary.name}` : ""}
      </p>
      {payload.length > 1 && (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {payload.slice(1).map((p, i) => {
            const v = typeof p.value === "number" ? p.value : Number(p.value);
            return (
              <div key={i} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 opacity-70">
                  <span className="size-1.5 rounded-full" style={{ background: p.color ?? VIZ.accent }} />
                  {p.name}
                </span>
                <span className="tabular-nums">{Number.isFinite(v) ? compactNum(v) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VizTooltip(props: { unit?: string }) {
  return (
    <Tooltip
      content={<VizTip unit={props.unit} />}
      cursor={{ stroke: VIZ.lineStrong, strokeWidth: 1, strokeDasharray: "3 3" }}
      wrapperStyle={{ outline: "none" }}
    />
  );
}

/** Compact delta — baseline words go in title, not on the tile */
export function VizDelta({
  cur,
  prev,
  invert = false,
  vs,
  minBase = 5,
}: {
  cur: number;
  prev: number;
  invert?: boolean;
  vs?: string;
  minBase?: number;
}) {
  if (!prev && prev !== 0) return null;
  if (prev > 0 && prev < minBase) {
    return <span className="text-[12px] tabular-nums text-[#66666d]">was {prev}</span>;
  }
  if (prev === 0) return null;
  const d = ((cur - prev) / prev) * 100;
  const r = Math.round(d);
  if (r === 0) return <span className="text-[12px] text-[#66666d]">±0%</span>;
  const good = invert ? d < 0 : d > 0;
  const text = Math.abs(d) > 999 ? (d > 0 ? "10×+" : "−99%") : `${d > 0 ? "▲" : "▼"} ${Math.abs(r)}%`;
  return (
    <span
      className="shrink-0 text-[12px] font-medium tabular-nums"
      style={{ color: good ? VIZ.up : VIZ.down }}
      title={vs ? `${vs}: ${prev}` : undefined}
    >
      {text}
    </span>
  );
}

/**
 * Linear-quiet KPI tile
 * — no blue wash; selected = soft surface only
 * — number always ink; spark sits right, never under
 * — delta is ▲ 4% only (vs… in tooltip)
 */
export function MetricTile({
  label,
  value,
  unit,
  delta,
  spark,
  selected,
  onSelect,
  title,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: ReactNode;
  spark?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  title?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full min-h-[88px] flex-col justify-between rounded-lg px-3.5 py-3 transition-colors",
        selected ? "bg-[#f4f4f5]" : onSelect ? "hover:bg-[#f7f7f8]" : "",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "truncate text-[12.5px] leading-none",
            selected ? "font-medium text-[#17171a]" : "text-[#66666d]",
          )}
        >
          {label}
        </span>
        {delta}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <p className="flex min-w-0 items-baseline gap-1">
          <span className="tabular-nums text-[28px] leading-none font-semibold tracking-[-0.035em] text-[#17171a]">
            {value}
          </span>
          {unit && <span className="text-[12px] text-[#8b8b93]">{unit}</span>}
        </p>
        {spark && <div className="mb-0.5 shrink-0">{spark}</div>}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        title={title}
        onClick={onSelect}
        className="min-w-0 flex-1 p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#17171a]/15"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="min-w-0 flex-1 p-1.5" title={title}>
      {inner}
    </div>
  );
}
