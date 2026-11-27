// ---------------------------------------------------------------------------
// Clinical Visualization Engine · 演示数据（，不用于临床）
// 供动态路径图、病程回放、多路径推演、流程挖掘与院长驾驶舱消费。
// ---------------------------------------------------------------------------
import type {
  JourneyEvent,
  MultimodalEventMarker,
  MultimodalMetric,
  PatientStateRadarData,
  ProcessEdge,
  ProcessNode,
  ReplayDecision,
  ReplaySnapshot,
  StateDimension,
  TrajectoryDataset,
  TrajectoryPath,
  PathwayNodeVisualState,
} from "@/visualization/core/types";

export const REPLAY_PATIENT_ID = "HCC-DEMO-001";
export const REPLAY_INSTANCE_ID = "INST-HCC-001";

const stageList = ["术前评估", "术前检查", "治疗方案确认", "手术及术后", "出院与随访"];

/* ------------------------------- 状态快照 ------------------------------- */

const stateAt = (values: number[]): StateDimension[] => [
  { key: "liver", label: "肝功能", value: values[0] },
  { key: "renal", label: "肾功能", value: values[1] },
  { key: "nutrition", label: "营养状态", value: values[2] },
  { key: "performance", label: "体能状态", value: values[3] },
  { key: "inflammation", label: "炎症负荷", value: values[4] },
  { key: "coagulation", label: "凝血功能", value: values[5] },
];

const nodeStates = (
  completed: string[],
  active: string[],
  variant: string[] = [],
): Record<string, PathwayNodeVisualState> => {
  const result: Record<string, PathwayNodeVisualState> = {};
  completed.forEach((k) => (result[k] = "completed"));
  active.forEach((k) => (result[k] = "active"));
  variant.forEach((k) => (result[k] = "variant"));
  return result;
};

/* ------------------------------- 病程事件 ------------------------------- */

export const JOURNEY_EVENTS: JourneyEvent[] = [
  { id: "JE-001", day: 0, at: "11-23 14:20", lane: "assess", category: "ADMISSION", title: "办理入院 · 肝胆外科", description: "门诊收入院，诊断肝细胞癌（C22.0，Ⅰb 期），床位 03-12。", source: "HIS", severity: "INFO" },
  { id: "JE-002", day: 0, at: "11-23 15:40", lane: "assess", category: "DECISION", title: "医生确认入径", description: "准入规则 RULE-001 判定 TRUE，排除规则 FALSE，进入肝癌手术临床路径 V1.3.0。", source: "HCC-CIP", severity: "INFO" },
  { id: "JE-003", day: 0, at: "11-23 17:05", lane: "assess", category: "NURSING", title: "入院评估与护理评估完成", description: "病史采集、跌倒/压疮/VTE 风险评估完成。", source: "HCC-CIP / 护理系统", severity: "INFO" },
  { id: "JE-004", day: 0, at: "11-23 18:00", lane: "lab", category: "LAB", title: "入院实验室检验开单", description: "血常规、生化、凝血、肿瘤标志物、HBV-DNA。", source: "LIS", severity: "INFO" },
  { id: "JE-005", day: 1, at: "11-24 09:12", lane: "lab", category: "LAB", title: "AFP 86.4 ng/mL（高于参考上限）", description: "26 项检验结果回归，AFP、HBV-DNA 异常。", source: "LIS", severity: "WARN", evidenceRef: "EV-001" },
  { id: "JE-006", day: 1, at: "11-24 10:30", lane: "exam", category: "EXAM", title: "上腹部增强 MRI 预约", description: "影像检查任务进入排期，预计 24 小时内完成。", source: "PACS", severity: "INFO" },
  { id: "JE-007", day: 1, at: "11-24 14:00", lane: "assess", category: "ASSESSMENT", title: "Child-Pugh A 级 · ICG 检查待做", description: "肝功能评估完成，ALBI -2.41，Caprini 5 分。", source: "HCC-CIP", severity: "INFO" },
  { id: "JE-008", day: 2, at: "11-25 10:15", lane: "exam", category: "EXAM", title: "增强 MRI 完成", description: "肝右叶 S6 段 3.2cm 强化灶，考虑 HCC；门静脉癌栓待复核。", source: "PACS", severity: "WARN", evidenceRef: "EV-001" },
  { id: "JE-009", day: 2, at: "11-25 10:45", lane: "exam", category: "EXAM", title: "胸部 CT：未见转移", description: "双肺未见明确转移结节。", source: "PACS", severity: "INFO" },
  { id: "JE-010", day: 2, at: "11-25 11:20", lane: "exam", category: "EXAM", title: "肺功能 FEV1 84%", description: "心肺功能评估通过，可耐受手术。", source: "功能检查室", severity: "INFO" },
  { id: "JE-011", day: 3, at: "11-25 09:40", lane: "lab", category: "LAB", title: "ICG R15 12.4%", description: "≤ 15%，符合手术分支阈值（RULE-004）。", source: "肝胆功能室", severity: "INFO", evidenceRef: "EV-002" },
  { id: "JE-012", day: 3, at: "11-25 10:12", lane: "assess", category: "DECISION", title: "数据变异：NRS 2002 缺失", description: "规划引擎按 UNKNOWN 处理，不视为低风险，生成待补充资料提示。", source: "HCC-CIP", severity: "WARN" },
  { id: "JE-013", day: 4, at: "11-25 15:00", lane: "assess", category: "CONSULT", title: "MDT 讨论：肝段切除", description: "肝胆外科、肿瘤内科、影像科、病理科联合讨论，确定 S6 段切除方案。", source: "HCC-CIP", severity: "INFO", evidenceRef: "EV-007" },
  { id: "JE-014", day: 4, at: "11-25 16:10", lane: "assess", category: "DECISION", title: "手术指征确认", description: "ICG 12.4%，可切除，无远处转移，进入术前准备。", source: "HCC-CIP", severity: "INFO", evidenceRef: "EV-004" },
  { id: "JE-015", day: 4, at: "11-26 08:30", lane: "assess", category: "CONSULT", title: "麻醉会诊完成", description: "ASA Ⅱ级，全身麻醉方案确定。", source: "麻醉系统", severity: "INFO" },
  { id: "JE-016", day: 4, at: "11-26 10:00", lane: "assess", category: "DECISION", title: "签署手术知情同意", description: "告知手术风险、替代方案与输血同意。", source: "EMR", severity: "INFO" },
  { id: "JE-017", day: 5, at: "11-27 08:00", lane: "medication", category: "MEDICATION", title: "预防性抗菌药物（切皮前 0.5h）", description: "头孢唑林 2g 静滴，符合院内规范。", source: "HIS", severity: "INFO" },
  { id: "JE-018", day: 5, at: "11-27 08:40", lane: "surgery", category: "SURGERY", title: "肝段切除术（S6）开始", description: "四级手术，全身麻醉，预计 180 分钟，备血 2U。", source: "手术麻醉系统", severity: "INFO", evidenceRef: "EV-002" },
  { id: "JE-019", day: 5, at: "11-27 12:05", lane: "surgery", category: "SURGERY", title: "手术结束 · 转入复苏", description: "手术过程顺利，术中出血约 150ml，未输血。", source: "手术麻醉系统", severity: "INFO" },
  { id: "JE-020", day: 5, at: "11-27 14:30", lane: "nursing", category: "NURSING", title: "术后引流管护理", description: "记录引流量与性状，预防管道滑脱。", source: "护理系统", severity: "INFO" },
  { id: "JE-021", day: 5, at: "11-27 18:00", lane: "medication", category: "MEDICATION", title: "多模式镇痛启动", description: "PCIA + 对乙酰氨基酚，计划 48 小时。", source: "HIS", severity: "INFO" },
  { id: "JE-022", day: 6, at: "11-28 07:20", lane: "nursing", category: "NURSING", title: "体温 37.6°C（高于参考上限）", description: "触发术后感染风险观察，未达变异阈值，医嘱复测。", source: "护理系统", severity: "WARN" },
  { id: "JE-023", day: 6, at: "11-28 10:00", lane: "lab", category: "LAB", title: "术后病理送检", description: "大体与镜下诊断、切缘评估、微血管侵犯待报告。", source: "病理系统", severity: "INFO" },
  { id: "JE-024", day: 7, at: "11-29 08:30", lane: "assess", category: "ASSESSMENT", title: "术后首次查房", description: "生命体征平稳，引流少，疼痛 NRS 3 分，鼓励下床。", source: "EMR", severity: "INFO" },
  { id: "JE-025", day: 7, at: "11-29 15:00", lane: "nursing", category: "NURSING", title: "早期下床活动", description: "术后 ERAS 目标：24–48 小时内下床活动。", source: "护理系统", severity: "INFO" },
  { id: "JE-026", day: 8, at: "11-30 09:00", lane: "assess", category: "DECISION", title: "出院评估通过", description: "体温正常 3 天、可进食半流质、疼痛 NRS ≤ 3、引流管已拔除，符合 RULE-007。", source: "HCC-CIP", severity: "INFO", evidenceRef: "RULE-007@1.2.0" },
  { id: "JE-027", day: 8, at: "11-30 11:00", lane: "followup", category: "DECISION", title: "生成随访计划", description: "30 天复查增强 MRI + 电话随访，路径结束。", source: "HCC-CIP", severity: "INFO" },
];

/* ------------------------------- 决策记录 ------------------------------- */

export const REPLAY_DECISIONS: ReplayDecision[] = [
  { id: "RD-01", day: 0, at: "11-23 15:40", title: "确认入径", detail: "准入 TRUE / 排除 FALSE，绑定肝癌手术路径 V1.3.0，生成个体化计划 P1。", actor: "张启明 · 主任医师", evidenceRefs: ["RULE-001@1.2.0", "EV-001"] },
  { id: "RD-02", day: 1, at: "11-24 14:20", title: "计划 P1 审核通过", detail: "18 项任务进入执行队列；营养评估缺失保留为待决策项。", actor: "张启明 · 主任医师", evidenceRefs: ["PLAN-HCC-P1"] },
  { id: "RD-03", day: 4, at: "11-25 16:10", title: "MDT 手术方案确认", detail: "ICG R15 12.4%，Child-Pugh A，选择 S6 段切除；门静脉癌栓待复核，暂不改变术式。", actor: "MDT 专家组", evidenceRefs: ["EV-001", "EV-002", "EV-007"] },
  { id: "RD-04", day: 4, at: "11-26 10:00", title: "手术知情同意", detail: "告知出血、胆漏、肝功能不全风险；患者选择不接受术中输血。", actor: "张启明 · 主任医师", evidenceRefs: ["CONSENT-HCC-001"] },
  { id: "RD-05", day: 6, at: "11-28 09:10", title: "术后镇痛方案调整", detail: "NRS 4 分，追加对乙酰氨基酚；排除出血与感染后继续观察。", actor: "李文博 · 副主任医师", evidenceRefs: ["EV-005"] },
  { id: "RD-06", day: 8, at: "11-30 09:00", title: "出院评估", detail: "符合 RULE-007 出院标准；生成 30 天复查与电话随访计划。", actor: "张启明 · 主任医师", evidenceRefs: ["RULE-007@1.2.0"] },
];

/* ------------------------------- 回放快照 ------------------------------- */

const snapshot = (
  day: number,
  stageIndex: number,
  state: number[],
  labs: ReplaySnapshot["labs"],
  completed: string[],
  active: string[],
  variant: string[],
  prediction: ReplaySnapshot["prediction"],
): ReplaySnapshot => ({
  day,
  label: `D${day}`,
  date: ["11-23", "11-24", "11-25", "11-25", "11-26", "11-27", "11-28", "11-29", "11-30"][day] ?? `D${day}`,
  stage: stageList[stageIndex],
  stageIndex,
  state: stateAt(state),
  labs,
  nodeStates: nodeStates(completed, active, variant),
  eventIds: JOURNEY_EVENTS.filter((e) => e.day === day).map((e) => e.id),
  decisionIds: REPLAY_DECISIONS.filter((d) => d.day === day).map((d) => d.id),
  prediction,
});

export const REPLAY_SNAPSHOTS: ReplaySnapshot[] = [
  snapshot(0, 0, [72, 92, 68, 62, 58, 88], { afp: 86.4, alt: 42, alb: 39.2, tbil: 21.3, crp: 8.2 }, ["start"], ["admission"], [], { burden: 62, low: 54, high: 70 }),
  snapshot(1, 1, [74, 92, 70, 64, 56, 88], { afp: 86.4, alt: 52, alb: 38.6, tbil: 23.6, crp: 12.4 }, ["start", "admission"], ["split_pre", "lab"], [], { burden: 60, low: 52, high: 69 }),
  snapshot(2, 1, [76, 91, 72, 66, 54, 87], { afp: 84.1, alt: 58, alb: 37.6, tbil: 26.8, crp: 9.8 }, ["start", "admission", "split_pre", "lab"], ["imaging", "icg", "cardio"], ["imaging"], { burden: 58, low: 49, high: 68 }),
  snapshot(3, 2, [78, 91, 74, 68, 52, 86], { afp: 82.0, alt: 46, alb: 38.1, tbil: 23.1, crp: 7.6 }, ["start", "admission", "split_pre", "lab", "cardio", "join_pre"], ["icg", "liver"], ["imaging"], { burden: 55, low: 46, high: 65 }),
  snapshot(4, 2, [79, 90, 76, 70, 50, 86], { afp: 78.6, alt: 44, alb: 38.4, tbil: 21.9, crp: 6.2 }, ["icg", "liver", "diagnosis", "join_pre", "imaging"], ["mdt", "decision"], [], { burden: 52, low: 42, high: 63 }),
  snapshot(5, 3, [66, 86, 62, 54, 68, 80], { afp: 80.2, alt: 62, alb: 35.2, tbil: 28.4, crp: 32.6 }, ["mdt", "decision", "prehab", "anesthesia", "consent"], ["surgery", "recovery"], [], { burden: 71, low: 58, high: 84 }),
  snapshot(6, 3, [62, 82, 58, 50, 76, 76], { afp: 76.4, alt: 58, alb: 34.1, tbil: 26.8, crp: 28.4 }, ["surgery", "recovery", "split_post"], ["pathology", "analgesia", "nursing"], ["analgesia"], { burden: 66, low: 53, high: 80 }),
  snapshot(7, 3, [68, 86, 62, 56, 66, 82], { afp: 72.1, alt: 48, alb: 35.6, tbil: 22.4, crp: 18.2 }, ["pathology", "analgesia", "nursing", "join_post", "split_post"], ["day1"], [], { burden: 59, low: 47, high: 72 }),
  snapshot(8, 4, [74, 90, 68, 64, 52, 86], { afp: 68.3, alt: 38, alb: 37.2, tbil: 18.9, crp: 9.4 }, ["pathology", "analgesia", "nursing", "join_post", "day1", "discharge", "follow", "end"], [], [], { burden: 48, low: 37, high: 61 }),
];

export const REPLAY_STAGES = stageList;

/* ------------------------------- 状态雷达 ------------------------------- */

export const PATIENT_STATE_RADAR: PatientStateRadarData[] = [
  { dimension: "肝功能", admission: 72, current: 78, reference: 85 },
  { dimension: "肾功能", admission: 92, current: 91, reference: 90 },
  { dimension: "营养状态", admission: 68, current: 74, reference: 80 },
  { dimension: "体能状态", admission: 62, current: 68, reference: 78 },
  { dimension: "炎症负荷", admission: 58, current: 52, reference: 75 },
  { dimension: "凝血功能", admission: 88, current: 86, reference: 88 },
];

/* --------------------------- 多模态指标与事件标记 --------------------------- */

export const MULTIMODAL_LABELS = REPLAY_SNAPSHOTS.map((s) => `${s.label} ${s.date}`);
export const MULTIMODAL_METRICS: MultimodalMetric[] = [
  {
    key: "afp",
    label: "AFP",
    unit: "ng/mL",
    color: "var(--chart-5)",
    refLow: 0,
    refHigh: 20,
    values: REPLAY_SNAPSHOTS.map((s) => s.labs.afp),
  },
  {
    key: "alt",
    label: "ALT",
    unit: "U/L",
    color: "var(--chart-3)",
    refLow: 9,
    refHigh: 50,
    values: REPLAY_SNAPSHOTS.map((s) => s.labs.alt),
  },
  {
    key: "alb",
    label: "白蛋白",
    unit: "g/L",
    color: "var(--chart-1)",
    refLow: 40,
    refHigh: 55,
    values: REPLAY_SNAPSHOTS.map((s) => s.labs.alb),
  },
  {
    key: "crp",
    label: "CRP",
    unit: "mg/L",
    color: "var(--chart-4)",
    refLow: 0,
    refHigh: 10,
    values: REPLAY_SNAPSHOTS.map((s) => s.labs.crp),
  },
];

export const MULTIMODAL_EVENTS: MultimodalEventMarker[] = [
  { index: 0, label: "入院", kind: "consult" },
  { index: 2, label: "增强 MRI", kind: "imaging" },
  { index: 3, label: "ICG / 评估", kind: "consult" },
  { index: 4, label: "MDT / 同意", kind: "consult" },
  { index: 5, label: "手术", kind: "surgery" },
  { index: 6, label: "术后镇痛", kind: "medication" },
  { index: 8, label: "出院", kind: "discharge" },
];

/* ------------------------------ 多路径推演 ------------------------------ */

function buildPath(
  key: TrajectoryPath["key"],
  label: string,
  description: string,
  color: string,
  horizon: number,
  endpoint: number,
  pointsCount: number,
): TrajectoryPath {
  const points = Array.from({ length: pointsCount }, (_, i) => {
    const ratio = i / (pointsCount - 1);
    const day = Math.round(ratio * horizon);
    const value = Math.round(62 + (endpoint - 62) * ratio);
    const band = Math.round(4 + ratio * (horizon === 30 ? 9 : horizon === 90 ? 13 : 17));
    return {
      day,
      value,
      low: Math.max(0, value - band),
      high: Math.min(100, value + band),
    };
  });
  return { key, label, description, color, points };
}

function buildTrajectory(horizon: 30 | 90 | 180): TrajectoryDataset {
  const count = horizon === 30 ? 16 : 13;
  const endpoints: Record<30 | 90 | 180, [number, number, number]> = {
    30: [34, 26, 44],
    90: [30, 22, 40],
    180: [25, 17, 36],
  };
  const [a, b, c] = endpoints[horizon];
  return {
    horizon,
    paths: [
      buildPath("A", "候选路径 A · 标准路径", "标准围术期管理与随访节奏", "var(--chart-4)", horizon, a, count),
      buildPath("B", "候选路径 B · ERAS 加速", "加速康复 + 早期活动 + 营养干预", "var(--chart-1)", horizon, b, count),
      buildPath("C", "候选路径 C · 保守治疗", "延迟手术与更密集随访", "var(--chart-3)", horizon, c, count),
    ],
    actual: REPLAY_SNAPSHOTS.map((s) => ({ day: s.day, value: s.prediction.burden })),
    interventions: [
      { day: 5, label: "手术", kind: "surgery" as const },
      { day: 8, label: "出院", kind: "discharge" as const },
      { day: 30, label: "首次复查", kind: "followup" as const },
      ...(horizon >= 90 ? [{ day: 90, label: "90 天复查", kind: "followup" as const }] : []),
      ...(horizon >= 180 ? [{ day: 180, label: "长期随访", kind: "followup" as const }] : []),
    ],
    model: {
      id: "hcc-world-model",
      version: "0.1.0-mock",
      provider: "Mock Provider",
      applicability: "肝癌手术演示队列 · 30–180 天推演",
      clinicalUse: false,
      trainedOn: "（100 例）",
      note: "确定性演示曲线，不包含随机概率；不得用于真实患者预测。",
    },
  };
}

export const TRAJECTORY_DATA: Record<30 | 90 | 180, TrajectoryDataset> = {
  30: buildTrajectory(30),
  90: buildTrajectory(90),
  180: buildTrajectory(180),
};

/* ------------------------------ 流程挖掘 ------------------------------ */

export const PROCESS_NODES: ProcessNode[] = [
  { id: "start", label: "入院登记", type: "start", count: 100, avgWaitMin: 0, deviationRate: 0, x: 20, y: 190 },
  { id: "admission", label: "入院评估", type: "activity", count: 100, avgWaitMin: 42, deviationRate: 2, x: 210, y: 190 },
  { id: "lab", label: "实验室检验", type: "activity", count: 98, avgWaitMin: 168, deviationRate: 6, x: 420, y: 80 },
  { id: "imaging", label: "影像检查", type: "activity", count: 96, avgWaitMin: 1560, deviationRate: 11, x: 420, y: 240 },
  { id: "mdt", label: "MDT 讨论", type: "activity", count: 91, avgWaitMin: 1080, deviationRate: 14, x: 640, y: 190 },
  { id: "surgery", label: "肝段切除", type: "activity", count: 88, avgWaitMin: 240, deviationRate: 8, x: 860, y: 190 },
  { id: "pathology", label: "术后病理", type: "activity", count: 87, avgWaitMin: 1920, deviationRate: 4, x: 1070, y: 90 },
  { id: "discharge", label: "出院评估", type: "activity", count: 84, avgWaitMin: 360, deviationRate: 9, x: 1070, y: 280 },
  { id: "followup", label: "随访登记", type: "end", count: 78, avgWaitMin: 120, deviationRate: 3, x: 1280, y: 190 },
  { id: "dev-consult", label: "转肿瘤科治疗", type: "deviation", count: 6, avgWaitMin: 2880, deviationRate: 6, x: 860, y: 380 },
  { id: "dev-longstay", label: "延长住院", type: "deviation", count: 9, avgWaitMin: 4320, deviationRate: 9, x: 1070, y: 400 },
  { id: "dev-early", label: "提前退出", type: "deviation", count: 4, avgWaitMin: 0, deviationRate: 4, x: 420, y: 380 },
];

export const PROCESS_EDGES: ProcessEdge[] = [
  { id: "pe-1", source: "start", target: "admission", count: 100, conformance: "COMPLIANT", waitMin: 42 },
  { id: "pe-2", source: "admission", target: "lab", count: 98, conformance: "COMPLIANT", waitMin: 168 },
  { id: "pe-3", source: "admission", target: "imaging", count: 96, conformance: "COMPLIANT", waitMin: 1560 },
  { id: "pe-4", source: "lab", target: "mdt", count: 91, conformance: "COMPLIANT", waitMin: 1080 },
  { id: "pe-5", source: "imaging", target: "mdt", count: 93, conformance: "COMPLIANT", waitMin: 960 },
  { id: "pe-6", source: "mdt", target: "surgery", count: 88, conformance: "COMPLIANT", waitMin: 240 },
  { id: "pe-7", source: "surgery", target: "pathology", count: 87, conformance: "COMPLIANT", waitMin: 1920 },
  { id: "pe-8", source: "pathology", target: "discharge", count: 84, conformance: "COMPLIANT", waitMin: 360 },
  { id: "pe-9", source: "surgery", target: "discharge", count: 7, conformance: "COMPLIANT", waitMin: 2880 },
  { id: "pe-10", source: "discharge", target: "followup", count: 78, conformance: "COMPLIANT", waitMin: 120 },
  { id: "pe-11", source: "admission", target: "mdt", count: 12, conformance: "DEVIATION", waitMin: 2040 },
  { id: "pe-12", source: "imaging", target: "surgery", count: 7, conformance: "DEVIATION", waitMin: 1440 },
  { id: "pe-13", source: "surgery", target: "dev-consult", count: 6, conformance: "DEVIATION", waitMin: 2880 },
  { id: "pe-14", source: "surgery", target: "dev-longstay", count: 9, conformance: "DEVIATION", waitMin: 4320 },
  { id: "pe-15", source: "admission", target: "dev-early", count: 4, conformance: "DEVIATION", waitMin: 0 },
  { id: "pe-16", source: "dev-consult", target: "followup", count: 4, conformance: "DEVIATION", waitMin: 720 },
  { id: "pe-17", source: "dev-longstay", target: "followup", count: 7, conformance: "DEVIATION", waitMin: 480 },
];

export const PROCESS_STATS = {
  patients: 100,
  conformance: 82.4,
  standardRate: 68,
  avgDays: 8.6,
  variants: 5,
  bottlenecks: [
    { stage: "影像检查等待", hours: 26.0, impact: "术前等待延长", target: "≤ 18h" },
    { stage: "MDT 排期", hours: 18.0, impact: "手术决策延迟", target: "≤ 12h" },
    { stage: "术后病理回报", hours: 32.0, impact: "出院评估推迟", target: "≤ 24h" },
    { stage: "出院办理", hours: 6.0, impact: "床位周转", target: "≤ 4h" },
  ],
  variantsList: [
    { name: "标准路径", count: 68, color: "var(--chart-1)" },
    { name: "跳过 MDT", count: 12, color: "var(--chart-3)" },
    { name: "延长等待", count: 9, color: "var(--chart-4)" },
    { name: "转肿瘤科", count: 6, color: "var(--chart-5)" },
    { name: "其他", count: 5, color: "var(--muted-foreground)" },
  ],
};

/* ------------------------------ 院长驾驶舱 ------------------------------ */

export const EXECUTIVE_KPIS = [
  {
    key: "coverage",
    label: "临床路径覆盖率",
    value: "86.4%",
    delta: 4.0,
    hint: "已配置路径的出院患者占全部出院患者比例",
    numerator: "2,486 名路径患者",
    denominator: "2,878 名出院患者",
    period: "近 30 天",
    href: "/analytics",
  },
  {
    key: "enrollment",
    label: "患者入径率",
    value: "78.6%",
    delta: 2.2,
    hint: "符合准入条件患者中实际入径的比例",
    numerator: "2,486 名入径患者",
    denominator: "3,163 名符合条件患者",
    period: "近 30 天",
    href: "/patients",
  },
  {
    key: "completion",
    label: "路径完成率",
    value: "91.2%",
    delta: 1.4,
    hint: "已结束路径中正常完成的比例",
    numerator: "1,932 例正常完成",
    denominator: "2,118 例已结束路径",
    period: "近 30 天",
    href: "/analytics",
  },
  {
    key: "variation",
    label: "路径变异率",
    value: "12.8%",
    delta: -1.6,
    hint: "观察期内发生变异的路径比例",
    numerator: "403 例发生变异",
    denominator: "3,148 例在径患者",
    period: "近 30 天",
    href: "/variations",
  },
  {
    key: "los",
    label: "平均住院日",
    value: "7.6",
    unit: "天",
    delta: -0.5,
    hint: "路径患者出院平均住院时间",
    numerator: "路径患者住院日总和",
    denominator: "同期路径出院患者数",
    period: "近 30 天",
    href: "/analytics",
  },
  {
    key: "cost",
    label: "路径次均费用",
    value: "¥36,820",
    delta: -1.2,
    hint: "路径患者次均诊疗费用",
    numerator: "路径患者总费用",
    denominator: "同期路径患者数",
    period: "近 30 天",
    href: "/analytics",
  },
];

export const EXECUTIVE_LOS = [
  { label: "6月", actual: 8.9, target: 8.8 },
  { label: "7月", actual: 8.6, target: 8.6 },
  { label: "8月", actual: 8.4, target: 8.4 },
  { label: "9月", actual: 8.1, target: 8.2 },
  { label: "10月", actual: 7.9, target: 8.0 },
  { label: "11月", actual: 7.6, target: 7.8 },
];

export const EXECUTIVE_DEPT = [
  { key: "ward1", name: "一病区 · 手术切除组", completion: 94.2, enrollment: 88.1, variation: 14.2, los: 9.2, patients: 42, coverage: 92.0 },
  { key: "ward2", name: "二病区 · 转化治疗组", completion: 92.8, enrollment: 84.6, variation: 16.1, los: 11.6, patients: 31, coverage: 89.5 },
  { key: "ward3", name: "三病区 · 消融/介入组", completion: 91.5, enrollment: 82.4, variation: 13.4, los: 4.2, patients: 27, coverage: 88.2 },
  { key: "mdt", name: "肝癌 MDT 门诊", completion: 89.2, enrollment: 79.8, variation: 11.8, los: 6.8, patients: 22, coverage: 85.6 },
  { key: "followup", name: "肝癌随访中心", completion: 87.6, enrollment: 76.2, variation: 15.6, los: 7.2, patients: 18, coverage: 82.4 },
];

export const EXECUTIVE_VARIATION_REASONS = [
  { name: "患者因素", value: 32, color: "var(--chart-4)" },
  { name: "检查等待", value: 26, color: "var(--chart-3)" },
  { name: "病情变化", value: 19, color: "var(--chart-5)" },
  { name: "资源限制", value: 14, color: "var(--chart-2)" },
  { name: "其他", value: 9, color: "var(--muted-foreground)" },
];

export const EXECUTIVE_BOTTLENECKS = [
  { stage: "影像检查等待", hours: 26, owner: "医学影像科", impact: "术前等待延长 0.8 天" },
  { stage: "MDT 排期", hours: 18, owner: "肝胆外科", impact: "手术决策延迟 0.5 天" },
  { stage: "术后病理回报", hours: 32, owner: "病理科", impact: "出院评估推迟 0.6 天" },
  { stage: "出院办理", hours: 6, owner: "护理部", impact: "床位周转率 -3.1%" },
];

export const EXECUTIVE_TREND = [
  { label: "6月", enrollment: 2140, completion: 88.2, variation: 15.2 },
  { label: "7月", enrollment: 2210, completion: 89.0, variation: 14.8 },
  { label: "8月", enrollment: 2290, completion: 89.6, variation: 14.1 },
  { label: "9月", enrollment: 2360, completion: 90.1, variation: 13.6 },
  { label: "10月", enrollment: 2430, completion: 90.8, variation: 13.1 },
  { label: "11月", enrollment: 2486, completion: 91.2, variation: 12.8 },
];

/* --------------------------- 科室 × 阶段变异热力 --------------------------- */

export const DEPT_STAGE_HEATMAP = {
  rows: ["一病区（手术）", "二病区（转化）", "三病区（消融/介入）", "肝癌 MDT 门诊", "随访中心"],
  cols: ["术前评估", "术前检查", "治疗方案", "手术/介入及术后", "出院随访"],
  values: [
    [4, 18, 9, 22, 7],
    [3, 21, 8, 19, 6],
    [5, 14, 6, 16, 5],
    [2, 12, 7, 13, 4],
    [6, 16, 11, 18, 8],
  ],
};

/* --------------------------- 临床决策证据图谱 --------------------------- */

export const DECISION_EVIDENCE_NODES = [
  { id: "rec", label: "推荐：术前 24h 内完成 ICG 并进入 MDT", kind: "recommendation" as const },
  { id: "rule-icg", label: "RULE-004 · ICG 阈值分支", kind: "rule" as const },
  { id: "rule-safety", label: "RULE-005 · 凝血安全约束", kind: "rule" as const },
  { id: "ev-001", label: "EV-001 · 肝癌诊疗指南 2024", kind: "evidence" as const },
  { id: "ev-002", label: "EV-002 · 肝切除围术期共识", kind: "evidence" as const },
  { id: "ev-005", label: "EV-005 · ERAS 专家共识", kind: "evidence" as const },
  { id: "patient", label: "患者状态快照 · 陈志远", kind: "patient" as const },
  { id: "plan", label: "候选计划 P2", kind: "plan" as const },
];

export const DECISION_EVIDENCE_EDGES = [
  { source: "rec", target: "rule-icg", label: "引用规则" },
  { source: "rec", target: "rule-safety", label: "安全约束" },
  { source: "rule-icg", target: "ev-001", label: "依据" },
  { source: "rule-icg", target: "ev-002", label: "依据" },
  { source: "rule-safety", target: "ev-002", label: "依据" },
  { source: "rec", target: "patient", label: "读取状态" },
  { source: "rec", target: "plan", label: "生成" },
  { source: "ev-005", target: "rec", label: "支持" },
];
