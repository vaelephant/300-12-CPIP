import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "搜索…",
  className,
  shortcut,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  shortcut?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md border border-input bg-card px-2.5 transition-colors focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15",
        className,
      )}
    >
      <Search className="size-3.5 shrink-0 text-muted-foreground/70" />
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/65"
      />
      {shortcut && (
        <kbd className="rounded border border-line bg-secondary px-1 font-mono text-[9.5px] text-muted-foreground">{shortcut}</kbd>
      )}
    </div>
  );
}

export function FilterPill({
  active,
  children,
  count,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
        active
          ? "border-transparent bg-secondary text-foreground"
          : "border-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && (
        <span className="tabular rounded-md bg-card px-1 text-[10px] text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

export function CountBadge({ count, tone = "neutral" }: { count: number; tone?: "neutral" | "risk" | "warn" }) {
  return (
    <span
      className={cn(
        "tabular inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-md px-1 text-[10px] font-medium bg-secondary text-muted-foreground",
        (tone === "risk" || tone === "warn") && "text-foreground",
      )}
    >
      {count}
    </span>
  );
}
