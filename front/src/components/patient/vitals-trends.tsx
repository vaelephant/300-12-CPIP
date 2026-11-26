import { AlertTriangle, TrendingUp } from "lucide-react";
import { VITALS_TREND } from "@/data";
import {
  ClinicalTrendChart,
  type ClinicalBand,
  type ClinicalSeries,
} from "@/components/charts/advanced";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHead } from "@/components/app/section";
import { cn } from "@/lib/utils";

const TEMP_BAND: ClinicalBand[] = [
  { low: 36.0, high: 37.2, label: "体温参考区间 36.0–37.2°C", color: "var(--ok)" },
];

const VITAL_SERIES: ClinicalSeries[] = [
  { key: "temp", label: "体温", color: "var(--chart-1)", unit: "°C", axis: "left" },
  { key: "hr", label: "脉搏", color: "var(--chart-4)", unit: "次/分", axis: "right" },
];

const PRESSURE_SERIES: ClinicalSeries[] = [
  { key: "sbp", label: "收缩压", color: "var(--chart-2)", unit: "mmHg", axis: "left" },
  { key: "spo2", label: "血氧饱和度", color: "var(--chart-4)", unit: "%", axis: "right" },
];

const TEMP_HIGH = 37.2;
const SPO2_LOW = 95;

/**
 * 概览 · 生命体征趋势卡：体温/脉搏双轴 + 体温参考区间；血压/血氧第二张小图。
 * 使用 data/visuals 中确定性合成趋势数据，明确标记 SYNTHETIC。
 */
export function VitalsTrendCard({ className }: { className?: string }) {
  const latest = VITALS_TREND[VITALS_TREND.length - 1];
  const tempAbnormal = latest.temp > TEMP_HIGH;
  const spo2Abnormal = latest.spo2 < SPO2_LOW;
  const tempOverCount = VITALS_TREND.filter((p) => p.temp > TEMP_HIGH).length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <SectionHead
          title="生命体征趋势"
          description="近 3 日 8 个采集点 · 体温 / 脉搏双轴，参考区间底色 36.0–37.2°C"
          action={
            <Badge variant="outline" className="font-mono text-[9px]">
              SYNTHETIC · 趋势
            </Badge>
          }
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80">
              <TrendingUp className="size-3 text-muted-foreground" /> 体温 / 脉搏
            </span>
            {tempAbnormal ? (
              <Badge variant="risk" className="gap-1 text-[9.5px]">
                <AlertTriangle className="size-3" />
                最近 {latest.temp}°C 高于参考上限（{tempOverCount}/8 点超出）
              </Badge>
            ) : (
              <Badge variant="ok" className="text-[9.5px]">
                最近 {latest.temp}°C 在参考区间内
              </Badge>
            )}
          </div>
          <ClinicalTrendChart
            data={VITALS_TREND}
            series={VITAL_SERIES}
            bands={TEMP_BAND}
            height={168}
            yDomain={[35.5, 38.5]}
            yRightDomain={[50, 110]}
          />
          <p className="mt-1 font-mono text-[9px] text-muted-foreground/80">
            左轴 体温 °C · 右轴 脉搏 次/分 · 浅色底色为体温参考区间（36.0–37.2°C）
          </p>
        </div>

        <div className="rounded-md border border-line/70 bg-secondary/15 p-2.5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-foreground/80">收缩压 / 血氧饱和度</span>
            <span className="inline-flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
              最近 {latest.sbp} mmHg · {latest.spo2}%
              {spo2Abnormal && (
                <Badge variant="warn" className="gap-0.5 text-[9px]">
                  <AlertTriangle className="size-2.5" /> 血氧偏低
                </Badge>
              )}
            </span>
          </div>
          <ClinicalTrendChart
            data={VITALS_TREND}
            series={PRESSURE_SERIES}
            height={118}
            yDomain={[100, 150]}
            yRightDomain={[90, 100]}
          />
          <p className="mt-1 font-mono text-[9px] text-muted-foreground/80">
            左轴 收缩压 mmHg · 右轴 血氧饱和度 %（参考 ≥ 95%）
          </p>
        </div>

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          合成演示趋势，用于展示趋势与参考区间交互，不代表真实监护记录；异常值仅提示需复测，不构成诊断结论。
        </p>
      </CardContent>
    </Card>
  );
}
