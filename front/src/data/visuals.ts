// ---------------------------------------------------------------------------
// CPIP · 可视化演示数据集（全部为确定性合成数据）
// 供各页面图表消费；与 data/ 其余 fixture 的时间基准一致。
// ---------------------------------------------------------------------------
import { NOW } from "./time";

const weekLabels = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - (11 - i) * 7);
  return `${d.getMonth() + 1}/${d.getDate()}`;
});

const shortDate = (dayOffset: number, hour = 8) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
};

/* --------------------------- 患者路径流转 Sankey --------------------------- */

export interface SankeyDataset {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}

export const PATHWAY_SANKEY: SankeyDataset = {
  nodes: [
    { name: "筛查患者" },
    { name: "符合准入" },
    { name: "未入径" },
    { name: "待补充资料" },
    { name: "入径确认" },
    { name: "术前评估" },
    { name: "术前检查" },
    { name: "治疗方案确认" },
    { name: "手术及术后" },
    { name: "变异调整" },
    { name: "出院随访" },
    { name: "正常完成" },
    { name: "路径退出" },
  ],
  links: [
    { source: 0, target: 1, value: 325 },
    { source: 0, target: 2, value: 199 },
    { source: 1, target: 4, value: 268 },
    { source: 1, target: 3, value: 57 },
    { source: 4, target: 5, value: 268 },
    { source: 5, target: 6, value: 252 },
    { source: 5, target: 12, value: 16 },
    { source: 6, target: 7, value: 246 },
    { source: 6, target: 12, value: 6 },
    { source: 7, target: 8, value: 238 },
    { source: 7, target: 9, value: 8 },
    { source: 8, target: 10, value: 238 },
    { source: 9, target: 10, value: 8 },
    { source: 10, target: 11, value: 189 },
    { source: 10, target: 12, value: 57 },
  ],
};

/** 工作台用的聚合路径流转（5 列，标签可读性更好） */
export const PATHWAY_SANKEY_COMPACT: SankeyDataset = {
  nodes: [
    { name: "筛查患者" },
    { name: "符合准入" },
    { name: "未入径" },
    { name: "待补充资料" },
    { name: "入径确认" },
    { name: "路径执行中" },
    { name: "正常完成" },
    { name: "路径退出" },
  ],
  links: [
    { source: 0, target: 1, value: 325 },
    { source: 0, target: 2, value: 199 },
    { source: 1, target: 4, value: 268 },
    { source: 1, target: 3, value: 57 },
    { source: 4, target: 5, value: 268 },
    { source: 5, target: 6, value: 189 },
    { source: 5, target: 7, value: 79 },
  ],
};

/* ------------------------------ 分期构成 ------------------------------ */

export const DISEASE_MIX = [
  { name: "Ⅰa 期", value: 62, color: "var(--chart-1)" },
  { name: "Ⅰb 期", value: 88, color: "var(--chart-2)" },
  { name: "Ⅱa 期", value: 74, color: "var(--chart-3)" },
  { name: "Ⅱb 期", value: 46, color: "var(--chart-4)" },
  { name: "Ⅲa 期", value: 30, color: "var(--chart-5)" },
];

/* ------------------------------ 科室质量雷达 ------------------------------ */

export const DEPT_RADAR = [
  { dimension: "路径完成率", hpb: 94, thoracic: 91, biliary: 89 },
  { dimension: "入径率", hpb: 88, thoracic: 84, biliary: 86 },
  { dimension: "变异控制", hpb: 82, thoracic: 84, biliary: 78 },
  { dimension: "任务及时率", hpb: 86, thoracic: 88, biliary: 84 },
  { dimension: "费用控制", hpb: 78, thoracic: 82, biliary: 88 },
  { dimension: "数据完整性", hpb: 90, thoracic: 86, biliary: 84 },
];

export const DEPT_RADAR_SERIES = [
  { key: "hpb", label: "手术切除组", color: "var(--chart-1)" },
  { key: "thoracic", label: "转化治疗组", color: "var(--chart-4)" },
  { key: "biliary", label: "消融介入组", color: "var(--chart-3)" },
];

/* --------------------------- 变异类型堆叠趋势 --------------------------- */

export const VARIATION_TREND = weekLabels.map((label, i) => ({
  label,
  values: {
    clinical: 3 + ((i * 2) % 5),
    time: 2 + ((i * 3) % 5),
    resource: 1 + ((i * 2) % 3),
    process: 1 + (i % 3),
    patient: i % 2,
    safety: i % 4 === 0 ? 1 : 0,
    data: i % 3 === 0 ? 1 : 0,
  },
}));

export const VARIATION_TREND_SERIES = [
  { key: "clinical", label: "临床变异", color: "var(--chart-1)" },
  { key: "time", label: "时间变异", color: "var(--chart-3)" },
  { key: "resource", label: "资源变异", color: "var(--chart-4)" },
  { key: "process", label: "流程变异", color: "var(--chart-2)" },
  { key: "patient", label: "患者变异", color: "var(--chart-5)" },
  { key: "safety", label: "安全变异", color: "#b23b36" },
  { key: "data", label: "数据变异", color: "#b3b6b1" },
];

/* --------------------------- 变异类型 × 严重度矩阵 --------------------------- */

export const VARIATION_MATRIX = {
  rows: ["时间变异", "临床变异", "资源变异", "流程变异", "患者变异", "安全变异", "数据变异"],
  cols: ["高", "中", "低"],
  values: [
    [2, 6, 6],
    [4, 6, 2],
    [1, 3, 2],
    [1, 2, 1],
    [0, 1, 1],
    [1, 0, 0],
    [0, 1, 0],
  ],
};

/* --------------------------- 任务超时分布热力图 --------------------------- */

export const OVERDUE_HEATMAP = {
  rows: ["一病区（手术）", "二病区（转化）", "三病区（消融/介入）", "肝癌 MDT 门诊", "随访中心"],
  cols: ["08–10", "10–12", "12–14", "14–16", "16–18", "18–20"],
  values: [
    [2, 5, 1, 4, 3, 0],
    [1, 4, 0, 3, 2, 1],
    [0, 3, 1, 2, 4, 0],
    [1, 2, 0, 2, 1, 0],
    [0, 2, 0, 3, 2, 0],
  ],
};

/* ------------------------------ 生命体征趋势 ------------------------------ */

export const VITALS_TREND = [
  { label: `${shortDate(-3)} 16:00`, temp: 36.6, hr: 82, sbp: 132, spo2: 97 },
  { label: `${shortDate(-3)} 22:00`, temp: 36.9, hr: 78, sbp: 128, spo2: 97 },
  { label: `${shortDate(-2)} 06:00`, temp: 36.7, hr: 74, sbp: 124, spo2: 98 },
  { label: `${shortDate(-2)} 14:00`, temp: 37.1, hr: 80, sbp: 126, spo2: 96 },
  { label: `${shortDate(-2)} 22:00`, temp: 36.8, hr: 76, sbp: 122, spo2: 98 },
  { label: `${shortDate(-1)} 08:00`, temp: 36.7, hr: 72, sbp: 120, spo2: 98 },
  { label: `${shortDate(-1)} 20:00`, temp: 37.2, hr: 88, sbp: 118, spo2: 97 },
  { label: `${shortDate(0)} 07:20`, temp: 37.6, hr: 78, sbp: 128, spo2: 98 },
];

/* ------------------------------ 检验指标趋势 ------------------------------ */

export const LAB_TREND = [
  { label: `入院 D0`, at: "2026-11-23T08:00:00+08:00", alt: 42, tbil: 21.3, alb: 39.2, afp: 86.4 },
  { label: `D1`, at: "2026-11-24T06:30:00+08:00", alt: 58, tbil: 26.8, alb: 37.6, afp: 84.1 },
  { label: `D2`, at: "2026-11-25T06:30:00+08:00", alt: 46, tbil: 23.1, alb: 38.1, afp: 82.0 },
  { label: `D3`, at: "2026-11-26T06:30:00+08:00", alt: 38, tbil: 18.9, alb: 38.4, afp: 78.6 },
];

export const LAB_REFERENCE = {
  alt: { low: 9, high: 50, unit: "U/L" },
  tbil: { low: 3.4, high: 20.5, unit: "μmol/L" },
  alb: { low: 40, high: 55, unit: "g/L" },
  afp: { low: 0, high: 20, unit: "ng/mL" },
};

/* --------------------------- 推演不确定性扇形图 --------------------------- */

export const SIM_UNCERTAINTY = Array.from({ length: 15 }, (_, i) => {
  const standard = Math.max(4, Math.round(100 - i * 6.6 + (i % 3) * 0.6));
  const eras = Math.max(2, Math.round(100 - i * 8.1 + (i % 2) * 0.8));
  return {
    label: `D${i}`,
    standard,
    standardBand: [Math.max(0, standard - 7), Math.min(100, standard + 7)] as [number, number],
    eras,
    erasBand: [Math.max(0, eras - 5), Math.min(100, eras + 5)] as [number, number],
  };
});

/* --------------------------- 成本-效果候选方案散点 --------------------------- */

export const COST_EFFECT_POINTS = [
  { plan: "标准路径 V1.3.0", cost: 68420, completion: 91.3, cohort: 100, recommended: false },
  { plan: "ERAS 加速路径", cost: 64280, completion: 93.1, cohort: 100, recommended: true },
  { plan: "国家临床路径基线", cost: 70150, completion: 89.4, cohort: 100, recommended: false },
  { plan: "术前等待 24h 优化", cost: 66800, completion: 92.2, cohort: 100, recommended: false },
  { plan: "营养干预强化", cost: 65200, completion: 92.8, cohort: 100, recommended: false },
];

/* ------------------------------ 版本规模增长 ------------------------------ */

export const VERSION_GROWTH = [
  { version: "1.1.0", nodes: 18, edges: 21, date: "2025-12-21", status: "已停用" },
  { version: "1.2.0", nodes: 21, edges: 25, date: "2026-04-20", status: "已停用" },
  { version: "1.3.0", nodes: 23, edges: 27, date: "2026-10-05", status: "已发布" },
  { version: "1.4.0", nodes: 25, edges: 30, date: "2026-11-20", status: "审核中" },
  { version: "1.5.0", nodes: 27, edges: 32, date: "2026-11-24", status: "草稿" },
];

/* ------------------------------ 审批效率趋势 ------------------------------ */

export const APPROVAL_WEEKLY = weekLabels.slice(5).map((label, i) => ({
  label,
  submitted: 5 + ((i * 3) % 6),
  approved: 4 + ((i * 2) % 5),
  rejected: i % 3 === 0 ? 1 : 0,
  avgHours: 5.4 - i * 0.35,
}));

export const APPROVAL_TYPE_MIX = [
  { name: "路径版本", value: 2, color: "var(--chart-1)" },
  { name: "患者计划", value: 1, color: "var(--chart-4)" },
  { name: "变异重规划", value: 1, color: "var(--chart-5)" },
];

/* --------------------------- 路径库结构分布（演示） --------------------------- */

export const PATHWAY_STATUS_MIX = [
  { name: "已发布", value: 4, color: "var(--chart-1)" },
  { name: "审核中", value: 1, color: "var(--chart-3)" },
  { name: "草稿", value: 1, color: "var(--chart-4)" },
];

export const PATHWAY_DISEASE_MIX = [
  { name: "手术切除", value: 1, color: "var(--chart-1)" },
  { name: "消融治疗", value: 1, color: "var(--chart-4)" },
  { name: "介入 TACE", value: 1, color: "var(--chart-3)" },
  { name: "转化 / 系统治疗", value: 3, color: "var(--chart-2)" },
];

/* ------------------------------ 知识证据等级 ------------------------------ */

export const EVIDENCE_GRADE_MIX = [
  { name: "A 级证据", value: 3, color: "var(--chart-1)" },
  { name: "B 级证据", value: 3, color: "var(--chart-4)" },
  { name: "院内规范", value: 2, color: "var(--chart-3)" },
];
