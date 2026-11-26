import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, ShieldCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/app/status-badge";

/* ------------------------------ 患者标记 ------------------------------ */

export function FlagChips({
  flags,
  max = 2,
  className,
  nowrap = false,
}: {
  flags: string[];
  max?: number;
  className?: string;
  /** 单行显示（表格行内使用，避免换行撑高行高） */
  nowrap?: boolean;
}) {
  if (!flags.length) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3" /> 无特殊标记
      </span>
    );
  }
  const shown = flags.slice(0, max);
  const rest = flags.slice(max);
  return (
    <span className={cn("inline-flex items-center gap-1", nowrap ? "flex-nowrap" : "flex-wrap", className)}>
      {shown.map((f) => (
        <Badge
          key={f}
          variant="secondary"
          className={cn("truncate font-normal", nowrap ? "max-w-[90px]" : "max-w-[190px]")}
          title={f}
        >
          {f}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">
              <Badge variant="outline" className="font-mono">
                +{rest.length}
              </Badge>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="mb-1 font-medium">全部标记</p>
            <ul className="list-disc space-y-0.5 pl-3.5">
              {flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

export function AllergyChips({ allergies }: { allergies: string[] }) {
  if (!allergies.length) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[4px] border border-ok/20 bg-ok-wash px-1.5 py-px text-[11px] text-ok">
        <ShieldCheck className="size-3" /> 无已知过敏
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {allergies.map((a) => (
        <span
          key={a}
          className="inline-flex items-center gap-1 rounded-[4px] border border-risk/20 bg-risk-wash px-1.5 py-px text-[11px] font-medium text-risk"
        >
          <AlertTriangle className="size-3" />
          {a}过敏
        </span>
      ))}
    </span>
  );
}

/* ------------------------------ 三态判定 ------------------------------ */

export type TriState = "TRUE" | "FALSE" | "UNKNOWN" | "WARN" | "PASS" | "BLOCKED";

const TRI_META: Record<TriState, { tone: "ok" | "risk" | "warn" | "neutral" | "info"; label: string }> = {
  TRUE: { tone: "ok", label: "TRUE" },
  FALSE: { tone: "neutral", label: "FALSE" },
  UNKNOWN: { tone: "warn", label: "UNKNOWN" },
  WARN: { tone: "warn", label: "WARN" },
  PASS: { tone: "ok", label: "PASS" },
  BLOCKED: { tone: "risk", label: "BLOCKED" },
};

export function TriStateBadge({ value, note, className }: { value: TriState; note?: string; className?: string }) {
  const meta = TRI_META[value];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StatusBadge tone={meta.tone} dot={false} className="font-mono text-[10px] tracking-wider">
        {meta.label}
      </StatusBadge>
      {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
    </span>
  );
}

/** 字段状态徽标（KNOWN / UNKNOWN / STALE） */
export function FieldStatusBadge({ status }: { status: "KNOWN" | "UNKNOWN" | "STALE" }) {
  const meta =
    status === "KNOWN"
      ? { tone: "ok" as const, label: "KNOWN" }
      : status === "UNKNOWN"
        ? { tone: "warn" as const, label: "UNKNOWN" }
        : { tone: "info" as const, label: "STALE" };
  return (
    <StatusBadge tone={meta.tone} dot={false} className="font-mono text-[9.5px] tracking-wider">
      {meta.label}
    </StatusBadge>
  );
}

/* ------------------------------ 分页 ------------------------------ */

function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(pageCount - 1, page + 1); p++) out.push(p);
  if (page < pageCount - 2) out.push("…");
  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  itemLabel = "条",
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5", className)}>
      <span className="text-[11.5px] text-muted-foreground tabular">
        显示 <span className="font-mono text-foreground/85">{start}</span>–
        <span className="font-mono text-foreground/85">{end}</span> / 共{" "}
        <span className="font-mono text-foreground/85">{total}</span> {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex size-7 items-center justify-center rounded-md border border-line bg-card text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          aria-label="上一页"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {pageWindow(page, Math.max(1, pageCount)).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="inline-flex size-7 items-center justify-center text-muted-foreground">
              <MoreHorizontal className="size-3.5" />
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 font-mono text-[11px] tabular transition-colors",
                p === page
                  ? "border-primary/30 bg-accent font-semibold text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="inline-flex size-7 items-center justify-center rounded-md border border-line bg-card text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          aria-label="下一页"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ 小工具 ------------------------------ */

export function SubNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[10.5px] leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

export function MiniStat({ label, value, tone }: { label: string; value: ReactNode; tone?: "risk" | "warn" | "ok" }) {
  return (
    <div className="rounded-md border border-line bg-secondary/30 px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-mono text-[13px] font-semibold tabular",
          tone === "risk" && "text-risk",
          tone === "warn" && "text-warn",
          tone === "ok" && "text-ok",
        )}
      >
        {value}
      </div>
    </div>
  );
}
