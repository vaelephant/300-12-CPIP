// ---------------------------------------------------------------------------
// Clinical Visualization Engine · ECharts React 封装
// 统一主题、响应式 resize、事件绑定与实例销毁。
// ---------------------------------------------------------------------------
import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption, EChartsType } from "echarts";
import { cn } from "@/lib/utils";
import { CLINICAL_THEME_NAME, registerClinicalTheme } from "./theme";

registerClinicalTheme();

type EChartsEventHandler = (params: unknown) => void;

interface EChartProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  /** 事件名（如 click / legendselectchanged）→ 处理函数 */
  onEvents?: Record<string, EChartsEventHandler>;
  /** 数据更新时是否清空旧配置，默认 true 避免残留 series */
  notMerge?: boolean;
  renderer?: "canvas" | "svg";
  ariaLabel?: string;
}

export function EChart({
  option,
  height = 260,
  className,
  onEvents,
  notMerge = true,
  renderer = "canvas",
  ariaLabel,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const chart = echarts.init(node, CLINICAL_THEME_NAME, { renderer });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [renderer]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge });
  }, [option, notMerge]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onEvents) return;
    const entries = Object.entries(onEvents);
    entries.forEach(([event, handler]) => chart.on(event, handler));
    return () => {
      entries.forEach(([event, handler]) => chart.off(event, handler));
    };
  }, [onEvents]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel ?? "临床数据可视化图表"}
      className={cn("w-full", className)}
      style={{ height }}
    />
  );
}
