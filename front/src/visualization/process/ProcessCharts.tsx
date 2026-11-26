// ---------------------------------------------------------------------------
// 临床流程挖掘 · ECharts 图表（合成事件日志，确定性演示）
// 颜色一律经 vizPalette() 解析为具体色值，避免 ECharts canvas 解析 var()。
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/visualization/core/EChart";
import { vizPalette } from "@/visualization/core/theme";

const AXIS_FONT = "JetBrains Mono Variable, monospace";

function axisLabel(colors: ReturnType<typeof vizPalette>) {
  return { color: colors.muted, fontSize: 9.5, fontFamily: AXIS_FONT };
}

/* ------------------------------- 瓶颈排名 ------------------------------- */

export function BottleneckBar({
  data,
  height = 210,
}: {
  data: { stage: string; hours: number; target: string }[];
  height?: number;
}) {
  const palette = useMemo(() => vizPalette(), []);
  const option = useMemo<EChartsOption>(() => {
    const targets = data.map((item) => {
      const matched = item.target.match(/[\d.]+/);
      return matched ? Number(matched[0]) : 0;
    });
    return {
      animation: false,
      grid: { left: 4, right: 42, top: 10, bottom: 2, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const list = Array.isArray(params) ? params : [params];
          const first = list[0] as { axisValueLabel?: string } | undefined;
          const rows = list.map((raw) => {
            const item = raw as { seriesName?: string; value?: number };
            return `${item.seriesName ?? ""}：${Number(item.value ?? 0).toFixed(0)}h`;
          });
          return `${first?.axisValueLabel ?? ""}<br/>${rows.join("<br/>")}`;
        },
      },
      xAxis: {
        type: "value",
        axisLabel: { ...axisLabel(palette), formatter: (value: number) => `${value}h` },
        splitLine: { lineStyle: { color: palette.line, type: [2, 4] } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: data.map((item) => item.stage),
        axisLine: { lineStyle: { color: palette.line } },
        axisLabel: { color: palette.muted, fontSize: 10 },
      },
      series: [
        {
          name: "实际等待",
          type: "bar",
          data: data.map((item) => item.hours),
          barWidth: 13,
          itemStyle: { color: palette.warn, borderRadius: [0, 2, 2, 0] },
          label: {
            show: true,
            position: "right",
            formatter: "{c}h",
            color: palette.muted,
            fontSize: 9,
            fontFamily: AXIS_FONT,
          },
        },
        {
          name: "目标上限",
          type: "bar",
          data: targets,
          barWidth: 4,
          barGap: "-100%",
          itemStyle: { color: palette.lineStrong, borderRadius: [0, 2, 2, 0] },
          z: 3,
        },
      ],
    };
  }, [data, palette]);
  return <EChart option={option} height={height} ariaLabel="流程瓶颈平均等待时长排名（对比目标上限）" />;
}

/* ----------------------------- 变异模式分布环形 ----------------------------- */

export function VariantDonut({
  data,
  height = 178,
}: {
  data: { name: string; count: number }[];
  height?: number;
}) {
  const palette = useMemo(() => vizPalette(), []);
  const option = useMemo<EChartsOption>(() => {
    const colors = [palette.chart[0], palette.chart[2], palette.chart[3], palette.chart[4], palette.muted];
    const total = data.reduce((acc, item) => acc + item.count, 0);
    return {
      animation: false,
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const item = params as { name?: string; value?: number; percent?: number };
          return `${item.name ?? ""}：${item.value ?? 0} 例（${item.percent ?? 0}%）`;
        },
      },
      title: {
        text: String(total),
        subtext: "患者例数",
        left: "50%",
        top: "36%",
        textAlign: "center",
        textStyle: { color: palette.ink, fontSize: 20, fontWeight: 600, fontFamily: AXIS_FONT },
        subtextStyle: { color: palette.muted, fontSize: 9 },
      },
      series: [
        {
          type: "pie",
          radius: ["52%", "76%"],
          center: ["50%", "52%"],
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: palette.card, borderWidth: 2 },
          data: data.map((item, index) => ({
            name: item.name,
            value: item.count,
            itemStyle: { color: colors[index % colors.length] },
          })),
        },
      ],
    };
  }, [data, palette]);
  return <EChart option={option} height={height} ariaLabel="流程变异模式分布环形图" />;
}
