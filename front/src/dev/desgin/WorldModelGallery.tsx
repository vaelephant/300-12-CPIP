import { Link } from "react-router-dom";
import { WorldModelCanvas, WorldModelStrip, WM } from "./kit/world-model";

/**
 * 世界模型工作台 · Past | Now | Future
 * /dev/desgin/world-model
 */
export default function WorldModelGalleryPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: WM.void, color: WM.ink, fontFamily: WM.sans }}
    >
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-md"
        style={{ borderColor: WM.line, background: "rgba(7,9,12,0.92)" }}
      >
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1
              className="text-[18px] tracking-[-0.03em]"
              style={{ fontFamily: WM.display, fontWeight: 600 }}
            >
              World Model · 过去现在未来
            </h1>
            <p className="mt-0.5 font-mono text-[11px]" style={{ color: WM.mute }}>
              /dev/desgin/world-model · WM-01 / WM-02
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-[12px]">
            {(
              [
                ["/dev/desgin", "Viz Kit"],
                ["/dev/desgin/live-pathway", "Live"],
                ["/dev/desgin/combo", "Combo"],
              ] as const
            ).map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="rounded-md border px-2.5 py-1"
                style={{ borderColor: WM.line, color: WM.mute }}
              >
                {label}
              </Link>
            ))}
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: WM.simLine, color: WM.sim, background: WM.simSoft }}
            >
              World Model
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-5 px-4 py-6 pb-20">
        <p className="max-w-2xl text-[13px] leading-6" style={{ color: WM.mute }}>
          上轨是传统临床路径阶段（医生已熟悉），下画布是 Past / Now / Future：左侧实线回放已执行事件，中间锋线是当前状态，右侧青绿虚线是研究情景。
          点阶段可过滤回放；选分支只改推演面板，不会激活计划。
        </p>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: WM.simSoft, color: WM.sim }}
            >
              WM-01
            </span>
            <h2 className="text-[13px] font-semibold">WorldModelCanvas</h2>
          </div>
          <WorldModelCanvas />
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: WM.simSoft, color: WM.sim }}
            >
              WM-02
            </span>
            <h2 className="text-[13px] font-semibold">WorldModelStrip</h2>
            <span className="text-[12px]" style={{ color: WM.dim }}>
              工作空间压缩条
            </span>
          </div>
          <WorldModelStrip />
        </section>

        <section
          className="rounded-[12px] border px-4 py-3 text-[12px] leading-5"
          style={{ borderColor: WM.line, background: WM.panel, color: WM.mute }}
        >
          <p style={{ color: WM.ink }} className="font-medium">
            设计意图
          </p>
          <ul className="mt-2 space-y-1">
            <li>先给标准路径阶段轨，再叠世界模型，降低「不了解过去」的认知门槛。</li>
            <li>真实 / 推演用实线 vs 虚线、石墨 vs 青绿编码，避免紫色「AI 默认」。</li>
            <li>右侧始终带 clinical_use=false / RESEARCH ONLY，防止与生效计划混淆。</li>
            <li>动效只服务三件事：过去入场、现在脉动、分支描边。</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
