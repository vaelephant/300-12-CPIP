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
          <h2 className="text-[13.5px] font-semibold tracking-tight">{title}</h2>
          {count !== undefined && (
            <span className="rounded-[3px] bg-secondary px-1 py-px font-mono text-[10px] text-muted-foreground">{count}</span>
          )}
        </div>
        {description && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
    </div>
  );
}

/* ------------------------------- 提示条 ------------------------------- */

const CALLOUT = {
  risk: { wrap: "border-risk/25 bg-risk-wash/70 text-risk", icon: XCircle },
  warn: { wrap: "border-warn/30 bg-warn-wash/70 text-warn", icon: AlertTriangle },
  info: { wrap: "border-info/25 bg-info-wash/70 text-info", icon: Info },
  ok: { wrap: "border-ok/25 bg-ok-wash/70 text-ok", icon: ShieldCheck },
  neutral: { wrap: "border-line bg-secondary/60 text-muted-foreground", icon: Info },
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
    <div className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5", meta.wrap, className)}>
      {icon && <Icon className="mt-px size-3.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium">{title}</p>
        {children && <div className="mt-0.5 text-[11.5px] leading-relaxed text-foreground/65">{children}</div>}
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

/* ------------------------------ 确认数据 ------------------------------ */

export function SyntheticTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[9.5px] tracking-wider text-muted-foreground uppercase",
        className,
      )}
      title="演示环境中的全部内容均为合成数据，不代表真实患者信息"
    >
      <span className="size-1 rounded-full bg-warn" />
      SYNTHETIC · 演示数据
    </span>
  );
}
