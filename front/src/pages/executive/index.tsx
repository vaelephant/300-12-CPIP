import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  Minus,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Sparkline } from "@/components/app/sparkline";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import {
  EnrollmentCompletionChart,
  LosTrendChart,
  VariationReasonDonut,
} from "@/visualization/analytics/ExecutiveCharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EXECUTIVE_BOTTLENECKS,
  EXECUTIVE_DEPT,
  EXECUTIVE_KPIS,
  EXECUTIVE_LOS,
  EXECUTIVE_TREND,
  EXECUTIVE_VARIATION_REASONS,
} from "@/data/visualization-data";
import { LAST_SYNC, PATHWAYS } from "@/data";
import { cn, fmtDate } from "@/lib/utils";

/* ===========================================================================
 * VIS-006 · 院长临床路径驾驶舱
 * 全院覆盖 / 入径 / 完成 / 变异 / 效率指标，支持 全院 → 病区 / 治疗组 → 路径 → 事件 下钻。
 * 所有数据均为确定性合成演示数据，不可用于对外披露或绩效考核。
 * ========================================================================= */

const PERIODS = ["近 30 天", "本季度", "本年度"];
const LOWER_IS_BETTER = new Set(["los", "cost", "variation"]);

type ExecKpi = (typeof EXECUTIVE_KPIS)[number];
type ExecDept = (typeof EXECUTIVE_DEPT)[number];

const GROUP_PATHWAYS: Record<string, string[]> = {
  ward1: ["PW-HCC-001", "PW-HCC-004"],
  ward2: ["PW-HCC-004", "PW-HCC-005"],
  ward3: ["PW-HCC-002", "PW-HCC-003"],
  mdt: ["PW-HCC-004", "PW-HCC-001"],
  followup: ["PW-HCC-006"],
};

/* -------------------------------- KPI 卡片 -------------------------------- */

function ExecKpiCard({ kpi }: { kpi: ExecKpi }) {
  const navigate = useNavigate();
  const unit = "unit" in kpi ? kpi.unit : undefined;
  const improvement = LOWER_IS_BETTER.has(kpi.key) ? kpi.delta < 0 : kpi.delta > 0;
  const flat = kpi.delta === 0;
  const DeltaIcon = flat ? Minus : kpi.delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <button
      type="button"
      onClick={() => {
        toast.info(`指标下钻：${kpi.label}`, {
          description: `分子 ${kpi.numerator} / 分母 ${kpi.denominator} · ${kpi.period}。已打开对应分析视图。`,
        });
        navigate(kpi.href);
      }}
      className="group flex flex-col rounded-lg border border-line bg-card px-3.5 pt-3 pb-2.5 text-left shadow-card transition-colors outline-none hover:border-line-strong hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-ring/30"
      aria-label={`${kpi.label} ${kpi.value}${unit ?? ""}，点击下钻`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11.5px] font-medium tracking-wide text-muted-foreground">{kpi.label}</span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5 rounded-[3px] px-1 py-0.5 font-mono text-[9.5px] tabular",
            flat
              ? "bg-secondary text-muted-foreground"
              : improvement
                ? "bg-ok-wash text-ok"
                : "bg-risk-wash text-risk",
          )}
        >
          <DeltaIcon className="size-2.5" />
          {Math.abs(kpi.delta).toFixed(1)}
          {LOWER_IS_BETTER.has(kpi.key) ? "" : "%"}
          <span className="font-normal opacity-70">较上月</span>
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="tabular text-[24px] leading-none font-semibold tracking-[-0.02em] text-foreground">
          {kpi.value}
        </span>
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
      </div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{kpi.hint}</p>

      <div className="mt-auto space-y-0.5 border-t border-line pt-1.5 text-[9.5px] text-muted-foreground">
        <p className="truncate">
          <span className="text-muted-foreground/60">分子 </span>
          {kpi.numerator}
        </p>
        <p className="truncate">
          <span className="text-muted-foreground/60">分母 </span>
          {kpi.denominator}
        </p>
      </div>
      <div className="mt-1 flex items-center justify-between text-[9.5px]">
        <span className="font-mono text-muted-foreground">{kpi.period}</span>
        <span className="inline-flex items-center gap-0.5 text-primary opacity-0 transition-opacity group-hover:opacity-100">
          下钻
          <ArrowRight className="size-2.5" />
        </span>
      </div>
    </button>
  );
}

/* ---------------------------------- 页面 ---------------------------------- */

export default function ExecutivePage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(PERIODS[0]);
  const [deptKey, setDeptKey] = useState<string | null>(null);

  const selectedDept = useMemo<ExecDept | null>(
    () => EXECUTIVE_DEPT.find((d) => d.key === deptKey) ?? null,
    [deptKey],
  );

  const deptPathways = useMemo(() => {
    if (!selectedDept) return [];
    const ids = GROUP_PATHWAYS[selectedDept.key] ?? [];
    return ids
      .map((id) => PATHWAYS.find((p) => p.id === id))
      .filter((p): p is (typeof PATHWAYS)[number] => Boolean(p));
  }, [selectedDept]);
  const breadcrumbPathway = deptPathways[0];

  const orgAvg = useMemo(() => {
    const avg = (pick: (d: ExecDept) => number) =>
      EXECUTIVE_DEPT.reduce((acc, d) => acc + pick(d), 0) / EXECUTIVE_DEPT.length;
    return {
      completion: avg((d) => d.completion),
      enrollment: avg((d) => d.enrollment),
      variation: avg((d) => d.variation),
      los: avg((d) => d.los),
    };
  }, []);

  const november = useMemo(() => {
    const nov = EXECUTIVE_TREND[EXECUTIVE_TREND.length - 1];
    const prev = EXECUTIVE_TREND[EXECUTIVE_TREND.length - 2];
    const novLos = EXECUTIVE_LOS[EXECUTIVE_LOS.length - 1];
    const prevLos = EXECUTIVE_LOS[EXECUTIVE_LOS.length - 2];
    return {
      rows: [
        {
          key: "enrollment",
          label: "入径患者",
          value: nov.enrollment.toLocaleString("zh-CN"),
          unit: "例",
          delta: `+${nov.enrollment - prev.enrollment}`,
          good: true,
          trend: EXECUTIVE_TREND.map((d) => d.enrollment),
          color: "ok" as const,
        },
        {
          key: "completion",
          label: "路径完成率",
          value: nov.completion.toFixed(1),
          unit: "%",
          delta: `+${(nov.completion - prev.completion).toFixed(1)}pp`,
          good: true,
          trend: EXECUTIVE_TREND.map((d) => d.completion),
          color: "ok" as const,
        },
        {
          key: "variation",
          label: "路径变异率",
          value: nov.variation.toFixed(1),
          unit: "%",
          delta: `${(nov.variation - prev.variation).toFixed(1)}pp`,
          good: nov.variation <= prev.variation,
          trend: EXECUTIVE_TREND.map((d) => d.variation),
          color: "risk" as const,
        },
        {
          key: "los",
          label: "平均住院日",
          value: novLos.actual.toFixed(1),
          unit: "天",
          delta: `${(novLos.actual - prevLos.actual).toFixed(1)} 天`,
          good: novLos.actual <= prevLos.actual,
          trend: EXECUTIVE_LOS.map((d) => d.actual),
          color: "info" as const,
        },
      ],
    };
  }, []);

  const handleExport = useCallback(() => {
    toast.success("驾驶舱报告导出已创建", {
      description: `统计周期 ${period}；报告含全院与病区 / 治疗组聚合指标，不含患者身份信息；导出行为写入审计日志。`,
    });
  }, [period]);

  const handleReasonClick = useCallback(
    (name: string, value: number) => {
      toast.info(`变异原因下钻：${name}`, {
        description: `${value} 例（合成数据），正在打开变异管理列表。`,
      });
      navigate("/variations");
    },
    [navigate],
  );

  const maxBottleneckHours = Math.max(...EXECUTIVE_BOTTLENECKS.map((b) => b.hours));

  return (
    <Page wide>
      <PageHeader
        module="VIS-006 · 院长驾驶舱"
        title="院长临床路径驾驶舱"
        description="全院临床路径运营总览：覆盖率、入径与完成率、变异与效率指标；支持从全院下钻至病区 / 治疗组、路径与执行事件。"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="组织" value="仁和医院（演示）" />
            <PageMeta label="统计周期" value={`${period}（演示）`} />
            <PageMeta label="数据截止" value={fmtDate(LAST_SYNC, true)} mono />
          </>
        }
        actions={
          <>
            <Select
              value={period}
              onValueChange={(value) => {
                setPeriod(value);
                toast("统计周期已切换", {
                  description: `${value}。演示数据固定为近 30 天口径，仅切换展示标签。`,
                });
              }}
            >
              <SelectTrigger size="sm" className="w-[112px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigate("/analytics")}>
              <ExternalLink className="size-3.5" />
              运营分析
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              导出报告
            </Button>
          </>
        }
      />

      {/* ------------------------------- KPI ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {EXECUTIVE_KPIS.map((kpi) => (
          <ExecKpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <InfoDot />
          点击任一指标卡片可下钻至对应分析视图
        </span>
        <span className="font-mono text-muted-foreground/70">delta = 较上月 · 合成演示数据</span>
      </p>

      {/* ------------------------------- Hero ------------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <VisualFrame
          className="lg:col-span-5"
          title="平均住院日趋势"
          english="LOS TREND"
          description="实际 vs 目标 · 近 6 个月（合成）"
          badge={<StatusBadge tone="ok">低于目标</StatusBadge>}
          footnote="口径：路径患者出院平均住院日；目标值为院内年度目标，合成演示数据。"
        >
          <LosTrendChart data={EXECUTIVE_LOS} height={210} />
        </VisualFrame>

        <VisualFrame
          className="lg:col-span-3"
          title="变异原因分布"
          english="VARIATION REASONS"
          description="近 30 天 · 点击扇区下钻（合成）"
          footnote="点击扇区可进入变异管理列表；合计为合成演示变异例数。"
        >
          <VariationReasonDonut
            data={EXECUTIVE_VARIATION_REASONS}
            height={210}
            onSliceClick={handleReasonClick}
          />
        </VisualFrame>

        <VisualFrame
          className="lg:col-span-4"
          title="入径 / 完成趋势"
          english="ENROLLMENT & COMPLETION"
          description={`上：入径患者数（例）· 下：路径完成率（%）（合成）`}
          badge={<span className="font-mono text-[10px] text-muted-foreground">11 月 91.2%</span>}
          footnote="入径患者数为柱状轴，完成率为右侧百分比轴；近 6 个月合成序列。"
        >
          <EnrollmentCompletionChart data={EXECUTIVE_TREND} height={210} />
        </VisualFrame>
      </div>

      {/* ------------------------------ 下钻路径 ------------------------------ */}
      <nav
        aria-label="下钻路径"
        className="mt-4 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-card px-3 py-2 text-[11.5px]"
      >
        <span className="label-micro mr-1">DRILLDOWN</span>
        <button
          type="button"
          onClick={() => {
            setDeptKey(null);
            toast("已回到全院视图", { description: "病区下钻面板已收起。" });
          }}
          className={cn(
            "rounded-[3px] px-1.5 py-0.5 transition-colors hover:bg-secondary",
            !selectedDept ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          全院
        </button>
        <ChevronRight className="size-3 text-muted-foreground/40" />
        <button
          type="button"
          onClick={() =>
            selectedDept
              ? toast(`当前病区 / 治疗组：${selectedDept.name}`, {
                  description: `在径 ${selectedDept.patients} 例 · 完成率 ${selectedDept.completion}%；可在下方面板继续下钻。`,
                })
              : toast("请先在病区排名中选择病区 / 治疗组", { description: "点击行即可生成病区 / 治疗组下钻面板。" })
          }
          className={cn(
            "rounded-[3px] px-1.5 py-0.5 transition-colors hover:bg-secondary",
            selectedDept ? "font-medium text-foreground" : "text-muted-foreground/60",
          )}
        >
          {selectedDept?.name ?? "病区 / 治疗组"}
        </button>
        <ChevronRight className="size-3 text-muted-foreground/40" />
        {breadcrumbPathway ? (
          <Link
            to={`/pathways/${breadcrumbPathway.id}/versions`}
            className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-primary transition-colors hover:bg-secondary"
          >
            {breadcrumbPathway.name}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() =>
              toast("路径 / 事件", {
                description: selectedDept
                  ? "该病区 / 治疗组在演示数据中暂无已发布路径模板，可前往路径库查看。"
                  : "请先选择病区 / 治疗组，再下钻至路径与事件。",
              })
            }
            className="rounded-[3px] px-1.5 py-0.5 text-muted-foreground/60 transition-colors hover:bg-secondary"
          >
            路径 / 事件
          </button>
        )}
        <ChevronRight className="size-3 text-muted-foreground/40" />
        <Link to="/variations" className="rounded-[3px] px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-secondary">
          事件与变异
        </Link>
        <span className="ml-auto hidden font-mono text-[9.5px] text-muted-foreground/60 xl:inline">
          全院 → 病区 / 治疗组 → 路径 → 事件
        </span>
      </nav>

      {/* --------------------------- 病区排名 + 下钻 --------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <VisualFrame
          className="lg:col-span-7"
          title="病区 / 治疗组路径质量排名"
          english="DEPT LEADERBOARD"
          description="按路径完成率排序 · 点击行下钻"
          actions={
            <Button variant="outline" size="xs" asChild>
              <Link to="/analytics">
                病区分析
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          }
          footnote="覆盖率为已配置路径的出院患者占比；全部为合成演示数据，不用于病区考核。"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 pl-1">#</TableHead>
                  <TableHead>病区 / 治疗组</TableHead>
                  <TableHead className="w-[110px]">完成率</TableHead>
                  <TableHead className="w-[70px]">入径率</TableHead>
                  <TableHead className="w-[70px]">变异率</TableHead>
                  <TableHead className="w-[70px]">住院日</TableHead>
                  <TableHead className="w-[64px]">在径</TableHead>
                  <TableHead className="w-[70px] pr-1">覆盖率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXECUTIVE_DEPT.map((dept, index) => {
                  const active = deptKey === dept.key;
                  const belowTarget = dept.completion < 90;
                  return (
                    <TableRow
                      key={dept.key}
                      tabIndex={0}
                      onClick={() => {
                        setDeptKey(dept.key);
                        toast.info(`已选择病区 / 治疗组：${dept.name}`, {
                          description: `在径 ${dept.patients} 例 · 完成率 ${dept.completion}% · 变异率 ${dept.variation}%；已生成病区下钻面板。`,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDeptKey(dept.key);
                          toast.info(`已选择病区 / 治疗组：${dept.name}`, {
                            description: `在径 ${dept.patients} 例 · 完成率 ${dept.completion}%。`,
                          });
                        }
                      }}
                      className={cn(
                        "cursor-pointer outline-none",
                        active && "border-l-2 border-l-primary bg-accent/35 hover:bg-accent/45",
                        !active && "focus-visible:bg-secondary/40",
                      )}
                    >
                      <TableCell className="pl-1 font-mono text-[10px] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
                          <Building2 className="size-3 text-muted-foreground" />
                          {dept.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="tabular font-mono text-[11.5px]">{dept.completion}%</span>
                          <span className="h-1 w-10 overflow-hidden rounded-full bg-secondary">
                            <span
                              className={cn("block h-full rounded-full", belowTarget ? "bg-warn" : "bg-primary")}
                              style={{ width: `${dept.completion}%` }}
                            />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular font-mono text-[11px]">{dept.enrollment}%</TableCell>
                      <TableCell className="tabular font-mono text-[11px] text-warn">{dept.variation}%</TableCell>
                      <TableCell className="tabular font-mono text-[11px]">{dept.los} 天</TableCell>
                      <TableCell className="tabular font-mono text-[11px]">{dept.patients}</TableCell>
                      <TableCell className="tabular pr-1 font-mono text-[11px]">{dept.coverage}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </VisualFrame>

        <VisualFrame
          className="lg:col-span-5"
          title={selectedDept ? `病区下钻 · ${selectedDept.name}` : "病区下钻"}
          english="DRILLDOWN"
          description={
            selectedDept
              ? `较全院均值（完成率 ${orgAvg.completion.toFixed(1)}%）· 合成数据`
              : "从左侧病区排名选择病区 / 治疗组，查看指标与代表路径"
          }
          footnote={selectedDept ? "病区 / 治疗组聚合指标；患者级明细需具备数据范围权限。" : "未选择病区 / 治疗组。"}
        >
          {!selectedDept ? (
            <EmptyState
              icon={<Building2 />}
              title="尚未选择病区 / 治疗组"
              description="点击左侧病区排名的任意一行，即可查看该病区 / 治疗组的完成率、入径率、变异率、住院日、覆盖率与代表路径。"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const first = EXECUTIVE_DEPT[0];
                    setDeptKey(first.key);
                    toast.info(`已选择病区 / 治疗组：${first.name}`, { description: "已展开病区下钻面板。" });
                  }}
                >
                  查看示例：{EXECUTIVE_DEPT[0].name}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "完成率",
                    value: `${selectedDept.completion}%`,
                    diff: selectedDept.completion - orgAvg.completion,
                    unit: "pp",
                  },
                  {
                    label: "入径率",
                    value: `${selectedDept.enrollment}%`,
                    diff: selectedDept.enrollment - orgAvg.enrollment,
                    unit: "pp",
                  },
                  {
                    label: "变异率",
                    value: `${selectedDept.variation}%`,
                    diff: selectedDept.variation - orgAvg.variation,
                    unit: "pp",
                    inverse: true,
                  },
                  {
                    label: "平均住院日",
                    value: `${selectedDept.los} 天`,
                    diff: selectedDept.los - orgAvg.los,
                    unit: " 天",
                    inverse: true,
                  },
                  { label: "在径患者", value: `${selectedDept.patients} 例`, diff: null },
                  { label: "覆盖率", value: `${selectedDept.coverage}%`, diff: null },
                ].map((item) => (
                  <div key={item.label} className="rounded-md border border-line bg-secondary/20 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 flex items-baseline justify-between gap-1">
                      <span className="tabular font-mono text-[15px] font-medium">{item.value}</span>
                      {typeof item.diff === "number" && (
                        <span
                          className={cn(
                            "font-mono text-[9.5px]",
                            (item.inverse ? item.diff <= 0 : item.diff >= 0) ? "text-ok" : "text-risk",
                          )}
                        >
                          {item.diff >= 0 ? "+" : ""}
                          {item.diff.toFixed(1)}
                          {item.unit}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <SectionHead
                  title="代表路径"
                  count={deptPathways.length}
                  description="该病区 / 治疗组已发布路径模板（合成）"
                  className="mb-1.5"
                />
                {deptPathways.length === 0 ? (
                  <Callout tone="neutral" title="演示数据中该病区 / 治疗组暂无已发布路径模板">
                    可前往路径库查看全部模板；病区指标仍按聚合口径展示。
                  </Callout>
                ) : (
                  <ul className="space-y-1.5">
                    {deptPathways.map((pathway) => (
                      <li key={pathway.id}>
                        <Link
                          to={`/pathways/${pathway.id}/versions`}
                          className="flex items-center justify-between gap-2 rounded-md border border-line bg-card px-2.5 py-1.5 transition-colors hover:border-line-strong hover:bg-secondary/30"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[11.5px] font-medium text-foreground/90">
                              {pathway.name}
                            </span>
                            <span className="font-mono text-[9.5px] text-muted-foreground">
                              {pathway.code} · v{pathway.currentVersion} · {pathway.instanceCount} 例
                            </span>
                          </span>
                          <StatusBadge tone="ok" dot={false}>
                            已发布
                          </StatusBadge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                <Button variant="outline" size="xs" asChild>
                  <Link to="/patients">
                    <UsersRound className="size-3" />
                    患者列表
                  </Link>
                </Button>
                <Button variant="outline" size="xs" asChild>
                  <Link to="/analytics">
                    <Layers className="size-3" />
                    病区分析
                  </Link>
                </Button>
                <Button variant="outline" size="xs" asChild>
                  <Link to="/process-mining">
                    <Network className="size-3" />
                    流程挖掘
                  </Link>
                </Button>
                <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">
                  role: executive
                </span>
              </div>
            </div>
          )}
        </VisualFrame>
      </div>

      {/* --------------------------- 瓶颈 + 11 月趋势 --------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <VisualFrame
          className="lg:col-span-5"
          title="流程瓶颈"
          english="BOTTLENECKS"
          description="按平均等待时长排序 · 点击查看"
          actions={
            <Button variant="outline" size="xs" asChild>
              <Link to="/process-mining">
                流程挖掘
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          }
          footnote="瓶颈基于合成事件日志；等待时长为中位数近似值。"
        >
          <ul className="space-y-2">
            {EXECUTIVE_BOTTLENECKS.map((item) => (
              <li key={item.stage}>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(`瓶颈下钻：${item.stage}`, {
                      description: `${item.owner} · 平均等待 ${item.hours}h · ${item.impact}。可在流程挖掘中查看对应流转。`,
                    })
                  }
                  className="w-full rounded-md border border-line px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-secondary/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-medium">{item.stage}</span>
                    <span className="font-mono text-[11px] text-warn">{item.hours} h</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-warn/80"
                      style={{ width: `${(item.hours / maxBottleneckHours) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>{item.owner}</span>
                    <span className="text-right">{item.impact}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </VisualFrame>

        <VisualFrame
          className="lg:col-span-7"
          title="11 月趋势"
          english="NOVEMBER TREND"
          description="近 6 个月序列 · 11 月为当前月（合成）"
          badge={<StatusBadge tone="info">当前月</StatusBadge>}
          footnote="环比为 11 月与 10 月差值；趋势为合成演示序列，不构成承诺目标。"
        >
          <div className="divide-y divide-line">
            {november.rows.map((row) => (
              <div key={row.key} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="w-[86px] shrink-0 text-[11.5px] text-muted-foreground">{row.label}</span>
                <Sparkline
                  values={row.trend}
                  width={132}
                  height={26}
                  tone={row.color === "risk" ? "risk" : row.color === "info" ? "info" : "ok"}
                  className="shrink-0"
                />
                <span className="ml-auto flex items-baseline gap-1">
                  <span className="tabular font-mono text-[16px] font-medium">{row.value}</span>
                  <span className="text-[10px] text-muted-foreground">{row.unit}</span>
                </span>
                <span
                  className={cn(
                    "inline-flex w-[76px] shrink-0 items-center justify-end gap-0.5 font-mono text-[10px]",
                    row.good ? "text-ok" : "text-risk",
                  )}
                >
                  {row.good ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
                  {row.delta}
                </span>
              </div>
            ))}
          </div>
        </VisualFrame>
      </div>

      <Callout tone="neutral" title="数据说明与合规边界" className="mt-4">
        本页全部指标为确定性合成演示数据（100 例队列口径扩展），不得用于等级评审、绩效考核或对外披露；
        分子 / 分母口径与「运营分析」模块一致，分母为零时返回「不可计算」。患者级明细需具备对应数据范围权限。
      </Callout>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground/70">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3" />
          ECharts 主题取色自设计令牌（canvas 禁用 var()）
        </span>
        <span className="font-mono">VIS-006 · executive cockpit · synthetic</span>
      </div>
    </Page>
  );
}

function InfoDot() {
  return (
    <span className="inline-flex size-3 items-center justify-center rounded-full border border-line-strong font-mono text-[8px] text-muted-foreground">
      i
    </span>
  );
}
