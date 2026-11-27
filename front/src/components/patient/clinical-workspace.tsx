import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Clinical Workspace · 主面优先
 * 窄属性栏 + 宽主工作面；副驾驶走抽屉，不占常驻第三栏。
 */

export function WorkspacePage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-[calc(100vh-3.5rem)] w-full min-w-0 flex-col bg-canvas", className)}>
      {children}
    </div>
  );
}

export function WorkspaceIdentity({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-14 z-10 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur-sm md:px-5",
        className,
      )}
    >
      {children}
    </header>
  );
}

/**
 * 左属性 · 中主面
 * 用 flex + 固定左宽，避免 grid 子项 min-content 把主栏撑破叠到左侧。
 */
export function WorkspaceColumns({
  left,
  center,
  className,
}: {
  left: ReactNode;
  center: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 w-full min-w-0 flex-1 flex-col md:flex-row", className)}>
      <aside
        className={cn(
          "relative z-10 w-full shrink-0 border-b border-line bg-canvas",
          "px-3 py-3 md:w-[220px] md:border-r md:border-b-0",
          "overflow-y-auto overflow-x-hidden",
        )}
      >
        {left}
      </aside>
      <section className="relative z-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface px-5 py-4 md:px-6">
        {center}
      </section>
    </div>
  );
}

export function WorkspacePanel({
  title,
  action,
  children,
  className,
  quiet,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  quiet?: boolean;
}) {
  return (
    <section className={cn("mb-5 last:mb-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2
          className={cn(
            "text-ink",
            quiet
              ? "text-[11px] font-medium tracking-[0.04em] text-muted-foreground uppercase"
              : "text-[13px] font-medium tracking-[-0.01em]",
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WorkspaceFact({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="shrink-0 text-[11px] leading-4 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right">
        <div
          className={cn(
            "truncate text-[12px] leading-4 text-ink",
            mono && "font-mono tabular-nums",
          )}
        >
          {value}
        </div>
        {hint && (
          <div className="mt-0.5 truncate text-[10px] leading-3 text-muted-foreground">{hint}</div>
        )}
      </div>
    </div>
  );
}
