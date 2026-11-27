import { cn } from "@/lib/utils";

/**
 * OV-02 GroupedSheet · 工作空间左侧概览
 * 弱组头三组：属性 / 分期 / 体征
 */

export type OverviewFact = {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  tone?: "default" | "warn" | "risk" | "ok";
};

export type OverviewVital = {
  code: string;
  label: string;
  value: string;
  unit?: string;
  flag?: "NORMAL" | "HIGH" | "LOW" | string;
};

export type OverviewGroupedSheetProps = {
  facts: OverviewFact[];
  staging: OverviewFact[];
  missing?: string[];
  vitals: OverviewVital[];
  className?: string;
};

function valueTone(tone?: OverviewFact["tone"]) {
  if (tone === "risk") return "text-risk";
  if (tone === "warn") return "text-warn";
  if (tone === "ok") return "text-ok";
  return "text-ink";
}

function vitalTone(flag?: string) {
  if (flag === "HIGH") return "text-risk";
  if (flag === "LOW") return "text-warn";
  return "text-ink";
}

export function OverviewGroupedSheet({
  facts,
  staging,
  missing,
  vitals,
  className,
}: OverviewGroupedSheetProps) {
  const groups: { title: string; rows: OverviewFact[] }[] = [
    { title: "属性", rows: facts },
    { title: "分期", rows: staging },
  ];

  return (
    <div className={cn("py-0.5", className)}>
      {groups.map((g) => (
        <div key={g.title} className="py-1.5">
          <p className="mb-0.5 text-[10px] font-medium tracking-[0.05em] text-muted-foreground uppercase">
            {g.title}
          </p>
          {g.rows.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-2 py-[3px]">
              <span className="shrink-0 text-[11px] text-muted-foreground">{f.label}</span>
              <div className="min-w-0 text-right">
                <div
                  className={cn(
                    "truncate text-[12px]",
                    f.mono && "font-mono tabular-nums",
                    valueTone(f.tone),
                  )}
                >
                  {f.value}
                </div>
                {f.hint ? <div className="truncate text-[10px] text-warn">{f.hint}</div> : null}
              </div>
            </div>
          ))}
        </div>
      ))}

      {missing && missing.length > 0 ? (
        <p className="pb-1 text-[10px] leading-4 text-warn">缺失 · {missing.join("、")}</p>
      ) : null}

      <div className="border-t border-line py-1.5">
        <p className="mb-0.5 text-[10px] font-medium tracking-[0.05em] text-muted-foreground uppercase">
          体征
        </p>
        {vitals.length ? (
          vitals.map((v) => (
            <div key={v.code} className="flex items-baseline justify-between gap-2 py-[3px]">
              <span className="text-[11px] text-muted-foreground">{v.label}</span>
              <span className={cn("font-mono text-[12px] tabular-nums", vitalTone(v.flag))}>
                {v.value}
                {v.unit ? (
                  <span className="ml-0.5 text-[10px] text-muted-foreground">{v.unit}</span>
                ) : null}
              </span>
            </div>
          ))
        ) : (
          <p className="py-1 text-[11px] text-muted-foreground">暂无</p>
        )}
      </div>
    </div>
  );
}
