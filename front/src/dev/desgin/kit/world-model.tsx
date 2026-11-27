import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * WM · 世界模型工作台候选
 * 上：传统临床路径阶段轨（医生已熟悉）
 * 下：Past（真实）| Now（状态）| Future（研究推演）同一画布
 * 预览：/dev/desgin/world-model
 *
 * 视觉语言「Clinical Observatory」：
 * - 路径轨：石墨分段 · done / active / pending
 * - 过去：实线事件 · 挂在已完成阶段下
 * - 现在：锋利 now 刃线 · 对齐当前阶段
 * - 未来：青绿虚线分支 · 研究情景（clinical_use=false）
 */

export const WM = {
  void: "#07090c",
  panel: "#0e1218",
  pastBand: "#12161d",
  futureBand: "#0a1618",
  ink: "#e8eaed",
  mute: "#8b939e",
  dim: "#5c6570",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",
  past: "#c5c9d0",
  now: "#f4f1ea",
  sim: "#2ec4b6",
  simSoft: "rgba(46,196,182,0.14)",
  simLine: "rgba(46,196,182,0.55)",
  risk: "#e85d5d",
  display: '"Fraunces", "Songti SC", "Noto Serif SC", Georgia, serif',
  sans: '"IBM Plex Sans", "PingFang SC", "Helvetica Neue", sans-serif',
  mono: '"IBM Plex Mono", "SF Mono", ui-monospace, monospace',
} as const;

export type WmStageState = "done" | "active" | "pending" | "blocked";

export type WmStage = {
  id: string;
  name: string;
  state: WmStageState;
  done: number;
  total: number;
  overdue?: number;
};

export type WmPastEvent = {
  id: string;
  label: string;
  at: string;
  /** 挂靠的路径阶段 */
  stageId: string;
  kind?: "task" | "exam" | "decision" | "note";
};

export type WmFutureNode = {
  id: string;
  label: string;
};

export type WmCandidate = {
  id: "A" | "B" | "C";
  name: string;
  hint: string;
  burden30: string;
  burden90: string;
  riskNote?: string;
  nodes: [WmFutureNode, WmFutureNode];
};

export type WmCanvasData = {
  patient: string;
  pathway: string;
  progress: number;
  stages: WmStage[];
  past: WmPastEvent[];
  nowLabel: string;
  nowDetail: string;
  candidates: WmCandidate[];
};

export const WM_FIXTURE: WmCanvasData = {
  patient: "陈志远 · Ib 期 HCC",
  pathway: "肝切除标准路径 · V1.3",
  progress: 42,
  stages: [
    { id: "s1", name: "入院评估", state: "done", done: 4, total: 4 },
    { id: "s2", name: "术前检查", state: "done", done: 6, total: 6 },
    { id: "s3", name: "MDT决策", state: "active", done: 1, total: 3, overdue: 1 },
    { id: "s4", name: "手术执行", state: "pending", done: 0, total: 5 },
    { id: "s5", name: "术后康复", state: "pending", done: 0, total: 4 },
    { id: "s6", name: "出院随访", state: "pending", done: 0, total: 3 },
  ],
  past: [
    { id: "p1", label: "入院登记", at: "D0", stageId: "s1", kind: "task" },
    { id: "p2", label: "基础化验", at: "D0", stageId: "s1", kind: "exam" },
    { id: "p3", label: "影像增强", at: "D1", stageId: "s2", kind: "exam" },
    { id: "p4", label: "ICG 评估", at: "D2", stageId: "s2", kind: "exam" },
    { id: "p5", label: "心肺评估", at: "D2", stageId: "s2", kind: "exam" },
    { id: "p6", label: "肝储备结论", at: "D3", stageId: "s2", kind: "decision" },
  ],
  nowLabel: "MDT 决策中",
  nowDetail: "术前检查完成 · 待 MDT 定案 · NRS 营养评估超时",
  candidates: [
    {
      id: "A",
      name: "手术优先",
      hint: "沿标准路径 · 肝段切除",
      burden30: "低",
      burden90: "中低",
      nodes: [
        { id: "a1", label: "MDT / 指征" },
        { id: "a2", label: "肝段切除" },
      ],
    },
    {
      id: "B",
      name: "转化治疗",
      hint: "ICG 临界 · 降期后再评",
      burden30: "中",
      burden90: "中",
      riskNote: "延长窗口",
      nodes: [
        { id: "b1", label: "转化方案" },
        { id: "b2", label: "再评估" },
      ],
    },
    {
      id: "C",
      name: "观察强化",
      hint: "补齐营养/合并症后再入径",
      burden30: "中低",
      burden90: "不确定",
      riskNote: "UNKNOWN 阻断",
      nodes: [
        { id: "c1", label: "补数据" },
        { id: "c2", label: "重评入径" },
      ],
    },
  ],
};

const KIND_MARK: Record<NonNullable<WmPastEvent["kind"]>, string> = {
  task: "任",
  exam: "检",
  decision: "决",
  note: "记",
};

function WmFonts() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
    />
  );
}

function WmKeyframes() {
  return (
    <style>{`
      @keyframes wm-now-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,241,234,0.35); }
        50% { box-shadow: 0 0 0 10px rgba(244,241,234,0); }
      }
      @keyframes wm-branch-draw {
        from { stroke-dashoffset: 120; opacity: 0.2; }
        to { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes wm-past-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .wm-now-pulse, .wm-branch, .wm-past-node { animation: none !important; }
      }
    `}</style>
  );
}

/** 传统路径阶段轨 · 嵌在 WM 顶部，降低认知门槛 */
function PathwayStageRail({
  stages,
  progress,
  focusId,
  onFocus,
}: {
  stages: WmStage[];
  progress: number;
  focusId: string | null;
  onFocus: (id: string | null) => void;
}) {
  const weight = stages.map((s) => Math.max(1, s.total));
  const sum = weight.reduce((a, b) => a + b, 0);
  const active = stages.find((s) => s.state === "active");

  return (
    <div className="border-b px-5 py-4" style={{ borderColor: WM.line, background: WM.panel }}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: WM.mute }}>
            CLINICAL PATHWAY · 标准路径阶段
          </p>
          <p className="mt-1 text-[13px]" style={{ color: WM.ink }}>
            {active ? (
              <>
                当前阶段 · <span style={{ color: WM.now }}>{active.name}</span>
                {active.overdue ? (
                  <span style={{ color: WM.risk }}> · 超时 {active.overdue}</span>
                ) : null}
              </>
            ) : (
              "未开始"
            )}
          </p>
        </div>
        <span className="font-mono text-[12px] tabular-nums" style={{ color: WM.mute }}>
          {progress}%
        </span>
      </div>

      <div
        className="mb-1.5 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => {
          const on = focusId === s.id;
          const muted = s.state === "pending";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onFocus(on ? null : s.id)}
              className="min-w-0 text-left"
              title={`${s.name} ${s.done}/${s.total}`}
            >
              <p
                className={cn("truncate text-[11px]", s.state === "active" || on ? "font-semibold" : "font-medium")}
                style={{
                  color: on ? WM.sim : muted ? WM.dim : s.state === "active" ? WM.now : WM.past,
                }}
              >
                {s.name}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex h-2 overflow-hidden rounded-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
        {stages.map((s, i) => {
          const on = focusId === s.id;
          const fill =
            s.state === "done"
              ? WM.past
              : s.state === "active"
                ? WM.now
                : s.state === "blocked"
                  ? WM.risk
                  : "transparent";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onFocus(on ? null : s.id)}
              className="relative h-full border-r last:border-0"
              style={{
                flex: weight[i],
                background: fill === "transparent" ? undefined : fill,
                borderColor: "rgba(0,0,0,0.35)",
                boxShadow: on ? `inset 0 0 0 1px ${WM.sim}` : undefined,
                opacity: focusId && !on ? 0.45 : 1,
              }}
              aria-pressed={on}
              aria-label={`聚焦阶段 ${s.name}`}
            />
          );
        })}
      </div>

      <div
        className="mt-1.5 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => (
          <p key={s.id} className="truncate font-mono text-[10px] tabular-nums" style={{ color: WM.dim }}>
            {s.done}/{s.total}
            {s.overdue ? <span style={{ color: WM.risk }}> ·超时</span> : null}
          </p>
        ))}
      </div>
    </div>
  );
}

/** WM-01 WorldModelCanvas · 路径轨 + 世界模型画布 */
export function WorldModelCanvas({
  data = WM_FIXTURE,
  className,
}: {
  data?: WmCanvasData;
  className?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const [active, setActive] = useState<"A" | "B" | "C">("A");
  const [focusStage, setFocusStage] = useState<string | null>(null);

  const candidate = useMemo(
    () => data.candidates.find((c) => c.id === active) ?? data.candidates[0],
    [active, data.candidates],
  );

  const stageMap = useMemo(() => new Map(data.stages.map((s) => [s.id, s])), [data.stages]);
  const activeStage = data.stages.find((s) => s.state === "active");

  const pastVisible = useMemo(() => {
    if (!focusStage) return data.past;
    return data.past.filter((e) => e.stageId === focusStage);
  }, [data.past, focusStage]);

  /** SVG：宽 960 · 高 300 · 左侧路径回放 · 中锋线 · 右推演 */
  const W = 960;
  const H = 300;
  const nowX = 400;
  const spineY = 150;
  const futureStart = 450;

  const pastLayout = useMemo(() => {
    const n = Math.max(pastVisible.length, 1);
    const left = 56;
    const right = nowX - 48;
    return pastVisible.map((ev, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      return { ...ev, x: left + t * (right - left) };
    });
  }, [pastVisible, nowX]);

  const branchPaths = useMemo(() => {
    const ends = [
      { y1: 64, y2: 64 },
      { y1: 150, y2: 150 },
      { y1: 236, y2: 236 },
    ];
    return data.candidates.map((c, i) => {
      const { y1, y2 } = ends[i];
      const mid = futureStart + 100;
      const end = futureStart + 250;
      const d = `M ${nowX} ${spineY} C ${nowX + 48} ${spineY}, ${futureStart - 8} ${y1}, ${mid} ${y1} L ${end} ${y2}`;
      return { id: c.id, d, y1, mid, end };
    });
  }, [data.candidates]);

  return (
    <div
      className={cn("overflow-hidden rounded-[14px] border", className)}
      style={{
        background: WM.panel,
        borderColor: WM.lineStrong,
        fontFamily: WM.sans,
        color: WM.ink,
      }}
    >
      <WmFonts />
      <WmKeyframes />

      {/* title bar */}
      <div
        className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: WM.line, background: WM.void }}
      >
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em]" style={{ color: WM.sim }}>
            HCC-CIP · WORLD MODEL WORKSPACE
          </p>
          <h3
            className="mt-1 text-[22px] leading-tight tracking-[-0.03em]"
            style={{ fontFamily: WM.display, fontWeight: 600 }}
          >
            路径回放 · 当前状态 · 情景推演
          </h3>
          <p className="mt-1 max-w-xl text-[12.5px] leading-5" style={{ color: WM.mute }}>
            {data.patient} · {data.pathway}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px]" style={{ color: WM.dim }}>
            clinical_use = false
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: WM.mute }}>
            上轨是标准路径 · 右侧分支仅研究情景
          </p>
        </div>
      </div>

      {/* traditional pathway rail */}
      <PathwayStageRail
        stages={data.stages}
        progress={data.progress}
        focusId={focusStage}
        onFocus={setFocusStage}
      />

      {/* zone labels */}
      <div
        className="grid grid-cols-3 border-b text-[11px]"
        style={{ borderColor: WM.line, fontFamily: WM.mono }}
      >
        <div className="px-5 py-2" style={{ background: WM.pastBand, color: WM.mute }}>
          Replay · 已执行事件
          {focusStage ? (
            <span style={{ color: WM.sim }}> · {stageMap.get(focusStage)?.name}</span>
          ) : null}
        </div>
        <div className="px-5 py-2 text-center" style={{ background: "#141820", color: WM.now }}>
          State · {activeStage?.name ?? "当前"}
        </div>
        <div className="px-5 py-2 text-right" style={{ background: WM.futureBand, color: WM.sim }}>
          Simulation · 情景推演
        </div>
      </div>

      {/* canvas */}
      <div
        className="relative"
        style={{
          background: `linear-gradient(90deg, ${WM.pastBand} 0%, ${WM.pastBand} 40%, #10141b 40%, #10141b 42%, ${WM.futureBand} 42%, ${WM.futureBand} 100%)`,
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label="临床路径回放、当前状态与未来候选路径"
        >
          <defs>
            <linearGradient id={`wm-past-${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={WM.past} stopOpacity="0.2" />
              <stop offset="100%" stopColor={WM.past} stopOpacity="0.95" />
            </linearGradient>
            <filter id={`wm-glow-${gid}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* past spine */}
          <line
            x1={40}
            y1={spineY}
            x2={nowX - 30}
            y2={spineY}
            stroke={`url(#wm-past-${gid})`}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* stage tick marks under past spine */}
          {data.stages
            .filter((s) => s.state === "done" || s.state === "active")
            .map((s, i, arr) => {
              const x = 56 + (i / Math.max(arr.length, 1)) * (nowX - 120);
              const dimmed = focusStage != null && focusStage !== s.id;
              return (
                <g key={`tick-${s.id}`} opacity={dimmed ? 0.25 : 0.7}>
                  <line
                    x1={x}
                    y1={spineY + 38}
                    x2={x}
                    y2={spineY + 48}
                    stroke={s.state === "active" ? WM.now : WM.dim}
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={spineY + 62}
                    textAnchor="middle"
                    fill={s.state === "active" ? WM.now : WM.dim}
                    style={{ fontFamily: WM.mono, fontSize: 9 }}
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}

          {pastLayout.map((ev, i) => {
            const stage = stageMap.get(ev.stageId);
            const dimmed = focusStage != null && ev.stageId !== focusStage;
            const mark = ev.kind ? KIND_MARK[ev.kind] : "·";
            return (
              <g
                key={ev.id}
                className="wm-past-node"
                style={{
                  animation: `wm-past-in 420ms ease ${i * 70}ms both`,
                  opacity: dimmed ? 0.22 : 1,
                }}
              >
                <circle cx={ev.x} cy={spineY} r={11} fill={WM.pastBand} stroke={WM.past} strokeWidth={2} />
                <text
                  x={ev.x}
                  y={spineY + 4}
                  textAnchor="middle"
                  fill={WM.past}
                  style={{ fontFamily: WM.mono, fontSize: 9, fontWeight: 500 }}
                >
                  {mark}
                </text>
                <text
                  x={ev.x}
                  y={spineY - 26}
                  textAnchor="middle"
                  fill={WM.ink}
                  style={{ fontFamily: WM.sans, fontSize: 12, fontWeight: 500 }}
                >
                  {ev.label}
                </text>
                <text
                  x={ev.x}
                  y={spineY + 28}
                  textAnchor="middle"
                  fill={WM.dim}
                  style={{ fontFamily: WM.mono, fontSize: 10 }}
                >
                  {ev.at}
                  {stage ? ` · ${stage.name}` : ""}
                </text>
              </g>
            );
          })}

          {pastLayout.length === 0 ? (
            <text
              x={(40 + nowX - 30) / 2}
              y={spineY}
              textAnchor="middle"
              fill={WM.dim}
              style={{ fontFamily: WM.sans, fontSize: 12 }}
            >
              该阶段暂无回放事件
            </text>
          ) : null}

          {/* now blade */}
          <line
            x1={nowX}
            y1={28}
            x2={nowX}
            y2={H - 28}
            stroke={WM.now}
            strokeWidth={1.5}
            strokeDasharray="5 6"
            opacity={0.85}
          />

          {/* future branches */}
          {branchPaths.map((bp, i) => {
            const on = bp.id === active;
            return (
              <path
                key={bp.id}
                className="wm-branch"
                d={bp.d}
                fill="none"
                stroke={on ? WM.sim : WM.simLine}
                strokeWidth={on ? 2.4 : 1.4}
                strokeDasharray="7 6"
                strokeLinecap="round"
                style={{
                  animation: `wm-branch-draw 700ms ease ${180 + i * 120}ms both`,
                  opacity: on ? 1 : 0.45,
                }}
              />
            );
          })}

          {branchPaths.map((bp, i) => {
            const c = data.candidates[i];
            const on = c.id === active;
            return (
              <g key={`fn-${c.id}`} opacity={on ? 1 : 0.4}>
                {[bp.mid, bp.end].map((x, ni) => (
                  <g key={ni}>
                    <rect
                      x={x - 46}
                      y={bp.y1 - 14}
                      width={92}
                      height={28}
                      rx={4}
                      fill={WM.futureBand}
                      stroke={on ? WM.sim : WM.simLine}
                      strokeWidth={on ? 1.5 : 1}
                      strokeDasharray={on ? undefined : "4 3"}
                    />
                    <text
                      x={x}
                      y={bp.y1 + 4}
                      textAnchor="middle"
                      fill={on ? WM.ink : WM.mute}
                      style={{ fontFamily: WM.sans, fontSize: 11, fontWeight: 500 }}
                    >
                      {c.nodes[ni].label}
                    </text>
                  </g>
                ))}
                <text
                  x={bp.end + 56}
                  y={bp.y1 + 4}
                  fill={on ? WM.sim : WM.dim}
                  style={{ fontFamily: WM.mono, fontSize: 11, fontWeight: 500 }}
                >
                  {c.id}
                </text>
              </g>
            );
          })}

          {/* now node */}
          <g filter={`url(#wm-glow-${gid})`}>
            <circle cx={nowX} cy={spineY} r={22} fill={WM.void} stroke={WM.now} strokeWidth={2.5} />
            <circle cx={nowX} cy={spineY} r={7} fill={WM.now} />
          </g>
          <text
            x={nowX}
            y={spineY + 52}
            textAnchor="middle"
            fill={WM.now}
            style={{ fontFamily: WM.display, fontSize: 14, fontWeight: 600 }}
          >
            {data.nowLabel}
          </text>
        </svg>

        <div className="pointer-events-none absolute inset-0">
          {data.candidates.map((c, i) => {
            const topPct = [12, 42, 72][i];
            return (
              <button
                key={c.id}
                type="button"
                className="pointer-events-auto absolute right-[4%] h-[18%] w-[48%] rounded-md border border-transparent text-left transition-colors"
                style={{
                  top: `${topPct}%`,
                  background: active === c.id ? WM.simSoft : "transparent",
                  borderColor: active === c.id ? "rgba(46,196,182,0.35)" : "transparent",
                }}
                onClick={() => setActive(c.id)}
                aria-pressed={active === c.id}
                aria-label={`选择候选路径 ${c.id} ${c.name}`}
              />
            );
          })}
        </div>

        <div
          className="wm-now-pulse pointer-events-none absolute top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${(nowX / W) * 100}%`,
            animation: "wm-now-pulse 2.4s ease-in-out infinite",
            border: `1px solid ${WM.now}`,
            opacity: 0.5,
          }}
          aria-hidden
        />
      </div>

      {/* legend + inspector */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-2 text-[10px]"
        style={{ borderColor: WM.line, background: "#0b0e13", color: WM.dim, fontFamily: WM.mono }}
      >
        <span>任 · 任务</span>
        <span>检 · 检查</span>
        <span>决 · 决策</span>
        <span style={{ color: WM.past }}>实线 · 已发生</span>
        <span style={{ color: WM.sim }}>虚线 · 研究推演</span>
        {focusStage ? (
          <button
            type="button"
            className="ml-auto underline-offset-2 hover:underline"
            style={{ color: WM.sim }}
            onClick={() => setFocusStage(null)}
          >
            清除阶段聚焦
          </button>
        ) : (
          <span className="ml-auto" style={{ color: WM.dim }}>
            点击上方阶段可过滤回放
          </span>
        )}
      </div>

      <div
        className="grid gap-4 border-t px-5 py-4 md:grid-cols-[1.1fr_0.9fr]"
        style={{ borderColor: WM.line, background: WM.void }}
      >
        <div>
          <p className="text-[11px]" style={{ color: WM.mute }}>
            现在 · 状态摘要
          </p>
          <p className="mt-1 text-[14px] font-medium" style={{ color: WM.ink }}>
            {data.nowDetail}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className="rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  borderColor: active === c.id ? WM.sim : WM.lineStrong,
                  background: active === c.id ? WM.simSoft : "transparent",
                  color: active === c.id ? WM.ink : WM.mute,
                  fontFamily: WM.mono,
                }}
              >
                路径 {c.id} · {c.name}
              </button>
            ))}
          </div>
        </div>
        <div
          className="rounded-lg border px-3.5 py-3"
          style={{ borderColor: "rgba(46,196,182,0.28)", background: WM.futureBand }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p style={{ fontFamily: WM.display, fontSize: 18, fontWeight: 600, color: WM.ink }}>
              候选 {candidate.id}
            </p>
            <span className="font-mono text-[10px]" style={{ color: WM.sim }}>
              RESEARCH ONLY
            </span>
          </div>
          <p className="mt-1 text-[12px]" style={{ color: WM.mute }}>
            {candidate.hint}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <dt style={{ color: WM.dim }}>30 天负担</dt>
              <dd className="mt-0.5 font-medium" style={{ color: WM.ink }}>
                {candidate.burden30}
              </dd>
            </div>
            <div>
              <dt style={{ color: WM.dim }}>90 天负担</dt>
              <dd className="mt-0.5 font-medium" style={{ color: WM.ink }}>
                {candidate.burden90}
              </dd>
            </div>
          </dl>
          {candidate.riskNote ? (
            <p className="mt-2 text-[11px]" style={{ color: WM.risk }}>
              注意 · {candidate.riskNote}
            </p>
          ) : (
            <p className="mt-2 text-[11px]" style={{ color: WM.dim }}>
              推演结果不写入生效计划；需医生审核后另行激活。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** WM-02 Strip · 嵌入工作空间的压缩版 */
export function WorldModelStrip({
  data = WM_FIXTURE,
  className,
}: {
  data?: WmCanvasData;
  className?: string;
}) {
  const active = data.stages.find((s) => s.state === "active");
  return (
    <div
      className={cn("overflow-hidden rounded-[10px] border px-4 py-3", className)}
      style={{
        background: WM.panel,
        borderColor: WM.lineStrong,
        fontFamily: WM.sans,
        color: WM.ink,
      }}
    >
      <WmFonts />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: WM.sim }}>
          WORLD MODEL · STRIP
        </p>
        <p className="font-mono text-[10px]" style={{ color: WM.dim }}>
          {data.progress}% · clinical_use=false
        </p>
      </div>

      {/* mini stage rail */}
      <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
        {data.stages.map((s) => (
          <span
            key={s.id}
            className="h-full border-r last:border-0"
            style={{
              flex: Math.max(1, s.total),
              background:
                s.state === "done" ? WM.past : s.state === "active" ? WM.now : s.state === "blocked" ? WM.risk : "transparent",
              borderColor: "rgba(0,0,0,0.35)",
            }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: WM.mute }}>
        {active ? `当前 · ${active.name}` : "未开始"}
        {active?.overdue ? <span style={{ color: WM.risk }}> · 超时 {active.overdue}</span> : null}
      </p>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {data.past.slice(0, 4).map((p) => (
          <span
            key={p.id}
            className="shrink-0 rounded border px-2 py-1 text-[11px]"
            style={{ borderColor: WM.lineStrong, color: WM.past }}
          >
            {p.label}
          </span>
        ))}
        <span className="mx-1 h-8 w-px shrink-0" style={{ background: WM.now, opacity: 0.7 }} />
        <span
          className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium"
          style={{ borderColor: WM.now, color: WM.now, fontFamily: WM.display }}
        >
          {data.nowLabel}
        </span>
        <span className="mx-1 h-8 w-px shrink-0 border-l border-dashed" style={{ borderColor: WM.sim }} />
        {data.candidates.map((c) => (
          <span
            key={c.id}
            className="shrink-0 rounded border border-dashed px-2 py-1 font-mono text-[11px]"
            style={{ borderColor: WM.simLine, color: WM.sim }}
          >
            {c.id} {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
