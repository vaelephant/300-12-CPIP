import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEY_EVENTS } from "@/data/visualization-data";
import type { EventLane, JourneyEvent, TimeScale } from "@/visualization/core/types";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/app/toolbar";

const LANES: { key: EventLane; label: string; color: string }[] = [
  { key: "assess", label: "评估", color: "var(--info)" },
  { key: "exam", label: "检查", color: "var(--chart-4)" },
  { key: "lab", label: "检验", color: "var(--chart-3)" },
  { key: "surgery", label: "手术", color: "var(--primary)" },
  { key: "medication", label: "用药", color: "var(--chart-5)" },
  { key: "nursing", label: "护理", color: "var(--warn)" },
  { key: "followup", label: "随访", color: "var(--chart-2)" },
];

const LANE_INDEX: Record<EventLane, number> = LANES.reduce(
  (acc, lane, index) => ({ ...acc, [lane.key]: index }),
  {} as Record<EventLane, number>,
);

const SEVERITY_COLOR: Record<NonNullable<JourneyEvent["severity"]>, { dot: string; label: string }> = {
  INFO: { dot: "var(--info)", label: "一般记录" },
  WARN: { dot: "var(--warn)", label: "需关注" },
  RISK: { dot: "var(--risk)", label: "风险事件" },
};

const SCALES: { key: TimeScale; label: string; basePx: number; step: number }[] = [
  { key: "day", label: "日", basePx: 88, step: 1 },
  { key: "week", label: "周", basePx: 30, step: 7 },
  { key: "month", label: "月", basePx: 11, step: 30 },
  { key: "year", label: "年", basePx: 2.8, step: 365 },
];

const AXIS_HEIGHT = 28;
const LEFT_PAD = 18;
const RIGHT_PAD = 24;
const LABEL_WIDTH = 132;

function parseEventDate(at: string) {
  const match = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/.exec(at);
  if (!match) return { month: 11, day: 23, hour: 0, minute: 0 };
  return {
    month: Number(match[1]),
    day: Number(match[2]),
    hour: Number(match[3]),
    minute: Number(match[4]),
  };
}

function dayFraction(at: string) {
  const { hour, minute } = parseEventDate(at);
  return (hour * 60 + minute) / 1440;
}

export interface PatientJourneyTimelineProps {
  events?: JourneyEvent[];
  /** 受控尺度；不传则内部管理 */
  scale?: TimeScale;
  onScaleChange?: (scale: TimeScale) => void;
  currentDay?: number;
  onSelect?: (event: JourneyEvent) => void;
  /** 泳道区域高度（约值），默认 340 */
  height?: number;
  compact?: boolean;
  selectedEventId?: string;
  className?: string;
}

/**
 * 患者全病程多泳道时间轴（自定义 SVG）。
 * 事件按 评估/检查/检验/手术/用药/护理/随访 分泳道，支持日/周/月/年尺度与横向缩放。
 */
export function PatientJourneyTimeline({
  events = JOURNEY_EVENTS,
  scale,
  onScaleChange,
  currentDay,
  onSelect,
  height = 340,
  compact = false,
  selectedEventId,
  className,
}: PatientJourneyTimelineProps) {
  const [internalScale, setInternalScale] = useState<TimeScale>("day");
  const activeScale = scale ?? internalScale;
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const laneHeight = Math.max(
    compact ? 30 : 38,
    Math.min(compact ? 46 : 64, Math.floor((height - AXIS_HEIGHT) / LANES.length)),
  );
  const svgHeight = AXIS_HEIGHT + laneHeight * LANES.length;

  const maxDay = useMemo(
    () => Math.max(0, ...events.map((event) => event.day), currentDay ?? 0),
    [currentDay, events],
  );

  const scaleMeta = SCALES.find((item) => item.key === activeScale) ?? SCALES[0];
  const pxPerDay = Math.max(0.6, scaleMeta.basePx * zoom);
  const plotWidth = Math.max(Math.ceil(maxDay * pxPerDay + LEFT_PAD + RIGHT_PAD), 260);

  const anchor = useMemo(() => {
    const first = events[0] ? parseEventDate(events[0].at) : { month: 11, day: 23 };
    return { month: first.month, day: first.day };
  }, [events]);

  const dateForDay = (day: number) => {
    const date = new Date(2026, anchor.month - 1, anchor.day + day);
    return date;
  };

  const xForDay = (day: number) => LEFT_PAD + day * pxPerDay;

  const setScale = (next: TimeScale) => {
    if (!scale) setInternalScale(next);
    onScaleChange?.(next);
    setZoom(1);
  };

  const effectiveStep = useMemo(() => {
    if (activeScale !== "day") return scaleMeta.step;
    return Math.max(1, Math.ceil(44 / pxPerDay));
  }, [activeScale, pxPerDay, scaleMeta.step]);

  const ticks = useMemo(() => {
    const result: number[] = [];
    for (let day = 0; day <= maxDay; day += effectiveStep) result.push(day);
    if (result.length === 0) result.push(0);
    return result;
  }, [effectiveStep, maxDay]);

  const markers = useMemo(() => {
    const grouped = new Map<EventLane, JourneyEvent[]>();
    events.forEach((event) => {
      const list = grouped.get(event.lane) ?? [];
      list.push(event);
      grouped.set(event.lane, list);
    });

    const result: { event: JourneyEvent; x: number; row: number; laneTop: number }[] = [];
    LANES.forEach((lane) => {
      const laneEvents = (grouped.get(lane.key) ?? []).slice().sort((a, b) => {
        const ax = a.day + dayFraction(a.at);
        const bx = b.day + dayFraction(b.at);
        return ax - bx;
      });
      const rowLastX: number[] = [];
      laneEvents.forEach((event) => {
        const x = xForDay(event.day + dayFraction(event.at));
        let row = 0;
        while (row < 3 && rowLastX[row] !== undefined && x - rowLastX[row] < 15) row += 1;
        if (row > 2) row = 2;
        rowLastX[row] = x;
        result.push({
          event,
          x,
          row,
          laneTop: AXIS_HEIGHT + LANE_INDEX[lane.key] * laneHeight,
        });
      });
    });
    return result;
  }, [events, laneHeight, pxPerDay]);

  const showLabels = activeScale === "day" && !compact && pxPerDay >= 60;

  const labelRows = useMemo(() => {
    if (!showLabels) return new Set<string>();
    const rowRight = new Map<number, number>();
    const visible = new Set<string>();
    markers
      .filter((marker) => marker.row === 0)
      .sort((a, b) => a.x - b.x)
      .forEach((marker) => {
        const laneIndex = LANE_INDEX[marker.event.lane];
        const lastRight = rowRight.get(laneIndex) ?? -Infinity;
        if (marker.x - lastRight < 10) return;
        if (marker.x + LABEL_WIDTH + 8 > plotWidth) return;
        visible.add(marker.event.id);
        rowRight.set(laneIndex, marker.x + LABEL_WIDTH);
      });
    return visible;
  }, [markers, plotWidth, showLabels]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setViewportWidth(width);
    });
    observer.observe(node);
    setViewportWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const centerDay = currentDay ?? maxDay;
    node.scrollLeft = Math.max(0, xForDay(centerDay) - node.clientWidth / 2);
    // pxPerDay 变化时保持当前日居中
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScale, currentDay, maxDay, pxPerDay]);

  const zoomIn = () => setZoom((current) => Math.min(3, Number((current + 0.2).toFixed(2))));
  const zoomOut = () => setZoom((current) => Math.max(0.5, Number((current - 0.2).toFixed(2))));
  const fit = () => {
    if (!viewportWidth) return;
    const target = (viewportWidth - LEFT_PAD - RIGHT_PAD) / Math.max(maxDay, 1) / scaleMeta.basePx;
    setZoom(Math.max(0.5, Math.min(3, Number(target.toFixed(2)))));
  };

  const currentX = currentDay !== undefined ? xForDay(currentDay) + pxPerDay / 2 : null;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-card shadow-card", className)}>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="label-micro">JOURNEY · 全病程</span>
        <div className="flex items-center gap-1">
          {SCALES.map((item) => (
            <FilterPill key={item.key} active={activeScale === item.key} onClick={() => setScale(item.key)}>
              {item.label}
            </FilterPill>
          ))}
        </div>
        <span className="font-mono text-[9.5px] text-muted-foreground">
          {events.length} 事件 · D0–D{maxDay}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={zoomOut} aria-label="缩小时间轴">
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-9 text-center font-mono text-[10px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" onClick={zoomIn} aria-label="放大时间轴">
            <ZoomIn className="size-3.5" />
          </Button>
          <Button variant="outline" size="xs" onClick={fit} title="缩放到容器宽度">
            <Maximize2 className="size-3" />
            适应
          </Button>
        </div>
      </div>

      {/* 泳道标签 + 可横向滚动的画布 */}
      <div className="flex">
        <div className="w-[58px] shrink-0 border-r border-line bg-secondary/20">
          <div className="flex items-end justify-end px-1.5 pb-1" style={{ height: AXIS_HEIGHT }}>
            <span className="label-micro">LANE</span>
          </div>
          {LANES.map((lane) => (
            <div
              key={lane.key}
              className="flex items-center gap-1.5 border-t border-line/60 px-2"
              style={{ height: laneHeight }}
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: lane.color }} />
              <span className="text-[10px] text-muted-foreground">{lane.label}</span>
            </div>
          ))}
        </div>

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto scrollbar-slim">
          <div className="relative" style={{ width: plotWidth, height: svgHeight }}>
            <svg
              width={plotWidth}
              height={svgHeight}
              className="block"
              role="img"
              aria-label={`患者全病程时间轴，共 ${events.length} 个事件，${activeScale} 尺度`}
            >
              {/* 泳道底色 */}
              {LANES.map((lane, index) => (
                <rect
                  key={`lane-bg-${lane.key}`}
                  x={0}
                  y={AXIS_HEIGHT + index * laneHeight}
                  width={plotWidth}
                  height={laneHeight}
                  fill={index % 2 === 0 ? "var(--secondary)" : "transparent"}
                  opacity={index % 2 === 0 ? 0.22 : 0}
                />
              ))}

              {/* 泳道分隔线 */}
              {LANES.map((lane, index) => (
                <line
                  key={`lane-line-${lane.key}`}
                  x1={0}
                  y1={AXIS_HEIGHT + index * laneHeight}
                  x2={plotWidth}
                  y2={AXIS_HEIGHT + index * laneHeight}
                  stroke="var(--line)"
                  strokeOpacity={0.65}
                />
              ))}

              {/* 纵向刻度线 + 轴标签 */}
              {ticks.map((day) => {
                const x = xForDay(day) + pxPerDay / 2;
                const date = dateForDay(day);
                const label =
                  activeScale === "day"
                    ? `D${day} · ${date.getMonth() + 1}-${String(date.getDate()).padStart(2, "0")}`
                    : activeScale === "week"
                      ? `W${Math.floor(day / 7) + 1} · ${date.getMonth() + 1}-${String(date.getDate()).padStart(2, "0")}`
                      : activeScale === "month"
                        ? `${date.getMonth() + 1}月`
                        : `${date.getFullYear()}`;
                return (
                  <g key={`tick-${day}`}>
                    <line
                      x1={x}
                      y1={AXIS_HEIGHT - 2}
                      x2={x}
                      y2={svgHeight}
                      stroke="var(--line)"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={x + 3}
                      y={AXIS_HEIGHT - 9}
                      fontSize={8.5}
                      fontFamily="var(--font-mono)"
                      fill="var(--muted-foreground)"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* 当前日标记 */}
              {currentX !== null && (
                <g>
                  <line
                    x1={currentX}
                    y1={AXIS_HEIGHT}
                    x2={currentX}
                    y2={svgHeight}
                    stroke="var(--primary)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.8}
                  />
                  <rect x={currentX - 24} y={4} width={48} height={14} rx={3} fill="var(--primary)" />
                  <text
                    x={currentX}
                    y={14}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontFamily="var(--font-mono)"
                    fill="var(--primary-foreground)"
                  >
                    当前 D{currentDay}
                  </text>
                </g>
              )}
            </svg>

            {/* 事件圆点（可点击） */}
            {markers.map(({ event, x, row, laneTop }) => {
              const severity = SEVERITY_COLOR[event.severity ?? "INFO"];
              const y = laneTop + laneHeight / 2 + (row === 1 ? 12 : row === 2 ? -12 : 0);
              const selected = selectedEventId === event.id;
              const labelVisible = labelRows.has(event.id);
              return (
                <div key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(event)}
                    title={`${event.at} · ${event.title}\n${event.description}\n来源：${event.source}`}
                    className={cn(
                      "absolute z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full p-1 outline-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring/50",
                      selected && "bg-primary/10",
                    )}
                    style={{ left: x, top: y }}
                  >
                    <span
                      className={cn(
                        "block rounded-full ring-2 ring-card",
                        selected ? "size-2.5 ring-primary/40" : "size-2",
                      )}
                      style={{ background: severity.dot }}
                    />
                  </button>
                  {labelVisible && (
                    <span
                      className="pointer-events-none absolute z-[1] max-w-[132px] -translate-y-1/2 truncate rounded-[3px] border border-line bg-card/95 px-1 py-px text-[9px] leading-[13px] text-foreground/80 shadow-card"
                      style={{ left: x + 7, top: y }}
                      title={event.title}
                    >
                      {event.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 图例 + 数据说明 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-secondary/20 px-3 py-1.5 text-[9.5px] text-muted-foreground">
        {(Object.keys(SEVERITY_COLOR) as (keyof typeof SEVERITY_COLOR)[]).map((severity) => (
          <span key={severity} className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: SEVERITY_COLOR[severity].dot }} />
            {SEVERITY_COLOR[severity].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-primary/70" />
          当前日
        </span>
        <span className="font-mono">
          {activeScale === "day" ? "日尺度" : activeScale === "week" ? "周尺度" : activeScale === "month" ? "月尺度" : "年尺度"}
        </span>
        <span className="ml-auto font-mono">合成演示数据 · 来源 HIS / LIS / PACS / HCC-CIP</span>
      </div>
    </div>
  );
}
