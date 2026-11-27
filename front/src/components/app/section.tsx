import type { ReactNode } from "react";
import { AlertTriangle, Info, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------ 区块标题 ------------------------------ */

interface SectionHeadProps {
  title: string;
  count?: number | string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHead({ title, count, description, action, className }: SectionHeadProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold tracking-[-0.015em]">{title}</h2>
          {count !== undefined && (
            <span className="rounded-md bg-secondary px-1.5 py-px text-[11px] font-medium text-muted-foreground">{count}</span>
          )}
        </div>
        {description && <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
    </div>
  );
}

/* ------------------------------- 提示条 ------------------------------- */

const CALLOUT = {
  risk: { wrap: "border-line bg-card text-foreground", icon: XCircle },
  warn: { wrap: "border-line bg-card text-foreground", icon: AlertTriangle },
  info: { wrap: "border-line bg-card text-foreground", icon: Info },
  ok: { wrap: "border-line bg-card text-foreground", icon: ShieldCheck },
  neutral: { wrap: "border-line bg-card text-muted-foreground", icon: Info },
};

interface CalloutProps {
  tone?: keyof typeof CALLOUT;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: boolean;
}

export function Callout({ tone = "info", title, children, action, className, icon = true }: CalloutProps) {
  const meta = CALLOUT[tone];
  const Icon = meta.icon;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5", meta.wrap, className)}>
      {icon && <Icon className={cn("mt-px size-3.5 shrink-0", tone === "risk" ? "text-risk" : tone === "warn" ? "text-warn" : "text-muted-foreground")} />}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium tracking-[-0.01em]">{title}</p>
        {children && <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------ 空状态 ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-dashed border-line-strong bg-secondary/40 text-muted-foreground [&_svg]:size-4">
          {icon}
        </div>
      )}
      <p className="text-[13px] font-medium">{title}</p>
      {description && <p className="mt-1 max-w-[360px] text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ---------------------------- 字段列表 ---------------------------- */

export function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5", className)}>
      <span className="shrink-0 text-[11.5px] text-muted-foreground">{label}</span>
      <span className={cn("text-right text-[12px] font-medium text-foreground/90", mono && "font-mono text-[11.5px]")}>{value}</span>
    </div>
  );
}

/** 产品面不再展示演示角标；保留导出以免旧引用报错。 */
export function SyntheticTag(_props: { className?: string }) {
  return null;
}
