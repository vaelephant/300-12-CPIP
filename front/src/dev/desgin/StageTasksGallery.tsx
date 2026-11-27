import { useState } from "react";
import { Link } from "react-router-dom";
import { VIZ } from "./kit/tokens";
import {
  StageTasksChecklist,
  StageTasksFocus,
  StageTasksIssue,
  StageTasksQueue,
  THEME_DARK,
  THEME_LIGHT,
  type KitTask,
  type KitTheme,
} from "./kit/stage-tasks";
import { StageTasksGantt, StageTasksSwimlane, type KitGanttRow } from "./kit/stage-gantt";

const NOW = "2026-11-27T02:00:00+09:00";

const FIXTURE: KitTask[] = [
  {
    id: "T-103",
    name: "入院实验室检验",
    role: "医生",
    assignee: "李文博",
    due: "11-24 22:00",
    state: "done",
  },
  {
    id: "T-105",
    name: "上腹部增强 MRI",
    role: "医生",
    assignee: "李文博",
    due: "11-25 18:00",
    state: "done",
  },
  {
    id: "T-106",
    name: "胸部 CT 与心肺功能评估",
    role: "医生",
    assignee: "李文博",
    due: "11-26 18:00",
    state: "done",
  },
  {
    id: "T-107",
    name: "ICG 清除试验",
    role: "医生",
    assignee: "李文博",
    due: "11-26 12:00",
    state: "done",
  },
  {
    id: "T-108",
    name: "营养风险筛查（NRS 2002）",
    role: "护士",
    assignee: "赵倩",
    due: "今天 11:00",
    state: "ready",
    overdue: true,
  },
];

/** 含跨阶段，便于看泳道 */
const GANTT_ROWS: KitGanttRow[] = [
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

const STAGE_ROWS = GANTT_ROWS.filter((r) => r.group === "术前检查");
const STAGE = "术前检查";

/**
 * Stage task candidates — list + gantt.
 * Preview: /dev/desgin/tasks
 */
export default function StageTasksGalleryPage() {
  const [selected, setSelected] = useState("T-108");
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
            <h1 className="text-[16px] font-semibold tracking-[-0.02em]">Stage Tasks · 甘特优先</h1>
            <p className="text-[12px]" style={{ color: theme.muted }}>
              /dev/desgin/tasks · E/F 甘特 + A–D 列表
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Link
              to="/dev/desgin"
              className="rounded-md border px-2.5 py-1 transition-colors"
              style={{ borderColor: theme.line, color: theme.muted }}
            >
              Viz Kit
            </Link>
            <Link
              to="/dev/desgin/pathway"
              className="rounded-md border px-2.5 py-1 transition-colors"
              style={{ borderColor: theme.line, color: theme.muted }}
            >
              Pathway
            </Link>
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: theme.lineStrong, background: theme.card, color: theme.ink }}
            >
              Tasks
            </span>
            <Link
              to="/dev/desgin/combo"
              className="rounded-md border px-2.5 py-1 transition-colors"
              style={{ borderColor: theme.line, color: theme.muted }}
            >
              Combo →
            </Link>
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
          按你的反馈，本阶段任务改成甘特时间轴：计划窗口浅条、实际执行实条、现在线标超时。E
          适合「本阶段」细看；F 泳道适合整条路径总览。
        </p>

        <StageTasksGantt
          rows={STAGE_ROWS}
          stage={STAGE}
          now={NOW}
          theme={theme}
          selectedId={selected}
          onSelect={setSelected}
        />

        <StageTasksSwimlane
          rows={GANTT_ROWS}
          now={NOW}
          theme={theme}
          selectedId={selected}
          onSelect={setSelected}
        />

        <p className="pt-2 text-[12px] font-medium tracking-[0.04em] uppercase" style={{ color: theme.muted }}>
          备选 · 列表形态
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <StageTasksQueue tasks={FIXTURE} stage={STAGE} theme={theme} onSelect={setSelected} />
          <StageTasksIssue
            tasks={FIXTURE}
            stage={STAGE}
            theme={theme}
            selectedId={selected}
            onSelect={setSelected}
          />
          <StageTasksChecklist tasks={FIXTURE} stage={STAGE} theme={theme} onSelect={setSelected} />
          <StageTasksFocus tasks={FIXTURE} stage={STAGE} theme={theme} />
        </div>

        <section
          className="rounded-[10px] border p-4"
          style={{ background: theme.card, borderColor: theme.line, boxShadow: theme.shadow }}
        >
          <h3 className="text-[13px] font-semibold">怎么选</h3>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-5" style={{ color: theme.muted }}>
            <li>
              <strong style={{ color: theme.ink }}>E Gantt</strong> — 本阶段任务主推荐：一眼看出延误与并行窗口。
            </li>
            <li>
              <strong style={{ color: theme.ink }}>F Swimlane</strong> — 整路径阶段泳道；可放在路径区替代色块阶段卡。
            </li>
            <li>
              <strong style={{ color: theme.ink }}>A–D</strong> — 列表备选；可与甘特上下叠放（上甘特、下待办）。
            </li>
          </ul>
          <p className="mt-3 text-[12px]" style={{ color: theme.muted }}>
            选中任务 id：
            <code className="ml-1 font-mono" style={{ color: theme.ink }}>
              {selected}
            </code>
          </p>
        </section>
      </main>
    </div>
  );
}
