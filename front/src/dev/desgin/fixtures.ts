/** 合成演示数据 · 触发问题态（超阈 / 未达目标）供预览 */

export const TREND = [
  { label: "W1", enrollment: 48, completion: 42, prev: 44, rate: 88 },
  { label: "W2", enrollment: 52, completion: 46, prev: 47, rate: 88 },
  { label: "W3", enrollment: 55, completion: 49, prev: 50, rate: 89 },
  { label: "W4", enrollment: 58, completion: 51, prev: 52, rate: 88 },
  { label: "W5", enrollment: 61, completion: 54, prev: 55, rate: 89 },
  { label: "W6", enrollment: 63, completion: 58, prev: 56, rate: 92 },
  { label: "W7", enrollment: 66, completion: 60, prev: 58, rate: 91 },
  { label: "W8", enrollment: 68, completion: 63, prev: 60, rate: 93 },
];

export const RISK_DONUT = [
  { name: "低风险", value: 152, tone: "muted" as const },
  { name: "中风险", value: 88, tone: "accent" as const },
  { name: "高风险", value: 42, tone: "warn" as const },
  { name: "严重", value: 18, tone: "down" as const },
];

export const VARIATION_BARS = [
  { label: "时间", value: 14 },
  { label: "临床", value: 12 },
  { label: "资源", value: 8 },
  { label: "流程", value: 6 },
  { label: "安全", value: 3, tone: "down" as const },
];

export const LOS_BARS = [
  { label: "≤3", value: 48 },
  { label: "4–6", value: 96 },
  { label: "7–9", value: 72 },
  { label: "10–14", value: 42 },
  { label: ">14", value: 18 },
];

export const STAGE_LOAD = [
  { label: "评估", total: 28, done: 22, overdue: 2 },
  { label: "检查", total: 34, done: 18, overdue: 5 },
  { label: "方案", total: 21, done: 16, overdue: 1 },
  { label: "手术", total: 19, done: 9, overdue: 3 },
  { label: "随访", total: 15, done: 11, overdue: 0 },
];

export const HEAT_ROWS = ["一病区", "二病区", "三病区", "MDT"];
export const HEAT_COLS = ["评估", "检查", "方案", "手术", "随访"];
export const HEAT_VALUES = [
  [4, 12, 6, 8, 3],
  [7, 18, 9, 14, 5],
  [3, 9, 5, 6, 2],
  [2, 5, 11, 4, 1],
];

export const RADAR = [
  { dimension: "入径率", eras: 88, standard: 76 },
  { dimension: "完成率", eras: 92, standard: 84 },
  { dimension: "准时率", eras: 81, standard: 73 },
  { dimension: "安全", eras: 95, standard: 90 },
  { dimension: "满意度", eras: 86, standard: 80 },
];

export const RANKED = [
  { name: "影像等待", value: "26h", share: 92, detail: "CT" },
  { name: "MDT 排期", value: "18h", share: 70 },
  { name: "病理回报", value: "32h", share: 100 },
  { name: "出院办理", value: "6h", share: 28 },
  { name: "随访接通", value: "4h", share: 18 },
];

export const KPI = [
  {
    id: "patients",
    label: "在径",
    value: 234,
    unit: "例",
    cur: 234,
    prev: 226,
    spark: [196, 202, 211, 218, 222, 226, 229, 234],
    title: "在径患者 · 本周",
  },
  {
    id: "complete",
    label: "完成率",
    value: "93.8",
    unit: "%",
    cur: 93.8,
    prev: 92.6,
    spark: [88, 89, 91, 90, 92, 93, 92, 93.8],
  },
  {
    id: "variation",
    label: "变异率",
    value: "12.8",
    unit: "%",
    cur: 12.8,
    prev: 13.4,
    invert: true,
    spark: [15.2, 14.8, 14.1, 13.6, 13.1, 12.9, 13.0, 12.8],
  },
  {
    id: "los",
    label: "平均住院日",
    value: "9.2",
    unit: "天",
    cur: 9.2,
    prev: 9.6,
    invert: true,
    spark: [10.4, 10.0, 9.8, 9.6, 9.5, 9.4, 9.3, 9.2],
  },
];
