import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/clinical";

const TONE_STYLES: Record<Tone, { badge: string; dot: string }> = {
  ok: { badge: "border-ok/20 bg-ok-wash text-ok", dot: "bg-ok" },
  warn: { badge: "border-warn/25 bg-warn-wash text-warn", dot: "bg-warn" },
  risk: { badge: "border-risk/20 bg-risk-wash text-risk", dot: "bg-risk" },
  info: { badge: "border-info/20 bg-info-wash text-info", dot: "bg-info" },
  neutral: { badge: "border-line bg-secondary text-muted-foreground", dot: "bg-muted-foreground/50" },
  ink: { badge: "border-transparent bg-ink text-white/85", dot: "bg-white/70" },
};

interface StatusBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ tone, children, dot = true, pulse, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-px text-[11px] leading-[18px] font-medium whitespace-nowrap",
        TONE_STYLES[tone].badge,
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", TONE_STYLES[tone].dot)} />}
          <span className={cn("relative inline-flex size-1.5 rounded-full", TONE_STYLES[tone].dot)} />
        </span>
      )}
      {children}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cn("inline-block size-1.5 rounded-full", TONE_STYLES[tone].dot, className)} />;
}
