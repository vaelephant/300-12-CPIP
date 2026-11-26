import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Download,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Route,
  SkipBack,
  SkipForward,
  TriangleAlert,
} from "lucide-react";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getPatient, EVIDENCE_ITEMS, TASKS } from "@/data";
import { getInstanceByPatient } from "@/data/runtime";
import { HCC_GRAPH } from "@/data/pathways";
import {
  JOURNEY_EVENTS,
  REPLAY_DECISIONS,
  REPLAY_SNAPSHOTS,
  REPLAY_STAGES,
  TRAJECTORY_DATA,
} from "@/data/visualization-data";
import { NODE_META, ROLE_LABELS } from "@/lib/clinical";
import { cn, fmtDate } from "@/lib/utils";
import { LivePathwayGraph, PathwayStateLegend } from "@/visualization/pathway/LivePathwayGraph";
import { PatientJourneyTimeline } from "@/visualization/timeline/PatientJourneyTimeline";
import { PatientStateRadar } from "@/visualization/patient/PatientStateRadar";
import { ClinicalTrendLinkage } from "@/visualization/patient/ClinicalTrendLinkage";
import { VisualFrame } from "@/visualization/core/VisualFrame";
import type { JourneyEvent } from "@/visualization/core/types";

const EVENT_CATEGORY_LABEL: Record<JourneyEvent["category"], string> = {
  ADMISSION: "入院",
  EXAM: "检查",
  LAB: "检验",
  SURGERY: "手术",
  MEDICATION: "用药",
  NURSING: "护理",
  ASSESSMENT: "评估",
  CONSULT: "会诊",
  DECISION: "决策",
};

const EVENT_LANE_LABEL: Record<JourneyEvent["lane"], string> = {
  assess: "评估",
  exam: "检查",
  lab: "检验",
  surgery: "手术",
  medication: "用药",
  nursing: "护理",
  followup: "随访",
};

const STATE_LABEL = {
  completed: { label: "已完成", tone: "ok" as const },
  active: { label: "执行中", tone: "warn" as const },
  variant: { label: "变异", tone: "risk" as const },
  blocked: { label: "阻塞", tone: "risk" as const },
  pending: { label: "待执行", tone: "neutral" as const },
  unknown: { label: "UNKNOWN", tone: "warn" as const },
  not_selected: { label: "未选路径", tone: "neutral" as const },
};

const REFERENCE_SCORES = [85, 90, 80, 78, 75, 88];

/** 回放页的迷你预测折线（纯 SVG，避免再加载图表实例）。 */
function PredictionSparkline({ activeIndex }: { activeIndex: number }) {
  const width = 360;
  const height = 104;
  const padX = 10;
  const padY = 10;
  const values = REPLAY_SNAPSHOTS.map((s) => s.prediction.burden);
  const lows = REPLAY_SNAPSHOTS.map((s) => s.prediction.low);
  const highs = REPLAY_SNAPSHOTS.map((s) => s.prediction.high);
  const max = 90;
  const min = 20;
  const x = (i: number) => padX + (i / (values.length - 1)) * (width - padX * 2);
  const y = (v: number) => height - padY - ((v - min) / (max - min)) * (height - padY * 2);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const band = [...lows.map((v, i) => `${x(i)},${y(v)}`), ...[...highs].reverse().map((v, i) => `${x(highs.length - 1 - i)},${y(v)}`)].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[104px] w-full overflow-visible" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={padX}
          x2={width - padX}
          y1={padY + (i * (height - padY * 2)) / 3}
          y2={padY + (i * (height - padY * 2)) / 3}
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
      ))}
      <polygon points={band} fill="var(--primary)" opacity="0.1" />
      <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinejoin="round" />
      {REPLAY_SNAPSHOTS.map((s, i) => (
        <circle
          key={s.day}
          cx={x(i)}
          cy={y(values[i])}
          r={i === activeIndex ? 3.6 : 2}
          fill={i === activeIndex ? "var(--card)" : "var(--primary)"}
          stroke="var(--primary)"
          strokeWidth={i === activeIndex ? 2 : 0}
        />
      ))}
      <line x1={x(activeIndex)} x2={x(activeIndex)} y1={padY} y2={height - padY} stroke="var(--warn)" strokeDasharray="3 3" />
      <text x={x(activeIndex)} y={height - 1} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
        {REPLAY_SNAPSHOTS[activeIndex].label}
      </text>
    </svg>
  );
}

export default function PatientReplayPage() {
  const { id = "" } = useParams();
  const patient = getPatient(id);
  const instance = getInstanceByPatient(id);
  const [dayIndex, setDayIndex] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [fitSignal, setFitSignal] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [nodeOpen, setNodeOpen] = useState(false);

  const snapshot = REPLAY_SNAPSHOTS[dayIndex];
  const maxDay = REPLAY_SNAPSHOTS.length - 1;
  const selectedEvent = JOURNEY_EVENTS.find((e) => e.id === selectedEventId) ?? null;
  const selectedNode = HCC_GRAPH.nodes.find((n) => n.nodeKey === selectedNodeKey) ?? null;
  const selectedMeta = selectedNode ? NODE_META[selectedNode.type] : null;
  const selectedTask = TASKS.find((t) => t.instanceId === instance?.id && t.nodeKey === selectedNodeKey);
  const nodeEvidence = (selectedNode?.evidenceRefs ?? [])
    .map((ref) => EVIDENCE_ITEMS.find((e) => e.id === ref))
    .filter((e): e is (typeof EVIDENCE_ITEMS)[number] => Boolean(e));

  const radarData = useMemo(
    () =>
      snapshot.state.map((dim, i) => ({
        dimension: dim.label,
        admission: REPLAY_SNAPSHOTS[0].state[i].value,
        current: dim.value,
        reference: REFERENCE_SCORES[i] ?? 80,
      })),
    [snapshot],
  );

  const dayEvents = JOURNEY_EVENTS.filter((e) => e.day === dayIndex);
  const activeDecisions = REPLAY_DECISIONS.filter((d) => d.day <= dayIndex);
  const predictionModel = TRAJECTORY_DATA[30].model;
  const stageCenter = [190, 570, 1230, 1920, 2600][snapshot.stageIndex] ?? 1230;
  const replayViewport = useMemo(() => {
    const zoom = 0.72;
    return { x: Math.min(0, 400 - stageCenter * 1.55 * zoom), y: -196, zoom };
  }, [stageCenter]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (dayIndex >= maxDay) {
        setPlaying(false);
        toast.success("回放结束", { description: "已到达 D8 · 出院随访阶段（合成演示）。" });
      } else {
        setDayIndex((v) => v + 1);
      }
    }, 1500 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, dayIndex, maxDay, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (eventOpen || nodeOpen) return;
      if (e.key === "ArrowRight") setDayIndex((v) => Math.min(maxDay, v + 1));
      if (e.key === "ArrowLeft") setDayIndex((v) => Math.max(0, v - 1));
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [eventOpen, nodeOpen, maxDay]);

  if (!patient) {
    return (
      <Page>
        <EmptyState
          icon={<Route />}
          title="患者不存在"
          description="无法找到可回放的患者档案。"
          action={
            <Button asChild size="sm">
              <Link to="/patients">返回患者中心</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  if (!instance || patient.id !== "HCC-DEMO-001") {
    return (
      <Page>
        <PageHeader
          module="VIS-011 · 患者病程回放"
          title={`${patient.name} · 病程回放`}
          description="V0.6.1 演示版仅提供陈志远（肝癌手术路径）的完整回放事件与状态快照。"
          actions={<SyntheticTag />}
        />
        <EmptyState
          icon={<Play />}
          title="该患者暂无可回放数据"
          description="病程回放依赖完整的事件日志与状态快照。当前演示数据仅覆盖 HCC-DEMO-001。"
          action={
            <Button asChild size="sm">
              <Link to={`/patients/${patient.id}`}>返回患者详情</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const goToEvent = (event: JourneyEvent) => {
    setSelectedEventId(event.id);
    setEventOpen(true);
  };

  return (
    <Page wide>
      <PageHeader
        module="VIS-011 · 患者病程回放"
        eyebrow="Clinical Journey Replay · 过去 / 现在 / 未来"
        title={`${patient.name} · 病程回放`}
        description="拖动时间滑块，回放从入院到出院的关键事件、路径状态、状态画像、检验指标、模型预测与临床决策；六视图同步于同一时间点。"
        meta={
          <>
            <PageMeta label="患者" value={`${patient.name} · ${patient.mrn}`} mono />
            <PageMeta label="路径实例" value={instance.id} mono />
            <PageMeta label="回放范围" value="D0–D8 · 合成重建" />
            <SyntheticTag />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to={`/patients/${patient.id}`}>
                <ArrowLeft className="size-3.5" /> 患者详情
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/patients/${patient.id}/map`}>
                <Route className="size-3.5" /> 动态路径图
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success("已导出回放摘要（合成演示）", {
                  description: "包含时间点、事件、状态快照与决策记录；导出行为写入审计日志（演示）。",
                })
              }
            >
              <Download className="size-3.5" /> 导出摘要
            </Button>
          </>
        }
      />

      {/* ---------------------------- 回放控制器 ---------------------------- */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-stretch border-b border-line">
            <div className="flex min-w-[190px] items-center gap-3 border-r border-line px-4 py-3">
              <div className="flex size-12 flex-col items-center justify-center rounded-[6px] bg-ink text-white">
                <span className="font-mono text-[15px] leading-none font-semibold">{snapshot.label}</span>
                <span className="mt-0.5 text-[8px] text-white/45">{snapshot.date}</span>
              </div>
              <div>
                <p className="text-[9.5px] text-muted-foreground">当前病程阶段</p>
                <p className="text-[13px] font-semibold">{snapshot.stage}</p>
                <div className="mt-1 flex items-center gap-1">
                  <StatusBadge tone="warn" dot={false}>
                    {dayEvents.length} 个事件
                  </StatusBadge>
                  <span className="font-mono text-[9px] text-muted-foreground">D{dayIndex}/D{maxDay}</span>
                </div>
              </div>
            </div>

            <div className="flex min-w-[300px] flex-1 flex-col justify-center gap-1.5 px-4 py-3">
              <div className="flex items-center gap-1.5">
                {REPLAY_STAGES.map((stage, i) => {
                  const state = i < snapshot.stageIndex ? "done" : i === snapshot.stageIndex ? "active" : "pending";
                  return (
                    <div key={stage} className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          state === "done" ? "bg-primary" : state === "active" ? "bg-warn" : "bg-line-strong",
                        )}
                      />
                      <span
                        className={cn(
                          "truncate text-[9.5px]",
                          state === "pending" ? "text-muted-foreground/60" : state === "active" ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {stage}
                      </span>
                      {i < REPLAY_STAGES.length - 1 && <span className="h-px min-w-2 flex-1 bg-line" />}
                    </div>
                  );
                })}
              </div>
              <input
                type="range"
                min={0}
                max={maxDay}
                value={dayIndex}
                onChange={(e) => {
                  setPlaying(false);
                  setDayIndex(Number(e.target.value));
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--primary)]"
                aria-label="回放时间点"
              />
              <div className="flex justify-between">
                {REPLAY_SNAPSHOTS.map((s, i) => (
                  <button
                    key={s.day}
                    onClick={() => {
                      setPlaying(false);
                      setDayIndex(i);
                    }}
                    className={cn(
                      "font-mono text-[9px] transition-colors",
                      i === dayIndex ? "font-medium text-foreground" : "text-muted-foreground/60 hover:text-foreground",
                    )}
                  >
                    D{i}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-l border-line px-4 py-3">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setDayIndex(0)}
                disabled={dayIndex === 0}
                title="回到入院"
              >
                <SkipBack className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setDayIndex((v) => Math.max(0, v - 1))} disabled={dayIndex === 0}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button size="icon" className="rounded-full" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "暂停回放" : "播放回放"}>
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setDayIndex((v) => Math.min(maxDay, v + 1))}
                disabled={dayIndex === maxDay}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPlaying(false)} title="暂停">
                <SkipForward className="size-3.5" />
              </Button>
              <div className="ml-1 flex items-center gap-0.5 rounded-md border border-line bg-card p-0.5">
                {[1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s as 1 | 2)}
                    className={cn(
                      "h-6 rounded-[4px] px-1.5 font-mono text-[9.5px]",
                      speed === s ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                onClick={() => {
                  setPlaying(false);
                  setDayIndex(0);
                }}
                title="重置"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 bg-secondary/25 px-4 py-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CircleDot className="size-2.5 text-warn" /> 六视图同步：路径图 · 状态画像 · 检验趋势 · 临床事件 · 模型预测 · 决策记录
            </span>
            <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">空格播放/暂停 · ←/→ 切换时间点</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* 动态路径图 */}
        <Card className="overflow-hidden xl:col-span-7">
          <CardHeader className="pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-[13px] font-semibold">动态临床路径图</h3>
                <span className="rounded-[3px] border border-info/25 bg-info-wash px-1.5 py-px font-mono text-[8.5px] text-info">
                  VIS-001
                </span>
                <span className="font-mono text-[8.5px] tracking-wide text-muted-foreground/60 uppercase">Live Pathway</span>
              </div>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                节点颜色随 {snapshot.label} 状态同步；点击节点查看属性与证据。
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <PathwayStateLegend compact />
              <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setFitSignal((v) => v + 1)}>
                适应画布
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-md border border-line">
              <LivePathwayGraph
                key={snapshot.day}
                stateMap={snapshot.nodeStates}
                mode="actual"
                height={402}
                fitSignal={fitSignal}
                showEvidence
                showMiniMap={false}
                onNodeSelect={(key) => {
                  if (!key) return;
                  setSelectedNodeKey(key);
                  setNodeOpen(true);
                }}
                defaultViewport={replayViewport}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-muted-foreground">
              <span>路径版本 V{instance.version} · 已锁定；状态由任务与事件重建。</span>
              <Link to={`/patients/${patient.id}/map`} className="inline-flex items-center gap-0.5 text-primary hover:underline">
                打开完整路径图 <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 右列：状态 + 预测 */}
        <div className="space-y-4 xl:col-span-5">
          <VisualFrame
            title="患者状态画像"
            badge={<span className="font-mono text-[8.5px] text-muted-foreground/60">VIS-007</span>}
            description={`${snapshot.label} 状态 vs 入院基线 · 0–100 演示评分`}
            footnote="评分为合成演示占位，正式产品须采用经验证的临床量表。"
          >
            <PatientStateRadar data={radarData} height={228} compact showFootnote={false} />
          </VisualFrame>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[13px] font-semibold">模型预测</h3>
                    <span className="rounded-[3px] border border-risk/20 bg-risk-wash px-1.5 py-px font-mono text-[8.5px] text-risk">
                      clinical_use = false
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground">模拟疾病负担指数 · 当前 {snapshot.prediction.burden}（P10–P90）</p>
                </div>
                <BrainCircuit className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <PredictionSparkline activeIndex={dayIndex} />
              <div className="mt-1 grid grid-cols-3 divide-x divide-line rounded-md border border-line bg-secondary/30 py-2">
                {[
                  { label: "当前预测", value: snapshot.prediction.burden },
                  { label: "P10 下限", value: snapshot.prediction.low },
                  { label: "P90 上限", value: snapshot.prediction.high },
                ].map((item) => (
                  <div key={item.label} className="px-3">
                    <p className="text-[9px] text-muted-foreground">{item.label}</p>
                    <p className="tabular text-[15px] font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground/70">
                {predictionModel.id}@{predictionModel.version} · {predictionModel.provider}
                <br />
                {predictionModel.note}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono text-[8.5px] text-muted-foreground/60">合成推演 · 不可用于临床</span>
                <Link to="/simulation" className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                  打开多路径推演 <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 多模态指标联动 */}
        <VisualFrame
          className="xl:col-span-8"
          title="多模态临床指标联动"
          badge={<span className="font-mono text-[8.5px] text-muted-foreground/60">VIS-004</span>}
          description="检验指标与手术、用药、影像事件共用时间轴；当前时间点与回放游标同步。"
          footnote="参考区间来自演示数据；异常标记不可替代临床判断。"
        >
          <ClinicalTrendLinkage
            cursorIndex={dayIndex}
            onHoverIndex={(i) => {
              if (i >= 0 && i <= maxDay) setDayIndex(i);
            }}
            height={246}
            showZoom={false}
          />
        </VisualFrame>

        {/* 当日事件 */}
        <Card className="xl:col-span-4">
          <CardHeader className="pb-2">
            <div>
              <h3 className="text-[13px] font-semibold">当日临床事件</h3>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">{snapshot.date} · {dayEvents.length} 条</p>
            </div>
            <span className="font-mono text-[9px] text-muted-foreground/60">{snapshot.label}</span>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {dayEvents.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground">当日无新事件，状态沿用上一时间点。</p>
            ) : (
              dayEvents.map((event) => {
                const severityTone = event.severity === "RISK" ? "risk" : event.severity === "WARN" ? "warn" : "neutral";
                return (
                  <button
                    key={event.id}
                    onClick={() => goToEvent(event)}
                    className="flex w-full items-start gap-2 rounded-md border border-line px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-secondary/30"
                  >
                    <span className="mt-0.5 font-mono text-[9px] text-muted-foreground">{event.at.split(" ")[1]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <StatusBadge tone={severityTone} dot={false}>
                          {EVENT_CATEGORY_LABEL[event.category]}
                        </StatusBadge>
                        <span className="truncate text-[10.5px] font-medium">{event.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[9.5px] text-muted-foreground">
                        {EVENT_LANE_LABEL[event.lane]} · {event.source}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 size-3 shrink-0 text-muted-foreground/50" />
                  </button>
                );
              })
            )}
            <div className="pt-1 text-[9.5px] text-muted-foreground/70">
              全部事件 {JOURNEY_EVENTS.length} 条 · 已回放 {JOURNEY_EVENTS.filter((e) => e.day <= dayIndex).length} 条
            </div>
          </CardContent>
        </Card>

        {/* 全病程时间轴 */}
        <VisualFrame
          className="xl:col-span-12"
          title="患者全病程时间轴"
          badge={<span className="font-mono text-[8.5px] text-muted-foreground/60">VIS-002</span>}
          description="统一时间坐标展示住院、评估、检查、检验、手术、用药、护理与随访事件；支持日/周/月/年尺度切换。"
          footnote="点击事件查看原始记录来源；时间轴由事件日志重建，合成演示。"
          actions={
            <span className="font-mono text-[9px] text-muted-foreground/60">
              当前 {snapshot.label} · {snapshot.date}
            </span>
          }
        >
          <PatientJourneyTimeline
            events={JOURNEY_EVENTS}
            currentDay={dayIndex}
            selectedEventId={selectedEventId ?? undefined}
            onSelect={goToEvent}
            height={318}
            compact
          />
        </VisualFrame>

        {/* 临床决策 */}
        <Card className="xl:col-span-7">
          <CardHeader className="pb-2">
            <SectionHead
              title="临床决策记录"
              description="决策依据、责任人与证据引用；回放到当前时间点已发生的决策"
              count={activeDecisions.length}
            />
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {REPLAY_DECISIONS.map((decision) => {
              const happened = decision.day <= dayIndex;
              return (
                <div
                  key={decision.id}
                  className={cn(
                    "rounded-md border px-2.5 py-2 transition-colors",
                    happened ? "border-line bg-card" : "border-dashed border-line bg-secondary/20 opacity-55",
                    decision.day === dayIndex && "border-primary/35 bg-accent/25",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground">{decision.at}</span>
                    <span className="flex-1 text-[11.5px] font-medium">{decision.title}</span>
                    {happened ? (
                      <StatusBadge tone={decision.day === dayIndex ? "info" : "ok"} dot={false}>
                        {decision.day === dayIndex ? "本日决策" : "已记录"}
                      </StatusBadge>
                    ) : (
                      <span className="font-mono text-[9px] text-muted-foreground/70">待发生</span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{decision.detail}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[9px] text-muted-foreground/70">{decision.actor}</span>
                    {decision.evidenceRefs.map((ref) => (
                      <span key={ref} className="rounded-[2px] border border-line bg-secondary/60 px-1 font-mono text-[8.5px] text-muted-foreground">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 数据来源与回放说明 */}
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="回放数据来源" description="事件日志 + 状态快照重建" />
            </CardHeader>
            <CardContent>
              <Field label="事件日志" value={`${JOURNEY_EVENTS.length} 条 · 6 类来源`} />
              <Field label="状态快照" value={`${REPLAY_SNAPSHOTS.length} 个时间点`} />
              <Field label="决策记录" value={`${REPLAY_DECISIONS.length} 条`} />
              <Field label="路径版本" value={`V${instance.version} · 已锁定`} mono />
              <Field label="入院时间" value={fmtDate(patient.admissionAt, true)} mono />
              <div className="mt-3 rounded-md border border-line bg-secondary/30 px-2.5 py-2 text-[9.5px] leading-relaxed text-muted-foreground">
                回放用于病例复盘、质量分析与教学演示；模型预测为合成 Mock Provider 输出，不得作为真实临床预测。
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <SectionHead title="回放阶段" description="7 个关键时间点对应 5 个路径阶段" />
            </CardHeader>
            <CardContent className="space-y-1.5">
              {REPLAY_SNAPSHOTS.map((s, i) => (
                <button
                  key={s.day}
                  onClick={() => {
                    setPlaying(false);
                    setDayIndex(i);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                    i === dayIndex ? "border-primary/35 bg-accent/40" : "border-line hover:bg-secondary/30",
                  )}
                >
                  <span className="w-7 font-mono text-[10px] text-muted-foreground">{s.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10.5px]">{s.stage}</span>
                    <span className="block text-[9px] text-muted-foreground">{s.date} · {s.eventIds.length} 事件</span>
                  </span>
                  <Progress value={(i / maxDay) * 100} className="h-1 w-10" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <TriangleAlert className="size-3 text-warn" />
          回放内容为合成演示重建，不代表真实患者病程；临床决策须由医生完成。
        </span>
        <span className="font-mono">VIS-011 · Journey Replay · {snapshot.label}</span>
      </div>

      {/* 事件详情 */}
      <Sheet open={eventOpen} onOpenChange={setEventOpen}>
        <SheetContent className="w-[440px]">
          <SheetHeader>
            <SheetDescription>临床事件 · {selectedEvent ? EVENT_CATEGORY_LABEL[selectedEvent.category] : ""}</SheetDescription>
            <SheetTitle>{selectedEvent?.title ?? "事件详情"}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {selectedEvent && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={selectedEvent.severity === "WARN" ? "warn" : selectedEvent.severity === "RISK" ? "risk" : "neutral"}>
                    {selectedEvent.severity ?? "INFO"}
                  </StatusBadge>
                  <span className="font-mono text-[10px] text-muted-foreground">{selectedEvent.at}</span>
                  <span className="text-[10px] text-muted-foreground">· {EVENT_LANE_LABEL[selectedEvent.lane]}泳道</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-foreground/85">{selectedEvent.description}</p>
                <div className="divide-y divide-line/70 border-y border-line/70">
                  <Field label="事件 ID" value={selectedEvent.id} mono />
                  <Field label="来源系统" value={selectedEvent.source} />
                  <Field label="所属时间点" value={REPLAY_SNAPSHOTS[selectedEvent.day].label} mono />
                  <Field label="证据引用" value={selectedEvent.evidenceRef ?? "—"} mono />
                </div>
                <Callout tone="info" title="回放说明">
                  事件按发生时间归入泳道；回放视图不会修改任何正式临床记录。
                </Callout>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setEventOpen(false)}>
                  返回回放
                </Button>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* 节点详情 */}
      <Sheet open={nodeOpen} onOpenChange={setNodeOpen}>
        <SheetContent className="w-[440px]">
          <SheetHeader>
            <SheetDescription>路径节点 · {snapshot.label} 状态</SheetDescription>
            <SheetTitle>{selectedNode?.name ?? "节点详情"}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {selectedNode && selectedMeta ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge
                    tone={STATE_LABEL[snapshot.nodeStates[selectedNode.nodeKey] ?? "pending"].tone}
                  >
                    {STATE_LABEL[snapshot.nodeStates[selectedNode.nodeKey] ?? "pending"].label}
                  </StatusBadge>
                  <StatusBadge tone="neutral" dot={false}>
                    {ROLE_LABELS[selectedNode.responsibleRole]}
                  </StatusBadge>
                  <StatusBadge tone="info" dot={false}>
                    {selectedNode.stage}
                  </StatusBadge>
                </div>
                <p className="text-[12px] leading-relaxed text-foreground/80">
                  {selectedNode.description ?? "该节点未填写说明。"}
                </p>
                <div className="divide-y divide-line/70 border-y border-line/70">
                  <Field label="节点类型" value={selectedNode.type} mono />
                  <Field label="节点标识" value={selectedNode.nodeKey} mono />
                  <Field label="是否必需" value={selectedNode.required ? "是" : "否"} />
                  <Field
                    label="时间约束"
                    value={
                      selectedNode.timeConstraint
                        ? `${selectedNode.timeConstraint.anchor} + ${selectedNode.timeConstraint.offsetHours}h`
                        : "未配置"
                    }
                    mono
                  />
                  <Field label="完成规则" value={selectedNode.completionRule?.name ?? "未配置"} />
                </div>
                {selectedTask && (
                  <div className="rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                    <p className="text-[10px] text-muted-foreground">关联任务</p>
                    <p className="mt-0.5 text-[11.5px] font-medium">{selectedTask.name}</p>
                    <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                      {selectedTask.assignee} · 截止 {fmtDate(selectedTask.dueAt, true)}
                    </p>
                  </div>
                )}
                {nodeEvidence.length > 0 && (
                  <div>
                    <p className="label-micro mb-1.5">证据引用</p>
                    {nodeEvidence.map((ev) => (
                      <div key={ev.id} className="rounded-md border border-line px-2 py-1.5">
                        <p className="font-mono text-[9px] text-muted-foreground">{ev.id} · {ev.grade} 级</p>
                        <p className="text-[10.5px]">{ev.title}</p>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setNodeOpen(false)}>
                  关闭
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">未找到节点信息。</p>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </Page>
  );
}
