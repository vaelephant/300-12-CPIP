import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Patient, Task, Variation } from "@/types";
import { cn, fmtDate, relTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PromptId = "priority" | "missing" | "variation" | "node";

const PROMPTS: { id: PromptId; label: string }[] = [
  { id: "priority", label: "今日优先" },
  { id: "missing", label: "UNKNOWN" },
  { id: "variation", label: "开放变异" },
  { id: "node", label: "阶段卡住" },
];

export type ClinicalCopilotProps = {
  patient: Patient;
  currentStage?: string;
  dataAsOf?: string;
  openTasks: Task[];
  overdueTasks: Task[];
  variations: Variation[];
  missingFields: string[];
  unknownConditions: string[];
  executionLink: string;
  planningLink: string | null;
  className?: string;
};

/**
 * Linear-quiet 临床副驾驶
 * 芯片提问 + 一段说明 + 底部操作；不堆卡片、不造医嘱。
 */
export function ClinicalCopilot({
  patient,
  currentStage = "未开始",
  dataAsOf,
  openTasks,
  overdueTasks,
  variations,
  missingFields,
  unknownConditions,
  executionLink,
  planningLink,
  className,
}: ClinicalCopilotProps) {
  const [active, setActive] = useState<PromptId>("priority");
  const [customQ, setCustomQ] = useState("");

  const openVariations = variations.filter((v) =>
    ["OPEN", "ASSESSING", "REPLAN_PENDING"].includes(v.status),
  );

  const draft = useMemo(
    () =>
      buildGroundedDraft(active, {
        patient,
        currentStage,
        openTasks,
        overdueTasks,
        openVariations,
        missingFields,
        unknownConditions,
      }),
    [
      active,
      patient,
      currentStage,
      openTasks,
      overdueTasks,
      openVariations,
      missingFields,
      unknownConditions,
    ],
  );

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[13px] font-medium text-ink">副驾驶</span>
          <span className="text-[11px] text-muted-foreground">AI · 非医嘱</span>
        </div>
        {dataAsOf && (
          <span className="truncate text-[11px] text-muted-foreground">
            {fmtDate(dataAsOf)} · {relTime(dataAsOf)}
          </span>
        )}
      </div>

      <p className="truncate text-[12px] leading-4 text-muted-foreground">
        {patient.name} · {currentStage}
        {overdueTasks.length > 0 ? ` · 超时 ${overdueTasks.length}` : ""}
        {openVariations.length > 0 ? ` · 变异 ${openVariations.length}` : ""}
      </p>

      <div className="flex flex-wrap gap-1">
        {PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActive(p.id);
              setCustomQ("");
            }}
            className={cn(
              "rounded-md px-2 py-1 text-[12px] leading-4 transition-colors",
              active === p.id
                ? "bg-ink text-surface"
                : "bg-surface text-muted-foreground hover:bg-surface-muted hover:text-ink",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-line bg-surface px-3 py-2.5">
        <p className="text-[13px] leading-[20px] text-ink">{draft.summary}</p>
        {draft.bullets.length > 0 && (
          <ul className="mt-2 space-y-1">
            {draft.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-[12px] leading-[18px] text-muted-foreground">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {draft.gaps.length > 0 && (
          <p className="mt-2 text-[12px] leading-[18px] text-warn">
            UNKNOWN · {draft.gaps.join("、")}
          </p>
        )}
        {draft.evidence.length > 0 && (
          <p className="mt-2 truncate text-[11px] leading-4 text-muted-foreground">
            {draft.evidence.join(" · ")}
          </p>
        )}
      </div>

      <div className="flex gap-1.5">
        <input
          value={customQ}
          onChange={(e) => setCustomQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              toast.info("请用上方芯片提问。");
            }
          }}
          placeholder="提问…"
          className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[12px] text-ink outline-none placeholder:text-muted-foreground focus:border-ink/30"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => toast.info("请用上方芯片提问。")}
        >
          问
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[12px]">
        <Link to={executionLink} className="inline-flex items-center gap-0.5 text-ink hover:underline">
          任务执行 <ArrowUpRight className="size-3" />
        </Link>
        {openVariations.length > 0 && (
          <Link to="/variations" className="inline-flex items-center gap-0.5 text-ink hover:underline">
            变异 {openVariations.length} <ArrowUpRight className="size-3" />
          </Link>
        )}
        {planningLink && (
          <Link to={planningLink} className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-ink hover:underline">
            规划审核 <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
    </section>
  );
}

function buildGroundedDraft(
  id: PromptId,
  ctx: {
    patient: Patient;
    currentStage: string;
    openTasks: Task[];
    overdueTasks: Task[];
    openVariations: Variation[];
    missingFields: string[];
    unknownConditions: string[];
  },
) {
  const {
    patient,
    currentStage,
    openTasks,
    overdueTasks,
    openVariations,
    missingFields,
    unknownConditions,
  } = ctx;

  const shortMissing = missingFields.map((f) => f.split(".").slice(-1)[0]);
  const evidence: string[] = [`${patient.id}`, currentStage];

  if (id === "priority") {
    const bullets: string[] = [];
    if (overdueTasks.length) {
      bullets.push(
        `超时 ${overdueTasks.length}：${overdueTasks
          .slice(0, 2)
          .map((t) => t.name)
          .join("、")}`,
      );
    }
    if (openVariations.length) {
      bullets.push(`变异「${openVariations[0].title}」待评估`);
    }
    if (patient.allergy.length) {
      bullets.push(`过敏 ${patient.allergy.join("、")}`);
    }
    if (!bullets.length) {
      bullets.push(openTasks[0] ? `下一待办「${openTasks[0].name}」` : "无开放待办");
    }
    overdueTasks.slice(0, 2).forEach((t) => evidence.push(t.id));
    return {
      summary: `${patient.name} · ${currentStage}。按超时 / 变异 / 过敏排序，非诊疗建议。`,
      bullets,
      gaps: shortMissing.slice(0, 3),
      evidence,
    };
  }

  if (id === "missing") {
    return {
      summary:
        shortMissing.length || unknownConditions.length
          ? "快照中的缺失按 UNKNOWN 处理，不视为已满足。"
          : "未列出缺失字段；以执行中心与检验页为准。",
      bullets: [
        ...shortMissing.map((m) => m),
        ...unknownConditions.map((c) => c),
      ].slice(0, 6),
      gaps: [],
      evidence: [...evidence, "snapshot"],
    };
  }

  if (id === "variation") {
    if (!openVariations.length) {
      return {
        summary: "无开放变异。",
        bullets: [],
        gaps: [],
        evidence,
      };
    }
    return {
      summary: `${openVariations.length} 条开放变异（摘录既有记录）。`,
      bullets: openVariations.slice(0, 3).map((v) => `${v.title} · ${v.severity}`),
      gaps: shortMissing.slice(0, 2),
      evidence: [...evidence, ...openVariations.slice(0, 2).map((v) => v.id)],
    };
  }

  const stageTasks = openTasks.filter((t) => t.stage === currentStage);
  const list = stageTasks.length ? stageTasks : openTasks;
  return {
    summary: `「${currentStage}」未完成 ${list.length} 项。`,
    bullets: list.slice(0, 4).map((t) => `${t.overdue ? "超时 · " : ""}${t.name}`),
    gaps: shortMissing.slice(0, 2),
    evidence: [...evidence, ...list.slice(0, 2).map((t) => t.id)],
  };
}
