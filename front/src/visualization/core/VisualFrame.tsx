// ---------------------------------------------------------------------------
// Clinical Visualization Engine · 统一图表卡片
// ---------------------------------------------------------------------------
import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VisualFrameProps {
  title: ReactNode;
  english?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
  className?: string;
  contentClassName?: string;
  dense?: boolean;
  badge?: ReactNode;
}

export function VisualFrame({
  title,
  english,
  description,
  actions,
  children,
  footnote,
  className,
  contentClassName,
  dense = false,
  badge,
}: VisualFrameProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <CardHeader className={cn("flex-wrap gap-y-2", dense ? "px-3.5 pt-3 pb-2" : "pb-2")}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-[13px]">{title}</CardTitle>
            {badge}
            {english && (
              <span className="font-mono text-[8.5px] tracking-[0.1em] text-muted-foreground/60 uppercase">
                {english}
              </span>
            )}
          </div>
          {description && <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <CardAction className="flex-wrap">{actions}</CardAction>}
      </CardHeader>
      <CardContent className={cn("flex-1", dense ? "px-3.5 pb-3" : "pt-0", contentClassName)}>{children}</CardContent>
      {footnote && (
        <div className="border-t border-line bg-secondary/20 px-4 py-1.5 text-[9.5px] text-muted-foreground/80">
          {footnote}
        </div>
      )}
    </Card>
  );
}
