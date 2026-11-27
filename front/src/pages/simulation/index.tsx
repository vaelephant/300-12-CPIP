import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  Boxes,
  CheckCircle2,
  Clock4,
  Download,
  Layers,
  Loader2,
  Play,
  Router,
  ShieldOff,
  Users,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { TrajectorySimulator } from "@/visualization/simulation/TrajectorySimulator";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { CHART_COLOR, TrendChart } from "@/components/charts/chart-kit";
import { CostEffectScatter, FanChart, type FanSeries } from "@/components/charts/advanced";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SIMULATION_SCENARIOS,
  SIMULATION_RESULTS,
  ADAPTER_STATUS,
  PREDICTION_RECORDS,
  PATHWAYS,
} from "@/data";
import { COST_EFFECT_POINTS, SIM_UNCERTAINTY } from "@/data/visuals";
import { cn, fmtDate, relTime } from "@/lib/utils";

/* ===========================================================================
 * M09 · 路径模拟（P1）
 * 全部结果为合成推演：合成数据、模型未验证、clinical_use = false。
 * 推演为确定性演示，不包含随机概率，不表示真实临床风险。
 * ========================================================================= */

const HORIZON_OPTIONS = ["7", "14", "30"];
const COHORT_OPTIONS = ["50", "100", "200"];
const RESOURCE_PROFILES = [
  "标准床位与手术间配置",
  "手术间容量受限（-10%）",
  "日间病房 6 张",
];

const TRAJECTORY_SERIES = [
  { key: "standard", label: "标准路径", color: CHART_COLOR["chart-1"], unit: "%" },
  { key: "eras", label: "ERAS 加速路径", color: CHART_COLOR["chart-2"], unit: "%" },
  { key: "national", label: "国家基线", color: CHART_COLOR["chart-4"], unit: "%", dashed: true },
];

const FAN_SERIES: FanSeries[] = [
  { key: "standard", bandKey: "standardBand", label: "标准路径", color: CHART_COLOR["chart-1"] },
  { key: "eras", bandKey: "erasBand", label: "ERAS 加速路径", color: CHART_COLOR["chart-2"] },
];

const PREDICTION_STATUS_META: Record<
  (typeof PREDICTION_RECORDS)[number]["status"],
  { label: string; tone: "ok" | "warn" | "risk" | "info" | "neutral" }
> = {
  SIMULATED: { label: "已生成推演", tone: "info" },
  UNAVAILABLE: { label: "不可用 · 已回退", tone: "risk" },
  FAILED: { label: "推演失败", tone: "risk" },
};

export default function SimulationPage() {
  const [scenarioId, setScenarioId] = useState(SIMULATION_SCENARIOS[0].id);
  const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId) ?? SIMULATION_SCENARIOS[0];

  const [horizon, setHorizon] = useState(String(scenario.horizonDays));
  const [cohort, setCohort] = useState(String(scenario.cohortSize));
  const [resourceProfile, setResourceProfile] = useState(scenario.resourceProfile);
  const [running, setRunning] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Record<string, string>>({});
  const [lastRun, setLastRun] = useState<{ horizon: number; cohort: number; profile: string } | null>(null);

  const result = useMemo(
    () => SIMULATION_RESULTS.find((r) => r.scenarioId === scenario.id) ?? SIMULATION_RESULTS[0],
    [scenario.id],
  );

  const mwm = ADAPTER_STATUS.find((a) => a.key === "mwm");
  const resultAt = generatedAt[scenario.id] ?? result.generatedAt;

  function selectScenario(id: string) {
    const next = SIMULATION_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setHorizon(String(next.horizonDays));
    setCohort(String(next.cohortSize));
    setResourceProfile(next.resourceProfile);
    setRunning(false);
    toast("已切换推演情景", {
      description: `${next.name}。当前显示该情景最近一次推演结果。`,
    });
  }

  function runSimulation() {
    if (running) return;
    setRunning(true);
    window.setTimeout(() => {
      setGeneratedAt((prev) => ({ ...prev, [scenario.id]: new Date().toISOString() }));
      setLastRun({ horizon: Number(horizon), cohort: Number(cohort), profile: resourceProfile });
      setRunning(false);
      toast.warning("本次为研究推演结果", {
        description:
          "clinical_use = false，不可用于临床决策或患者沟通。",
      });
    }, 900);
  }

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

  function exportReport() {
    toast.success("推演报告导出已创建", {
      description: "导出标注 clinical_use = false；行为写入审计日志。",
    });
  }

  return (
    <Page>
      <PageHeader
        module="M09 · 路径模拟"
        title="路径模拟"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="推演引擎" value="MWM · Mock Provider" mono />
            <PageMeta label="情景" value={`${SIMULATION_SCENARIOS.length} 个`} />
            <PageMeta label="最近推演" value={fmtDate(resultAt, true)} mono />
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="size-3.5" />
            导出推演报告
          </Button>
        }
      />

      {/* --------------------------- 合成数据警示 --------------------------- */}
      <div className="rounded-lg border border-risk/30 bg-risk-wash/60 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <AlertOctagon className="mt-0.5 size-4 shrink-0 text-risk" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-risk">研究推演 · 模型未验证 · 不可用于临床决策</p>
              <span className="rounded-[3px] border border-risk/25 bg-card px-1.5 py-px font-mono text-[10px] text-risk">
                clinical_use = false
              </span>
              <StatusBadge tone="info">研究推演</StatusBadge>
            </div>
            <p className="mt-1.5 max-w-[880px] text-[11.5px] leading-relaxed text-foreground/70">
              推演结果不代表真实患者结局、风险概率或费用承诺，禁止用于临床决策、患者沟通与考核。
            </p>
          </div>
          <div className="hidden shrink-0 gap-5 border-l border-risk/20 pl-4 text-[10.5px] lg:flex">
            <div>
              <p className="text-muted-foreground">用途</p>
              <p className="mt-0.5 font-mono text-foreground">容量规划</p>
            </div>
            <div>
              <p className="text-muted-foreground">模型验证</p>
              <p className="mt-0.5 font-mono text-risk">未通过</p>
            </div>
            <div>
              <p className="text-muted-foreground">监管用途</p>
              <p className="mt-0.5 font-mono text-foreground">研究推演</p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------ VIS-012 多路径推演 ------------------------ */}
      <VisualFrame
        className="mt-4"
        title="多路径推演"
        english="World Model Rollout"
        badge={
          <span className="rounded-[3px] border border-info/25 bg-info-wash px-1.5 py-px font-mono text-[9px] tracking-wide text-info">
            VIS-012 / VIS-013
          </span>
        }
        footnote="推演不含随机概率，不代表真实治疗效果；模型版本与适用范围随结果一并展示。"
      >
        <TrajectorySimulator />
      </VisualFrame>

      {/* ---------------------------- 情景卡片 ---------------------------- */}
      <div className="mt-4">
        <SectionHead
          title="推演情景"
          count={SIMULATION_SCENARIOS.length}
          description="选择情景后可调整推演配置并重新运行"
          className="mb-2.5"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {SIMULATION_SCENARIOS.map((s) => {
            const selected = s.id === scenario.id;
            const sp = PATHWAYS.find((p) => p.id === s.pathwayId);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectScenario(s.id)}
                className={cn(
                  "group relative flex flex-col rounded-lg border bg-card px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-primary/40 bg-accent/30 shadow-card"
                    : "border-line hover:border-line-strong hover:bg-secondary/25",
                )}
                aria-pressed={selected}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground">{s.id}</span>
                  {selected ? (
                    <span className="inline-flex items-center gap-1 rounded-[3px] bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                      <CheckCircle2 className="size-3" />
                      已选择
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[13px] leading-snug font-semibold text-foreground">{s.name}</p>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{s.description}</p>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-2.5 text-[10.5px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="size-3" />
                    <dt className="sr-only">路径</dt>
                    <dd className="truncate text-foreground/75">{sp?.name ?? s.pathwayId}</dd>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3" />
                    <dt className="sr-only">队列</dt>
                    <dd className="font-mono text-foreground/75">n = {s.cohortSize}</dd>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock4 className="size-3" />
                    <dt className="sr-only">时间窗</dt>
                    <dd className="font-mono text-foreground/75">{s.horizonDays} 天</dd>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Boxes className="size-3" />
                    <dt className="sr-only">资源</dt>
                    <dd className="truncate text-foreground/75">{s.resourceProfile}</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------- 主体网格 ---------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {/* 配置 */}
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHead title="推演配置" description={`当前情景：${scenario.name}`} />
              <span className="font-mono text-[10px] text-muted-foreground">
                最近运行 {fmtDate(resultAt, true)}
              </span>
            </div>
            <CardContent className="px-4 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">时间窗</label>
                  <Select value={horizon} onValueChange={setHorizon}>
                    <SelectTrigger size="sm" className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HORIZON_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h} 天
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">分析队列规模</label>
                  <Select value={cohort} onValueChange={setCohort}>
                    <SelectTrigger size="sm" className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COHORT_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c} 例
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[220px] space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">资源配置</label>
                  <Select value={resourceProfile} onValueChange={setResourceProfile}>
                    <SelectTrigger size="sm" className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_PROFILES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={runSimulation} disabled={running} className="ml-auto">
                  {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  {running ? "推演中…" : "运行推演"}
                </Button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-[10.5px] text-muted-foreground">
                <span>
                  {running
                    ? "正在生成分析队列并比较候选方案…"
                    : lastRun
                      ? `本次配置：队列 ${lastRun.cohort} 例 · 时间窗 ${lastRun.horizon} 天 · ${lastRun.profile}`
                      : `情景默认配置：队列 ${scenario.cohortSize} 例 · 时间窗 ${scenario.horizonDays} 天 · ${scenario.resourceProfile}`}
                </span>
                <span className="font-mono">deterministic · no random probability</span>
              </div>
            </CardContent>
          </Card>

          {/* 结局指标 */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {result.outcomes.map((o) => (
              <StatCard
                key={o.label}
                label={o.label}
                value={o.value}
                hint={`不确定度：${o.uncertainty}`}
                tone="info"
                
              />
            ))}
          </div>

          {/* 轨迹图 */}
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHead title="队列轨迹" description="队列剩余比例" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {scenario.horizonDays} 天 · n = {cohort}
              </span>
            </div>
            <CardContent className="px-4 py-3">
              <TrendChart
                data={result.trajectories}
                series={TRAJECTORY_SERIES}
                height={208}
                unit="%"
                digits={1}
                yDomain={[0, 100]}
                footnote="曲线由推演引擎确定性生成，不含随机抽样，不代表真实患者脱落率。"
              />
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[10.5px] text-muted-foreground">
                <span>D0 = 入径日；曲线为分析队列剩余比例</span>
                <span className="font-mono">SIMULATED · clinical_use = false</span>
              </div>
            </CardContent>
          </Card>


          {/* 不确定性与成本-效果 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="gap-0 py-0">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <SectionHead title="推演不确定性（P10–P90）" description="标准路径 vs ERAS 加速路径" />
                <span className="rounded-[3px] border border-risk/25 bg-risk-wash px-1.5 py-px font-mono text-[9.5px] text-risk">
                  clinical_use = false
                </span>
              </div>
              <CardContent className="px-4 py-3">
                <FanChart data={SIM_UNCERTAINTY} series={FAN_SERIES} height={206} unit="%" yDomain={[0, 100]} />
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  阴影为推演 P10–P90 区间，实线为中位数；区间宽度为模型不确定性估计，
                  不代表真实临床不确定性，不可用于患者沟通或临床决策。
                </p>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <SectionHead title="成本-效果候选方案" description="次均费用 vs 完成率" />
              </div>
              <CardContent className="px-4 py-3">
                <CostEffectScatter points={COST_EFFECT_POINTS} height={206} />
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  气泡为分析队列规模，虚线为目标基线；推荐点为目标函数下最优，
                  clinical_use = false，不构成临床推荐。
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 比较表 */}
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHead title="候选方案比较" description="推荐项为本次推演中指标最优的候选方案" />
              <span className="font-mono text-[10px] text-muted-foreground">{result.comparison.length} 个方案</span>
            </div>
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">方案</TableHead>
                    <TableHead>住院日</TableHead>
                    <TableHead>费用</TableHead>
                    <TableHead>完成率</TableHead>
                    <TableHead className="pr-4">变异风险</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.comparison.map((row) => (
                    <TableRow
                      key={row.plan}
                      className={cn(
                        row.recommended && "border-l-2 border-l-primary bg-accent/25 hover:bg-accent/35",
                      )}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[12.5px]", row.recommended && "font-medium text-foreground")}>
                            {row.plan}
                          </span>
                          {row.recommended && <StatusBadge tone="ok">推荐</StatusBadge>}
                        </div>
                      </TableCell>
                      <TableCell className="tabular font-mono text-[11.5px]">{row.los}</TableCell>
                      <TableCell className="tabular font-mono text-[11.5px]">{row.cost}</TableCell>
                      <TableCell className="tabular font-mono text-[11.5px]">{row.completion}</TableCell>
                      <TableCell className="tabular pr-4 font-mono text-[11.5px]">{row.risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-line px-4 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                推荐仅表示在本次推演目标函数下指标较优，并非临床推荐；实际方案须由 MDT / 医生结合患者情况决定。
              </div>
            </CardContent>
          </Card>

          {/* 警告 */}
          <Callout tone="warn" title={`推演限制与告警 · ${result.warnings.length} 条`}>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px]">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
              <li>结果未经过临床验证，不得用于患者沟通、考核或监管申报。</li>
            </ul>
          </Callout>
        </div>

        {/* 右栏：MWM 状态 + 预测记录 */}
        <div className="space-y-4 lg:col-span-4">
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
                <Field label="临床使用" value={<span className="font-mono text-risk">clinical_use = false</span>} mono />
                <Field label="输出性质" value="研究概率分布" />
              </div>
              <div className="mt-2 rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                {mwm?.note ?? "研究推演已启用，clinical_use = false"}
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
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  超时或不可用时<b className="font-medium text-foreground/80">回退规则规划</b>，不阻断临床流程，
                  也不会将缺失预测显示为 0。
                </p>
              </div>
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
                    <li key={record.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10.5px] text-foreground/80">{record.id}</span>
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
                        <span className="font-mono">{record.modelId}@{record.modelVersion}</span>
                        <span className="text-line-strong">·</span>
                        <span>provider {record.provider}</span>
                        <span className="text-line-strong">·</span>
                        <span className="font-mono">{relTime(record.createdAt)}</span>
                        <span className="rounded-[3px] border border-risk/25 bg-risk-wash px-1 font-mono text-[9.5px] text-risk">
                          clinical_use = false
                        </span>
                      </div>
                      {record.metrics && record.metrics.length > 0 && (
                        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
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
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-[4px] border border-risk/20 bg-risk-wash/60 px-2 py-1.5 text-[10.5px] leading-relaxed text-risk">
                          <ShieldOff className="mt-px size-3 shrink-0" />
                          <span>
                            {record.warnings[0]}；未生成任何预测结果，已回退至知识 / 规则模式。
                          </span>
                        </div>
                      )}
                      {!unavailable && record.warnings.length > 0 && (
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{record.warnings[0]}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Callout tone="neutral" title="研究推演 · 不呈现真实风险">
            同一情景与配置每次返回一致结果，不包含随机抽样与概率预测，也不以百分比形式呈现真实风险。
          </Callout>

          <Callout tone="info" title="推演结果的正确用途">
            仅用于路径设计评审时的容量与流程讨论，例如比较候选方案在分析队列中的相对差异；不可用于个体患者决策。
          </Callout>
        </div>
      </div>
    </Page>
  );
}
