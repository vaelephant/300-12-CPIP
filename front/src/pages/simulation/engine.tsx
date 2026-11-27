import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Router, ShieldOff } from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { CostEffectScatter } from "@/components/charts/advanced";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ADAPTER_STATUS,
  PREDICTION_RECORDS,
  SIMULATION_RESULTS,
} from "@/data";
import { COST_EFFECT_POINTS } from "@/data/visuals";
import { relTime } from "@/lib/utils";
import { SimulationSubnav } from "./subnav";

/* ===========================================================================
 * M09 · 路径模拟 · 引擎与记录
 * MWM 状态、预测审计、成本-效果与推演限制。与工作台解耦。
 * ========================================================================= */

const PREDICTION_STATUS_META: Record<
  (typeof PREDICTION_RECORDS)[number]["status"],
  { label: string; tone: "ok" | "warn" | "risk" | "info" | "neutral" }
> = {
  SIMULATED: { label: "已生成推演", tone: "info" },
  UNAVAILABLE: { label: "不可用 · 已回退", tone: "risk" },
  FAILED: { label: "推演失败", tone: "risk" },
};

export default function SimulationEnginePage() {
  const [testingProvider, setTestingProvider] = useState(false);
  const mwm = ADAPTER_STATUS.find((a) => a.key === "mwm");
  const warnings = Array.from(new Set(SIMULATION_RESULTS.flatMap((r) => r.warnings)));

  function testProvider() {
    if (testingProvider) return;
    setTestingProvider(true);
    window.setTimeout(() => {
      setTestingProvider(false);
      toast("Mock Provider 连通性正常", {
        description: `响应 ${mwm?.latency ?? "42 ms"}；仅返回研究分布，未做临床验证。`,
      });
    }, 700);
  }

  return (
    <Page>
      <PageHeader
        module="M09 · 路径模拟"
        title="引擎与记录"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="推演引擎" value="MWM · Mock Provider" mono />
            <PageMeta label="记录" value={`${PREDICTION_RECORDS.length} 条`} />
          </>
        }
      />

      <SimulationSubnav />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHead title="MWM 医疗世界模型" description={mwm?.mode ?? "Mock Provider"} />
              <StatusBadge tone="warn" dot pulse>
                {mwm?.status ?? "SIMULATED"}
              </StatusBadge>
            </div>
            <CardContent className="px-4 py-2.5">
              <div className="divide-y divide-line">
                <Field label="适配器" value="world-model-adapter" mono />
                <Field label="响应延迟" value={mwm?.latency ?? "42 ms"} mono />
                <Field
                  label="临床使用"
                  value={<span className="font-mono text-risk">clinical_use = false</span>}
                  mono
                />
                <Field label="输出性质" value="研究概率分布" />
              </div>
              <div className="mt-2.5 space-y-1.5">
                <p className="label-micro">回退策略</p>
                <ol className="space-y-1 text-[11px] text-foreground/75">
                  <li className="flex gap-1.5">
                    <span className="font-mono text-muted-foreground">1</span>
                    请求 MWM，超时阈值 2.5s
                  </li>
                  <li className="flex gap-1.5">
                    <span className="font-mono text-muted-foreground">2</span>
                    标记 UNAVAILABLE，不生成任何预测
                  </li>
                  <li className="flex gap-1.5">
                    <span className="font-mono text-muted-foreground">3</span>
                    回退知识 / 规则规划，医生可手动确认
                  </li>
                </ol>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                {mwm?.note ?? "研究推演已启用"}。超时不阻断流程，也不将缺失预测显示为 0。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 w-full"
                onClick={testProvider}
                disabled={testingProvider}
              >
                {testingProvider ? <Loader2 className="size-3.5 animate-spin" /> : <Router className="size-3.5" />}
                {testingProvider ? "探测中…" : "测试连通性"}
              </Button>
            </CardContent>
          </Card>

          <Callout tone="info" title="正确用途">
            用于路径设计评审时比较候选方案在分析队列中的相对差异；不可用于个体患者决策。
          </Callout>

          <Callout tone="warn" title={`推演限制 · ${warnings.length} 条`}>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px]">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
              <li>结果未经过临床验证，不得用于患者沟通、考核或监管申报。</li>
            </ul>
          </Callout>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHead title="预测记录" count={PREDICTION_RECORDS.length} description="含不可用 / 回退示例" />
              <span className="font-mono text-[10px] text-muted-foreground">world-model</span>
            </div>
            <CardContent className="px-0 py-0">
              <ul className="divide-y divide-line">
                {PREDICTION_RECORDS.map((record) => {
                  const meta = PREDICTION_STATUS_META[record.status];
                  const unavailable = record.status === "UNAVAILABLE";
                  return (
                    <li key={record.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10.5px] text-foreground/80">{record.id}</span>
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                        <span className="font-mono">
                          {record.modelId}@{record.modelVersion}
                        </span>
                        <span className="text-line-strong">·</span>
                        <span>provider {record.provider}</span>
                        <span className="text-line-strong">·</span>
                        <span className="font-mono">{relTime(record.createdAt)}</span>
                      </div>
                      {record.metrics && record.metrics.length > 0 && (
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                          {record.metrics.map((m) => (
                            <div key={m.label}>
                              <dt className="text-[10px] text-muted-foreground">{m.label}</dt>
                              <dd className="tabular font-mono text-[11px] text-foreground/80">
                                {m.value}
                                {m.uncertainty && (
                                  <span className="ml-1 text-[9.5px] text-muted-foreground">{m.uncertainty}</span>
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {unavailable && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-[4px] border border-risk/20 bg-risk-wash/60 px-2 py-1.5 text-[10.5px] leading-relaxed text-risk">
                          <ShieldOff className="mt-px size-3 shrink-0" />
                          <span>
                            {record.warnings[0]}；未生成任何预测结果，已回退至知识 / 规则模式。
                          </span>
                        </div>
                      )}
                      {!unavailable && record.warnings.length > 0 && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground">{record.warnings[0]}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <div className="border-b border-line px-4 py-3">
              <SectionHead title="成本-效果候选方案" description="次均费用 vs 完成率" />
            </div>
            <CardContent className="px-4 py-3">
              <CostEffectScatter points={COST_EFFECT_POINTS} height={220} />
              <p className="mt-1 text-[10px] text-muted-foreground">
                气泡为分析队列规模；推荐点为目标函数下最优，不构成临床推荐。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}
