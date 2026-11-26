import { cn } from "@/lib/utils";
import { CHART_COLOR, CHART_SEMANTIC } from "@/components/charts/chart-theme";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  tone?: "ok" | "risk" | "info" | "neutral";
  className?: string;
  fill?: boolean;
}

const TONE = {
  ok: { stroke: CHART_COLOR["chart-1"], fill: CHART_COLOR["chart-1"] },
  risk: { stroke: CHART_COLOR["chart-1"], fill: CHART_COLOR["chart-1"] },
  info: { stroke: CHART_COLOR["chart-3"], fill: CHART_COLOR["chart-3"] },
  neutral: { stroke: CHART_SEMANTIC.neutral, fill: CHART_SEMANTIC.neutral },
};

export function Sparkline({ values, width = 88, height = 26, tone = "ok", className, fill = true }: SparklineProps) {
  if (!values.length) {
    return <div className={cn("h-[26px] w-[88px]", className)} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const step = (width - pad * 2) / (values.length - 1 || 1);
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const id = `spark-${tone}-${values.length}-${Math.round(values[0] * 10)}`;
  const last = points[points.length - 1].split(",");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TONE[tone].fill} stopOpacity="0.18" />
              <stop offset="100%" stopColor={TONE[tone].fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`${pad},${height} ${points.join(" ")} ${width - pad},${height}`}
            fill={`url(#${id})`}
          />
        </>
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={TONE[tone].stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={TONE[tone].stroke} />
    </svg>
  );
}
