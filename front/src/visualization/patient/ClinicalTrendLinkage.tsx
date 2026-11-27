import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import {
  MULTIMODAL_EVENTS,
  MULTIMODAL_LABELS,
  MULTIMODAL_METRICS,
} from "@/data/visualization-data";
import type {
  MultimodalEventMarker,
  MultimodalMetric,
} from "@/visualization/core/types";
import { EChart } from "@/visualization/core/EChart";
import { vizPalette } from "@/visualization/core/theme";
import { cn } from "@/lib/utils";
import { FilterPill } from "@/components/app/toolbar";
import { Badge } from "@/components/ui/badge";

export interface ClinicalTrendLinkageProps {
  /** X 轴标签（通常为 D0…Dn 或日期） */
  labels?: string[];
  /** 多模态指标集合（AFP / ALT / ALB / CRP），默认使用演示数据 */
  metrics?: MultimodalMetric[];
  /** 临床事件标记（手术、用药、影像、会诊、出院） */
  events?: MultimodalEventMarker[];
  /** 初始选中的指标 key（默认第一个指标） */
  initialMetric?: string;
  /** 外部回放游标索引（与病程回放时间滑块同步） */
  cursorIndex?: number;
  /** 鼠标悬停到某数据点时的回调，用于与回放时间轴双向联动 */
  onHoverIndex?: (index: number) => void;
  /** 是否显示 dataZoom（长序列或回放页建议开启） */
  showZoom?: boolean;
  /** 图表高度（px），默认 256 */
  height?: number;
  /** 紧凑模式：更小的内边距与事件标签 */
  compact?: boolean;
  className?: string;
}

const EVENT_LABEL: Record<MultimodalEventMarker["kind"], string> = {
  surgery: "手术",
  medication: "用药",
  imaging: "影像",
  consult: "会诊 / 决策",
  discharge: "出院",
};

/** 指标默认取色（按 key），避免直接使用数据层 CSS var() 字符串。 */
const METRIC_COLOR_INDEX: Record<string, number> = { afp: 4, alt: 2, alb: 0, crp: 3 };

/**
 * ClinicalTrendLinkage · 多模态临床指标联动
 *
 * 检验指标趋势 + 参考区间 + 临床事件标记 + 回放游标共用一个时间轴：
 * - 指标切换 chips（AFP / ALT / ALB / CRP）；单位与参考范围始终可见；
 * - 参考区间 band 与上下限 markLine；异常点以风险色强调；
 * - 事件 markPoint（▲ + 标签）；`cursorIndex` 驱动垂直回放游标；
 * - `onHoverIndex` 在高亮数据点时回调，供回放页反向同步时间轴。
 * 颜色全部经 vizPalette() 解析；图表为。
 */
export function ClinicalTrendLinkage({
  labels = MULTIMODAL_LABELS,
  metrics = MULTIMODAL_METRICS,
  events = MULTIMODAL_EVENTS,
  initialMetric,
  cursorIndex,
  onHoverIndex,
  showZoom = false,
  height = 256,
  compact = false,
  className,
}: ClinicalTrendLinkageProps) {
  const palette = useMemo(() => vizPalette(), []);
  const [selectedKey, setSelectedKey] = useState(initialMetric ?? metrics[0]?.key ?? "");

  useEffect(() => {
    if (initialMetric && initialMetric !== selectedKey) setSelectedKey(initialMetric);
    // 仅响应外部 initialMetric 变化（受控切换），避免覆盖用户本地选择
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMetric]);

  const metric = metrics.find((m) => m.key === selectedKey) ?? metrics[0];
  const metricIndex = metric ? metrics.findIndex((m) => m.key === metric.key) : 0;
  const metricColor = metric
    ? (palette.chart[METRIC_COLOR_INDEX[metric.key] ?? (metricIndex + 1) % palette.chart.length] ?? palette.primary)
    : palette.primary;

  const eventColor = useMemo<Record<MultimodalEventMarker["kind"], string>>(
    () => ({
      surgery: palette.risk,
      medication: palette.chart[2],
      imaging: palette.chart[3],
      consult: palette.muted,
      discharge: palette.ok,
    }),
    [palette],
  );

  const option = useMemo<EChartsOption>(() => {
    if (!metric || metric.values.length === 0 || labels.length === 0) return {};
    const values = metric.values;
    const isAbnormal = (v: number) => v > metric.refHigh || v < metric.refLow;
    const yMin = Math.min(...values, metric.refLow) * 0.9;
    const yMax = Math.max(...values, metric.refHigh) * 1.15;
    const eventY = yMax * 0.94;
    const hasCursor = cursorIndex !== undefined && cursorIndex >= 0 && cursorIndex < labels.length;

    const normalData = values.map((value) => ({
      value,
      itemStyle: { color: isAbnormal(value) ? palette.risk : metricColor },
    }));
    const abnormalPoints = values
      .map((value, index) => (isAbnormal(value) ? { value: [labels[index], value] } : null))
      .filter((p): p is { value: [string, number] } => p !== null);
    const eventPoints = events
      .filter((e) => e.index >= 0 && e.index < labels.length)
      .map((e) => ({
        value: [labels[e.index], eventY],
        name: e.label,
        itemStyle: { color: eventColor[e.kind] },
      }));

    const series: EChartsOption["series"] = [
      {
        name: metric.label,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        data: normalData,
        lineStyle: { color: metricColor, width: 1.8 },
        itemStyle: { color: metricColor },
        areaStyle: { color: metricColor, opacity: 0.06 },
        emphasis: { focus: "series" },
        markArea: {
          silent: true,
          itemStyle: { color: palette.ok, opacity: 0.08 },
          label: { show: false },
          data: [[{ yAxis: metric.refLow }, { yAxis: metric.refHigh }]],
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: palette.lineStrong, type: "dashed", width: 1 },
          label: { show: false },
          data: [{ yAxis: metric.refHigh }, { yAxis: metric.refLow }],
        },
        z: 3,
      },
      {
        name: "异常值",
        type: "scatter",
        symbolSize: 9,
        data: abnormalPoints,
        itemStyle: { color: palette.risk, borderColor: palette.card, borderWidth: 2 },
        z: 5,
      },
      {
        name: "临床事件",
        type: "scatter",
        symbol: "triangle",
        symbolRotate: 0,
        symbolSize: 9,
        data: eventPoints,
        label: {
          show: !compact,
          position: "top",
          formatter: "{b}",
          color: palette.muted,
          fontSize: 8,
          distance: 3,
        },
        z: 4,
      },
    ];

    if (hasCursor) {
      series.push({
        name: "回放游标",
        type: "line",
        data: [],
        silent: true,
        symbol: "none",
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: palette.risk, width: 1.2, type: "solid" },
          label: {
            show: true,
            formatter: "回放游标",
            color: palette.risk,
            fontSize: 8,
            position: "insideEndTop",
          },
          data: [{ xAxis: labels[cursorIndex] }],
        },
        z: 6,
      });
      series.push({
        name: "游标值",
        type: "scatter",
        symbolSize: 11,
        data: [{ value: [labels[cursorIndex], values[cursorIndex]] }],
        itemStyle: { color: palette.risk, borderColor: palette.card, borderWidth: 2 },
        z: 7,
      });
    }

    return {
      animationDuration: 280,
      grid: {
        left: 8,
        right: compact ? 10 : 16,
        top: compact ? 26 : 36,
        bottom: showZoom ? 48 : compact ? 22 : 28,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: palette.lineStrong, type: "dashed" },
        },
        formatter: (params: unknown) => {
          const list = (Array.isArray(params) ? params : [params]) as {
            dataIndex?: number;
            seriesName?: string;
          }[];
          const idx = list.find((p) => typeof p.dataIndex === "number")?.dataIndex ?? 0;
          const value = values[idx];
          if (value === undefined) return "";
          const abnormal = isAbnormal(value);
          const dir =
            value > metric.refHigh
              ? "高于参考上限"
              : value < metric.refLow
                ? "低于参考下限"
                : "参考范围内";
          const markerEvents = events.filter((e) => e.index === idx).map((e) => e.label);
          return [
            `<div style="font-weight:600;font-size:11px;color:${palette.ink}">${labels[idx] ?? ""}</div>`,
            `<div style="margin-top:4px;font-size:11px;color:${palette.ink}">${metric.label}：<b>${value}</b> ${metric.unit}</div>`,
            `<div style="margin-top:2px;font-size:10px;color:${palette.muted}">参考 ${metric.refLow}–${metric.refHigh} ${metric.unit}</div>`,
            `<div style="margin-top:2px;font-size:10px;color:${abnormal ? palette.risk : palette.ok}">${dir}</div>`,
            markerEvents.length
              ? `<div style="margin-top:4px;font-size:10px;color:${palette.muted}">事件：${markerEvents.join("、")}</div>`
              : "",
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: palette.line } },
        axisTick: { show: false },
        axisLabel: { color: palette.muted, fontSize: 9, fontFamily: "JetBrains Mono Variable, monospace" },
      },
      yAxis: {
        type: "value",
        min: Math.floor(yMin),
        max: Math.ceil(yMax),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: palette.muted, fontSize: 9 },
        splitLine: { lineStyle: { color: palette.line, type: [2, 4] } },
      },
      dataZoom: showZoom
        ? [
            { type: "inside", start: 0, end: 100, zoomOnMouseWheel: "shift" },
            {
              type: "slider",
              height: 12,
              bottom: 6,
              borderColor: palette.line,
              backgroundColor: "transparent",
              fillerColor: palette.primarySoft,
              handleStyle: { color: palette.primary },
              textStyle: { color: palette.muted, fontSize: 8 },
              dataBackground: {
                lineStyle: { color: palette.lineStrong },
                areaStyle: { color: palette.line },
              },
            },
          ]
        : undefined,
      series,
    };
  }, [
    metric,
    metricColor,
    labels,
    events,
    cursorIndex,
    showZoom,
    compact,
    palette,
    eventColor,
  ]);

  const onEvents = useMemo(() => {
    if (!onHoverIndex) return undefined;
    return {
      mouseover: (params: unknown) => {
        const p = params as { dataIndex?: number; seriesType?: string };
        if (typeof p.dataIndex === "number" && p.dataIndex >= 0 && p.dataIndex < labels.length) {
          onHoverIndex(p.dataIndex);
        }
      },
    };
  }, [onHoverIndex, labels.length]);

  if (!metric) {
    return (
      <div className={cn("rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-[11px] text-muted-foreground", className)}>
        暂无可展示的多模态指标数据。
      </div>
    );
  }

  const latest = metric.values[metric.values.length - 1];
  const latestAbnormal = latest > metric.refHigh || latest < metric.refLow;
  const latestDir = latest > metric.refHigh ? "高于参考上限" : latest < metric.refLow ? "低于参考下限" : "参考范围内";
  const hasCursor = cursorIndex !== undefined && cursorIndex >= 0 && cursorIndex < labels.length;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {metrics.map((m) => (
          <FilterPill
            key={m.key}
            active={m.key === metric.key}
            onClick={() => setSelectedKey(m.key)}
          >
            <span className="font-mono">{m.key.toUpperCase()}</span>
            <span className="hidden text-[10px] font-normal text-muted-foreground sm:inline">{m.label}</span>
          </FilterPill>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
          <span>单位 {metric.unit}</span>
          <span className="text-line-strong">|</span>
          <span>
            参考 {metric.refLow}–{metric.refHigh} {metric.unit}
          </span>
          <Badge variant={latestAbnormal ? "risk" : "ok"} className="text-[9px]">
            当前 {latest} · {latestDir}
          </Badge>
        </span>
      </div>

      <EChart
        option={option}
        height={height}
        onEvents={onEvents}
        ariaLabel={`多模态临床指标联动图：${metric.label}（${metric.unit}）趋势、参考区间 ${metric.refLow}–${metric.refHigh}、临床事件标记与回放游标，`}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full" style={{ background: metricColor }} />
          {metric.label}（{metric.unit}）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[1px]" style={{ background: palette.ok, opacity: 0.18 }} />
          参考区间 {metric.refLow}–{metric.refHigh}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: palette.risk }} /> 异常点
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[8px] leading-none text-muted-foreground">▲</span> 临床事件
        </span>
        {hasCursor && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px" style={{ background: palette.risk }} /> 回放游标 D{cursorIndex}
          </span>
        )}
      </div>

      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-muted-foreground/80">事件标记：</span>
          {events.map((e) => (
            <span
              key={`${e.index}-${e.label}`}
              className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/40 px-1 py-px font-mono text-[8.5px] text-muted-foreground"
              title={`${EVENT_LABEL[e.kind]} · ${labels[e.index] ?? `#${e.index}`}`}
            >
              <span className="size-1 rounded-full" style={{ background: eventColor[e.kind] }} />
              {e.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
