import type { PatientStateSnapshot } from "@/types";
import { AlertTriangle, CircleHelp, Clock3, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionHead } from "@/components/app/section";
import { cn, fmtDate, relTime } from "@/lib/utils";
import { fieldLabel } from "./patient-state";

export function DataCompletenessBody({
  state,
  className,
  showSource = true,
}: {
  state: PatientStateSnapshot;
  className?: string;
  showSource?: boolean;
}) {
  const known = state.fields.filter((f) => f.status === "KNOWN").length;
  const unknown = state.fields.filter((f) => f.status === "UNKNOWN").length;
  const stale = state.fields.filter((f) => f.status === "STALE").length;
  const missingLabels = state.missingFields.map((f) => fieldLabel(state, f));

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-[11.5px] text-muted-foreground">
            完整度 <span className="font-mono text-[13px] font-semibold text-foreground tabular">{state.dataCompleteness}%</span>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tabular">
            KNOWN {known} · UNKNOWN {unknown} · STALE {stale}
          </span>
        </div>
        <Progress
          value={state.dataCompleteness}
          className="mt-1.5 h-1.5"
          indicatorClassName={state.dataCompleteness < 80 ? "bg-warn" : "bg-primary"}
        />
      </div>

      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-foreground/75">
          <Clock3 className="size-3 text-warn" /> 待补充资料
          <span className="font-mono text-[10px] text-muted-foreground">({missingLabels.length})</span>
        </p>
        <div className="flex flex-wrap gap-1">
          {missingLabels.length ? (
            missingLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-[3px] border border-warn/25 bg-warn-wash px-1.5 py-px text-[10.5px] text-warn"
              >
                <AlertTriangle className="size-2.5" /> {label} · 待补充
              </span>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground">无缺失字段</span>
          )}
        </div>
      </div>

      {state.unknownConditions.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-foreground/75">
            <CircleHelp className="size-3 text-warn" /> 未知条件
          </p>
          <ul className="space-y-1">
            {state.unknownConditions.map((c) => (
              <li key={c} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-warn" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-1.5 rounded-md border border-line bg-secondary/40 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-px size-3 shrink-0 text-muted-foreground/70" />
        <span>
          UNKNOWN / STALE 字段不会被自动视为满足条件；规划与入径判定均按三态逻辑处理。
        </span>
      </div>

      {showSource && (
        <p className="font-mono text-[9.5px] text-muted-foreground/70">
          状态快照 {fmtDate(state.snapshotAt, true)} · {relTime(state.snapshotAt)} · 来源 HCC-CIP 状态聚合（合成）
        </p>
      )}
    </div>
  );
}

export function DataCompletenessCard({
  state,
  description,
  action,
  className,
}: {
  state: PatientStateSnapshot;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <SectionHead title="数据完整性" description={description} action={action} />
      </CardHeader>
      <CardContent>
        <DataCompletenessBody state={state} />
      </CardContent>
    </Card>
  );
}
