/** ECharts/Recharts shared theme sourced from the V1.0 CSS tokens. */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const CHART_THEME = {
  colors: CHART_COLORS,
  text: "var(--muted-foreground)",
  textStrong: "var(--foreground)",
  axis: "var(--border)",
  grid: "var(--border)",
  surface: "var(--card)",
  fontFamily: "var(--font-sans)",
  fontMono: "var(--font-mono)",
} as const;
