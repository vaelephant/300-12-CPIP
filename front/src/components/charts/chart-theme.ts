/**
 * Recharts 图表主题 · 唯一色源
 * 全部颜色使用 CSS token（var(--*)），禁止在图表层硬编码 hex / oklch。
 * Token 定义见 `src/styles/globals.css`（Design System V1.0）。
 */

export type ChartTone = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";

/** 序列色：按索引循环取用 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const CHART_COLOR: Record<ChartTone, string> = {
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
  "chart-4": "var(--chart-4)",
  "chart-5": "var(--chart-5)",
};

/** 语义色：风险 / 状态 / 中性，与业务 StatusBadge 对齐 */
export const CHART_SEMANTIC = {
  risk: "var(--risk)",
  warn: "var(--warn)",
  ok: "var(--ok)",
  info: "var(--info)",
  brand: "var(--brand)",
  ai: "var(--ai)",
  muted: "var(--muted-foreground)",
  neutral: "var(--line-strong)",
  primary: "var(--primary)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  white: "var(--primary-foreground)",
} as const;

export type ChartSemanticTone = keyof typeof CHART_SEMANTIC;

export type HeatTone = "warn" | "risk" | "primary" | "ok" | "info";

const HEAT_BASE: Record<HeatTone, string> = {
  warn: CHART_SEMANTIC.warn,
  risk: CHART_SEMANTIC.risk,
  primary: CHART_SEMANTIC.primary,
  ok: CHART_SEMANTIC.ok,
  info: CHART_SEMANTIC.info,
};

/**
 * 用 color-mix 把 token 混透明，替代硬编码 oklch 透明度。
 * @param token CSS 变量字符串，如 `var(--risk)`
 * @param alpha 0–1
 */
export function chartMix(token: string, alpha: number): string {
  const pct = Math.max(0, Math.min(1, alpha)) * 100;
  return `color-mix(in srgb, ${token} ${pct.toFixed(1)}%, transparent)`;
}

/** 热力单元格填充：按 tone + 相对强度取 token 混合色 */
export function heatFill(tone: HeatTone, intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const alpha = clamped === 0 ? 0.04 : 0.1 + clamped * 0.72;
  return chartMix(HEAT_BASE[tone], alpha);
}

/** 热力图例色阶 */
export function heatLegendStops(tone: HeatTone = "risk"): string[] {
  return [0.12, 0.28, 0.46, 0.64, 0.82].map((a) => chartMix(HEAT_BASE[tone], a));
}

/** 按索引取序列色（越界循环） */
export function chartColor(index: number): string {
  return CHART_COLORS[((index % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length];
}

/** Recharts 轴 / 网格 / 文字共用样式 token */
export const CHART_THEME = {
  colors: CHART_COLORS,
  semantic: CHART_SEMANTIC,
  text: "var(--muted-foreground)",
  textStrong: "var(--foreground)",
  axis: "var(--border)",
  grid: "var(--line)",
  gridStrong: "var(--line-strong)",
  surface: "var(--card)",
  secondary: "var(--secondary)",
  cursor: "var(--line-strong)",
  fontFamily: "var(--font-sans)",
  fontMono: "var(--font-mono)",
  tick: {
    fontSize: 10,
    fill: "var(--muted-foreground)",
    fontFamily: "var(--font-mono)",
  },
  cartesianGrid: {
    vertical: false,
    stroke: "var(--line)",
    strokeDasharray: "2 4",
  },
} as const;
