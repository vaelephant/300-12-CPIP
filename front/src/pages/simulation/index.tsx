import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  CheckCircle2,
  Clock4,
  Download,
  Layers,
  Loader2,
  Play,
  Users,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { SectionHead, SyntheticTag } from "@/components/app/section";
import { TrajectorySimulator } from "@/visualization/simulation/TrajectorySimulator";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
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
  PATHWAYS,
} from "@/data";
import { cn, fmtDate } from "@/lib/utils";
import { SimulationSubnav } from "./subnav";

/* ===========================================================================
 * M09 · 路径模拟 · 推演工作台
 * 只做一条事：选情景 → 配置运行 → 看主图与方案比较。
 * 引擎状态 / 预测记录 / 成本-效果 → /simulation/engine
 * ========================================================================= */

const COHORT_OPTIONS = ["50", "100", "200"];
const RESOURCE_PROFILES = [
  "标准床位与手术间配置",
  "手术间容量受限（-10%）",
  "日间病房 6 张",
];

export default function SimulationPage() {
  const [scenarioId, setScenarioId] = useState(SIMULATION_SCENARIOS[0].id);
  const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId) ?? SIMULATION_SCENARIOS[0];

  const [cohort, setCohort] = useState(String(scenario.cohortSize));
  const [resourceProfile, setResourceProfile] = useState(scenario.resourceProfile);
  const [running, setRunning] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Record<string, string>>({});
  const [lastRun, setLastRun] = useState<{ cohort: number; profile: string } | null>(null);

  const result = useMemo(
    () => SIMULATION_RESULTS.find((r) => r.scenarioId === scenario.id) ?? SIMULATION_RESULTS[0],
    [scenario.id],
  );

  const resultAt = generatedAt[scenario.id] ?? result.generatedAt;

  function selectScenario(id: string) {
    const next = SIMULATION_SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
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
      setLastRun({ cohort: Number(cohort), profile: resourceProfile });
      setRunning(false);
      toast.warning("本次为研究推演结果", {
        description: "clinical_use = false，不可用于临床决策或患者沟通。",
      });
    }, 900);
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
        title="推演工作台"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="情景" value={scenario.id} mono />
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

      <SimulationSubnav />

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-risk/30 bg-risk-wash/60 px-3.5 py-2.5">
        <AlertOctagon className="size-3.5 shrink-0 text-risk" />
        <p className="text-[12.5px] font-medium text-risk">研究推演 · 不可用于临床决策</p>
        <span className="rounded-[3px] border border-risk/25 bg-card px-1.5 py-px font-mono text-[10px] text-risk">
          clinical_use = false
        </span>
      </div>

      {/* 情景 */}
      <SectionHead
        title="推演情景"
        count={SIMULATION_SCENARIOS.length}
        description="选择后调整配置并运行"
        className="mb-2"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SIMULATION_SCENARIOS.map((s) => {
          const selected = s.id === scenario.id;
          const sp = PATHWAYS.find((p) => p.id === s.pathwayId);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectScenario(s.id)}
              className={cn(
                "flex flex-col rounded-lg border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary/40 bg-accent/30 shadow-card"
                  : "border-line bg-card hover:border-line-strong hover:bg-secondary/25",
              )}
              aria-pressed={selected}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] tracking-wider text-muted-foreground">{s.id}</span>
                {selected ? <CheckCircle2 className="size-3.5 text-primary" /> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug font-semibold text-foreground">
                {s.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 truncate">
                  <Layers className="size-2.5" />
                  {sp?.name ?? s.pathwayId}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Users className="size-2.5" />n={s.cohortSize}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Clock4 className="size-2.5" />
                  {s.horizonDays}d
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 配置 + 运行 */}
      <Card className="mt-4 gap-0 py-0">
        <CardContent className="flex flex-wrap items-end gap-3 px-4 py-3">
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground">分析队列</label>
            <Select value={cohort} onValueChange={setCohort}>
              <SelectTrigger size="sm" className="w-[110px]">
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
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="text-[11px] text-muted-foreground">资源配置</label>
            <Select value={resourceProfile} onValueChange={setResourceProfile}>
              <SelectTrigger size="sm" className="w-full max-w-[280px]">
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
          <Button size="sm" onClick={runSimulation} disabled={running}>
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            {running ? "推演中…" : "运行推演"}
          </Button>
          <p className="basis-full text-[10.5px] text-muted-foreground">
            {running
              ? "正在生成分析队列并比较候选方案…"
              : lastRun
                ? `本次：队列 ${lastRun.cohort} 例 · ${lastRun.profile}`
                : `默认：队列 ${scenario.cohortSize} 例 · ${scenario.resourceProfile}`}
            <span className="ml-2 font-mono text-muted-foreground/70">时间尺度在图中切换</span>
          </p>
        </CardContent>
      </Card>

      {/* 主图 */}
      <VisualFrame
        className="mt-4"
        title="多路径推演"
        english="World Model Rollout"
        description={scenario.name}
        badge={
          <span className="rounded-[3px] border border-info/25 bg-info-wash px-1.5 py-px font-mono text-[9px] tracking-wide text-info">
            VIS-012
          </span>
        }
        footnote="区间为 P10–P90；不含随机概率，不代表真实治疗效果。"
      >
        <TrajectorySimulator compact />
      </VisualFrame>

      {/* KPI + 比较 */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
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

      <Card className="mt-4 gap-0 py-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <SectionHead title="候选方案比较" description="推荐项为本次推演目标函数下较优方案" />
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
          <div className="border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
            推荐并非临床建议；实际方案由 MDT / 医生决定。
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
