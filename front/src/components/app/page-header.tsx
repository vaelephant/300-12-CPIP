import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  padded?: boolean;
}

/** 页面内容容器：统一 1560px 工作区、24px 边距与纵向节奏 */
export function Page({ children, className, wide, padded = true }: PageProps) {
  return (
    <div className={cn("mx-auto w-full px-6 py-6", wide ? "max-w-[1680px]" : "max-w-[1560px]", padded && "pb-10", className)}>
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
    <header className={cn("mb-5 flex items-start justify-between gap-6", className)}>
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="label-micro">{module}</span>
          <span className="h-2.5 w-px bg-line-strong" />
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            {eyebrow ?? "肝癌全病程智能诊疗平台"}
          </span>
        </div>
        <h1 className="text-[24px] leading-[32px] font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 max-w-[760px] text-[13px] leading-[22px] text-muted-foreground">{description}</p>
        )}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-4">{actions}</div>}
    </header>
  );
}

export function PageMeta({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
      <span>{label}</span>
      <span className={cn("text-foreground/85", mono && "font-mono text-[11px]")}>{value}</span>
    </span>
  );
}
