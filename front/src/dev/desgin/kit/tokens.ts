/**
 * Viz Kit v2 · dashboard-design skill tokens
 * Quiet: grey + one entity hue; warm only on problems.
 */

export const VIZ = {
  page: "#f8f8f6",
  card: "#ffffff",
  soft: "#f1f1ef",
  side: "#f3f3f1",
  ink: "#17171a",
  ink2: "#48484d",
  muted: "#66666d",
  line: "rgba(0,0,0,0.075)",
  lineStrong: "rgba(0,0,0,0.14)",
  accent: "#3e63dd",
  onAccent: "#ffffff",
  money: "#0f7f57",
  up: "#0f7f57",
  down: "#d23f45",
  warn: "#c98a00",
  tip: "#1f2530",
  tipText: "#f3f3f5",
  live: "#12a150",
  shadowCard: "0 1px 2px rgba(0,0,0,.04), 0 1px 1px rgba(0,0,0,.02)",
  shadowPop: "0 12px 32px -8px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)",
  /** series: primary → grey ladder */
  series: ["#3e63dd", "#17171a", "#7a7a82", "#b0b0b6", "#d4d4d8"] as const,
  font: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
} as const;

export const VIZ_AXIS = {
  tick: { fontSize: 11, fill: VIZ.muted, fontFamily: VIZ.font },
  grid: { stroke: VIZ.line, strokeDasharray: "0", vertical: false as const },
};

export function seriesColor(i: number) {
  return VIZ.series[((i % VIZ.series.length) + VIZ.series.length) % VIZ.series.length];
}

/** token + alpha over transparent */
export function mix(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
    return hex.replace(/[\d.]+\)$/, `${a})`);
  }
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 0 and evenly spaced round ticks covering max */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => +(i * step).toFixed(10));
}

export function compactNum(n: number) {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function sharePct(v: number) {
  if (v === 0) return "0%";
  if (v < 0.1) return "<0.1%";
  if (v < 1) return `${v.toFixed(1)}%`;
  return `${Math.round(v)}%`;
}
