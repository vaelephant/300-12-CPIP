import { Link } from "react-router-dom";
import { ArrowRight, Compass, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { Page, PageHeader } from "@/components/app/page-header";
import { Callout, SectionHead, SyntheticTag } from "@/components/app/section";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VISUALIZATION_REGISTRY } from "@/visualization/core/registry";

const CAPABILITIES = [
  { zh: "可设计", en: "Design", desc: "节点、规则、时间约束、证据统一为 Pathway Schema" },
  { zh: "可挖掘", en: "Discover", desc: "从真实事件日志发现实际流程、偏差与瓶颈" },
  { zh: "可规划", en: "Plan", desc: "状态快照 → 规则计算 → 候选计划 → 安全校验" },
  { zh: "可执行", en: "Execute", desc: "任务状态机、临床事件驱动、超时与变异处理" },
  { zh: "可预测", en: "Predict", desc: "多路径推演与不确定性区间，明确标注非临床用途" },
  { zh: "可优化", en: "Optimize", desc: "覆盖、完成、变异与效率指标持续回流" },
];

export default function AboutPage() {
  const ready = VISUALIZATION_REGISTRY.filter((v) => v.status !== "planned").slice(0, 6);
  return (
    <Page>
      <PageHeader
        module="PRODUCT DEFINITION · V0.6.1"
        eyebrow="HCC Clinical Intelligence Platform"
        title="关于平台"
        actions={<SyntheticTag />}
      />

      {/* 产品定义 —— 对应产品定义图 */}
      <Card className="overflow-hidden">
        <CardContent className="px-7 py-7 sm:px-10 sm:py-9">
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Product Definition · V0.6.1</p>
          <h1 className="mt-3 text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[30px]">
            原发性肝癌智能临床路径平台
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">Liver Cancer Clinical Pathway Platform</p>
          <div className="my-6 h-px bg-line" />
          <p className="max-w-[880px] text-[13.5px] leading-[1.9] text-foreground/80">
            当期定位为<strong>可审计的肝癌临床路径旁路工具</strong>：以患者状态与三值规则组织入径、规划、执行、变异与随访，医生审核后生效，不自主下医嘱。
            预测模型与器械/CDSS 取证沿同一证据链升级，当前 `clinical_use=false`，取证为后续期权而非当期交付。
          </p>

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <div key={cap.zh} className="border-t border-line pt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[16px] font-semibold tracking-tight">{cap.zh}</span>
                  <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">{cap.en}</span>
                </div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">{cap.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <SectionHead title="平台定位" description="从标准路径到全病程智能管理" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { icon: Compass, title: "专病旁路", desc: "聚焦原发性肝癌；挂接 HIS 旁路，不替换主系统，医生保留最终决策权。" },
              { icon: Layers3, title: "状态驱动闭环", desc: "快照 · 三值规则 · 条件图执行 · 重评重规划；Server 模式同一套服务端状态。" },
              { icon: ShieldCheck, title: "可解释与可审核", desc: "审批指纹、审计事件、契约校验；未配置能力诚实 503，不造假成功。" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-2.5 rounded-md border border-line bg-secondary/25 px-3 py-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-accent text-accent-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHead title="可视化能力" description="Clinical Visualization Engine · 注册表节选" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ready.map((vis) => (
              <div key={vis.id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">{vis.id}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{vis.name}</span>
                <span className="font-mono text-[8.5px] text-muted-foreground/60">P{vis.phase}</span>
                {vis.href && (
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link to={vis.href} aria-label={`打开 ${vis.name}`}>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
            <p className="pt-1 text-[9.5px] leading-relaxed text-muted-foreground/70">
              完整注册表见 `src/visualization/core/registry.ts`，覆盖 VIS-001–VIS-016 的三阶段规划。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHead title="当前版本边界" description="V0.6.1" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Callout tone="info" title="产品边界">
              预测与推演标记 `clinical_use = false`；Demo 模式仅界面概念，融资主演示用 Server 模式。器械注册不作为当期承诺。
            </Callout>
            <div className="rounded-md border border-line bg-secondary/25 px-3 py-2.5">
              <p className="text-[11px] font-medium">Server 可点闭环</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                患者 / 路径 / 任务 / 规划 / 审批 / 重评 / 变异 / 随访 / 分析 / 审计；验收病例 HCC-DEMO-001 · PW-HCC-001。
              </p>
            </div>
            <div className="rounded-md border border-line bg-secondary/25 px-3 py-2.5">
              <p className="text-[11px] font-medium">研究预览 / 期权</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                知识库 · 模拟 · 世界模型观测台 · 院长驾驶舱（Demo 可视化）；HIS 适配与 CDSS 取证为路线图期权。
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/about/tech">
                技术附录 · 契约与状态机
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3" />
          旁路闭环 · 契约驱动 · 取证作期权
        </span>
        <span className="font-mono">HCC-CIP · V0.6.1 · BYPASS TOOL</span>
      </div>
    </Page>
  );
}
