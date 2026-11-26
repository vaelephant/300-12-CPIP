// ---------------------------------------------------------------------------
// 院长驾驶舱 · ECharts 图表（全部为确定性合成数据）
// 注意：ECharts 使用 canvas 渲染，无法解析 CSS var()，所有颜色均通过
// vizPalette() 解析设计令牌得到具体色值后传入；options 一律 memoized。
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/visualization/core/EChart";
import { vizPalette } from "@/visualization/core/theme";

type Palette = ReturnType<typeof vizPalette>;

const AXIS_FONT = "JetBrains Mono Variable, monospace";

function legendStyle(palette: Palette): Record<string, unknown> {
  return {
    show: true,
    top: 2,
    left: 0,
    itemWidth: 8,
    itemHeight: 8,
    icon: "roundRect",
    itemGap: 14,
    textStyle: { color: palette.muted, fontSize: 10, fontFamily: AXIS_FONT },
  };
}

function axisLabel(palette: Palette): Record<string, unknown> {
  return { color: palette.muted, fontSize: 9.5, fontFamily: AXIS_FONT };
}

/* --------------------------- 平均住院日：实际 vs 目标 --------------------------- */

export function LosTrendChart({
  data,
  height = 220,
}: {
  data: { label: string; actual: number; target: number }[];
  height?: number;
}) {
  const palette = useMemo(() => vizPalette(), []);
  const option = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 4, right: 14, top: 30, bottom: 2, containLabel: true },
      tooltip: {
        trigger: "axis",
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params];
          const first = list[0] as { axisValueLabel?: string } | undefined;
          const lines = list.map((raw) => {
            const item = raw as { seriesName?: string; value?: number };
            return `${item.seriesName ?? ""}：${Number(item.value ?? 0).toFixed(1)} 天`;
          });
          return `${first?.axisValueLabel ?? ""}<br/>${lines.join("<br/>")}`;
        },
      },
      legend: legendStyle(palette),
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: palette.line } },
        axisLabel: axisLabel(palette),
      },
      yAxis: {
        type: "value",
        min: 6.5,
        max: 9.5,
        axisLabel: {
          ...axisLabel(palette),
          formatter: (value: number) => `${value.toFixed(1)}天`,
        },
        splitLine: { lineStyle: { color: palette.line, type: [2, 4] } },
      },
      series: [
        {
          name: "实际住院日",
          type: "line",
          data: data.map((d) => d.actual),
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 2, color: palette.chart[0] },
          itemStyle: { color: palette.chart[0] },
        },
        {
          name: "目标值",
          type: "line",
          data: data.map((d) => d.target),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 1.4, color: palette.lineStrong, type: "dashed" },
          itemStyle: { color: palette.lineStrong },
        },
      ],
    }),
    [data, palette],
  );
  return <EChart option={option} height={height} ariaLabel="平均住院日趋势（实际 vs 目标）" />;
}

/* ------------------------------ 变异原因分布环形 ------------------------------ */

export function VariationReasonDonut({
  data,
  height = 220,
  onSliceClick,
}: {
  data: { name: string; value: number }[];
  height?: number;
  onSliceClick?: (name: string, value: number) => void;
}) {
  const palette = useMemo(() => vizPalette(), []);
  const option = useMemo<EChartsOption>(() => {
    const colors = [palette.chart[3], palette.chart[2], palette.chart[4], palette.chart[1], palette.muted];
    const total = data.reduce((acc, d) => acc + d.value, 0);
    return {
      animation: false,
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const item = params as { name?: string; value?: number; percent?: number };
          return `${item.name ?? ""}：${item.value ?? 0} 例（${item.percent ?? 0}%）`;
        },
      },
      legend: {
        show: true,
        orient: "vertical",
        right: 2,
        top: "middle",
        itemWidth: 8,
        itemHeight: 8,
        icon: "roundRect",
        itemGap: 8,
        textStyle: { color: palette.muted, fontSize: 10, fontFamily: AXIS_FONT },
        formatter: (name: string) => {
          const item = data.find((d) => d.name === name);
          return `${name}  ${item?.value ?? 0}`;
        },
      },
      title: {
        text: String(total),
        subtext: "变异例数",
        left: "32%",
        top: "37%",
        textAlign: "center",
        textStyle: { color: palette.ink, fontSize: 21, fontWeight: 600, fontFamily: AXIS_FONT },
        subtextStyle: { color: palette.muted, fontSize: 9 },
      },
      series: [
        {
          type: "pie",
          radius: ["50%", "74%"],
          center: ["32%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: palette.card, borderWidth: 2 },
          data: data.map((d, i) => ({
            name: d.name,
            value: d.value,
            itemStyle: { color: colors[i % colors.length] },
          })),
        },
      ],
    };
  }, [data, palette]);

  const events = useMemo(() => {
    if (!onSliceClick) return undefined;
    return {
      click: (params: unknown) => {
        const item = params as { name?: string; value?: number };
        onSliceClick(item.name ?? "", Number(item.value ?? 0));
      },
    };
  }, [onSliceClick]);

  return (
    <EChart option={option} height={height} onEvents={events} ariaLabel="变异原因分布环形图" />
  );
}

/* ------------------------- 入径 / 完成趋势（双轴） ------------------------- */

export function EnrollmentCompletionChart({
  data,
  height = 220,
}: {
  data: { label: string; enrollment: number; completion: number; variation: number }[];
  height?: number;
}) {
  const palette = useMemo(() => vizPalette(), []);
  const option = useMemo<EChartsOption>(
    () => ({
      animation: false,
      grid: { left: 4, right: 4, top: 30, bottom: 2, containLabel: true },
      tooltip: {
        trigger: "axis",
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params];
          const first = list[0] as { axisValueLabel?: string } | undefined;
          const lines = list.map((raw) => {
            const item = raw as { seriesName?: string; value?: number; seriesType?: string };
            const value = Number(item.value ?? 0);
            return `${item.seriesName ?? ""}：${
              item.seriesType === "bar" ? `${value.toLocaleString("zh-CN")} 例` : `${value.toFixed(1)}%`
            }`;
          });
          return `${first?.axisValueLabel ?? ""}<br/>${lines.join("<br/>")}`;
        },
      },
      legend: legendStyle(palette),
      xAxis: {
        type: "category",
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: palette.line } },
        axisLabel: axisLabel(palette),
      },
      yAxis: [
        {
          type: "value",
          splitLine: { lineStyle: { color: palette.line, type: [2, 4] } },
          axisLabel: {
            ...axisLabel(palette),
            formatter: (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)),
          },
        },
        {
          type: "value",
          min: 10,
          max: 100,
          splitLine: { show: false },
          axisLabel: { ...axisLabel(palette), formatter: (value: number) => `${value}%` },
        },
      ],
      series: [
        {
          name: "入径患者",
          type: "bar",
          data: data.map((d) => d.enrollment),
          barMaxWidth: 16,
          itemStyle: { color: palette.chart[1], borderRadius: [2, 2, 0, 0] },
        },
        {
          name: "路径完成率",
          type: "line",
          yAxisIndex: 1,
          data: data.map((d) => d.completion),
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { width: 2, color: palette.chart[0] },
          itemStyle: { color: palette.chart[0] },
        },
      ],
    }),
    [data, palette],
  );
  return <EChart option={option} height={height} ariaLabel="入径患者数与路径完成率趋势" />;
}
