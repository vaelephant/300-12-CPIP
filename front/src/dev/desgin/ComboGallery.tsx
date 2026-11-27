import { useState } from "react";
import { Link } from "react-router-dom";
import { VIZ } from "./kit/tokens";
import type { KitStage } from "./kit/pathway";
import type { KitGanttRow } from "./kit/stage-gantt";
import {
  PathwaySegmentsSwimlaneCombo,
  THEME_DARK,
  THEME_LIGHT,
} from "./kit/pathway-combo";
import type { KitTheme } from "./kit/stage-tasks";

const NOW = "2026-11-27T02:00:00+09:00";
const PATHWAY = "HCC 肝切除 · 标准路径";
const PROGRESS = 48;

/** 阶段名与泳道 group 对齐 */
const STAGES: KitStage[] = [
  { id: "assess", name: "术前评估", state: "done", done: 2, total: 2 },
  { id: "exam", name: "术前检查", state: "active", done: 4, total: 5, overdue: 1 },
  { id: "plan", name: "治疗方案确认", state: "pending", done: 0, total: 2 },
  { id: "or", name: "手术及术后", state: "pending", done: 0, total: 1 },
];

const ROWS: KitGanttRow[] = [
  {
    id: "T-101",
    name: "入院评估与病史采集",
    group: "术前评估",
    role: "医生",
    start: "2026-11-24T14:00:00+09:00",
    end: "2026-11-24T18:00:00+09:00",
    actualStart: "2026-11-24T15:00:00+09:00",
    actualEnd: "2026-11-24T17:05:00+09:00",
    status: "done",
  },
  {
    id: "T-102",
    name: "入院护理评估",
    group: "术前评估",
    role: "护士",
    start: "2026-11-24T14:00:00+09:00",
    end: "2026-11-24T20:00:00+09:00",
    actualStart: "2026-11-24T15:20:00+09:00",
    actualEnd: "2026-11-24T17:40:00+09:00",
    status: "done",
  },
  {
    id: "T-103",
    name: "入院实验室检验",
    group: "术前检查",
    role: "医生",
    start: "2026-11-24T16:00:00+09:00",
    end: "2026-11-24T22:00:00+09:00",
    actualStart: "2026-11-24T16:30:00+09:00",
    actualEnd: "2026-11-24T18:00:00+09:00",
    status: "done",
  },
  {
    id: "T-105",
    name: "上腹部增强 MRI",
    group: "术前检查",
    role: "医生",
    start: "2026-11-25T08:00:00+09:00",
    end: "2026-11-25T18:00:00+09:00",
    actualStart: "2026-11-25T09:30:00+09:00",
    actualEnd: "2026-11-25T10:45:00+09:00",
    status: "done",
  },
  {
    id: "T-106",
    name: "胸部 CT 与心肺功能评估",
    group: "术前检查",
    role: "医生",
    start: "2026-11-25T08:00:00+09:00",
    end: "2026-11-26T18:00:00+09:00",
    actualStart: "2026-11-26T09:00:00+09:00",
    actualEnd: "2026-11-26T11:20:00+09:00",
    status: "done",
  },
  {
    id: "T-107",
    name: "ICG 清除试验",
    group: "术前检查",
    role: "医生",
    start: "2026-11-26T08:00:00+09:00",
    end: "2026-11-26T12:00:00+09:00",
    actualStart: "2026-11-26T09:20:00+09:00",
    actualEnd: "2026-11-26T10:05:00+09:00",
    status: "done",
  },
  {
    id: "T-108",
    name: "营养风险筛查（NRS 2002）",
    group: "术前检查",
    role: "护士",
    start: "2026-11-26T08:00:00+09:00",
    end: "2026-11-27T11:00:00+09:00",
    actualStart: "2026-11-26T08:00:00+09:00",
    status: "overdue",
  },
  {
    id: "T-109",
    name: "麻醉会诊与评估",
    group: "治疗方案确认",
    role: "麻醉",
    start: "2026-11-28T08:00:00+09:00",
    end: "2026-11-28T12:00:00+09:00",
    status: "pending",
  },
  {
    id: "T-110",
    name: "MDT 讨论",
    group: "治疗方案确认",
    role: "医生",
    start: "2026-11-28T14:00:00+09:00",
    end: "2026-11-28T18:00:00+09:00",
    status: "pending",
  },
  {
    id: "T-113",
    name: "肝段切除术（S6）",
    group: "手术及术后",
    role: "主刀",
    start: "2026-11-30T08:00:00+09:00",
    end: "2026-11-30T18:00:00+09:00",
    status: "pending",
  },
];

/**
 * B Segments + F Swimlane composition preview.
 * /dev/desgin/combo
 */
export default function ComboGalleryPage() {
  const [stageId, setStageId] = useState("exam");
  const [taskId, setTaskId] = useState("T-108");
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const theme: KitTheme = mode === "dark" ? THEME_DARK : THEME_LIGHT;
  const pageBg = mode === "dark" ? THEME_DARK.page : VIZ.page;

  return (
    <div className="min-h-screen" style={{ background: pageBg, color: theme.ink, fontFamily: VIZ.font }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-md"
        style={{
          borderColor: theme.line,
          background: mode === "dark" ? "rgba(15,16,18,0.9)" : "rgba(248,248,246,0.9)",
        }}
      >
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[-0.02em]">Combo · Segments + Swimlane</h1>
            <p className="text-[12px]" style={{ color: theme.muted }}>
              /dev/desgin/combo · B + F 组合预览
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Link
              to="/dev/desgin"
              className="rounded-md border px-2.5 py-1"
              style={{ borderColor: theme.line, color: theme.muted }}
            >
              Viz Kit
            </Link>
            <Link
              to="/dev/desgin/pathway"
              className="rounded-md border px-2.5 py-1"
              style={{ borderColor: theme.line, color: theme.muted }}
            >
              Pathway
            </Link>
            <Link
              to="/dev/desgin/tasks"
              className="rounded-md border px-2.5 py-1"
              style={{ borderColor: theme.line, color: theme.muted }}
            >
              Tasks
            </Link>
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: theme.lineStrong, background: theme.card, color: theme.ink }}
            >
              Combo
            </span>
            <div
              className="ml-1 inline-flex rounded-md border p-0.5"
              style={{ borderColor: theme.line, background: theme.card }}
            >
              {(["dark", "light"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: mode === m ? theme.ink : "transparent",
                    color: mode === m ? theme.onInk : theme.muted,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-4 px-4 py-5 pb-20">
        <p className="max-w-2xl text-[13px] leading-5" style={{ color: theme.muted }}>
          点上方分段条或左侧阶段名，泳道会聚焦该阶段（其它变淡）；再点同一阶段取消聚焦。任务条可点选。
        </p>

        <PathwaySegmentsSwimlaneCombo
          stages={STAGES}
          rows={ROWS}
          pathwayName={PATHWAY}
          progress={PROGRESS}
          now={NOW}
          theme={theme}
          selectedStageId={stageId || undefined}
          selectedTaskId={taskId}
          onSelectStage={setStageId}
          onSelectTask={setTaskId}
        />

        <section
          className="rounded-[10px] border p-4"
          style={{ background: theme.card, borderColor: theme.line, boxShadow: theme.shadow }}
        >
          <h3 className="text-[13px] font-semibold">状态</h3>
          <p className="mt-2 text-[12px]" style={{ color: theme.muted }}>
            阶段{" "}
            <code className="font-mono" style={{ color: theme.ink }}>
              {stageId || "（全部）"}
            </code>
            {" · "}
            任务{" "}
            <code className="font-mono" style={{ color: theme.ink }}>
              {taskId}
            </code>
          </p>
        </section>
      </main>
    </div>
  );
}
