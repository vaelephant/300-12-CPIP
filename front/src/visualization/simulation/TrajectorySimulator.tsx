// ---------------------------------------------------------------------------
// VIS-012 · 医疗世界模型多路径推演
// 候选路径 A/B/C × 时间尺度切换 × 不确定性区间 × 临床干预点 × 实际对照
// 全部为确定性，clinical_use = false。
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { Activity, Info, Layers, RotateCcw } from "lucide-react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/visualization/core/EChart";
import { vizPalette } from "@/visualization/core/theme";
import type { TrajectoryDataset } from "@/visualization/core/types";
import { TRAJECTORY_DATA } from "@/data/visualization-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const HORIZONS: (30 | 90 | 180)[] = [30, 90, 180];

type ToggleKey = "band" | "actual" | "interventions";

export function TrajectorySimulator({
  datasets = TRAJECTORY_DATA,
  className,
  compact = false,
}: {
  datasets?: Record<30 | 90 | 180, TrajectoryDataset>;
  className?: string;
  compact?: boolean;
}) {
  const [horizon, setHorizon] = useState<30 | 90 | 180>(30);
  const [band, setBand] = useState(true);
  const [actual, setActual] = useState(true);
  const [interventions, setInterventions] = useState(true);
  const dataset = datasets[horizon];
  const colors = useMemo(() => vizPalette(), []);

  const pathColor: Record<string, string> = {
    A: colors.chart[3],
    B: colors.chart[0],
    C: colors.chart[2],
  };

  const option = useMemo<EChartsOption>(() => {
    const series: Record<string, unknown>[] = [];

    if (band) {
      dataset.paths.forEach((path) => {
        series.push({
          type: "custom",
          name: `${path.label} · 区间`,
          silent: true,
          z: 1,
          data: [[0]],
          renderItem: (_params: unknown, api: { coord: (v: [number, number]) => [number, number] }) => {
            const low = path.points.map((pt) => api.coord([pt.day, pt.low]));
            const high = [...path.points].reverse().map((pt) => api.coord([pt.day, pt.high]));
            return {
              type: "polygon",
              shape: { points: [...low, ...high] },
              style: { fill: pathColor[path.key], opacity: 0.12 },
            };
          },
        });
      });
    }

    dataset.paths.forEach((path, index) => {
      series.push({
        type: "line",
        name: path.label,
        z: 3,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color: pathColor[path.key] },
        itemStyle: { color: pathColor[path.key] },
        emphasis: { focus: "series" },
        data: path.points.map((pt) => [pt.day, pt.value]),
        markLine:
          index === 0 && interventions
            ? {
                symbol: "none",
                silent: true,
                lineStyle: { color: colors.lineStrong, type: "dashed" as const, width: 1 },
                label: {
                  fontSize: 9,
                  color: colors.muted,
                  fontFamily: "JetBrains Mono Variable, monospace",
                  rotate: 0,
                  distance: 2,
                  position: "insideEndTop" as const,
                },
                data: dataset.interventions
                  .filter((iv) => iv.day <= horizon)
                  .map((iv) => ({
                    xAxis: iv.day,
                    label: { formatter: iv.label, position: "insideEndTop" as const },
                  })),
              }
            : undefined,
      });
    });

    if (actual) {
      series.push({
        type: "line",
        name: "实际观察",
        z: 4,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2.2, color: colors.ink, type: "solid" as const },
        itemStyle: { color: colors.ink, borderColor: colors.card, borderWidth: 1 },
        areaStyle: { color: colors.ink, opacity: 0.04 },
        data: dataset.actual.map((pt) => [pt.day, pt.value]),
      });
    }

    return {
      animationDuration: 450,
      grid: { left: 42, right: 18, top: 26, bottom: 30, containLabel: true },
      xAxis: {
        type: "value",
        min: 0,
        max: horizon,
        interval: horizon === 30 ? 5 : horizon === 90 ? 15 : 30,
        axisLabel: {
          formatter: (v: number) => `D${v}`,
          fontFamily: "JetBrains Mono Variable, monospace",
          fontSize: 9.5,
          color: colors.muted,
        },
        axisLine: { lineStyle: { color: colors.line } },
        splitLine: { show: false },
        name: horizon === 180 ? "入院后第 N 天（180 天）" : `入院后第 N 天（${horizon} 天）`,
        nameLocation: "end",
        nameTextStyle: { fontSize: 9, color: colors.muted, padding: [0, 0, 0, 0] },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        name: "模拟疾病负担指数",
        nameTextStyle: { fontSize: 9, color: colors.muted, align: "left" },
        axisLabel: { fontSize: 9.5, color: colors.muted, fontFamily: "JetBrains Mono Variable, monospace" },
        splitLine: { lineStyle: { color: colors.line, type: [2, 4] as unknown as "dashed" } },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: colors.lineStrong, type: "dashed" } },
        formatter: (params: unknown) => {
          const rows = params as { seriesName?: string; value?: [number, number]; color?: string }[];
          const day = rows.find((r) => Array.isArray(r.value))?.value?.[0] ?? 0;
          const medians = dataset.paths
            .map((path) => {
              const point = path.points.reduce((closest, pt) =>
                Math.abs(pt.day - day) < Math.abs(closest.day - day) ? pt : closest,
              );
              return `<div style="display:flex;align-items:center;gap:6px;margin-top:3px">
                <span style="width:6px;height:6px;border-radius:999px;background:${pathColor[path.key]}"></span>
                <span style="color:${colors.muted};font-size:10px">${path.label}</span>
                <b style="margin-left:auto;font-family:monospace;font-size:11px">${point.value}</b>
                <span style="color:${colors.muted};font-size:9px">[${point.low}–${point.high}]</span>
              </div>`;
            })
            .join("");
          return `<div style="min-width:230px">
            <div style="font-family:monospace;font-size:10px;color:${colors.muted}">D${day}</div>
            ${medians}
            <div style="margin-top:6px;border-top:1px solid ${colors.line};padding-top:5px;font-size:9px;color:${colors.muted}">
              区间为 P10–P90 不确定性带；不构成临床预测。
            </div>
          </div>`;
        },
        backgroundColor: colors.card,
        borderColor: colors.line,
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: colors.ink, fontSize: 10 },
      },
      series,
    };
  }, [dataset, horizon, band, actual, interventions, colors, pathColor]);

  const toggle = (key: ToggleKey) => {
    if (key === "band") setBand((v) => !v);
    if (key === "actual") setActual((v) => !v);
    if (key === "interventions") setInterventions((v) => !v);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* 控制条 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-md border border-line bg-card p-0.5">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cn(
                "h-6 rounded-[4px] px-2 font-mono text-[10.5px] transition-colors",
                horizon === h ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              未来 {h} 天
            </button>
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-line" />
        {(
          [
            { key: "band" as const, label: "不确定性区间", on: band, icon: Layers },
            { key: "interventions" as const, label: "临床干预点", on: interventions, icon: Activity },
            { key: "actual" as const, label: "实际观察对照", on: actual, icon: Info },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[4px] border px-1.5 text-[10.5px] transition-colors",
                t.on
                  ? "border-primary/25 bg-accent text-accent-foreground"
                  : "border-line bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3" />
              {t.label}
            </button>
          );
        })}
        <span className="ml-auto inline-flex items-center gap-1 rounded-[3px] border border-risk/20 bg-risk-wash px-1.5 py-0.5 font-mono text-[9px] text-risk">
          clinical_use = false
        </span>
      </div>

      <EChart option={option} height={compact ? 240 : 300} ariaLabel="多路径疾病状态推演图" />

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10.5px] text-muted-foreground">
        {dataset.paths.map((path) => (
          <span key={path.key} className="flex items-center gap-1.5">
            <span className="h-[2px] w-5 rounded-full" style={{ background: pathColor[path.key] }} />
            {path.label}
            <span className="font-mono text-[9.5px] text-foreground/60">
              D{horizon} 预计 {path.points[path.points.length - 1].value}
            </span>
          </span>
        ))}
        {actual && (
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-5 rounded-full bg-ink" />
            实际观察（D0–D8）
          </span>
        )}
        
      </div>

      {!compact && (
        <div className="grid gap-2 rounded-md border border-line bg-secondary/30 px-3 py-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "模型", value: `${dataset.model.id}@${dataset.model.version}` },
            { label: "Provider", value: dataset.model.provider },
            { label: "适用队列", value: dataset.model.applicability },
            { label: "训练数据", value: dataset.model.trainedOn },
          ].map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[9px] tracking-wide text-muted-foreground">{m.label}</p>
              <p className="truncate font-mono text-[10px] text-foreground/80" title={m.value}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-foreground/75">
        <Info className="mt-px size-3 shrink-0" />
        {dataset.model.note} 干预点仅用于展示推演交互；实际临床行动仍需医生评估与审核。切换时间尺度只改变展示坐标，不重新训练模型。
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() => {
            setHorizon(30);
            setBand(true);
            setActual(true);
            setInterventions(true);
          }}
        >
          <RotateCcw className="size-3" />
          重置视图
        </Button>
        <span className="text-[9.5px] text-muted-foreground/60">
          拖动或悬停查看各候选路径的中位数与不确定性区间
        </span>
      </div>
    </div>
  );
}
