import { useState } from "react";
import { AlertTriangle, FlaskConical, Table2, TrendingUp } from "lucide-react";
import { LAB_REFERENCE, LAB_TREND } from "@/data";
import { ClinicalTrendChart } from "@/components/charts/advanced";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHead } from "@/components/app/section";
import { cn } from "@/lib/utils";

type LabKey = "alt" | "tbil" | "afp";

interface LabPanel {
  key: LabKey;
  name: string;
  short: string;
  unit: string;
  color: string;
  note: string;
}

const PANELS: LabPanel[] = [
  {
    key: "alt",
    name: "丙氨酸氨基转移酶",
    short: "ALT",
    unit: LAB_REFERENCE.alt.unit,
    color: "var(--chart-1)",
    note: "反映肝细胞损伤，术后需关注是否再次升高。",
  },
  {
    key: "tbil",
    name: "总胆红素",
    short: "TBIL",
    unit: LAB_REFERENCE.tbil.unit,
    color: "var(--chart-3)",
    note: "D1 曾高于参考上限，随后逐步回落。",
  },
  {
    key: "afp",
    name: "甲胎蛋白",
    short: "AFP",
    unit: LAB_REFERENCE.afp.unit,
    color: "var(--chart-5)",
    note: "肿瘤标志物，持续高于参考上限，需结合影像随访。",
  },
];

function direction(value: number, low: number, high: number): "high" | "low" | "normal" {
  if (value > high) return "high";
  if (value < low) return "low";
  return "normal";
}

/**
 * 检验检查 · 关键指标趋势卡：ALT / TBIL / AFP 三张紧凑折线，带参考区间底色。
 * 数据来自 data/visuals 的 LAB_TREND 与 LAB_REFERENCE，标记 SYNTHETIC。
 */
const SHORT_TIME = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function KeyLabTrendsCard({ className }: { className?: string }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <SectionHead
          title="关键指标趋势"
          description="入院以来 ALT / TBIL / AFP 变化 · 参考区间来自院内检验标准"
          action={
            <div className="flex items-center gap-1 rounded-md border border-line bg-secondary/40 p-0.5">
              <Button size="xs" variant={view === "chart" ? "secondary" : "ghost"} onClick={() => setView("chart")}>
                <TrendingUp className="size-3" /> 图
              </Button>
              <Button size="xs" variant={view === "table" ? "secondary" : "ghost"} onClick={() => setView("table")}>
                <Table2 className="size-3" /> 表
              </Button>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PANELS.map((panel) => {
            const ref = LAB_REFERENCE[panel.key];
            const latest = LAB_TREND[LAB_TREND.length - 1][panel.key];
            const dir = direction(latest, ref.low, ref.high);
            const overCount = LAB_TREND.filter((d) => direction(d[panel.key], ref.low, ref.high) === "high").length;
            const chartData = LAB_TREND.map((d) => ({
              label: d.label,
              atMs: +new Date(d.at),
              value: d[panel.key],
            }));
            const tone = dir === "high" ? "text-risk" : dir === "low" ? "text-warn" : "text-ok";
            return (
              <div key={panel.key} className="rounded-md border border-line/80 bg-secondary/15 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FlaskConical className="size-3 text-muted-foreground" />
                      <span className="text-[11.5px] font-semibold">{panel.short}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{panel.name}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                      参考 {ref.low}–{ref.high} {panel.unit}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={cn("font-mono text-[15px] leading-none font-semibold tabular", tone)}>
                      {latest}
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{panel.unit}</span>
                    </div>
                    <div className="mt-1">
                      {dir === "high" ? (
                        <Badge variant="risk" className="gap-0.5 text-[8.5px]">
                          <AlertTriangle className="size-2.5" /> 高于上限
                        </Badge>
                      ) : dir === "low" ? (
                        <Badge variant="warn" className="gap-0.5 text-[8.5px]">
                          <AlertTriangle className="size-2.5" /> 低于下限
                        </Badge>
                      ) : (
                        <Badge variant="ok" className="text-[8.5px]">
                          参考范围内
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {view === "chart" ? (
                  <ClinicalTrendChart
                    className="mt-1.5"
                    data={chartData}
                    series={[{ key: "value", label: panel.short, color: panel.color, unit: panel.unit }]}
                    bands={[
                      {
                        low: ref.low,
                        high: ref.high,
                        label: `${panel.short} 参考 ${ref.low}–${ref.high}`,
                        color: "var(--ok)",
                      },
                    ]}
                    height={112}
                    xKey="atMs"
                    xTickFormatter={(value) => SHORT_TIME.format(new Date(value))}
                    xTooltipFormatter={(value) => SHORT_TIME.format(new Date(value))}
                  />
                ) : (
                  <table className="mt-2 w-full text-left text-[9.5px]">
                    <thead className="text-muted-foreground">
                      <tr><th className="py-1 font-medium">采集时间</th><th className="py-1 font-medium">数值</th><th className="py-1 font-medium">参考</th></tr>
                    </thead>
                    <tbody>
                      {LAB_TREND.map((row) => (
                        <tr key={row.at} className="border-t border-line/60">
                          <td className="py-1 font-mono">{SHORT_TIME.format(new Date(row.at))}</td>
                          <td className="py-1 font-mono">{row[panel.key]} {panel.unit}</td>
                          <td className="py-1 font-mono text-muted-foreground">{ref.low}–{ref.high}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground/80">
                  <span>4 个采集点 · LIS · 最近 {SHORT_TIME.format(new Date(LAB_TREND[LAB_TREND.length - 1].at))}</span>
                  <span className={cn(dir !== "normal" || overCount > 0 ? "text-warn" : "text-muted-foreground/80")}>
                    {overCount > 0 ? `${overCount} 点高于参考上限` : "均在参考区间"}
                  </span>
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{panel.note}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-secondary/20 px-2.5 py-1.5">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            异常方向以「高于上限 / 低于下限」标注；参考区间底色仅为提示，异常结果需结合临床判断，不构成诊断结论。缺测不绘制、不填零；单位不一致不直接连线。
          </p>
          <span className="font-mono text-[9px] text-muted-foreground/70">LAB_TREND · </span>
        </div>
      </CardContent>
    </Card>
  );
}
