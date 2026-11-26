import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  FlaskConical,
  HeartPulse,
  Microscope,
  ScanLine,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { Observation } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, SectionHead } from "@/components/app/section";
import { FilterPill, CountBadge } from "@/components/app/toolbar";
import { cn, fmtDate, fmtTime } from "@/lib/utils";
import type { Tone } from "@/lib/clinical";

const CATEGORY_META: Record<Observation["category"], { label: string; icon: LucideIcon; order: number }> = {
  VITAL: { label: "生命体征", icon: HeartPulse, order: 1 },
  LAB: { label: "检验", icon: FlaskConical, order: 2 },
  IMAGING: { label: "影像", icon: ScanLine, order: 3 },
  PATHOLOGY: { label: "病理", icon: Microscope, order: 4 },
  FUNCTION: { label: "功能检查", icon: Activity, order: 5 },
};

const FLAG_META: Record<NonNullable<Observation["flag"]>, { label: string; tone: Tone }> = {
  HIGH: { label: "偏高", tone: "risk" },
  LOW: { label: "偏低", tone: "warn" },
  NORMAL: { label: "正常", tone: "ok" },
  UNKNOWN: { label: "未知", tone: "neutral" },
};

const CATEGORIES: Observation["category"][] = ["VITAL", "LAB", "IMAGING", "PATHOLOGY", "FUNCTION"];

function ObservationTable({ rows }: { rows: Observation[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[180px]">项目</TableHead>
          <TableHead className="min-w-[200px]">结果</TableHead>
          <TableHead>参考范围</TableHead>
          <TableHead>标记</TableHead>
          <TableHead className="min-w-[130px]">采集时间</TableHead>
          <TableHead>来源</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((o) => {
          const flag = FLAG_META[o.flag ?? "UNKNOWN"];
          const abnormal = o.flag === "HIGH" || o.flag === "LOW";
          return (
            <TableRow key={o.id} className={cn(abnormal && "bg-risk-wash/25 hover:bg-risk-wash/40")}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground/90">{o.name}</span>
                  <span className="font-mono text-[9.5px] text-muted-foreground/70">{o.code}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-normal">
                <span
                  className={cn(
                    "font-mono text-[12px] font-medium tabular",
                    o.flag === "HIGH" && "text-risk",
                    o.flag === "LOW" && "text-warn",
                    o.flag === "UNKNOWN" && "text-muted-foreground italic",
                  )}
                >
                  {o.value}
                  {o.unit ? <span className="ml-1 font-sans text-[10.5px] font-normal text-muted-foreground">{o.unit}</span> : null}
                </span>
              </TableCell>
              <TableCell className="font-mono text-[11px] text-muted-foreground">{o.refRange || "—"}</TableCell>
              <TableCell>
                <StatusBadge tone={flag.tone} dot={false}>
                  {flag.label}
                </StatusBadge>
              </TableCell>
              <TableCell className="font-mono text-[11px] text-muted-foreground">
                {fmtDate(o.observedAt)} <span className="text-foreground/60">{fmtTime(o.observedAt)}</span>
              </TableCell>
              <TableCell className="text-[11px] text-muted-foreground">{o.source}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ObservationPanel({ observations }: { observations: Observation[] }) {
  const [filter, setFilter] = useState<"ALL" | Observation["category"]>("ALL");
  const abnormal = observations.filter((o) => o.flag === "HIGH" || o.flag === "LOW");
  const unknown = observations.filter((o) => o.flag === "UNKNOWN");

  const grouped = useMemo(() => {
    const map = new Map<Observation["category"], Observation[]>();
    CATEGORIES.forEach((c) => {
      const rows = observations.filter((o) => o.category === c);
      if (rows.length) map.set(c, rows);
    });
    return map;
  }, [observations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-2.5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-micro">检查检验</span>
          <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")} count={observations.length}>
            全部
          </FilterPill>
          {CATEGORIES.filter((c) => grouped.has(c)).map((c) => {
            const meta = CATEGORY_META[c];
            return (
              <FilterPill key={c} active={filter === c} onClick={() => setFilter(c)} count={grouped.get(c)?.length ?? 0}>
                {meta.label}
              </FilterPill>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-risk">
            <AlertTriangle className="size-3.5" /> 异常 {abnormal.length}
          </span>
          <span className="text-line-strong">|</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Stethoscope className="size-3.5" /> 未知 {unknown.length}
          </span>
          <CountBadge count={observations.length} />
        </div>
      </div>

      {abnormal.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warn/25 bg-warn-wash/50 px-3 py-2 text-[11.5px] text-warn">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            存在 <span className="font-mono font-semibold">{abnormal.length}</span> 项异常结果：
            {abnormal
              .slice(0, 4)
              .map((o) => `${o.name} ${o.value}${o.unit ?? ""}`)
              .join("、")}
            {abnormal.length > 4 ? ` 等` : ""}。异常结果需结合临床判断，不构成诊断结论。
          </span>
        </div>
      )}

      {observations.length === 0 ? (
        <EmptyState
          title="暂无检查检验数据"
          description="该患者尚未同步 LIS / PACS 数据，请稍后重试或检查接口状态。"
          icon={<FlaskConical />}
        />
      ) : filter === "ALL" ? (
        CATEGORIES.filter((c) => grouped.has(c)).map((c) => {
          const meta = CATEGORY_META[c];
          const Icon = meta.icon;
          const rows = grouped.get(c) ?? [];
          return (
            <section key={c} className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <Icon className="size-3.5 text-muted-foreground" />
                <h3 className="text-[13px] font-semibold tracking-tight">{meta.label}</h3>
                <span className="rounded-[3px] bg-secondary px-1 font-mono text-[10px] text-muted-foreground">{rows.length}</span>
              </div>
              <ObservationTable rows={rows} />
            </section>
          );
        })
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
          <div className="border-b border-line px-4 py-2.5">
            <SectionHead title={CATEGORY_META[filter].label} count={grouped.get(filter)?.length ?? 0} />
          </div>
          <ObservationTable rows={grouped.get(filter) ?? []} />
        </section>
      )}
    </div>
  );
}
