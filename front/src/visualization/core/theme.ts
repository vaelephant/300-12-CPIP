import * as echarts from "echarts";

// ---------------------------------------------------------------------------
// Clinical Visualization Engine · 主题与色板
// 统一 ECharts 主题：画布取色从 CSS 设计令牌解析，避免 ECharts canvas 无法使用 var()。
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

const FALLBACK: ResolvedPalette = {
  primary: "#263343",
  primarySoft: "#edf1f5",
  risk: "#b23b36",
  warn: "#a5772f",
  ok: "#4c6f63",
  info: "#4a6a8b",
  ink: "#1b2430",
  muted: "#68717d",
  line: "#e3e3de",
  lineStrong: "#d2d4cf",
  card: "#ffffff",
  paper: "#f6f6f4",
  chart: ["#2e4057", "#5c7a94", "#b08a4f", "#4d6e90", "#a9544e"],
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
    // 无效颜色时 canvas 会保留默认黑色，此处回退到设计值
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
          shadowStyle: { color: "rgba(47,109,92,0.04)" },
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
