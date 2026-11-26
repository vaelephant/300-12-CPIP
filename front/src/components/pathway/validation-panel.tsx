import { ChevronUp, CircleAlert, CircleCheck, CircleHelp, Sparkles, TriangleAlert } from "lucide-react";
import type { ValidationIssue } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CATEGORY_LABELS: Record<ValidationIssue["category"], string> = {
  GRAPH: "图结构",
  RULE: "规则",
  TIME: "时间",
  SAFETY: "安全",
  PERMISSION: "权限",
  VERSION: "版本",
};

const LEVEL_META = {
  ERROR: { label: "错误", tone: "risk", icon: CircleAlert },
  WARNING: { label: "警告", tone: "warn", icon: TriangleAlert },
  INFO: { label: "提示", tone: "info", icon: CircleHelp },
} as const;

interface ValidationPanelProps {
  issues: ValidationIssue[];
  open: boolean;
  onToggle: () => void;
  onJump: (issue: ValidationIssue) => void;
  onSimulateFix: (issue: ValidationIssue) => void;
}

export function ValidationPanel({ issues, open, onToggle, onJump, onSimulateFix }: ValidationPanelProps) {
  const errors = issues.filter((i) => i.level === "ERROR").length;
  const warnings = issues.filter((i) => i.level === "WARNING").length;
  const infos = issues.filter((i) => i.level === "INFO").length;

  return (
    <div className="shrink-0 border-t border-line bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 px-3 text-left outline-none transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-[4px]",
            errors > 0 ? "bg-risk-wash text-risk" : "bg-ok-wash text-ok",
          )}
        >
          {errors > 0 ? <CircleAlert className="size-3" /> : <CircleCheck className="size-3" />}
        </span>
        <span className="text-[11.5px] font-medium">校验结果</span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <span className={cn("text-risk", errors === 0 && "text-muted-foreground")}>错误 {errors}</span>
          <span className="text-line-strong">·</span>
          <span className={cn("text-warn", warnings === 0 && "text-muted-foreground")}>警告 {warnings}</span>
          <span className="text-line-strong">·</span>
          <span className={cn("text-info", infos === 0 && "text-muted-foreground")}>提示 {infos}</span>
        </span>
        <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          {open ? "收起" : "展开"}
          <ChevronUp className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="max-h-[192px] overflow-y-auto border-t border-line scrollbar-slim">
          {issues.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-[11.5px] text-ok">
              <CircleCheck className="size-4" />
              校验通过：未发现阻断性错误或警告，可提交审核。
            </div>
          ) : (
            <ul className="divide-y divide-line/80">
              {issues.map((issue) => {
                const meta = LEVEL_META[issue.level];
                const Icon = meta.icon;
                return (
                  <li key={issue.id} className="flex items-start gap-2.5 px-3 py-2">
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        issue.level === "ERROR" && "text-risk",
                        issue.level === "WARNING" && "text-warn",
                        issue.level === "INFO" && "text-info",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] leading-relaxed text-foreground/85">{issue.message}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[9.5px]">
                          {issue.id}
                        </Badge>
                        <Badge variant="outline">{CATEGORY_LABELS[issue.category]}</Badge>
                        {issue.nodeKey && (
                          <button
                            type="button"
                            onClick={() => onJump(issue)}
                            className="rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[9.5px] text-foreground/75 outline-none transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                            title={`定位到节点 ${issue.nodeKey}`}
                          >
                            {issue.nodeKey} ↗
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-[3px] border px-1.5 py-px text-[9.5px] font-medium",
                          meta.tone === "risk" && "border-risk/20 bg-risk-wash text-risk",
                          meta.tone === "warn" && "border-warn/25 bg-warn-wash text-warn",
                          meta.tone === "info" && "border-info/20 bg-info-wash text-info",
                        )}
                      >
                        {meta.label}
                      </span>
                      {issue.level === "ERROR" && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onSimulateFix(issue)}
                          title="演示操作：模拟修复该错误，用于体验提交审核流程"
                        >
                          <Sparkles className="size-3" />
                          模拟修复
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
