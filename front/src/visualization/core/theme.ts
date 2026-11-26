import * as echarts from "echarts";
import { CHART_COLORS, CHART_SEMANTIC, CHART_THEME } from "@/components/charts/chart-theme";

// ---------------------------------------------------------------------------
// Clinical Visualization Engine · ECharts 主题
// Canvas 无法直接使用 CSS var()，因此从 document 解析 token；
// 回退值与 Design System V1.0 / chart-theme 保持一致。
// ---------------------------------------------------------------------------

type ResolvedPalette = {
  primary: string;
  primarySoft: string;
  risk: string;
  warn: string;
  ok: string;
  info: string;
  ink: string;
  muted: string;
  line: string;
  lineStrong: string;
  card: string;
  paper: string;
  chart: [string, string, string, string, string];
};

/** V1.0 字面量回退（仅 SSR / 解析失败时使用，禁止作为页面主色源） */
const FALLBACK: ResolvedPalette = {
  primary: "#111113",
  primarySoft: "#efeff1",
  risk: "#c23b3b",
  warn: "#9a7b2f",
  ok: "#3d7a5a",
  info: "#5e6ad2",
  ink: "#111113",
  muted: "#8b8b93",
  line: "#e8e8eb",
  lineStrong: "#d8d8de",
  card: "#ffffff",
  paper: "#f7f7f8",
  chart: ["#111113", "#5e6ad2", "#6b6b73", "#9a9aa3", "#c4c4cb"],
};

let cache: ResolvedPalette | null = null;

function resolve(raw: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = raw.trim();
  if (!value) return fallback;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return fallback;
    ctx.fillStyle = value;
    const normalized = ctx.fillStyle;
    return normalized === "#000000" && !value.startsWith("rgb(0") ? fallback : normalized;
  } catch {
    return fallback;
  }
}

/** 读取并解析设计令牌，首次调用后缓存。必须在浏览器环境调用（组件内使用）。 */
export function vizPalette(): ResolvedPalette {
  if (cache) return cache;
  const style = typeof window === "undefined" ? null : getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => (style ? resolve(style.getPropertyValue(name), fallback) : fallback);
  cache = {
    primary: v("--primary", FALLBACK.primary),
    primarySoft: v("--accent", FALLBACK.primarySoft),
    risk: v("--risk", FALLBACK.risk),
    warn: v("--warn", FALLBACK.warn),
    ok: v("--ok", FALLBACK.ok),
    info: v("--info", FALLBACK.info),
    ink: v("--ink", FALLBACK.ink),
    muted: v("--muted-foreground", FALLBACK.muted),
    line: v("--line", FALLBACK.line),
    lineStrong: v("--line-strong", FALLBACK.lineStrong),
    card: v("--card", FALLBACK.card),
    paper: v("--paper", FALLBACK.paper),
    chart: [
      v("--chart-1", FALLBACK.chart[0]),
      v("--chart-2", FALLBACK.chart[1]),
      v("--chart-3", FALLBACK.chart[2]),
      v("--chart-4", FALLBACK.chart[3]),
      v("--chart-5", FALLBACK.chart[4]),
    ],
  };
  return cache;
}

export const VIZ_FALLBACK = FALLBACK;

/** 供排查：图表层仍应优先用 chart-theme 的 CSS var；此处仅暴露 token 名映射 */
export const VIZ_TOKEN_REF = {
  colors: CHART_COLORS,
  semantic: CHART_SEMANTIC,
  theme: CHART_THEME,
} as const;

const themeName = "cpip-clinical";
let registered = false;

/** 注册统一 ECharts 主题（幂等）。 */
export function registerClinicalTheme() {
  if (registered || typeof window === "undefined") return;
  const p = vizPalette();
  echarts.registerTheme(themeName, {
      color: [...p.chart, p.primary, p.risk, p.warn, p.ok, p.info],
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: '"Inter Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
        color: p.ink,
        fontSize: 11,
      },
      title: {
        textStyle: { color: p.ink, fontWeight: 600, fontSize: 13 },
        subtextStyle: { color: p.muted, fontSize: 10 },
      },
      legend: {
        textStyle: { color: p.muted, fontSize: 10 },
        itemWidth: 8,
        itemHeight: 8,
        icon: "roundRect",
      },
      tooltip: {
        backgroundColor: p.card,
        borderColor: p.line,
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: p.ink, fontSize: 11 },
        extraCssText: "box-shadow: 0 8px 24px -12px rgba(22,36,31,.25); border-radius: 8px;",
        axisPointer: {
          lineStyle: { color: p.lineStrong, type: "dashed" },
          crossStyle: { color: p.lineStrong, type: "dashed" },
          shadowStyle: { color: "rgba(24,24,27,0.04)" },
        },
      },
      grid: { left: 34, right: 16, top: 28, bottom: 26, containLabel: true },
      categoryAxis: {
        axisLine: { lineStyle: { color: p.line } },
        axisTick: { show: false },
        axisLabel: { color: p.muted, fontSize: 9.5, fontFamily: "JetBrains Mono Variable, monospace" },
        splitLine: { show: false },
      },
      valueAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: p.muted, fontSize: 9.5, fontFamily: "JetBrains Mono Variable, monospace" },
        splitLine: { lineStyle: { color: p.line, type: [2, 4] } },
      },
      line: { smooth: true, symbol: "none", lineStyle: { width: 1.8 } },
      bar: { barMaxWidth: 22 },
  });
  registered = true;
}

export { themeName as CLINICAL_THEME_NAME };
