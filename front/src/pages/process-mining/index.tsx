import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CircleDot,
  Download,
  GitCompareArrows,
  Info,
  ScanSearch,
  Waypoints,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { FilterPill } from "@/components/app/toolbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROCESS_EDGES, PROCESS_NODES, PROCESS_STATS } from "@/data/visualization-data";
import { ProcessGraph, type ProcessSelection, type ProcessViewMode } from "@/visualization/process/ProcessGraph";
import { BottleneckBar, VariantDonut } from "@/visualization/process/ProcessCharts";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import { cn, fmt } from "@/lib/utils";

const MODE_LABEL: Record<ProcessViewMode, { label: string; description: string }> = {
  standard: { label: "标准路径", description: "仅展示与标准临床路径一致的合规流程" },
  actual: { label: "实际流程", description: "基于近 30 天事件日志发现的执行流程" },
  deviation: { label: "偏差高亮", description: "仅高亮偏离标准路径的流转与偏差节点" },
};

function formatWait(minutes: number) {
  if (!minutes) return "—";
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  return `${(minutes / 60).toFixed(1)} 小时`;
}

export default function ProcessMiningPage() {
  const [mode, setMode] = useState<ProcessViewMode>("actual");
  const [selection, setSelection] = useState<ProcessSelection>({ kind: "node", id: "imaging" });

  const selectedNode = useMemo(
    () => (selection?.kind === "node" ? PROCESS_NODES.find((n) => n.id === selection.id) ?? null : null),
    [selection],
  );
  const selectedEdge = useMemo(
    () => (selection?.kind === "edge" ? PROCESS_EDGES.find((e) => e.id === selection.id) ?? null : null),
    [selection],
  );

  const deviationEdges = PROCESS_EDGES.filter((e) => e.conformance === "DEVIATION");
  const deviationPatients = deviationEdges.reduce((acc, e) => acc + e.count, 0);

  return (
    <Page wide>
      <PageHeader
        module="VIS-009 · 临床流程挖掘"
        eyebrow="Process Mining · 从事件日志发现真实流程"
        title="临床流程发现"
        meta={
          <>
            <PageMeta label="分析队列" value="分析队列" />
            <PageMeta label="事件日志" value="事件日志" mono />
            <PageMeta label="分析口径" value="近 30 天 · 已脱敏" />
            <SyntheticTag />
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("一致性检查报告生成中", { description: "报告将包含 5 类流程变体与 4 个瓶颈节点。" })}
            >
              <GitCompareArrows className="size-3.5" /> 一致性检查
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success("已导出流程发现报告", {
                  description: "导出行为写入审计日志；不包含患者身份信息。",
                })
              }
            >
              <Download className="size-3.5" /> 导出报告
            </Button>
          </>
        }
      />

      {/* 统计 */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "分析患者", value: `${PROCESS_STATS.patients}`, unit: "例", hint: "近 30 天事件日志", tone: "info" as const },
          { label: "路径合规率", value: `${PROCESS_STATS.conformance}%`, unit: "", hint: "与标准路径一致的流程占比", tone: "ok" as const },
          { label: "标准路径执行", value: `${PROCESS_STATS.standardRate}%`, unit: "", hint: "完整按照标准路径执行的病例", tone: "ok" as const },
          { label: "平均住院日", value: `${PROCESS_STATS.avgDays}`, unit: "天", hint: "流程端到端平均耗时", tone: "neutral" as const },
          { label: "流程变体", value: `${PROCESS_STATS.variants}`, unit: "类", hint: "发现的显著流程变体数量", tone: "warn" as const },
        ].map((kpi) => (
          <Card key={kpi.label} className="px-4 py-3">
            <p className="text-[10.5px] text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="tabular text-[24px] leading-none font-semibold tracking-tight">{kpi.value}</span>
              {kpi.unit && <span className="text-[10px] text-muted-foreground">{kpi.unit}</span>}
            </p>
            <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground/75">{kpi.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* 流程图 */}
        <Card className="overflow-hidden xl:col-span-12">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <SectionHead
                title="实际临床流程发现"
                description={`${MODE_LABEL[mode].description} · 流线宽度表示患者数量 · 红色虚线为偏差流转`}
              />
              <div className="ml-auto flex items-center gap-1">
                {(Object.keys(MODE_LABEL) as ProcessViewMode[]).map((key) => (
                  <FilterPill key={key} active={mode === key} onClick={() => setMode(key)}>
                    {MODE_LABEL[key].label}
                  </FilterPill>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ProcessGraph
              nodes={PROCESS_NODES}
              edges={PROCESS_EDGES}
              mode={mode}
              selection={selection}
              onSelect={(next) => setSelection(next)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-5 rounded-full bg-[var(--line-strong)]" /> 合规流转
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-5 rounded-full bg-risk" /> 偏差流转
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-risk" /> 偏差节点
              </span>
              <span className="ml-auto font-mono">PM4Py · 流程发现（模拟）</span>
            </div>
          </CardContent>
        </Card>

        {/* 选中详情 + 说明 */}
        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="节点 / 流转详情" description="点击流程图中的节点或流线" />
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold">{selectedNode.label}</p>
                      <p className="font-mono text-[9px] text-muted-foreground">{selectedNode.id}</p>
                    </div>
                    <StatusBadge tone={selectedNode.type === "deviation" ? "risk" : "info"} dot={false}>
                      {selectedNode.type === "deviation" ? "偏差活动" : "核心活动"}
                    </StatusBadge>
                  </div>
                  <div className="divide-y divide-line/70 border-y border-line/70">
                    <Field label="经过患者" value={`${selectedNode.count} 例`} />
                    <Field label="平均等待" value={formatWait(selectedNode.avgWaitMin)} />
                    <Field label="偏差率" value={`${selectedNode.deviationRate}%`} />
                    <Field label="活动类型" value={selectedNode.type} mono />
                  </div>
                  <Callout
                    tone={selectedNode.avgWaitMin > 1200 ? "warn" : "info"}
                    title={
                      selectedNode.avgWaitMin > 1200
                        ? "该活动为主要等待瓶颈"
                        : selectedNode.type === "deviation"
                          ? "偏差活动需人工复核"
                          : "活动耗时处于可接受范围"
                    }
                  >
                    等待按事件日志时间戳计算，不含患者拒绝或主动延迟；偏差不代表医疗质量缺陷。
                  </Callout>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        toast.info(`查看 ${selectedNode.label} 的事件明细`, {
                          description: "该下钻在正式版本中按权限返回脱敏患者事件列表。",
                        })}
                    >
                      查看事件明细
                    </Button>
                    <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setSelection(null)}>
                      清除选择
                    </Button>
                  </div>
                </div>
              ) : selectedEdge ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold">
                      {PROCESS_NODES.find((n) => n.id === selectedEdge.source)?.label} →{" "}
                      {PROCESS_NODES.find((n) => n.id === selectedEdge.target)?.label}
                    </p>
                    <StatusBadge tone={selectedEdge.conformance === "DEVIATION" ? "risk" : "ok"} dot={false}>
                      {selectedEdge.conformance === "DEVIATION" ? "偏离标准" : "合规"}
                    </StatusBadge>
                  </div>
                  <div className="divide-y divide-line/70 border-y border-line/70">
                    <Field label="经过患者" value={`${selectedEdge.count} 例`} />
                    <Field label="平均等待" value={formatWait(selectedEdge.waitMin)} />
                    <Field label="一致性" value={selectedEdge.conformance} mono />
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    流线宽度按经过患者数缩放；虚线表示与标准路径不一致的流转。
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11.5px] text-muted-foreground">未选中节点。点击流程图中任意节点或流线查看患者量、等待时长与偏差率。</p>
                  <Callout tone="warn" title="流程变体不一定是质量问题">
                    路径偏离可能来自合理的个体化诊疗。流程挖掘用于发现模式与瓶颈，是否构成质量缺陷需结合病例复核。
                  </Callout>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="偏差概览" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between rounded-md border border-warn/25 bg-warn-wash/50 px-2.5 py-2">
                <span className="text-[11px] text-foreground/70">偏差流转患者</span>
                <span className="tabular font-mono text-[14px] font-semibold text-warn">{deviationPatients} 例次</span>
              </div>
              <p className="text-[9.5px] leading-relaxed text-muted-foreground">
                注意：同一患者可能发生多次偏差流转，因此例次合计不等于去重患者数；正式版本按患者去重并保留事件链。
              </p>
              <ol className="space-y-1.5">
                {[
                  "入院评估 → 直接 MDT（跳过实验室检验）",
                  "影像检查 → 直接手术（跳过 MDT）",
                  "手术 → 转肿瘤科 / 延长住院",
                ].map((item, i) => (
                  <li key={item} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-risk-wash font-mono text-[8px] text-risk">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* 瓶颈 + 变体 */}
        <VisualFrame
          className="xl:col-span-4"
          title="流程瓶颈分析"
          badge={<span className="rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[8.5px] text-muted-foreground">PM4PY</span>}
          footnote="等待时长来自事件日志聚合。"
        >
          <BottleneckBar data={PROCESS_STATS.bottlenecks} height={214} />
        </VisualFrame>

        <Card className="xl:col-span-4">
          <CardHeader className="pb-2">
            <SectionHead title="流程变体构成" description="分析队列 · 5 类执行模式" />
          </CardHeader>
          <CardContent>
            <VariantDonut data={PROCESS_STATS.variantsList.map((v) => ({ name: v.name, count: v.count }))} height={172} />
            <div className="mt-2 divide-y divide-line/70 border-t border-line/70">
              {PROCESS_STATS.variantsList.map((v) => (
                <div key={v.name} className="flex items-center justify-between py-1 text-[10.5px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-1.5 rounded-[1px]" style={{ background: v.color }} />
                    {v.name}
                  </span>
                  <span className="font-mono text-[10px]">
                    {fmt(v.count)} 例 · {((v.count / PROCESS_STATS.patients) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 分析能力说明 */}
        <Card className="xl:col-span-12">
          <CardHeader className="pb-2">
            <SectionHead title="分析能力与常见问题" description="Process Discovery / Conformance / Bottleneck / Variant / Performance" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                { title: "流程发现", en: "Discovery", desc: "从事件日志自动生成真实流程图", icon: ScanSearch },
                { title: "一致性检查", en: "Conformance", desc: "标准路径与实际流程比对", icon: GitCompareArrows },
                { title: "瓶颈分析", en: "Bottleneck", desc: "识别等待最长的活动与时段", icon: AlertTriangle },
                { title: "变体分析", en: "Variant", desc: "聚类不同诊疗执行模式", icon: Waypoints },
                { title: "性能分析", en: "Performance", desc: "节点耗时、等待与吞吐", icon: CircleDot },
              ].map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="rounded-md border border-line bg-secondary/25 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium">
                      <Icon className="size-3.5 text-muted-foreground" />
                      {cap.title}
                      <span className="ml-auto font-mono text-[8px] text-muted-foreground/60">{cap.en}</span>
                    </div>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-muted-foreground">{cap.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-risk/25 bg-risk-wash/60 px-3 py-2 text-[10.5px]">
              <span className="flex items-center gap-1.5 text-risk">
                <Info className="size-3.5" /> 偏离标准路径 ≠ 医疗质量问题；需结合个体化诊疗合理性复核。
              </span>
              <Link to="/analytics" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                返回运营分析 <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
