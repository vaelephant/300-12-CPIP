import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Map as MapIcon, PanelRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WorldModelCanvas,
  WM_FIXTURE,
  useAppWmTone,
  WmToneProvider,
  type WmCanvasData,
  type WmSelection,
} from "@/dev/desgin/kit/world-model";
import {
  buildPatientCdssActions,
  buildPatientObservatoryData,
  type ObservatoryCdssAction,
} from "@/components/patient/observatory-data";
import type { Patient, PathwayInstance, Task } from "@/types";
import type { PatientStateSnapshot } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { pushWmPlanDraft } from "@/lib/wm-plan-drafts";

/**
 * 临床观测台 · 路径 × CDSS × 世界模型
 * 主面优先：全宽画布；CDSS / 闸门进右侧抽屉。
 */

export type { ObservatoryCdssAction };

/** @deprecated 保留给 ProductDemo；业务页请用患者派生数据 */
export const OBSERVATORY_CDSS: ObservatoryCdssAction[] = [
  {
    id: "c1",
    title: "闭环 NRS 营养评估",
    why: "MDT 决策阶段超时 · UNKNOWN 营养数据缺口阻断入径确认",
    evidence: ["路径规则 · 术前营养必填", "超时 18h", "白蛋白 32 g/L"],
    severity: "critical",
    cta: "发起营养复评",
    target: { kind: "now" },
    focusStageId: "s3",
  },
  {
    id: "c2",
    title: "排定 MDT 定案会",
    why: "术前检查已完成，肝储备倾向手术优先，待多学科确认指征",
    evidence: ["ICG-R15 12.8%", "残肝体积 68%", "决策记录 #D-441"],
    severity: "warn",
    cta: "预约 MDT",
    target: { kind: "past", id: "p6" },
    focusStageId: "s2",
  },
  {
    id: "c3",
    title: "对照情景 B 再议转化",
    why: "ICG 临界；世界模型情景 B 显示窗口延长、负担中等",
    evidence: ["情景 B", "研究推演", "90 天负担 · 中"],
    severity: "info",
    cta: "仅查看推演",
    target: { kind: "future", candidateId: "B", nodeId: "b1" },
    focusStageId: null,
  },
];

function selectionMatchesAction(sel: WmSelection | null, action: ObservatoryCdssAction): boolean {
  if (!sel) return false;
  const t = action.target;
  if (sel.kind !== t.kind) return false;
  if (sel.kind === "now") return true;
  if (sel.kind === "past" && t.kind === "past") return sel.id === t.id;
  if (sel.kind === "stage" && t.kind === "stage") return sel.id === t.id;
  if (sel.kind === "candidate" && t.kind === "candidate") return sel.id === t.id;
  if (sel.kind === "future" && t.kind === "future") {
    return sel.candidateId === t.candidateId && sel.nodeId === t.nodeId;
  }
  return false;
}

export function buildObservatoryData(override?: Partial<WmCanvasData>): WmCanvasData {
  return {
    ...WM_FIXTURE,
    ...override,
    stages: override?.stages ?? WM_FIXTURE.stages,
    past: override?.past ?? WM_FIXTURE.past,
    candidates: override?.candidates ?? WM_FIXTURE.candidates,
    nowFacts: override?.nowFacts ?? WM_FIXTURE.nowFacts,
    nowBlockers: override?.nowBlockers ?? WM_FIXTURE.nowBlockers,
  };
}

function CdssPanel({
  data,
  actions,
  activeCdssId,
  armed,
  activeCandidate,
  onArmedChange,
  onApply,
  onGenerateDraft,
  WM,
}: {
  data: WmCanvasData;
  actions: ObservatoryCdssAction[];
  activeCdssId: string | null;
  armed: boolean;
  activeCandidate: "A" | "B" | "C";
  onArmedChange: (v: boolean) => void;
  onApply: (a: ObservatoryCdssAction, withToast?: boolean) => void;
  onGenerateDraft: () => void;
  WM: ReturnType<typeof useAppWmTone>;
}) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-[14px] border px-3.5 py-3"
        style={{ borderColor: WM.lineStrong, background: WM.panel, color: WM.ink }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: WM.now }}>
            CDSS · NOW
          </p>
          <span className="font-mono text-[10px]" style={{ color: WM.risk }}>
            {data.nowBlockers?.length ?? 0} BLOCK
          </span>
        </div>
        <p className="mt-2 text-[14px] font-medium" style={{ fontFamily: WM.display }}>
          {data.nowLabel}
        </p>
        <p className="mt-1 text-[12px] leading-5" style={{ color: WM.mute }}>
          {data.nowDetail}
        </p>

        <div className="mt-3 space-y-2">
          {actions.map((a) => {
            const on = activeCdssId === a.id;
            const tone = a.severity === "critical" ? WM.risk : a.severity === "warn" ? WM.warn : WM.sim;
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => onApply(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onApply(a);
                  }
                }}
                className="rounded-lg border px-3 py-2.5 text-left transition-colors"
                style={{
                  borderColor: on ? tone : WM.line,
                  background: on ? WM.cardOn : WM.void,
                  boxShadow: on ? `inset 0 0 0 1px ${tone}` : undefined,
                }}
              >
                <p className="font-mono text-[9px] tracking-[0.12em]" style={{ color: tone }}>
                  {a.severity.toUpperCase()}
                  {on ? " · LINKED" : ""}
                </p>
                <p className="mt-1 text-[13px] font-medium">{a.title}</p>
                <p className="mt-1 text-[11px] leading-4" style={{ color: WM.mute }}>
                  {a.why}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.evidence.map((e) => (
                    <span
                      key={e}
                      className="rounded border px-1.5 py-0.5 text-[10px]"
                      style={{ borderColor: WM.lineStrong, color: WM.dim }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2.5 w-full rounded-md border px-2 py-1.5 text-[12px] font-medium"
                  style={{
                    borderColor: a.severity === "info" ? WM.simLine : WM.lineStrong,
                    color: a.severity === "info" ? WM.sim : WM.ink,
                    background: a.severity === "info" ? WM.simSoft : "transparent",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply(a, true);
                  }}
                >
                  {a.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded-[14px] border px-3.5 py-3"
        style={{
          borderColor: "rgba(232,93,93,0.28)",
          background: WM.gateBg,
          color: WM.ink,
        }}
      >
        <p className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: WM.risk }}>
          <ShieldAlert className="size-3" /> ACTIVATE GATE
        </p>
        <p className="mt-1 text-[12px] leading-5" style={{ color: WM.mute }}>
          世界模型情景 ≠ 生效计划。勾选后才可生成待审草稿并送入审核中心。
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={armed}
            onChange={(e) => onArmedChange(e.target.checked)}
          />
          <span>我理解推演仅为研究情景，不会直接生效</span>
        </label>
        <button
          type="button"
          disabled={!armed}
          className="mt-3 w-full rounded-md border px-2 py-2 text-[12px] font-medium disabled:opacity-40"
          style={{ borderColor: WM.risk, color: armed ? WM.ink : WM.dim }}
          onClick={onGenerateDraft}
        >
          生成待审计划草稿 · 情景 {activeCandidate}
        </button>
      </div>
    </div>
  );
}

export function ClinicalObservatory({
  data: dataProp,
  patient,
  instance,
  tasks,
  state,
  patientLabel,
  pathwayLabel,
  className,
  showPillars = false,
  /** 嵌在患者详情时：不重复身份条/路径图，画布也藏标题头 */
  embedded = false,
  mapPath,
  initialStageId,
  initialNodeKey,
  cdssOpen: cdssOpenProp,
  onCdssOpenChange,
}: {
  data?: WmCanvasData;
  patient?: Patient;
  instance?: PathwayInstance;
  tasks?: Task[];
  state?: PatientStateSnapshot;
  patientLabel?: string;
  pathwayLabel?: string;
  className?: string;
  showPillars?: boolean;
  embedded?: boolean;
  /** 深链到路径图（独立页可用；embedded 时外层已有入口则可不传） */
  mapPath?: string;
  initialStageId?: string | null;
  initialNodeKey?: string | null;
  cdssOpen?: boolean;
  onCdssOpenChange?: (open: boolean) => void;
}) {
  const WM = useAppWmTone();
  const navigate = useNavigate();
  const [cdssOpenInner, setCdssOpenInner] = useState(false);
  const cdssOpen = cdssOpenProp ?? cdssOpenInner;
  const setCdssOpen = (open: boolean) => {
    onCdssOpenChange?.(open);
    if (cdssOpenProp === undefined) setCdssOpenInner(open);
  };

  const derived = useMemo(() => {
    if (patient && tasks) {
      return buildPatientObservatoryData({ patient, instance, tasks, state });
    }
    return null;
  }, [patient, instance, tasks, state]);

  const data = useMemo(() => {
    const base = derived ?? buildObservatoryData(dataProp);
    return {
      ...base,
      patient: patientLabel ?? base.patient,
      pathway: pathwayLabel ?? base.pathway,
    };
  }, [derived, dataProp, patientLabel, pathwayLabel]);

  const cdssActions = useMemo(() => {
    if (patient && tasks) return buildPatientCdssActions({ data, tasks });
    return OBSERVATORY_CDSS;
  }, [patient, tasks, data]);

  const [selection, setSelection] = useState<WmSelection | null>({ kind: "now" });
  const [focusStageId, setFocusStageId] = useState<string | null>(initialStageId ?? null);
  const [activeCandidate, setActiveCandidate] = useState<"A" | "B" | "C">("A");
  const [activeCdssId, setActiveCdssId] = useState<string | null>(cdssActions[0]?.id ?? null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (initialStageId) {
      setFocusStageId(initialStageId);
      setSelection({ kind: "stage", id: initialStageId });
    }
  }, [initialStageId]);

  useEffect(() => {
    if (!initialNodeKey || !tasks?.length) return;
    const task = tasks.find((t) => t.nodeKey === initialNodeKey);
    if (!task) return;
    const pastHit = data.past.find((p) => p.id === task.id);
    if (pastHit) {
      setSelection({ kind: "past", id: pastHit.id });
      setFocusStageId(pastHit.stageId);
    }
  }, [initialNodeKey, tasks, data.past]);

  const activeStage = data.stages.find((s) => s.state === "active");
  const pendingCdss = cdssActions.filter((a) => a.severity !== "info").length;

  const applyCdss = (action: ObservatoryCdssAction, withToast?: boolean) => {
    setActiveCdssId(action.id);
    setSelection(action.target);
    setFocusStageId(action.focusStageId === undefined ? null : action.focusStageId);
    if (action.target.kind === "future") setActiveCandidate(action.target.candidateId);
    else if (action.target.kind === "candidate") setActiveCandidate(action.target.id);
    if (withToast) {
      if (action.severity === "info") {
        toast.message("已定位世界模型情景", { description: "研究推演 · 未激活任何计划" });
      } else {
        toast.message(`已记录「${action.cta}」意图`, { description: "Demo · 需医生确认后生效" });
      }
    }
  };

  const onCanvasSelection = (next: WmSelection) => {
    setSelection(next);
    const match = cdssActions.find((a) => selectionMatchesAction(next, a));
    setActiveCdssId(match?.id ?? null);
    if (next.kind === "future") setActiveCandidate(next.candidateId);
    if (next.kind === "candidate") setActiveCandidate(next.id);
    if (next.kind === "stage") setFocusStageId(next.id);
    if (next.kind === "past") {
      const ev = data.past.find((p) => p.id === next.id);
      if (ev) setFocusStageId(ev.stageId);
    }
  };

  const generateDraft = () => {
    const cand = data.candidates.find((c) => c.id === activeCandidate) ?? data.candidates[0];
    const id = `AP-WM-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();
    pushWmPlanDraft({
      id,
      type: "PLAN",
      title: `世界模型情景 ${cand.id} · ${cand.name}（研究草稿）`,
      pathwayName: data.pathway,
      version: instance?.version ?? patient?.pathwayVersion ?? "demo",
      submittedBy: "观测台 · Demo",
      submittedAt: now,
      status: "PENDING",
      risk: cand.id === "B" ? "MEDIUM" : cand.id === "C" ? "HIGH" : "LOW",
      checklist: [
        { key: "gate", label: "已确认情景 ≠ 生效计划", status: "PASS" },
        { key: "clinical_use", label: "clinical_use=false（研究推演）", status: "WARN", note: "不可直激" },
        { key: "evidence", label: "Past/Now 证据已对照", status: "PENDING" },
      ],
      comments: [
        {
          author: "系统",
          role: "WORLD_MODEL",
          at: now,
          content: `由观测台从情景 ${cand.id} 生成。负担 30/90：${cand.burden30}/${cand.burden90}。`,
        },
      ],
      patientName: patient?.name ?? data.patient,
      source: "world-model",
      candidateId: cand.id,
      patientId: patient?.id,
    });
    setArmed(false);
    toast.success("已生成待审计划草稿", {
      description: `情景 ${cand.id} · 已写入审核队列（Demo）`,
      action: {
        label: "去审核中心",
        onClick: () => navigate("/approvals"),
      },
    });
  };

  return (
    <WmToneProvider tone={WM}>
      <div
        className={cn("flex min-h-0 flex-col gap-2", className)}
        style={{ fontFamily: WM.sans, color: WM.ink }}
        data-wm-mode={WM.mode}
      >
        {/* embedded：CDSS 已在患者条；独立页才显示本条工具栏 */}
        {!embedded ? (
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-1 pb-2"
            style={{ borderColor: WM.line }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium" style={{ color: WM.ink }}>
                {data.patient}
                <span className="mx-1.5 font-normal" style={{ color: WM.dim }}>
                  ·
                </span>
                <span className="font-normal" style={{ color: WM.mute }}>
                  {activeStage?.name ?? "—"}
                </span>
                <span className="mx-1.5 font-normal" style={{ color: WM.dim }}>
                  ·
                </span>
                <span className="font-mono text-[12px] font-normal tabular-nums" style={{ color: WM.mute }}>
                  {data.progress}%
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px]" style={{ color: WM.dim }}>
                {data.pathway} · 推演不可直激
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {mapPath ? (
                <Button asChild size="sm" variant="ghost">
                  <Link to={mapPath}>
                    <MapIcon className="size-3.5" /> 路径图
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setCdssOpen(true)}>
                <PanelRight className="size-3.5" />
                CDSS
                {pendingCdss > 0 ? (
                  <span className="ml-1 font-mono text-[11px] tabular-nums">{pendingCdss}</span>
                ) : null}
              </Button>
            </div>
          </div>
        ) : null}

        {showPillars ? (
          <div className="flex flex-wrap gap-2">
            {(
              [
                { k: "PATHWAY", v: "标准路径", d: activeStage ? `当前 · ${activeStage.name}` : "—" },
                { k: "CDSS", v: "决策支持", d: `${pendingCdss} 项待处理` },
                { k: "WORLD MODEL", v: "过去·现在·未来", d: "情景研究 · 不可直激" },
              ] as const
            ).map((p) => (
              <div
                key={p.k}
                className="min-w-[132px] rounded-lg border px-3 py-2"
                style={{ borderColor: WM.lineStrong, background: WM.panel, color: WM.ink }}
              >
                <p className="font-mono text-[9px] tracking-[0.14em]" style={{ color: WM.sim }}>
                  {p.k}
                </p>
                <p className="mt-1 text-[12px] font-medium">{p.v}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: WM.dim }}>
                  {p.d}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* 主面：世界模型画布 */}
        <div className="min-w-0 flex-1">
          <WorldModelCanvas
            data={data}
            selection={selection}
            onSelectionChange={onCanvasSelection}
            focusStageId={focusStageId}
            onFocusStageChange={setFocusStageId}
            activeCandidate={activeCandidate}
            onActiveCandidateChange={setActiveCandidate}
            hideHeader={embedded}
            flowHeight={420}
            className="min-h-[560px] rounded-md"
          />
        </div>

        <Sheet open={cdssOpen} onOpenChange={setCdssOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md" style={{ fontFamily: WM.sans }}>
            <SheetHeader>
              <SheetTitle>CDSS · 激活闸门</SheetTitle>
              <SheetDescription>行动定位画布；推演需闸门确认后才能生成待审草稿。</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <CdssPanel
                data={data}
                actions={cdssActions}
                activeCdssId={activeCdssId}
                armed={armed}
                activeCandidate={activeCandidate}
                onArmedChange={setArmed}
                onApply={(a, t) => {
                  applyCdss(a, t);
                }}
                onGenerateDraft={generateDraft}
                WM={WM}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>
    </WmToneProvider>
  );
}
