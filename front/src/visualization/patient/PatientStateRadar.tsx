import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { PATIENT_STATE_RADAR } from "@/data/visualization-data";
import type { PatientStateRadarData } from "@/visualization/core/types";
import { EChart } from "@/visualization/core/EChart";
import { vizPalette } from "@/visualization/core/theme";
import { cn } from "@/lib/utils";

export interface PatientStateRadarProps {
  /** 雷达数据；缺省使用演示患者状态画像数据 */
  data?: PatientStateRadarData[];
  /** 图表高度（px） */
  height?: number;
  /** 紧凑模式：缩小半径、字号并隐藏部分说明，便于右侧栏 / 回放页复用 */
  compact?: boolean;
  /** 是否显示参考范围序列（默认 true） */
  showReference?: boolean;
  /** 是否显示底部合成数据说明（默认 true） */
  showFootnote?: boolean;
  className?: string;
}

/**
 * PatientStateRadar · 患者疾病状态画像
 *
 * 通过 ECharts radar 对比「入院基线 / 当前状态 / 参考范围」三个状态向量，
 * 六个维度（肝功能、肾功能、营养状态、体能状态、炎症负荷、凝血功能）统一 0–100 分。
 * 颜色全部由 vizPalette() 解析（ECharts canvas 不可直接使用 CSS var()）。
 * 数据为确定性，评分不代表任何临床量表结论。
 */
export function PatientStateRadar({
  data = PATIENT_STATE_RADAR,
  height,
  compact = false,
  showReference = true,
  showFootnote = true,
  className,
}: PatientStateRadarProps) {
  const palette = useMemo(() => vizPalette(), []);

  const option = useMemo<EChartsOption>(() => {
    if (data.length === 0) return {};
    const indicators = data.map((d) => ({ name: d.dimension, max: 100, min: 0 }));
    const seriesData: Record<string, unknown>[] = [
      {
        name: "入院基线",
        value: data.map((d) => d.admission),
        symbolSize: compact ? 3 : 4,
        itemStyle: { color: palette.chart[3] },
        lineStyle: { color: palette.chart[3], width: 1.2, type: "dashed" },
        areaStyle: { color: palette.chart[3], opacity: 0.05 },
      },
      {
        name: "当前状态",
        value: data.map((d) => d.current),
        symbolSize: compact ? 3 : 4,
        itemStyle: { color: palette.primary },
        lineStyle: { color: palette.primary, width: 1.8 },
        areaStyle: { color: palette.primary, opacity: 0.12 },
      },
    ];
    if (showReference) {
      seriesData.push({
        name: "参考范围",
        value: data.map((d) => d.reference),
        symbolSize: 2,
        itemStyle: { color: palette.muted },
        lineStyle: { color: palette.muted, width: 1, type: "dotted" },
        areaStyle: { opacity: 0 },
      });
    }
    return {
      animationDuration: 320,
      tooltip: { trigger: "item" },
      legend: {
        show: true,
        bottom: 0,
        left: "center",
        itemWidth: 8,
        itemHeight: 8,
        itemGap: compact ? 8 : 12,
        icon: "roundRect",
        textStyle: { color: palette.muted, fontSize: compact ? 8.5 : 9.5 },
      },
      radar: {
        center: ["50%", compact ? "45%" : "46%"],
        radius: compact ? "55%" : "60%",
        splitNumber: 4,
        shape: "polygon",
        indicator: indicators,
        axisName: {
          color: palette.muted,
          fontSize: compact ? 8.5 : 9.5,
        },
        axisLine: { lineStyle: { color: palette.line } },
        splitLine: { lineStyle: { color: palette.line } },
        splitArea: { areaStyle: { color: [palette.card, palette.paper] } },
      },
      series: [
        {
          type: "radar",
          symbol: "circle",
          lineStyle: { width: 1.4 },
          emphasis: { focus: "series" },
          data: seriesData,
        },
      ],
    };
  }, [data, palette, compact, showReference]);

  return (
    <div className={cn("flex flex-col", className)}>
      <EChart
        option={option}
        height={height ?? (compact ? 196 : 236)}
        ariaLabel="患者疾病状态雷达图：入院基线、当前状态与参考范围，"
      />
      {showFootnote && (
        <p className="px-1 pt-0.5 text-[9px] leading-relaxed text-muted-foreground/75">
          评分映射为 0–100，用于信息组织，不代表任何临床量表结论。
        </p>
      )}
    </div>
  );
}
