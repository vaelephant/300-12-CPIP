import { useState } from "react";
import { VIZ } from "./kit/tokens";
import { VizFrame } from "./kit/primitives";
import {
  VizAreaTrend,
  VizBullet,
  VizDonut,
  VizGroupedBar,
  VizHBar,
  VizHeatmap,
  VizKpiStrip,
  VizLineTrend,
  VizLineWithGoal,
  VizRadar,
  VizRankedList,
  VizRing,
  VizShareBar,
  VizTickTarget,
  VizVBar,
} from "./kit/charts";
import {
  OverviewDenseTable,
  OverviewFactRail,
  OverviewGroupedSheet,
  OverviewSnapshot,
  OverviewVitalStrip,
} from "./kit/overview";
import {
  HEAT_COLS,
  HEAT_ROWS,
  HEAT_VALUES,
  KPI,
  LOS_BARS,
  RADAR,
  RANKED,
  RISK_DONUT,
  STAGE_LOAD,
  TREND,
  VARIATION_BARS,
} from "./fixtures";

/**
 * Viz Kit v2 gallery — dashboard-design skill
 * Quiet · Wordless · one accent · warm only on problems
 */
export default function VizGalleryPage() {
  const [metric, setMetric] = useState("patients");

  return (
    <div className="min-h-screen" style={{ background: VIZ.page, color: VIZ.ink, fontFamily: VIZ.font }}>
      <header className="sticky top-0 z-10 border-b bg-[#f8f8f6]/90 backdrop-blur-md" style={{ borderColor: VIZ.line }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[-0.02em]">Viz Kit</h1>
            <p className="text-[12px] text-[#66666d]">/dev/desgin · preview</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#ov-overview"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.lineStrong, color: VIZ.ink, background: VIZ.card }}
            >
              OV 概览
            </a>
            <a
              href="/dev/desgin/pathway"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.ink, background: VIZ.card }}
            >
              Pathway →
            </a>
            <a
              href="/dev/desgin/tasks"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.ink, background: VIZ.card }}
            >
              Tasks →
            </a>
            <a
              href="/dev/desgin/timeline"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.ink, background: VIZ.card }}
            >
              Timeline →
            </a>
            <a
              href="/dev/desgin/combo"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.ink, background: VIZ.card }}
            >
              Combo →
            </a>
            <a
              href="/dev/desgin/live-pathway"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.ink, background: VIZ.card }}
            >
              Live Pathway →
            </a>
            <a
              href="/dev/desgin/world-model"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.ink, background: VIZ.card }}
            >
              World Model →
            </a>
            <a
              href="/dev/desgin/product-demo"
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ borderColor: VIZ.lineStrong, color: VIZ.ink, background: VIZ.card }}
            >
              Product Demo →
            </a>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px]"
              style={{ borderColor: VIZ.line, background: VIZ.card }}
            >
              <span className="size-1.5 rounded-full" style={{ background: VIZ.live }} />
              v2 · skill
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-4 px-4 py-4 pb-16">
        {/* OV · 工作空间左侧概览 */}
        <section id="ov-overview" className="scroll-mt-16 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]" style={{ color: VIZ.ink }}>
                OV · 工作空间概览
              </h2>
              <p className="mt-0.5 max-w-2xl text-[12px] leading-5" style={{ color: VIZ.muted }}>
                替换 Patient 360 左侧「属性 / 分期 / 体征」三块散装 Panel。编号 OV-01…OV-05，确认后再接入。
              </p>
            </div>
            <p className="font-mono text-[11px]" style={{ color: VIZ.muted }}>
              kit/overview.tsx
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <OverviewFactRail />
            <OverviewGroupedSheet />
            <OverviewVitalStrip />
            <OverviewSnapshot />
            <OverviewDenseTable />
          </div>
          <div
            className="rounded-[10px] border px-4 py-3 text-[12px] leading-5"
            style={{ borderColor: VIZ.line, background: VIZ.card, color: VIZ.muted }}
          >
            <strong style={{ color: VIZ.ink }}>命名</strong>
            {" · "}
            <span className="font-mono">OV-01 FactRail</span>
            {" · "}
            <span className="font-mono">OV-02 GroupedSheet</span>
            {" · "}
            <span className="font-mono">OV-03 VitalStrip</span>
            {" · "}
            <span className="font-mono">OV-04 Snapshot</span>
            {" · "}
            <span className="font-mono">OV-05 DenseTable</span>
          </div>
        </section>

        <div className="h-px" style={{ background: VIZ.line }} />

        <div>
          <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.02em]" style={{ color: VIZ.ink }}>
            Viz · 图表
          </h2>
          {/* KPI — selectable strip */}
          <VizKpiStrip items={KPI} selected={metric} onSelect={setMetric} />
        </div>

        {/* Main trend + goal */}
        <div className="grid gap-4 lg:grid-cols-5">
          <VizFrame label="入径" value={68} unit="例 · W8" className="lg:col-span-3">
            <VizAreaTrend data={TREND} dataKey="enrollment" name="入径" prevKey="prev" height={200} />
          </VizFrame>
          <VizFrame label="完成率" value="93%" unit="vs 目标 90%" className="lg:col-span-2">
            <VizLineWithGoal data={TREND} dataKey="rate" goal={90} height={200} />
          </VizFrame>
        </div>

        {/* Bars row */}
        <div className="grid gap-4 md:grid-cols-3">
          <VizFrame label="住院日" value={96} unit="峰值 · 4–6天">
            <VizVBar data={LOS_BARS} height={160} unit="例" litIndex={1} />
          </VizFrame>
          <VizFrame label="变异" value={43} unit="例">
            <VizHBar data={VARIATION_BARS} />
          </VizFrame>
          <VizFrame label="阶段" value={5} unit="超期 · 检查">
            <VizGroupedBar
              data={STAGE_LOAD}
              series={[
                { key: "done", label: "完成" },
                { key: "overdue", label: "超期" },
              ]}
              height={160}
            />
          </VizFrame>
        </div>

        {/* Composition + targets */}
        <div className="grid gap-4 lg:grid-cols-2">
          <VizFrame label="风险分层" value={300} unit="例">
            <VizDonut data={RISK_DONUT} centerLabel="合计" height={140} />
            <div className="mt-4">
              <VizShareBar
                showLegend={false}
                parts={RISK_DONUT.map((d) => ({
                  label: d.name,
                  value: d.value,
                  color:
                    d.tone === "down"
                      ? VIZ.down
                      : d.tone === "warn"
                        ? VIZ.warn
                        : d.tone === "accent"
                          ? VIZ.accent
                          : VIZ.series[3],
                }))}
              />
            </div>
          </VizFrame>
          <div className="grid gap-4 sm:grid-cols-2">
            <VizTickTarget label="路径完成率" value={93.8} goal={90} unit="%" leftLabel="已超额" />
            <VizTickTarget label="入径率" value={86} goal={90} unit="%" />
            <div
              className="space-y-3 rounded-[14px] border bg-white p-4 sm:col-span-2"
              style={{ borderColor: VIZ.line, boxShadow: VIZ.shadowCard }}
            >
              <p className="text-[13px] text-[#48484d]">对照目标</p>
              <div className="space-y-3">
                <VizBullet label="完成率" value={93.8} target={90} unit="%" />
                <VizBullet label="准时率" value={81} target={85} unit="%" />
                <VizBullet label="变异率" value={12.8} target={10} unit="%" invert max={20} ranges={[8, 12, 20]} />
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap + radar + ranked */}
        <div className="grid gap-4 lg:grid-cols-2">
          <VizFrame label="负荷" value={18} unit="最高 · 二病区检查">
            <VizHeatmap rows={HEAT_ROWS} cols={HEAT_COLS} values={HEAT_VALUES} problemAt={0.7} />
          </VizFrame>
          <VizFrame label="质量" value={88} unit="ERAS 入径率">
            <VizRadar
              data={RADAR}
              series={[
                { key: "eras", label: "ERAS" },
                { key: "standard", label: "常规" },
              ]}
              height={240}
            />
          </VizFrame>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <VizFrame label="瓶颈" value="32h" unit="病理">
            <VizRankedList items={RANKED} header={{ left: "环节", right: "等待" }} />
          </VizFrame>
          <VizFrame label="执行" value={3} unit="指标">
            <div className="flex flex-wrap items-center justify-around gap-4 py-2">
              <VizRing value={94} label="完成" />
              <VizRing value={81} label="准时" problemBelow={85} />
              <VizRing value={68} label="资源" problemBelow={75} />
            </div>
          </VizFrame>
        </div>

        {/* Dual line comparison */}
        <VizFrame label="入径 / 完成" value={63} unit="完成 · W8">
          <VizLineTrend
            data={TREND}
            series={[
              { key: "enrollment", label: "入径" },
              { key: "completion", label: "完成" },
              { key: "prev", label: "上期", dashed: true },
            ]}
            height={180}
          />
        </VizFrame>

        {/* Tokens strip — minimal */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-[14px] border bg-white px-4 py-3"
          style={{ borderColor: VIZ.line, boxShadow: VIZ.shadowCard }}
        >
          {(
            [
              ["accent", VIZ.accent],
              ["up", VIZ.up],
              ["warn", VIZ.warn],
              ["down", VIZ.down],
              ["ink", VIZ.ink],
              ["muted", VIZ.muted],
            ] as const
          ).map(([name, hex]) => (
            <span key={name} className="inline-flex items-center gap-1.5 text-[12px] text-[#48484d]">
              <span className="size-3 rounded-[4px]" style={{ background: hex }} />
              {name}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
