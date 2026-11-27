import type {
  AuditLog,
  Kpi,
  MetricRow,
  PredictionRecord,
  SeriesPoint,
  SimulationResult,
  SimulationScenario,
} from "@/types";
import { at, daysAgo, NOW } from "./time";

const weekLabels = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - (11 - i) * 7);
  return `${d.getMonth() + 1}/${d.getDate()}`;
});

export const KPIS: Kpi[] = [
  {
    key: "coverage",
    label: "路径覆盖率",
    value: "76.2%",
    rawValue: 76.2,
    delta: 4.6,
    deltaLabel: "较上月",
    trend: [62, 64, 65, 67, 68, 70, 71, 72, 73, 74, 75, 76.2],
    hint: "已配置路径的肝癌诊疗场景占应配置场景比例",
    numerator: "5 个肝癌诊疗场景已配置",
    denominator: "6 个目标场景",
    period: "本季度",
    exclusions: "排除尚未纳入年度路径计划的治疗场景",
    source: "路径模板库",
  },
  {
    key: "enrollment",
    label: "患者入径率",
    value: "82.4%",
    rawValue: 82.4,
    delta: 3.1,
    deltaLabel: "较上月",
    trend: [74, 75, 76, 78, 77, 79, 80, 81, 80, 81, 82, 82.4],
    hint: "符合入径条件的患者中实际确认入径的比例",
    numerator: "268 例符合条件患者已入径",
    denominator: "325 例符合条件患者",
    period: "近 30 天",
    exclusions: "排除拒绝入径且已记录原因的患者",
    source: "路径实例 + 准入引擎",
  },
  {
    key: "completion",
    label: "路径完成率",
    value: "91.3%",
    rawValue: 91.3,
    delta: 1.8,
    deltaLabel: "较上月",
    trend: [88, 89, 88, 90, 89, 90, 91, 90, 91, 91, 92, 91.3],
    hint: "已结束路径中正常完成的比例",
    numerator: "189 例正常完成",
    denominator: "207 例已结束路径",
    period: "近 30 天",
    exclusions: "排除已取消入径的实例",
    source: "路径实例状态机",
  },
  {
    key: "variation",
    label: "路径变异率",
    value: "18.6%",
    rawValue: 18.6,
    delta: -2.2,
    deltaLabel: "较上月",
    trend: [24, 23, 22, 23, 21, 20, 21, 20, 19.5, 19, 18.8, 18.6],
    hint: "观察期内发生至少一次变异的路径比例",
    numerator: "58 例发生变异",
    denominator: "312 例在径患者",
    period: "近 30 天",
    exclusions: "排除已退出路径的患者",
    source: "变异管理模块",
  },
  {
    key: "los",
    label: "平均住院日",
    value: "6.8",
    unit: "天",
    rawValue: 6.8,
    delta: -0.4,
    deltaLabel: "较上月",
    trend: [8.2, 8.0, 7.9, 7.7, 7.6, 7.4, 7.3, 7.2, 7.1, 7.0, 6.9, 6.8],
    hint: "出院患者平均住院时间",
    numerator: "已出院患者住院日总和",
    denominator: "同期出院患者数",
    period: "近 30 天",
    exclusions: "排除非计划再入院与转院患者",
    source: "住院病案首页",
  },
  {
    key: "cost",
    label: "平均诊疗费用",
    value: "¥38,420",
    rawValue: 38420,
    delta: 2.1,
    deltaLabel: "较上月",
    trend: [36.2, 36.8, 37.1, 37.0, 37.4, 37.6, 37.9, 38.0, 38.1, 38.3, 38.3, 38.4],
    hint: "指定肝癌路径患者的次均费用",
    numerator: "路径患者总费用",
    denominator: "同期路径患者数",
    period: "近 30 天",
    exclusions: "排除合并严重并发症患者的额外费用",
    source: "费用结算数据",
  },
  {
    key: "overdue",
    label: "任务超时率",
    value: "4.2%",
    rawValue: 4.2,
    delta: 0.6,
    deltaLabel: "较上月",
    trend: [3.1, 3.3, 3.4, 3.2, 3.5, 3.6, 3.8, 3.9, 4.0, 4.1, 4.1, 4.2],
    hint: "到期任务中超时未完成的比例",
    numerator: "146 项超时任务",
    denominator: "3,475 项到期任务",
    period: "近 30 天",
    exclusions: "排除因患者原因暂停的路径实例",
    source: "任务运行引擎",
  },
  {
    key: "exit",
    label: "路径退出率",
    value: "3.9%",
    rawValue: 3.9,
    delta: -0.3,
    deltaLabel: "较上月",
    trend: [5.2, 5.0, 4.9, 4.7, 4.6, 4.5, 4.4, 4.2, 4.1, 4.0, 4.0, 3.9],
    hint: "已结束路径中非正常退出的比例",
    numerator: "8 例非正常退出",
    denominator: "207 例已结束路径",
    period: "近 30 天",
    exclusions: "排除因转院自动退出的实例",
    source: "路径实例状态机",
  },
  {
    key: "rare",
    label: "罕见亚型路径覆盖率",
    value: "不可计算",
    unavailable: true,
    trend: [],
    hint: "分母为 0 时不返回百分比，避免将缺失数据误读为 0%",
    numerator: "0 个罕见亚型场景已配置",
    denominator: "0 个目标罕见亚型场景",
    period: "本季度",
    exclusions: "—",
    source: "路径模板库",
  },
];

export const TREND_SERIES: SeriesPoint[] = weekLabels.map((label, i) => ({
  label,
  values: {
    enrollment: 52 + ((i * 13) % 29),
    completion: 38 + ((i * 9) % 21),
    variation: 14 + ((i * 5) % 12),
  },
}));

export const LOS_SERIES: SeriesPoint[] = weekLabels.map((label, i) => ({
  label,
  values: {
    standard: 7.6 - i * 0.06,
    eras: 6.9 - i * 0.09,
    national: 8.4 - i * 0.05,
  },
}));

export const DEPARTMENT_METRICS: MetricRow[] = [
  { key: "ward1", name: "肝胆外科一病区", sub: "手术切除组 · 在径 42 例", value: "93.8%", numeric: 93.8, delta: 1.2, trend: [88, 89, 91, 90, 92, 93, 92, 94], status: "ok" },
  { key: "ward2", name: "肝胆外科二病区", sub: "转化治疗组 · 在径 31 例", value: "91.4%", numeric: 91.4, delta: 0.6, trend: [87, 88, 89, 90, 89, 91, 90, 91], status: "ok" },
  { key: "ward3", name: "肝胆外科三病区", sub: "消融/介入组 · 在径 27 例", value: "89.7%", numeric: 89.7, delta: -1.1, trend: [91, 90, 90, 89, 90, 88, 89, 90], status: "warn" },
  { key: "mdt", name: "肝癌 MDT 门诊", sub: "评估 22 例", value: "86.2%", numeric: 86.2, delta: 2.4, trend: [80, 82, 83, 84, 85, 84, 86, 86], status: "ok" },
  { key: "followup", name: "肝癌随访中心", sub: "随访 18 例", value: "84.5%", numeric: 84.5, delta: -0.8, trend: [86, 85, 85, 84, 85, 83, 84, 85], status: "warn" },
  { key: "rare", name: "罕见亚型队列", sub: "本周期无入径患者", value: "不可计算", numeric: undefined, delta: undefined, trend: [], status: "warn" },
];

export const PATHWAY_METRICS: MetricRow[] = [
  { key: "hcc", name: "肝癌手术临床路径", sub: "V1.3.0 · 已发布", value: "42 例在径", numeric: 42, delta: 3, trend: [28, 30, 31, 33, 35, 37, 39, 42], status: "ok" },
  { key: "ablation", name: "肝癌消融治疗路径", sub: "V2.0.1 · 已发布", value: "31 例在径", numeric: 31, delta: 2, trend: [24, 25, 26, 27, 28, 29, 30, 31], status: "ok" },
  { key: "tace", name: "肝癌介入治疗（TACE）路径", sub: "V1.2.0 · 已发布", value: "27 例在径", numeric: 27, delta: -1, trend: [30, 29, 29, 28, 28, 28, 27, 27], status: "warn" },
  { key: "conversion", name: "肝癌转化治疗后手术路径", sub: "V1.3.0 · 已发布", value: "12 例在径", numeric: 12, delta: 2, trend: [6, 7, 8, 8, 9, 10, 11, 12], status: "ok" },
];

export const PATHWAY_RANKING = [
  { name: "肝癌手术临床路径", dept: "肝胆外科一病区", instances: 42, completion: 93.8, variation: 14.2, los: 9.2, cost: 68420 },
  { name: "肝癌消融治疗路径", dept: "肝胆外科三病区", instances: 31, completion: 91.4, variation: 16.1, los: 4.2, cost: 32840 },
  { name: "肝癌介入治疗（TACE）路径", dept: "介入科", instances: 27, completion: 89.7, variation: 11.1, los: 5.1, cost: 28640 },
  { name: "肝癌转化治疗后手术路径", dept: "肝胆外科二病区", instances: 12, completion: 88.2, variation: 18.4, los: 11.6, cost: 92840 },
];

export const VARIATION_BY_TYPE = [
  { type: "TIME", label: "时间变异", count: 14, pct: 35.0 },
  { type: "CLINICAL", label: "临床变异", count: 12, pct: 30.0 },
  { type: "RESOURCE", label: "资源变异", count: 6, pct: 15.0 },
  { type: "PROCESS", label: "流程变异", count: 4, pct: 10.0 },
  { type: "PATIENT", label: "患者变异", count: 2, pct: 5.0 },
  { type: "SAFETY", label: "安全变异", count: 1, pct: 2.5 },
  { type: "DATA", label: "数据变异", count: 1, pct: 2.5 },
];

export const ENROLLMENT_FUNNEL = [
  { stage: "筛查患者", count: 524, note: "近 30 天病理确诊的原发性肝癌住院患者" },
  { stage: "符合准入条件", count: 325, note: "准入规则 TRUE，排除规则 FALSE" },
  { stage: "医生确认入径", count: 268, note: "入径率 82.4%" },
  { stage: "正常完成路径", count: 189, note: "完成率 91.3%（占已结束路径）" },
];

export const TASK_WORKLOAD = [
  { role: "医生", tasks: 128, overdue: 5, avgHours: 6.2 },
  { role: "护士", tasks: 176, overdue: 11, avgHours: 3.8 },
  { role: "麻醉医生", tasks: 24, overdue: 1, avgHours: 2.4 },
  { role: "药师", tasks: 18, overdue: 0, avgHours: 1.6 },
  { role: "协调员", tasks: 32, overdue: 2, avgHours: 2.1 },
];

export const LOS_BUCKETS = [
  { bucket: "≤ 3 天", count: 48 },
  { bucket: "4–6 天", count: 96 },
  { bucket: "7–9 天", count: 72 },
  { bucket: "10–14 天", count: 42 },
  { bucket: "> 14 天", count: 18 },
];

export const ROLE_TASK_DIST = [
  { name: "医生", value: 128, color: "var(--chart-1)" },
  { name: "护士", value: 176, color: "var(--chart-2)" },
  { name: "麻醉", value: 24, color: "var(--chart-3)" },
  { name: "药师", value: 18, color: "var(--chart-4)" },
  { name: "协调员", value: 32, color: "var(--chart-5)" },
];

/* ------------------------------ 审计日志 ------------------------------ */

export const AUDIT_LOGS: AuditLog[] = [
  { id: "AL-9012", at: at(0, 10, 42), actor: "张启明", role: "临床专家", action: "PATHWAY_VERSION_SAVE", actionLabel: "保存路径版本", target: "肝癌手术临床路径 V1.5.0-draft", targetType: "PATHWAY", ip: "10.20.31.18", result: "SUCCESS", detail: "更新 3 个节点属性，未发布" },
  { id: "AL-9011", at: at(0, 9, 26), actor: "李文博", role: "临床医生", action: "PLAN_SUBMIT", actionLabel: "提交计划审核", target: "陈志远 · 计划 P2", targetType: "PLAN", ip: "10.20.33.42", result: "SUCCESS", detail: "计划 P2 提交医务处/专家审核" },
  { id: "AL-9010", at: at(0, 9, 10), actor: "周敏", role: "医务处管理员", action: "APPROVAL_COMMENT", actionLabel: "审批意见", target: "肝癌手术临床路径 V1.4.0", targetType: "PATHWAY", ip: "10.20.10.6", result: "SUCCESS", detail: "要求补充证据条目" },
  { id: "AL-9009", at: at(0, 8, 50), actor: "李文博", role: "临床医生", action: "REPLAN_REQUEST", actionLabel: "请求重新规划", target: "陈志远 · INST-HCC-001", targetType: "PLAN", ip: "10.20.33.42", result: "SUCCESS", detail: "数据缺失触发重规划草案" },
  { id: "AL-9008", at: at(0, 8, 42), actor: "张启明", role: "临床专家", action: "PATHWAY_SUBMIT", actionLabel: "提交路径审核", target: "肝癌手术临床路径 V1.4.0", targetType: "PATHWAY", ip: "10.20.31.18", result: "SUCCESS", detail: "提交版本审核" },
  { id: "AL-9007", at: at(0, 8, 36), actor: "王建国", role: "系统管理员", action: "PATIENT_VIEW", actionLabel: "访问患者数据", target: "HCC-DEMO-001", targetType: "PATIENT", ip: "10.20.5.2", result: "DENIED", detail: "系统管理员无患者数据访问权限，请求已拒绝并记录" },
  { id: "AL-9006", at: at(0, 8, 1), actor: "系统", role: "系统", action: "OUTBOX_DISPATCH", actionLabel: "事件分发", target: "clinical_events · 42 条", targetType: "SYSTEM", ip: "—", result: "SUCCESS", detail: "Outbox 事件消费者重试成功 2 条，跳过幂等重复 5 条" },
  { id: "AL-9005", at: at(0, 7, 58), actor: "陈立", role: "临床医生", action: "VARIATION_CREATE", actionLabel: "登记变异", target: "王丽华 · 转化疗效评估", targetType: "PATIENT", ip: "10.20.34.11", result: "SUCCESS", detail: "临床变异 HIGH，已关联 mRECIST 评估" },
  { id: "AL-9004", at: at(0, 7, 42), actor: "系统", role: "系统", action: "DEADLINE_CHECK", actionLabel: "任务超时扫描", target: "全量到期任务", targetType: "SYSTEM", ip: "—", result: "SUCCESS", detail: "标记超时任务 9 项，不改变任务执行状态" },
  { id: "AL-9003", at: at(-1, 18, 20), actor: "刘欣", role: "临床医生", action: "TASK_COMPLETE", actionLabel: "完成任务", target: "T-X021 · 术前评估记录签署", targetType: "TASK", ip: "10.20.35.8", result: "SUCCESS", detail: "任务完成并生成 TaskCompleted 事件" },
  { id: "AL-9002", at: at(-1, 17, 5), actor: "张启明", role: "临床专家", action: "TASK_COMPLETE", actionLabel: "完成任务", target: "T-101 · 入院评估与病史采集", targetType: "TASK", ip: "10.20.31.18", result: "SUCCESS", detail: "附评估记录签名" },
  { id: "AL-9001", at: at(-1, 16, 30), actor: "何静", role: "质控人员", action: "ANALYTICS_EXPORT", actionLabel: "导出统计报表", target: "2026-11 全院变异分析", targetType: "SYSTEM", ip: "10.20.12.3", result: "SUCCESS", detail: "脱敏导出，保留导出审计记录" },
  { id: "AL-9000", at: at(-1, 15, 12), actor: "郑凯", role: "科研人员", action: "PATIENT_EXPORT", actionLabel: "导出患者数据", target: "肝胆外科患者列表", targetType: "PATIENT", ip: "10.20.40.77", result: "DENIED", detail: "科研人员无患者身份数据导出权限" },
  { id: "AL-8999", at: at(-1, 11, 28), actor: "周敏", role: "医务处管理员", action: "PATHWAY_PUBLISH", actionLabel: "发布路径版本", target: "肝癌消融治疗路径 V2.0.1", targetType: "PATHWAY", ip: "10.20.10.6", result: "SUCCESS", detail: "版本锁定，不可再修改" },
  { id: "AL-8998", at: at(-1, 10, 5), actor: "李文博", role: "临床医生", action: "TASK_COMPLETE", actionLabel: "完成任务", target: "T-107 · ICG 清除试验", targetType: "TASK", ip: "10.20.33.42", result: "SUCCESS", detail: "结果 12.4% 写入患者状态" },
  { id: "AL-8997", at: at(-2, 16, 40), actor: "王建国", role: "系统管理员", action: "ROLE_UPDATE", actionLabel: "更新角色权限", target: "科研人员角色", targetType: "USER", ip: "10.20.5.2", result: "SUCCESS", detail: "移除患者身份数据导出权限" },
  { id: "AL-8996", at: at(-2, 15, 40), actor: "周敏", role: "医务处管理员", action: "APPROVAL_APPROVE", actionLabel: "审批通过", target: "肝癌介入治疗（TACE）路径 V1.3.0", targetType: "PATHWAY", ip: "10.20.10.6", result: "SUCCESS", detail: "审批通过，等待发布" },
  { id: "AL-8995", at: at(-2, 11, 20), actor: "刘欣", role: "临床医生", action: "VARIATION_RESOLVE", actionLabel: "处理变异", target: "VAR-2026-0074", targetType: "PATIENT", ip: "10.20.35.8", result: "SUCCESS", detail: "记录术中变更，生成调整计划" },
  { id: "AL-8994", at: at(-2, 10, 12), actor: "系统", role: "系统", action: "CLINICAL_EVENT_INGEST", actionLabel: "接收临床事件", target: "PACS · 影像报告归档", targetType: "SYSTEM", ip: "—", result: "SUCCESS", detail: "幂等键去重，重复事件 1 条已忽略" },
  { id: "AL-8993", at: at(-2, 9, 30), actor: "刘欣", role: "临床医生", action: "PATHWAY_VERSION_CREATE", actionLabel: "创建路径版本", target: "肝癌介入治疗（TACE）路径 V1.3.0", targetType: "PATHWAY", ip: "10.20.35.8", result: "SUCCESS", detail: "派生自 V1.2.0" },
  { id: "AL-8992", at: at(-3, 17, 5), actor: "张启明", role: "临床专家", action: "TASK_COMPLETE", actionLabel: "完成任务", target: "T-102 · 入院护理评估", targetType: "TASK", ip: "10.20.31.18", result: "SUCCESS", detail: "护理评估完成" },
  { id: "AL-8991", at: at(-3, 16, 10), actor: "系统", role: "系统", action: "PLAN_ACTIVATE", actionLabel: "激活计划", target: "陈志远 · 计划 P1", targetType: "PLAN", ip: "—", result: "SUCCESS", detail: "路径实例 INST-HCC-001 激活" },
  { id: "AL-8990", at: at(-3, 15, 40), actor: "张启明", role: "临床专家", action: "PATIENT_ENROLL", actionLabel: "确认入径", target: "陈志远 · HCC_DEMO_001", targetType: "PATIENT", ip: "10.20.31.18", result: "SUCCESS", detail: "准入 TRUE，排除 FALSE，医生确认入径" },
  { id: "AL-8989", at: at(-3, 14, 20), actor: "张启明", role: "临床专家", action: "ENCOUNTER_CREATE", actionLabel: "创建就诊记录", target: "陈志远 · 住院", targetType: "PATIENT", ip: "10.20.31.18", result: "SUCCESS", detail: "HIS 同步住院就诊" },
  { id: "AL-8988", at: at(-4, 9, 0), actor: "王建国", role: "系统管理员", action: "ADAPTER_CONFIG", actionLabel: "配置外部接口", target: "MWM Adapter", targetType: "SYSTEM", ip: "10.20.5.2", result: "SUCCESS", detail: "切换至 Mock Provider，模拟数据标记保持开启" },
  { id: "AL-8987", at: at(-4, 8, 50), actor: "系统", role: "系统", action: "BACKUP", actionLabel: "数据库备份", target: "clinical_pathway.db", targetType: "SYSTEM", ip: "—", result: "SUCCESS", detail: "备份完成，校验和验证通过" },
  { id: "AL-8986", at: at(-5, 14, 22), actor: "未知账户", role: "—", action: "LOGIN", actionLabel: "登录尝试", target: "admin", targetType: "USER", ip: "203.0.113.44", result: "FAILED", detail: "密码错误 5 次，账户临时锁定 15 分钟" },
];

/* --------------------------- 预测 / 世界模型 --------------------------- */

export const PREDICTION_RECORDS: PredictionRecord[] = [
  {
    id: "PRED-2026-0118",
    modelId: "hcc-world-model",
    modelVersion: "0.1.0-mock",
    provider: "mock",
    clinicalUse: false,
    patientStateId: "STATE-HCC-001",
    candidatePlanId: "PLAN-HCC-P2",
    horizonDays: 30,
    status: "SIMULATED",
    createdAt: at(0, 8, 52),
    warnings: ["不得用于真实患者风险评估", "模型未经过临床验证，clinical_use = false"],
    metrics: [
      { label: "预计住院日", value: "8.4 天", uncertainty: "± 1.8 天（模拟）" },
      { label: "术后并发症风险", value: "12.6%", uncertainty: "± 4.2%（模拟）" },
      { label: "30 天再入院风险", value: "5.1%", uncertainty: "± 2.6%（模拟）" },
    ],
  },
  {
    id: "PRED-2026-0117",
    modelId: "hcc-conversion-model",
    modelVersion: "0.1.0-mock",
    provider: "mock",
    clinicalUse: false,
    patientStateId: "STATE-HCC-002",
    candidatePlanId: "PLAN-HCC-002-P3",
    horizonDays: 90,
    status: "SIMULATED",
    createdAt: at(0, 7, 12),
    warnings: ["仅用于流程推演", "预测分布由 Mock Provider 生成"],
    metrics: [
      { label: "预计至手术时间", value: "6.2 周", uncertainty: "± 1.4 周（模拟）" },
      { label: "术后肝功能不全风险", value: "14.8%", uncertainty: "± 4.6%（模拟）" },
      { label: "转化后 R0 切除概率", value: "72.4%", uncertainty: "± 8.1%（模拟）" },
    ],
  },
  {
    id: "PRED-2026-0116",
    modelId: "hcc-world-model",
    modelVersion: "0.1.0-mock",
    provider: "mwm",
    clinicalUse: false,
    patientStateId: "STATE-HCC-001",
    horizonDays: 30,
    status: "UNAVAILABLE",
    createdAt: at(-1, 16, 30),
    warnings: ["MWM 服务不可用（连接超时 2.5s），已回退至知识/规则模式", "未生成任何预测结果"],
  },
];

export const ADAPTER_STATUS = [
  { key: "kee", name: "KEE 知识工程平台", mode: "Mock Adapter", status: "DEGRADED", latency: "128 ms", note: "本地知识库可用；远端检索降级，缓存命中 76%" },
  { key: "mwm", name: "MWM 医疗世界模型", mode: "Mock Provider", status: "SIMULATED", latency: "42 ms", note: "合成推演已启用，clinical_use = false" },
  { key: "data", name: "多模态数据平台", mode: "Mock Adapter", status: "ONLINE", latency: "86 ms", note: "影像/检验/病理数据映射正常" },
  { key: "his", name: "HIS 医院信息系统", mode: "院内接口", status: "ONLINE", latency: "64 ms", note: "只读同步，未开启医嘱下发" },
];

/* ------------------------------ 模拟中心 ------------------------------ */

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: "SIM-001",
    name: "肝癌手术 · 标准路径 vs ERAS 加速路径",
    description: "对比标准围术期管理与 ERAS 加速康复方案在分析队列中的住院日与费用差异。",
    pathwayId: "PW-HCC-001",
    horizonDays: 30,
    cohortSize: 100,
    resourceProfile: "标准床位与手术间配置",
    synthetic: true,
  },
  {
    id: "SIM-002",
    name: "肝癌转化治疗 · 手术时机评估",
    description: "对比继续转化治疗 2 周期与立即手术两种策略下的 R0 切除率、住院日与肝功能风险。",
    pathwayId: "PW-HCC-004",
    horizonDays: 90,
    cohortSize: 100,
    resourceProfile: "MDT 与手术间容量受限（-10%）",
    synthetic: true,
  },
  {
    id: "SIM-003",
    name: "肝癌消融 vs 小范围切除",
    description: "针对 ≤ 3cm 单发肝癌，比较消融与腹腔镜小范围切除的住院日、费用与局部复发风险。",
    pathwayId: "PW-HCC-002",
    horizonDays: 30,
    cohortSize: 100,
    resourceProfile: "介入手术间 2 间 / 床位 12 张",
    synthetic: true,
  },
];

const trajectoryDays = Array.from({ length: 15 }, (_, i) => `D${i}`);

export const SIMULATION_RESULTS: SimulationResult[] = [
  {
    scenarioId: "SIM-001",
    status: "SIMULATED",
    generatedAt: at(0, 9, 12),
    outcomes: [
      { label: "预计平均住院日", value: "8.4 天", uncertainty: "± 1.8 天" },
      { label: "预计次均费用", value: "¥64,280", uncertainty: "± ¥8,400" },
      { label: "路径完成率", value: "91.2%", uncertainty: "± 3.6%" },
      { label: "变异风险", value: "17.4%", uncertainty: "± 5.1%" },
    ],
    trajectories: trajectoryDays.map((label, i) => ({
      label,
      values: {
        standard: 100,
        eras: 100 - i * 2.4,
        national: 100 - i * 1.9,
      },
    })),
    comparison: [
      { plan: "标准路径 V1.3.0", los: "9.2 天", cost: "¥68,420", completion: "91.3%", risk: "18.6%", recommended: false },
      { plan: "ERAS 加速路径（候选）", los: "8.4 天", cost: "¥64,280", completion: "93.1%", risk: "16.2%", recommended: true },
      { plan: "国家临床路径基线", los: "9.8 天", cost: "¥70,150", completion: "89.4%", risk: "20.1%", recommended: false },
    ],
    warnings: ["全部结果为合成推演，不代表真实临床结局", "未使用真实医院数据训练，不可用于临床决策"],
  },
  {
    scenarioId: "SIM-002",
    status: "SIMULATED",
    generatedAt: at(0, 8, 30),
    outcomes: [
      { label: "预计 R0 切除率", value: "78.6%", uncertainty: "± 6.4%" },
      { label: "至手术中位时间", value: "5.8 周", uncertainty: "± 1.6 周" },
      { label: "路径完成率", value: "92.4%", uncertainty: "± 2.8%" },
      { label: "术后肝功能不全风险", value: "12.8%", uncertainty: "± 4.4%" },
    ],
    trajectories: trajectoryDays.map((label, i) => ({
      label,
      values: { standard: 100, eras: 100 - i * 3.1, national: 100 - i * 2.2 },
    })),
    comparison: [
      { plan: "立即手术（转化 2 周期后）", los: "10.8 天", cost: "¥86,420", completion: "89.2%", risk: "18.6%", recommended: false },
      { plan: "继续转化 2 周期后手术", los: "11.6 天", cost: "¥92,180", completion: "92.4%", risk: "13.2%", recommended: true },
    ],
    warnings: ["研究推演", "转化疗程与手术窗口为模拟约束，未接入真实 MDT 排期"],
  },
  {
    scenarioId: "SIM-003",
    status: "SIMULATED",
    generatedAt: at(-1, 15, 0),
    outcomes: [
      { label: "消融治疗占比", value: "58.0%", uncertainty: "± 5.0%" },
      { label: "预计平均住院日", value: "3.6 天", uncertainty: "± 1.1 天" },
      { label: "床位释放", value: "14.2 床日/周", uncertainty: "± 2.8 床日" },
      { label: "路径完成率", value: "94.1%", uncertainty: "± 2.1%" },
    ],
    trajectories: trajectoryDays.map((label, i) => ({
      label,
      values: { standard: 100, eras: 100 - i * 4.2, national: 100 - i * 3.0 },
    })),
    comparison: [
      { plan: "腹腔镜小范围切除", los: "6.4 天", cost: "¥42,680", completion: "90.2%", risk: "12.4%", recommended: false },
      { plan: "超声引导下消融", los: "3.6 天", cost: "¥28,940", completion: "94.1%", risk: "10.8%", recommended: true },
    ],
    warnings: ["研究推演", "未考虑真实患者偏好、肿瘤位置与消融技术差异"],
  },
];

/* ------------------------------ 驾驶舱辅助 ------------------------------ */

export const ANALYTICS_PERIODS = ["近 7 天", "近 30 天", "本季度", "本年度"];
export const LAST_SYNC = at(0, 10, 30);

export const NOTIFICATIONS = [
  { id: "N-01", level: "RISK" as const, title: "安全变异待处理", description: "赵海峰（肝胆外科）凝血功能异常触发手术任务阻断", at: at(0, 6, 40), href: "/variations" },
  { id: "N-02", level: "WARN" as const, title: "待审核计划", description: "陈志远 · 个体化计划 P2 等待审核（截止今日 17:00）", at: at(0, 9, 26), href: "/approvals" },
  { id: "N-03", level: "WARN" as const, title: "路径版本审核", description: "肝癌手术临床路径 V1.4.0 等待医务处审核", at: at(0, 8, 42), href: "/approvals" },
  { id: "N-04", level: "INFO" as const, title: "任务超时提醒", description: "营养风险筛查（NRS 2002）已超时 2 小时", at: at(0, 11, 2), href: "/tasks" },
];
