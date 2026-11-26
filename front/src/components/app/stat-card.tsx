import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  deltaUnit?: string;
  /** 数值上升 / 下降哪一个代表改善，默认上升为改善 */
  deltaPolarity?: "up" | "down";
  trend?: number[];
  hint?: string;
  tone?: "ok" | "risk" | "info" | "neutral";
  progress?: number;
  footer?: ReactNode;
  className?: string;
  inverted?: boolean;
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  deltaUnit = "%",
  deltaPolarity = "up",
  trend,
  hint,
  tone = "ok",
  progress,
  footer,
  className,
  inverted = false,
}: StatCardProps) {
  const flat = delta === 0 || delta === undefined;
  const improved = deltaPolarity === "down" ? (delta ?? 0) < 0 : (delta ?? 0) > 0;
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-lg border border-line bg-card px-4 pt-3 pb-3.5 shadow-card transition-colors hover:border-line-strong",
        inverted && "border-ink/10 bg-ink text-white",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[11.5px] font-medium tracking-wide", inverted ? "text-white/60" : "text-muted-foreground")}>
            {label}
          </span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className={cn("outline-none", inverted ? "text-white/35 hover:text-white/70" : "text-muted-foreground/50 hover:text-muted-foreground")}>
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[260px] leading-relaxed">{hint}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {trend && trend.length > 1 && (
          <Sparkline values={trend} tone={tone} width={74} height={24} className="opacity-90" />
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className={cn("tabular text-[26px] leading-none font-semibold tracking-[-0.02em]", inverted ? "text-white" : "text-foreground")}>
            {value}
          </span>
          {unit && <span className={cn("text-[12px] font-medium", inverted ? "text-white/55" : "text-muted-foreground")}>{unit}</span>}
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 whitespace-nowrap rounded-[3px] px-1 py-0.5 text-[10.5px] font-medium tabular",
              flat
                ? inverted ? "bg-white/8 text-white/55" : "bg-secondary text-muted-foreground"
                : improved
                  ? inverted ? "bg-white/10 text-emerald-200" : "bg-ok-wash text-ok"
                  : inverted ? "bg-white/10 text-rose-200" : "bg-risk-wash text-risk",
            )}
          >
            {flat ? <Minus className="size-2.5" /> : improved ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
            {flat ? "持平" : `${Math.abs(delta).toFixed(1)}${deltaUnit}`}
            {deltaLabel && <span className={cn("ml-0.5 font-normal", inverted ? "text-white/40" : "text-muted-foreground/70")}>{deltaLabel}</span>}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
      {footer && <div className={cn("mt-2.5 border-t pt-2 text-[10.5px]", inverted ? "border-white/10 text-white/50" : "border-line text-muted-foreground")}>{footer}</div>}
    </div>
  );
}
