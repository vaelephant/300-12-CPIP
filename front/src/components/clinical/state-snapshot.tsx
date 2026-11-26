import { Clock3, Database, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/app/status-badge";
import { semanticForRisk } from "@/lib/clinical-semantics";
import { cn, fmtDate } from "@/lib/utils";

export function StateSnapshot({
  stage,
  risk,
  completeness,
  asOf,
  source = "SYNTHETIC",
  className,
}: {
  stage: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | string;
  completeness: number;
  asOf?: string;
  source?: string;
  className?: string;
}) {
  const riskSemantic = semanticForRisk(risk);
  return (
    <Card className={cn("mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5", className)}>
      <div>
        <p className="label-micro">当前阶段</p>
        <p className="mt-0.5 text-[12px] font-medium">{stage || "未开始"}</p>
      </div>
      <div>
        <p className="label-micro">风险</p>
        <div className="mt-0.5"><StatusBadge tone={riskSemantic.tone} dot={false}>{riskSemantic.label}</StatusBadge></div>
      </div>
      <div>
        <p className="label-micro">数据完整度</p>
        <p className={cn("mt-0.5 font-mono text-[13px] tabular", completeness < 80 ? "text-warn" : "text-foreground")}>{completeness}%</p>
      </div>
      <div>
        <p className="label-micro">快照时点</p>
        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground">
          <Clock3 className="size-3" /> {asOf ? fmtDate(asOf, true) : "当前视图"}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Database className="size-3" /> {source}</span>
        <span className="inline-flex items-center gap-1 text-ok"><ShieldCheck className="size-3" /> 合成数据 · 非临床使用</span>
      </div>
    </Card>
  );
}
