import { useState } from "react";
import { Link } from "react-router-dom";
import { VIZ } from "./kit/tokens";
import {
  LivePathwayFocusPath,
  LivePathwayQuietGraph,
  LivePathwayStageSwim,
  THEME_DARK,
  THEME_LIGHT,
} from "./kit/live-pathway";
import type { KitTheme } from "./kit/stage-tasks";

/**
 * 动态临床路径图候选 · VIS-001 替换预览
 * /dev/desgin/live-pathway
 */
export default function LivePathwayGalleryPage() {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const theme: KitTheme = mode === "dark" ? THEME_DARK : THEME_LIGHT;
  const pageBg = mode === "dark" ? THEME_DARK.page : VIZ.page;

  return (
    <div className="min-h-screen" style={{ background: pageBg, color: theme.ink, fontFamily: VIZ.font }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-md"
        style={{
          borderColor: theme.line,
          background: mode === "dark" ? "rgba(15,16,18,0.92)" : "rgba(248,248,246,0.92)",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[-0.02em]">Live Pathway · 动态路径</h1>
            <p className="text-[12px]" style={{ color: theme.muted }}>
              /dev/desgin/live-pathway · LP-01…03 · 替换 VIS-001 候选
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-[12px]">
            <Link to="/dev/desgin" className="rounded-md border px-2.5 py-1" style={{ borderColor: theme.line, color: theme.muted }}>
              Viz Kit
            </Link>
            <Link to="/dev/desgin/pathway" className="rounded-md border px-2.5 py-1" style={{ borderColor: theme.line, color: theme.muted }}>
              Pathway
            </Link>
            <Link to="/dev/desgin/tasks" className="rounded-md border px-2.5 py-1" style={{ borderColor: theme.line, color: theme.muted }}>
              Tasks
            </Link>
            <Link to="/dev/desgin/combo" className="rounded-md border px-2.5 py-1" style={{ borderColor: theme.line, color: theme.muted }}>
              Combo
            </Link>
            <Link to="/dev/desgin/world-model" className="rounded-md border px-2.5 py-1" style={{ borderColor: theme.line, color: theme.muted }}>
              World Model
            </Link>
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: theme.lineStrong, background: theme.card, color: theme.ink }}
            >
              Live
            </span>
            <div className="ml-1 inline-flex rounded-md border p-0.5" style={{ borderColor: theme.line, background: theme.card }}>
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
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-4 px-4 py-5 pb-20">
        <p className="max-w-2xl text-[13px] leading-5" style={{ color: theme.muted }}>
          现网 VIS-001（`LivePathwayGraph`）节点卡偏「卡片墙」。下面三版用墨色状态 + 暖色只标变异/阻塞；数据来自
          HCC 标准路径图 + 演示状态表。确认后再替换业务页。
        </p>

        <LivePathwayQuietGraph theme={theme} />

        <div className="grid gap-4 lg:grid-cols-2">
          <LivePathwayStageSwim theme={theme} />
          <LivePathwayFocusPath theme={theme} />
        </div>

        <section
          className="rounded-[10px] border p-4 text-[12px] leading-5"
          style={{ borderColor: theme.line, background: theme.card, color: theme.muted }}
        >
          <h3 className="text-[13px] font-semibold" style={{ color: theme.ink }}>
            编号
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <code className="font-mono" style={{ color: theme.ink }}>
                LP-01 QuietGraph
              </code>{" "}
              — 完整动态图（主推荐，对齐路径图页）
            </li>
            <li>
              <code className="font-mono" style={{ color: theme.ink }}>
                LP-02 StageSwim
              </code>{" "}
              — 阶段泳道胶囊，适合总览
            </li>
            <li>
              <code className="font-mono" style={{ color: theme.ink }}>
                LP-03 FocusPath
              </code>{" "}
              — 当前附近节点，适合工作空间嵌套
            </li>
          </ul>
          <p className="mt-2">
            组件：
            <code className="ml-1 font-mono" style={{ color: theme.ink }}>
              kit/live-pathway.tsx
            </code>
          </p>
        </section>
      </main>
    </div>
  );
}
