import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  padded?: boolean;
}

/** 业务页：拉满可用宽度，边距紧凑，不留大片空白 */
export function Page({ children, className, wide, padded = true }: PageProps) {
  return (
    <div
      className={cn(
        "w-full px-4 py-3",
        wide ? "max-w-none" : "max-w-none",
        padded && "pb-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  module: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  eyebrow?: string;
  className?: string;
}

export function PageHeader({ module, title, description, actions, meta, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-3 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-[18px] leading-7 font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
          <span className="text-[12px] text-muted-foreground">
            {module}
            {eyebrow ? ` · ${eyebrow}` : ""}
          </span>
        </div>
        {description && (
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{description}</p>
        )}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}

export function PageMeta({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
      <span>{label}</span>
      <span className={cn("text-foreground", mono && "font-mono text-[11px]")}>{value}</span>
    </span>
  );
}
