import { useState } from "react";
import { Link } from "react-router-dom";
import { VIZ } from "./kit/tokens";
import {
  PathwayFocus,
  PathwayMilestones,
  PathwaySegments,
  PathwaySpine,
  type KitStage,
} from "./kit/pathway";

const FIXTURE: KitStage[] = [
  { id: "admit", name: "入院评估", state: "done", done: 6, total: 6 },
  { id: "lab", name: "检验检查", state: "done", done: 8, total: 8 },
  { id: "dx", name: "诊断确认", state: "active", done: 3, total: 5, overdue: 1 },
  { id: "tx", name: "治疗执行", state: "pending", done: 0, total: 7 },
  { id: "monitor", name: "疗效观察", state: "pending", done: 0, total: 4 },
  { id: "discharge", name: "出院准备", state: "pending", done: 0, total: 5 },
];

const PROGRESS = 42;
const PATHWAY = "社区获得性肺炎 · 标准路径";

/**
 * Pathway stage candidates — pick one before wiring into Clinical Workspace.
 * Preview: /dev/desgin/pathway
 */
export default function PathwayGalleryPage() {
  const [selected, setSelected] = useState("dx");

  return (
    <div className="min-h-screen" style={{ background: VIZ.page, color: VIZ.ink, fontFamily: VIZ.font }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-md"
        style={{ borderColor: VIZ.line, background: "rgba(248,248,246,0.9)" }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[-0.02em]">Pathway · 阶段轨</h1>
            <p className="text-[12px]" style={{ color: VIZ.muted }}>
              /dev/desgin/pathway · 替换 StageProgressStrip 候选
            </p>
          </div>
          <nav className="flex items-center gap-2 text-[12px]">
            <Link
              to="/dev/desgin"
              className="rounded-md border px-2.5 py-1 transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.muted }}
            >
              Viz Kit
            </Link>
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: VIZ.lineStrong, background: VIZ.card, color: VIZ.ink }}
            >
              Pathway
            </span>
            <Link
              to="/dev/desgin/tasks"
              className="rounded-md border px-2.5 py-1 transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.muted }}
            >
              Tasks
            </Link>
            <Link
              to="/dev/desgin/combo"
              className="rounded-md border px-2.5 py-1 transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.muted }}
            >
              Combo →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-4 px-4 py-5 pb-20">
        <p className="max-w-2xl text-[13px] leading-5" style={{ color: VIZ.muted }}>
          现网 StageProgressStrip 是彩色阶段卡片 + 图标墙，信息密度假高、视觉吵。下面四版都去掉色块卡片，只保留墨色进度与当前焦点。点选会同步到 C 的选中行。
        </p>

        <PathwaySpine
          stages={FIXTURE}
          pathwayName={PATHWAY}
          progress={PROGRESS}
          onSelect={setSelected}
        />

        <PathwaySegments
          stages={FIXTURE}
          pathwayName={PATHWAY}
          progress={PROGRESS}
          onSelect={setSelected}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <PathwayMilestones
            stages={FIXTURE}
            pathwayName={PATHWAY}
            progress={PROGRESS}
            selectedId={selected}
            onSelect={setSelected}
          />
          <PathwayFocus stages={FIXTURE} pathwayName={PATHWAY} progress={PROGRESS} />
        </div>

        <section
          className="rounded-[10px] border p-4"
          style={{ background: VIZ.card, borderColor: VIZ.line, boxShadow: VIZ.shadowCard }}
        >
          <h3 className="text-[13px] font-semibold" style={{ color: VIZ.ink }}>
            怎么选
          </h3>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-5" style={{ color: VIZ.muted }}>
            <li>
              <strong style={{ color: VIZ.ink }}>A Spine</strong> — 横轨最适合顶栏；当前环 + 进度线，不占高。
            </li>
            <li>
              <strong style={{ color: VIZ.ink }}>B Segments</strong> — 任务量大时一眼比阶段权重；适合分析向。
            </li>
            <li>
              <strong style={{ color: VIZ.ink }}>C Milestones</strong> — 侧栏 / 窄列；和任务列表同构。
            </li>
            <li>
              <strong style={{ color: VIZ.ink }}>D Focus</strong> — 只看「现在该干哪」；适合医生主路径。
            </li>
          </ul>
          <p className="mt-3 text-[12px]" style={{ color: VIZ.muted }}>
            当前选中阶段 id：
            <code className="ml-1 font-mono" style={{ color: VIZ.ink }}>
              {selected}
            </code>
          </p>
        </section>
      </main>
    </div>
  );
}
