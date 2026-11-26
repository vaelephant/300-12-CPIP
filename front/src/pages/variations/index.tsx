import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Plus,
  SearchX,
  ShieldAlert,
  Timer,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { FilterPill, SearchInput, Toolbar } from "@/components/app/toolbar";
import { HBarChart } from "@/components/charts/chart-kit";
import { HeatmapGrid, StackedAreaTrend } from "@/components/charts/advanced";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VARIATION_MATRIX, VARIATION_TREND, VARIATION_TREND_SERIES } from "@/data/visuals";
import { DEPT_STAGE_HEATMAP } from "@/data/visualization-data";
import {
  VARIATIONS,
  VARIATION_BY_TYPE,
  PATIENTS,
  PATHWAYS,
  HCC_PLAN_DRAFT,
  getInstanceByPatient,
  LAST_SYNC,
} from "@/data";
import { VARIATION_TYPE_META, RISK_META, type Tone } from "@/lib/clinical";
import type { Variation, VariationType } from "@/types";
import { cn, fmtDate, fmtTime, hoursBetween, relTime } from "@/lib/utils";

/* ===========================================================================
 * M08 · 变异管理
 * 变异识别 → 影响评估 → 重规划草案 → 医生审核 → 新版本发布
 * 安全变异阻断自动推进；原计划与调整前差异完整保留。
 * ========================================================================= */

const TYPE_ORDER: VariationType[] = [
  "CLINICAL",
  "RESOURCE",
  "TIME",
  "PATIENT",
  "PROCESS",
  "SAFETY",
  "DATA",
];

const VARIATION_STATUS_META: Record<Variation["status"], { label: string; tone: Tone }> = {
  OPEN: { label: "待处理", tone: "warn" },
  ASSESSING: { label: "评估中", tone: "info" },
  REPLAN_PENDING: { label: "重规划待审", tone: "warn" },
  RESOLVED: { label: "已解决", tone: "ok" },
  CLOSED: { label: "已关闭", tone: "neutral" },
};

const SEVERITY_BAR: Record<Variation["severity"], string> = {
  HIGH: "bg-risk",
  MEDIUM: "bg-warn",
  LOW: "bg-ok",
};

const TYPE_DOT: Record<VariationType, string> = {
  CLINICAL: "bg-warn",
  RESOURCE: "bg-warn",
  TIME: "bg-risk",
  PATIENT: "bg-muted-foreground/60",
  PROCESS: "bg-muted-foreground/60",
  SAFETY: "bg-risk",
  DATA: "bg-info",
};

/** 节点 key → 中文任务名（用于影响范围 chips） */
const NODE_LABEL: Record<string, string> = Object.fromEntries(
  HCC_PLAN_DRAFT.map((task) => [task.nodeKey, task.name]),
);

/* ---------------------------- 处理流程（时间线） ---------------------------- */

const STEP_LABELS = [
  "发现变异",
  "记录变异",
  "评估影响",
  "生成重规划草案",
  "医生审核",
  "发布新版本",
  "继续执行 / 退出",
];

const STEP_MINUTES = [0, 2, 47, 182, 301, 342, 366];

const DONE_STEPS: Record<Variation["status"], number> = {
  OPEN: 2,
  ASSESSING: 3,
  REPLAN_PENDING: 4,
  RESOLVED: 7,
  CLOSED: 7,
};

type StepState = "done" | "current" | "pending";

function plusMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function variationSteps(v: Variation): { label: string; state: StepState; at?: string }[] {
  const done = DONE_STEPS[v.status];
  return STEP_LABELS.map((label, i) => ({
    label,
    state: i < done ? "done" : i === done ? "current" : "pending",
    at: i < done ? plusMinutes(v.detectedAt, STEP_MINUTES[i]) : undefined,
  }));
}

/* ------------------------------- 登记表单 ------------------------------- */

const DEMO_PATIENTS = PATIENTS.filter((p) => p.id.includes("DEMO"));

interface RegisterForm {
  patientId: string;
  type: VariationType;
  severity: Variation["severity"];
  title: string;
  description: string;
}

const EMPTY_FORM: RegisterForm = {
  patientId: DEMO_PATIENTS[0]?.id ?? "",
  type: "CLINICAL",
  severity: "MEDIUM",
  title: "",
  description: "",
};

export default function VariationsPage() {
  const [rows, setRows] = useState<Variation[]>(VARIATIONS);
  const [type, setType] = useState<VariationType | "ALL">("ALL");
  const [severity, setSeverity] = useState<Variation["severity"] | "ALL">("ALL");
  const [status, setStatus] = useState<Variation["status"] | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heatCell, setHeatCell] = useState<{ row: string; col: string; value: number } | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [replanOpen, setReplanOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  /* ---------------------------- KPI / 分布 ---------------------------- */

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "OPEN" || r.status === "ASSESSING").length;
    const high = rows.filter((r) => r.severity === "HIGH").length;
    const replan = rows.filter((r) => r.status === "REPLAN_PENDING").length;
    const resolved = rows.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length;
    const overdue24h = rows.filter(
      (r) =>
        (r.status === "OPEN" || r.status === "ASSESSING") &&
        hoursBetween(r.detectedAt, new Date().toISOString()) > 24,
    ).length;
    return { total: rows.length, pending, high, replan, resolved, overdue24h };
  }, [rows]);

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (severity !== "ALL" && r.severity !== severity) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (q) {
        const haystack = `${r.patientName} ${r.title} ${r.pathwayName} ${r.ruleRef} ${r.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, severity, status, query]);

  const filtered = useMemo(
    () => (type === "ALL" ? baseFiltered : baseFiltered.filter((r) => r.type === type)),
    [baseFiltered, type],
  );

  const typeCounts = useMemo(() => {
    const counts = new Map<VariationType, number>();
    baseFiltered.forEach((r) => counts.set(r.type, (counts.get(r.type) ?? 0) + 1));
    return counts;
  }, [baseFiltered]);

  const typeChart = useMemo(() => {
    const total = VARIATION_BY_TYPE.reduce((acc, t) => acc + t.count, 0) || 1;
    const colors: Record<string, string> = {
      TIME: "var(--chart-3)",
      CLINICAL: "var(--chart-2)",
      RESOURCE: "var(--chart-1)",
      PROCESS: "var(--chart-4)",
      PATIENT: "var(--chart-5)",
      SAFETY: "var(--chart-5)",
      DATA: "var(--chart-4)",
    };
    return VARIATION_BY_TYPE.map((t) => ({
      label: t.label.replace("变异", ""),
      value: t.count,
      display: `${t.count} · ${Math.round((t.count / total) * 1000) / 10}%`,
      color: colors[t.type] ?? "var(--chart-1)",
    }));
  }, []);

  /* ------------------------------- 动作 ------------------------------- */

  function openDetail(id: string) {
    setSelectedId(id);
    setEvaluating(false);
    setResolution("");
  }

  function patchRow(id: string, patch: Partial<Variation>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleAssess() {
    if (!selected || selected.status !== "OPEN") return;
    const targetId = selected.id;
    setEvaluating(true);
    window.setTimeout(() => {
      patchRow(targetId, { status: "ASSESSING" });
      setEvaluating(false);
      toast.success("影响评估已完成", {
        description: "变异状态更新为「评估中」。已识别受影响节点，可生成重规划草案。",
      });
    }, 700);
  }

  function handleReplan() {
    if (!selected) return;
    const safety = selected.type === "SAFETY";
    patchRow(selected.id, {
      status: "REPLAN_PENDING",
      impact: `${selected.impact} 重规划草案已生成，等待医务处 / 临床专家审核，原计划差异保留。`,
    });
    setReplanOpen(false);
    toast.success("重规划草案已生成", {
      description: safety
        ? "安全变异草案需医生逐项确认；正式方案未被自动修改，原计划完整保留。"
        : "草案已提交审核队列，原计划与调整前差异完整保留，不覆盖历史版本。",
    });
  }

  function handleResolve() {
    if (!selected) return;
    const text = resolution.trim();
    if (!text) {
      toast.error("请填写处理结论", { description: "处理结论将写入变异记录与审计日志。" });
      return;
    }
    patchRow(selected.id, {
      status: "RESOLVED",
      resolution: text,
      resolvedBy: "李文博",
    });
    setResolveOpen(false);
    toast.success("变异已标记为已解决", {
      description: "处理结论已归档，原计划与调整前差异完整保留，可追溯。",
    });
  }

  function handleRegister() {
    const patient = PATIENTS.find((p) => p.id === form.patientId);
    if (!patient) {
      toast.error("请选择患者");
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("请填写变异标题与描述", { description: "标题与描述为必填项。" });
      return;
    }
    const row: Variation = {
      id: `VAR-2026-${String(9000 + rows.length)}`,
      patientId: patient.id,
      patientName: patient.name,
      pathwayName: patient.pathwayName ?? "尚未入径",
      type: form.type,
      severity: form.severity,
      title: form.title.trim(),
      description: form.description.trim(),
      detectedAt: new Date().toISOString(),
      status: "OPEN",
      source: "医生登记",
      affectedNodes: [],
      impact: "待评估影响范围；未自动修改计划。",
      ruleRef: "—",
      evidence: ["人工登记记录"],
    };
    setRows((prev) => [row, ...prev]);
    setRegisterOpen(false);
    setForm(EMPTY_FORM);
    toast.success("变异已登记", {
      description: `${patient.name} · ${VARIATION_TYPE_META[form.type].label}，已进入待处理队列。`,
    });
    openDetail(row.id);
  }

  function handleExport() {
    toast.success("导出任务已创建", {
      description: "变异清单（脱敏）CSV 将生成；导出行为已写入审计日志。",
    });
  }

  const active = selected !== null && selected.status !== "RESOLVED" && selected.status !== "CLOSED";
  const linkedPathway = selected ? PATHWAYS.find((p) => p.name === selected.pathwayName) : undefined;
  const linkedInstance = selected ? getInstanceByPatient(selected.patientId) : undefined;

  return (
    <Page>
      <PageHeader
        module="M08 · 变异管理"
        title="变异管理"
        description="统一登记临床、资源、时间与流程变异，评估影响后生成重规划草案；安全相关变异阻断自动推进，不自动改变正式方案。"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="数据同步" value={fmtTime(LAST_SYNC)} mono />
            <PageMeta label="待处理" value={`${stats.pending} 条`} />
            <PageMeta label="超 24h 未处理" value={`${stats.overdue24h} 条`} />
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              导出
            </Button>
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="size-3.5" />
              登记变异
            </Button>
          </>
        }
      />

      {/* ------------------------------ KPI ------------------------------ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="全部变异"
          value={String(stats.total)}
          unit="条"
          hint="演示数据集中的变异登记总数（合成数据）"
          footer={<span className="font-mono text-[10px]">ALL STATUSES</span>}
        />
        <StatCard
          label="待处理"
          value={String(stats.pending)}
          unit="条"
          tone="info"
          hint="状态为 OPEN（待处理）或 ASSESSING（评估中）的变异"
          footer={<span className="font-mono text-[10px]">OPEN + ASSESSING</span>}
        />
        <StatCard
          label="高风险"
          value={String(stats.high)}
          unit="条"
          tone="risk"
          hint="严重度为 HIGH 的变异，需医生优先确认"
          footer={<StatusBadge tone="risk">需优先处置</StatusBadge>}
        />
        <StatCard
          label="需重规划"
          value={String(stats.replan)}
          unit="条"
          tone="info"
          hint="已生成重规划草案、等待医生 / 医务处审核的变异"
          footer={<span className="font-mono text-[10px]">REPLAN_PENDING</span>}
        />
        <StatCard
          label="已解决"
          value={String(stats.resolved)}
          unit="条"
          tone="ok"
          hint="状态为 RESOLVED（已解决）或 CLOSED（已关闭）的变异"
          footer={<span className="font-mono text-[10px]">RESOLVED + CLOSED</span>}
        />
      </div>

      {/* ------------------------------ 筛选 ------------------------------ */}
      <Card className="mt-4 gap-0 py-0">
        <CardContent className="px-3.5 py-2.5">
          <Toolbar className="justify-between">
            <div className="flex flex-wrap items-center gap-0.5">
              <FilterPill active={type === "ALL"} count={baseFiltered.length} onClick={() => setType("ALL")}>
                全部
              </FilterPill>
              {TYPE_ORDER.map((t) => (
                <FilterPill
                  key={t}
                  active={type === t}
                  count={typeCounts.get(t) ?? 0}
                  onClick={() => setType(t)}
                >
                  <span className={cn("size-1.5 rounded-full", TYPE_DOT[t])} />
                  {VARIATION_TYPE_META[t].label.replace("变异", "")}
                </FilterPill>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={severity} onValueChange={(v) => setSeverity(v as Variation["severity"] | "ALL")}>
                <SelectTrigger size="sm" className="w-[122px]">
                  <SelectValue placeholder="严重度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部严重度</SelectItem>
                  <SelectItem value="HIGH">高风险</SelectItem>
                  <SelectItem value="MEDIUM">中风险</SelectItem>
                  <SelectItem value="LOW">低风险</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as Variation["status"] | "ALL")}>
                <SelectTrigger size="sm" className="w-[132px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部状态</SelectItem>
                  <SelectItem value="OPEN">待处理</SelectItem>
                  <SelectItem value="ASSESSING">评估中</SelectItem>
                  <SelectItem value="REPLAN_PENDING">重规划待审</SelectItem>
                  <SelectItem value="RESOLVED">已解决</SelectItem>
                  <SelectItem value="CLOSED">已关闭</SelectItem>
                </SelectContent>
              </Select>
              <div className="w-[220px]">
                <SearchInput value={query} onChange={setQuery} placeholder="搜索患者 / 变异标题" />
              </div>
            </div>
          </Toolbar>
        </CardContent>
      </Card>

      {/* ------------------------------ 主体 ------------------------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 列表 */}
        <Card className="gap-0 py-0 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead
              title="变异记录"
              count={filtered.length}
              description="点击任意记录查看影响范围、触发规则与处理流程"
            />
            <span className="font-mono text-[10px] text-muted-foreground">按发现时间倒序</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="没有符合条件的变异"
              description="当前类型 / 严重度 / 状态 / 关键词组合下无记录。可重置筛选条件后查看全部变异。"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setType("ALL");
                    setSeverity("ALL");
                    setStatus("ALL");
                    setQuery("");
                  }}
                >
                  重置筛选
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {filtered.map((v) => {
                const typeMeta = VARIATION_TYPE_META[v.type];
                const statusMeta = VARIATION_STATUS_META[v.status];
                return (
                  <button
                    key={v.id}
                    onClick={() => openDetail(v.id)}
                    className="group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/35"
                  >
                    <span className={cn("h-8 w-[2px] shrink-0 rounded-full", SEVERITY_BAR[v.severity])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[12.5px] font-medium text-foreground group-hover:text-primary">
                          {v.title}
                        </span>
                        <StatusBadge tone={statusMeta.tone} pulse={v.status === "ASSESSING"}>
                          {statusMeta.label}
                        </StatusBadge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/75">{v.patientName}</span>
                        <span className="text-line-strong">·</span>
                        <span className="truncate">{v.pathwayName}</span>
                        <span className="text-line-strong">·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className={cn("size-1.5 rounded-full", TYPE_DOT[v.type])} />
                          {typeMeta.label}
                        </span>
                        {v.severity === "HIGH" && (
                          <span className="inline-flex items-center gap-0.5 text-risk">
                            <AlertTriangle className="size-3" />
                            高风险
                          </span>
                        )}
                        <span className="text-line-strong">·</span>
                        <span className="font-mono text-[10.5px]">{fmtDate(v.detectedAt, true)}</span>
                        <span className="text-line-strong">·</span>
                        <span className="font-mono text-[10px]">{v.ruleRef}</span>
                      </div>
                    </div>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
            <span>共 {filtered.length} 条记录 · 全部为合成数据</span>
            <span className="font-mono">severity: HIGH / MEDIUM / LOW</span>
          </div>
        </Card>

        {/* 右栏 */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="gap-0 py-0">
            <div className="border-b border-line px-4 py-3">
              <SectionHead title="变异类型分布" count={VARIATIONS.length} description="近 30 天登记构成（合成）" />
            </div>
            <CardContent className="px-4 py-3">
              <HBarChart data={typeChart} height={196} labelWidth={64} rightPad={62} />
              <div className="mt-1 flex items-center justify-between border-t border-line pt-2 text-[10.5px] text-muted-foreground">
                <span>近 30 天全量 40 条 · 列表为演示抽样</span>
                <span className="font-mono">时间+临床 65.0%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <div className="border-b border-line px-4 py-3">
              <SectionHead title="处理时效" description="发现 → 评估 → 草案 → 审核（中位数）" />
            </div>
            <CardContent className="px-4 py-2.5">
              <div className="divide-y divide-line">
                <Field label="发现 → 首次响应" value="1.8 小时" mono />
                <Field label="评估 → 重规划草案" value="6.2 小时" mono />
                <Field label="草案 → 医生审核" value="3.1 小时" mono />
                <Field
                  label="当前超 24 小时未处理"
                  value={
                    <span className={cn("inline-flex items-center gap-1", stats.overdue24h > 0 && "text-warn")}>
                      <Timer className="size-3" />
                      {stats.overdue24h} 条
                    </span>
                  }
                  mono
                />
              </div>
              <div className="mt-2 rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                时效基于变异事件时间戳计算；未处理记录不会自动关闭，超时仅提示，不改变临床状态。
              </div>
            </CardContent>
          </Card>

          <Callout tone="risk" title="安全相关变异阻止自动推进">
            安全变异（如凝血异常、出血、过敏）触发后，手术 / 用药相关任务暂停推进，系统<b>不会自动修改正式方案</b>。
            必须由医生确认并发布新计划版本后方可继续执行，原计划差异完整保留。
          </Callout>

          <Callout tone="neutral" title="差异与历史版本保留">
            所有重规划均生成新计划版本，原计划与调整前差异不可覆盖；处理过程写入审计日志，可追溯至具体操作人。
          </Callout>
        </div>
      </div>


      {/* ------------------ 类型 × 严重度矩阵 / 变异趋势 ------------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="gap-0 py-0 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="类型 × 严重度矩阵" description="近 30 天变异登记数（合成）" />
            <span className="font-mono text-[10px] text-muted-foreground">单位：例</span>
          </div>
          <CardContent className="px-4 py-3">
            <HeatmapGrid
              rows={VARIATION_MATRIX.rows}
              cols={VARIATION_MATRIX.cols}
              values={VARIATION_MATRIX.values}
              tone="risk"
              unit="例"
              rowWidth={76}
              footnote="颜色越深表示该类型 × 严重度登记越多"
            />
            <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-muted-foreground">
              安全变异全部为高风险（1 例），需优先处置；高风险变异不自动推进计划。
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="变异类型趋势" description="近 12 周新增（按类型堆叠，合成）" />
            <span className="font-mono text-[10px] text-muted-foreground">单位：例</span>
          </div>
          <CardContent className="px-4 py-3">
            <StackedAreaTrend data={VARIATION_TREND} series={VARIATION_TREND_SERIES} height={208} unit="例" />
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              趋势为合成演示序列；安全变异（红色）任何上升均需人工复核，系统不会自动重规划。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------ 病区 × 路径阶段变异热力 ------------------ */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="gap-0 py-0 xl:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead
              title="病区 × 路径阶段变异热力"
              description="近 30 天模拟变异率，可点击单元格下钻至病区 / 阶段记录（合成）"
            />
            <span className="font-mono text-[10px] text-muted-foreground">单位：变异率 %</span>
          </div>
          <CardContent className="px-4 py-3">
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: `92px repeat(${DEPT_STAGE_HEATMAP.cols.length}, minmax(0, 1fr))` }}>
              <span />
              {DEPT_STAGE_HEATMAP.cols.map((col) => (
                <span key={col} className="pb-1 text-center text-[9.5px] text-muted-foreground">
                  {col}
                </span>
              ))}
              {DEPT_STAGE_HEATMAP.rows.map((row, ri) => (
                <div key={row} className="contents">
                  <span className="pr-2 text-[10.5px] text-muted-foreground">{row}</span>
                  {DEPT_STAGE_HEATMAP.cols.map((col, ci) => {
                    const value = DEPT_STAGE_HEATMAP.values[ri][ci];
                    const alpha = 0.1 + (value / 24) * 0.78;
                    const active = heatCell?.row === row && heatCell?.col === col;
                    return (
                      <button
                        key={`${row}-${col}`}
                        onClick={() => setHeatCell({ row, col, value })}
                        title={`${row} · ${col}：${value}%`}
                        className={cn(
                          "flex h-8 items-center justify-center rounded-[3px] font-mono text-[10px] tabular transition-all",
                          active ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "hover:opacity-80",
                        )}
                        style={{
                          background: `oklch(0.56 0.19 27 / ${alpha})`,
                          color: alpha > 0.55 ? "#ffffff" : "var(--foreground)",
                        }}
                      >
                        {value}%
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2">
              <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
                <span>低</span>
                {[0.12, 0.28, 0.46, 0.64, 0.82].map((a) => (
                  <span key={a} className="size-2.5 rounded-[1px]" style={{ background: `oklch(0.56 0.19 27 / ${a})` }} />
                ))}
                <span>高</span>
              </div>
              <span className="text-[9.5px] text-muted-foreground/70">颜色越深表示该病区 / 阶段的变异率越高</span>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="单元格下钻" description="点击左侧任意单元格" />
          </div>
          <CardContent className="px-4 py-3">
            {heatCell ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold">
                      {heatCell.row} · {heatCell.col}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">模拟变异率（近 30 天）</p>
                  </div>
                  <span className="tabular text-[24px] font-semibold text-risk">{heatCell.value}%</span>
                </div>
                <div className="divide-y divide-line/70 border-y border-line/70">
                  <Field label="估计变异患者" value={`${Math.max(1, Math.round((heatCell.value / 100) * 42))} 例`} />
                  <Field label="主要类型" value="临床变异 / 时间变异" />
                  <Field label="关联路径" value="肝癌手术 · 肝癌消融治疗" />
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  正式产品点击单元格后将下钻到该病区、阶段、路径版本的变异清单与患者事件；演示环境仅展示聚合值。
                </p>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    toast.info(`下钻：${heatCell.row} · ${heatCell.col}（演示）`, {
                      description: "正式版本将按数据范围过滤并展示相关变异记录。",
                    })
                  }
                >
                  查看相关变异记录
                </Button>
              </div>
            ) : (
              <p className="py-6 text-center text-[11px] text-muted-foreground">
                点击左侧热力单元格查看该病区、阶段的变异率与下钻说明。
              </p>
            )}
            <div className="mt-3 rounded-md border border-line bg-secondary/30 px-2.5 py-2 text-[9.5px] leading-relaxed text-muted-foreground">
              变异率用于质量改进与流程对比，不用于病区考核；偏离标准路径可能是个体化诊疗所需。
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================ 详情 Sheet ============================ */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-[560px] max-w-[94vw]">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10.5px] text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", TYPE_DOT[selected.type])} />
                    {VARIATION_TYPE_META[selected.type].label}
                  </span>
                  <StatusBadge tone={RISK_META[selected.severity].tone}>{RISK_META[selected.severity].label}</StatusBadge>
                  <StatusBadge tone={VARIATION_STATUS_META[selected.status].tone} pulse={selected.status === "ASSESSING"}>
                    {VARIATION_STATUS_META[selected.status].label}
                  </StatusBadge>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{selected.id}</span>
                </div>
                <SheetTitle className="mt-1 leading-snug">{selected.title}</SheetTitle>
                <SheetDescription>
                  发现于 <span className="font-mono">{fmtDate(selected.detectedAt, true)}</span>
                  <span className="mx-1 text-line-strong">·</span>
                  <span className="font-mono">{relTime(selected.detectedAt)}</span>
                </SheetDescription>
              </SheetHeader>

              <SheetBody className="space-y-4">
                {selected.type === "SAFETY" && (
                  <Callout tone="risk" title="安全变异 · 阻断自动推进">
                    该变异触发安全约束，相关任务已暂停。系统不会自动改变正式方案，需医生评估后生成新计划版本。
                  </Callout>
                )}

                {/* 患者 / 路径 */}
                <section>
                  <SectionHead title="患者与路径" className="mb-1.5" />
                  <div className="rounded-md border border-line">
                    <div className="divide-y divide-line px-3">
                      <Field
                        label="患者"
                        value={
                          <Link className="text-primary hover:underline" to={`/patients/${selected.patientId}`}>
                            {selected.patientName}
                            <span className="ml-1 font-mono text-[10px] text-muted-foreground">{selected.patientId}</span>
                          </Link>
                        }
                      />
                      <Field
                        label="路径"
                        value={
                          linkedPathway ? (
                            <Link className="text-primary hover:underline" to={`/pathways/${linkedPathway.id}/versions`}>
                              {selected.pathwayName}
                              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                {linkedPathway.currentVersion}
                              </span>
                            </Link>
                          ) : (
                            selected.pathwayName
                          )
                        }
                      />
                      <Field label="来源" value={selected.source} />
                      <Field
                        label="状态机"
                        value={<span className="font-mono text-[10.5px]">{selected.status}</span>}
                        mono
                      />
                    </div>
                  </div>
                </section>

                {/* 描述 */}
                <section>
                  <SectionHead title="变异描述" className="mb-1.5" />
                  <p className="rounded-md border border-line bg-secondary/30 px-3 py-2.5 text-[12px] leading-relaxed text-foreground/85">
                    {selected.description}
                  </p>
                </section>

                {/* 影响范围 */}
                <section>
                  <SectionHead title="影响范围" className="mb-1.5" />
                  <div className="rounded-md border border-line px-3 py-2.5">
                    <p className="text-[12px] leading-relaxed text-foreground/85">{selected.impact}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {selected.affectedNodes.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">尚未登记受影响节点</span>
                      ) : (
                        selected.affectedNodes.map((node) => (
                          <span
                            key={node}
                            className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-0.5 text-[10.5px] text-foreground/75"
                          >
                            <Layers className="size-2.5 text-muted-foreground" />
                            <span className="font-mono">{node}</span>
                            {NODE_LABEL[node] && (
                              <span className="text-muted-foreground">· {NODE_LABEL[node]}</span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                {/* 触发规则 */}
                <section>
                  <SectionHead title="触发规则" className="mb-1.5" />
                  <div className="rounded-md border border-line">
                    <div className="divide-y divide-line px-3">
                      <Field label="规则引用" value={selected.ruleRef} mono />
                      <Field label="严重度" value={RISK_META[selected.severity].label} />
                      <Field label="当前状态" value={VARIATION_STATUS_META[selected.status].label} />
                    </div>
                  </div>
                </section>

                {/* 证据 */}
                <section>
                  <SectionHead title="证据与依据" count={selected.evidence.length} className="mb-1.5" />
                  <ul className="space-y-1.5">
                    {selected.evidence.map((item, i) => (
                      <li
                        key={`${item}-${i}`}
                        className="flex items-start gap-2 rounded-md border border-line bg-card px-2.5 py-1.5 text-[11.5px] text-foreground/80"
                      >
                        <FileText className="mt-px size-3 shrink-0 text-muted-foreground" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* 处理流程 */}
                <section>
                  <SectionHead
                    title="处理流程与历史轨迹"
                    description="当前步骤高亮；时间戳来自变异事件记录"
                    className="mb-2"
                  />
                  <ol>
                    {variationSteps(selected).map((step, i, arr) => (
                      <li key={step.label} className="relative flex gap-2.5 pb-2.5 last:pb-0">
                        {i < arr.length - 1 && (
                          <span
                            className={cn(
                              "absolute top-3.5 bottom-0 left-[5.5px] w-px",
                              step.state === "done" ? "bg-primary/40" : "bg-line",
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "relative z-10 mt-0.5 flex size-3 shrink-0 items-center justify-center rounded-full border",
                            step.state === "done" && "border-primary bg-primary",
                            step.state === "current" && "border-warn bg-warn-wash",
                            step.state === "pending" && "border-line bg-card",
                          )}
                        >
                          {step.state === "done" ? (
                            <Check className="size-2 text-primary-foreground" strokeWidth={3} />
                          ) : (
                            <span
                              className={cn(
                                "size-1 rounded-full",
                                step.state === "current" ? "bg-warn" : "bg-line-strong",
                              )}
                            />
                          )}
                        </span>
                        <div className="-mt-px flex flex-1 items-center justify-between gap-3">
                          <span
                            className={cn(
                              "text-[12px]",
                              step.state === "current"
                                ? "font-medium text-foreground"
                                : step.state === "done"
                                  ? "text-foreground/80"
                                  : "text-muted-foreground",
                            )}
                          >
                            {step.label}
                            {step.state === "current" && (
                              <span className="ml-1.5 rounded-[3px] bg-warn-wash px-1 py-px font-mono text-[9px] text-warn">
                                当前
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {step.at ? fmtDate(step.at, true) : "待完成"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {selected.resolution && (
                  <Callout tone="ok" title={`处理结论 · ${selected.resolvedBy ?? "—"}`}>
                    {selected.resolution}
                  </Callout>
                )}

                <Callout tone="neutral" title="原计划与调整前差异完整保留，不覆盖历史">
                  变异处理生成的新计划版本独立存储，原计划版本、差异对比与审计日志均保留；已发布路径不会被自动修改。
                </Callout>
              </SheetBody>

              <SheetFooter className="flex-wrap gap-2">
                <div className="mr-auto flex items-center gap-1.5">
                  {linkedInstance ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/planning/${linkedInstance.id}`}>
                        <GitBranch className="size-3.5" />
                        查看规划
                      </Link>
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                      <ClipboardList className="size-3" />
                      无关联在径实例
                    </span>
                  )}
                </div>
                {active ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAssess}
                      disabled={evaluating || selected.status !== "OPEN"}
                      title={selected.status !== "OPEN" ? "影响评估已完成" : undefined}
                    >
                      {evaluating ? <Loader2 className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
                      {evaluating ? "评估中…" : "评估影响"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResolution("");
                        setResolveOpen(true);
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      标记已解决
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setReplanOpen(true)}
                      disabled={selected.status === "OPEN" || selected.status === "REPLAN_PENDING"}
                      title={selected.status === "OPEN" ? "请先完成影响评估" : undefined}
                    >
                      <GitBranch className="size-3.5" />
                      生成重规划草案
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={VARIATION_STATUS_META[selected.status].tone}>
                      {VARIATION_STATUS_META[selected.status].label}
                    </StatusBadge>
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                      关闭
                    </Button>
                  </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================= 重规划确认 AlertDialog ========================= */}
      <AlertDialog open={replanOpen} onOpenChange={setReplanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-warn" />
              生成重规划草案
            </AlertDialogTitle>
            <AlertDialogDescription>
              将基于变异影响范围生成新的计划草案，状态变为「重规划待审」，等待医生 / 医务处审核。
              <b className="mt-1 block font-medium text-foreground/80">
                原计划不会被覆盖，调整前差异完整保留；安全相关变异不自动改变正式方案。
              </b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-line bg-secondary/40 px-3 py-2 text-[11.5px] text-muted-foreground">
            变异 <span className="font-mono text-foreground/80">{selected?.id}</span> · {selected?.patientName} ·{" "}
            {selected ? VARIATION_TYPE_META[selected.type].label : ""}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplan}>
              <GitBranch className="size-3.5" />
              确认生成草案
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================= 标记已解决 Dialog ========================= */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>标记变异已解决</DialogTitle>
            <DialogDescription>
              处理结论将写入变异记录与审计日志，原计划差异与历史版本完整保留。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-md border border-line bg-secondary/40 px-3 py-2 text-[11.5px]">
              <span className="text-muted-foreground">变异：</span>
              <span className="font-medium">{selected?.title}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variation-resolution">处理结论</Label>
              <Textarea
                id="variation-resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="例如：已完成术前营养干预，复查 NRS 2002 = 1 分，路径继续执行。"
                className="min-h-[88px]"
              />
              <p className="text-[10.5px] text-muted-foreground">必填。请记录临床判断依据与后续安排。</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResolveOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleResolve}>
              <CheckCircle2 className="size-3.5" />
              确认已解决
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================= 登记变异 Dialog ========================= */}
      <Dialog
        open={registerOpen}
        onOpenChange={(open) => {
          setRegisterOpen(open);
          if (!open) setForm(EMPTY_FORM);
        }}
      >
        <DialogContent className="max-w-[540px]">
          <DialogHeader>
            <DialogTitle>登记变异</DialogTitle>
            <DialogDescription>
              人工登记变异不会自动修改正式方案；登记后进入待处理队列，需完成影响评估。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>患者</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择患者" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_PATIENTS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>变异类型</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as VariationType }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {VARIATION_TYPE_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>严重度</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm((f) => ({ ...f, severity: v as Variation["severity"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择严重度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">高风险</SelectItem>
                    <SelectItem value="MEDIUM">中风险</SelectItem>
                    <SelectItem value="LOW">低风险</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="variation-title">变异标题</Label>
                <Input
                  id="variation-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例如：术前营养筛查结果缺失"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="variation-desc">变异描述</Label>
              <Textarea
                id="variation-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="描述变异事实、发生时间、已采取措施与信息来源。"
                className="min-h-[76px]"
              />
            </div>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              登记信息为合成演示数据；提交后可在列表中继续评估影响并生成重规划草案。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRegisterOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleRegister}>
              <Plus className="size-3.5" />
              登记变异
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
