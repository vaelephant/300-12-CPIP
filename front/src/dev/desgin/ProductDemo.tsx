import { Link } from "react-router-dom";
import { ClinicalObservatory } from "@/components/patient/clinical-observatory";
import { useAppWmTone, WM_FIXTURE } from "./kit/world-model";

/**
 * 产品定位 Demo · 临床路径 × CDSS × 世界模型
 * /dev/desgin/product-demo · 跟随系统 light/dark
 */
export default function ProductDemoPage() {
  const WM = useAppWmTone();

  return (
    <div className="min-h-screen" style={{ background: WM.void, color: WM.ink, fontFamily: WM.sans }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      />

      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: WM.line, background: WM.mode === "dark" ? "rgba(7,9,12,0.92)" : "rgba(255,255,255,0.92)" }}
      >
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em]" style={{ color: WM.sim }}>
              HCC-CIP · PRODUCT DEMO · {WM.mode.toUpperCase()}
            </p>
            <h1 className="text-[18px] tracking-[-0.03em]" style={{ fontFamily: WM.display, fontWeight: 600 }}>
              临床观测台 · 路径 + CDSS + 世界模型
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-[12px]">
            <Link to="/dev/desgin" className="rounded-md border px-2.5 py-1" style={{ borderColor: WM.line, color: WM.mute }}>
              Viz Kit
            </Link>
            <Link
              to="/dev/desgin/world-model"
              className="rounded-md border px-2.5 py-1"
              style={{ borderColor: WM.line, color: WM.mute }}
            >
              WM 组件
            </Link>
            <Link
              to="/patients/HCC-DEMO-001"
              className="rounded-md border px-2.5 py-1"
              style={{ borderColor: WM.line, color: WM.mute }}
            >
              患者观测台
            </Link>
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: WM.simLine, color: WM.sim, background: WM.simSoft }}
            >
              Product Demo
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 pb-16">
        <section
          className="rounded-[14px] border px-5 py-4"
          style={{ borderColor: WM.lineStrong, background: WM.panel }}
        >
          <p className="font-mono text-[10px]" style={{ color: WM.dim }}>
            DEMO PATIENT · 非生产数据 · 主题跟随系统
          </p>
          <p className="mt-1 text-[22px] tracking-[-0.03em]" style={{ fontFamily: WM.display, fontWeight: 600 }}>
            {WM_FIXTURE.patient}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: WM.mute }}>
            {WM_FIXTURE.pathway} · 进度 {WM_FIXTURE.progress}% · 点右上角切换浅色/深色即可验证
          </p>
        </section>

        <ClinicalObservatory showPillars />

        <section
          className="rounded-[12px] border px-4 py-3 text-[12px] leading-5"
          style={{ borderColor: WM.line, background: WM.panel, color: WM.mute }}
        >
          <p className="font-medium" style={{ color: WM.ink }}>
            本 Demo 要证明的产品叙事
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>临床路径提供「大家认得」的执行骨架。</li>
            <li>CDSS 钉在 Now：阻断、证据、可审核动作；与画布双向联动。</li>
            <li>世界模型提供 Past 审计与 Future 研究情景，激活必须过闸。</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
