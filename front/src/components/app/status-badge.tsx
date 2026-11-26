import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/clinical";

/** Quiet status: gray surface + colored dot. No rainbow washes. */
const TONE_STYLES: Record<Tone, { badge: string; dot: string }> = {
  ok: { badge: "border-transparent bg-secondary text-foreground/80", dot: "bg-ok" },
  warn: { badge: "border-transparent bg-secondary text-foreground/80", dot: "bg-warn" },
  risk: { badge: "border-transparent bg-secondary text-foreground/80", dot: "bg-risk" },
  info: { badge: "border-transparent bg-secondary text-foreground/80", dot: "bg-info" },
  neutral: { badge: "border-transparent bg-secondary text-muted-foreground", dot: "bg-muted-foreground/50" },
  ink: { badge: "border-transparent bg-foreground text-background", dot: "bg-background/70" },
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
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-px text-[11px] leading-[18px] font-medium tracking-[-0.01em] whitespace-nowrap",
        TONE_STYLES[tone].badge,
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-50", TONE_STYLES[tone].dot)} />}
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
