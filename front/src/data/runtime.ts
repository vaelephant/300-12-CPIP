import type {
  InstanceStatus,
  PathwayInstance,
  PlanVersion,
  Task,
  TaskEvent,
  Variation,
} from "@/types";
import { at, addHours, minutesAgo, minutesFromNow } from "./time";
import { PATIENTS } from "./patients";

/* ------------------------------ 路径实例 ------------------------------ */

export const INSTANCES: PathwayInstance[] = [
  {
    id: "INST-HCC-001",
    patientId: "HCC-DEMO-001",
    patientName: "陈志远",
    pathwayId: "PW-HCC-001",
    pathwayName: "肝癌手术临床路径",
    versionId: "PV-HCC-130",
    version: "1.3.0",
    status: "ACTIVE",
    enrolledAt: at(-3, 15, 40),
    activePlanId: "PLAN-HCC-P1",
    progress: 46,
    currentStage: "术前检查",
    responsibleDoctor: "张启明",
    revision: 3,
    dataCompleteness: 86,
    unknownConditions: ["门静脉癌栓（影像待复核）", "营养风险分级"],
  },
  {
    id: "INST-HCC-002",
    patientId: "HCC-DEMO-002",
    patientName: "王丽华",
    pathwayId: "PW-HCC-004",
    pathwayName: "肝癌转化治疗后手术路径",
    versionId: "PV-HCC4-130",
    version: "1.3.0",
    status: "REPLAN_REQUIRED",
    enrolledAt: at(-2, 10, 12),
    activePlanId: "PLAN-HCC-002-P2",
    progress: 41,
    currentStage: "手术评估",
    responsibleDoctor: "张启明",
    revision: 5,
    dataCompleteness: 92,
    unknownConditions: ["最终手术切除范围", "转化治疗后肝功能耐受性"],
  },
  {
    id: "INST-HCC-003",
    patientId: "HCC-DEMO-003",
    patientName: "李国强",
    pathwayId: "PW-HCC-003",
    pathwayName: "肝癌介入治疗（TACE）路径",
    versionId: "PV-HCC3-120",
    version: "1.2.0",
    status: "PENDING",
    enrolledAt: at(-1, 11, 20),
    progress: 8,
    currentStage: "入径确认",
    responsibleDoctor: "陈立",
    revision: 1,
    dataCompleteness: 100,
    unknownConditions: [],
  },
];

export function getInstance(id: string) {
  return INSTANCES.find((i) => i.id === id);
}

export function getInstanceByPatient(patientId: string) {
  return INSTANCES.find((i) => i.patientId === patientId);
}

/* ------------------------------ 计划版本 ------------------------------ */

export const PLANS: PlanVersion[] = [
  {
    id: "PLAN-HCC-P1",
    instanceId: "INST-HCC-001",
    version: "P1",
    status: "ACTIVE",
    createdBy: "张启明",
    createdAt: at(-3, 16, 2),
    approvedBy: "张启明",
    approvedAt: at(-3, 16, 2),
    summary: "基于 V1.3.0 标准路径生成的初始个体化计划，共 19 项任务，覆盖 5 个阶段。",
    tasks: [],
    warnings: [
      { id: "W-1", level: "WARN", message: "营养风险筛查 NRS 2002 数据缺失，已保留为待决策项。" },
    ],
    validation: [
      { level: "PASS", label: "安全约束", detail: "凝血 INR 1.12、PLT 168×10⁹/L，满足手术条件。" },
      { level: "WARNING", label: "数据完整性", detail: "NRS 2002 缺失，不影响当前阶段推进。" },
      { level: "PASS", label: "时间窗口", detail: "手术窗口 96h ± 24h，与手术室排期无冲突。" },
      { level: "PASS", label: "规则一致性", detail: "RULE-001@1.2.0 准入 TRUE，RULE-002@1.1.0 排除 FALSE。" },
    ],
    evidence: [
      { ref: "EV-001", title: "原发性肝癌诊疗指南（2024年版）", source: "国家卫生健康委员会" },
      { ref: "EV-004", title: "重庆附二医院肝切除围术期诊疗规范 V2.1", source: "重庆附二医院医务处" },
    ],
  },
  {
    id: "PLAN-HCC-P2",
    instanceId: "INST-HCC-001",
    version: "P2",
    status: "PENDING_APPROVAL",
    createdBy: "李文博",
    createdAt: at(0, 8, 50),
    summary: "因营养评估缺失与手术排期变化生成的调整草案：新增营养干预与术后早期活动任务，调整手术时间窗口。",
    tasks: [],
    warnings: [
      { id: "W-1", level: "WARN", message: "NRS 2002 结果缺失；若评分 ≥ 3 需追加术前营养支持任务。" },
      { id: "W-2", level: "WARN", message: "门静脉癌栓影像复核未完成，可能影响手术方式选择。" },
      { id: "W-3", level: "RISK", message: "当前体温 37.6°C，若术前 24h 仍异常需暂停手术任务。" },
    ],
    validation: [
      { level: "PASS", label: "结构校验", detail: "模板版本 V1.3.0 已锁定，图结构合法。" },
      { level: "WARNING", label: "安全校验", detail: "体温轻度升高，需术前复测；不阻断当前阶段。" },
      { level: "PASS", label: "必需任务", detail: "19 项必需任务全部保留，无自动删除。" },
      { level: "UNKNOWN", label: "营养风险", detail: "NRS 2002 缺失，按 UNKNOWN 处理，需人工补充资料。" },
    ],
    evidence: [
      { ref: "EV-001", title: "原发性肝癌诊疗指南（2024年版）", source: "国家卫生健康委员会" },
      { ref: "EV-002", title: "中国肝癌肝切除围手术期管理专家共识（2023）", source: "中华医学会外科学分会" },
      { ref: "EV-005", title: "加速康复外科（ERAS）专家共识（2021）", source: "中华医学会外科学分会" },
    ],
    differences: { added: 2, removed: 0, changed: 3, note: "新增「营养干预」「术后早期活动」；手术窗口由 72h±12h 调整为 96h±24h；麻醉会诊提前至术前 2 天。" },
  },
  {
    id: "PLAN-HCC-002-P2",
    instanceId: "INST-HCC-002",
    version: "P2",
    status: "ACTIVE",
    createdBy: "张启明",
    createdAt: at(-2, 14, 10),
    approvedBy: "张启明",
    approvedAt: at(-2, 14, 25),
    summary: "转化治疗前制定的初始计划：按 3 周期靶向联合免疫治疗后重新评估手术机会。",
    tasks: [],
    warnings: [],
    validation: [{ level: "PASS", label: "安全校验", detail: "肝功能与体能状态满足系统治疗条件。" }],
    evidence: [{ ref: "EV-001", title: "原发性肝癌诊疗指南（2024年版）", source: "国家卫生健康委员会" }],
  },
  {
    id: "PLAN-HCC-002-P3",
    instanceId: "INST-HCC-002",
    version: "P3",
    status: "PENDING_APPROVAL",
    createdBy: "张启明",
    createdAt: at(0, 7, 8),
    summary: "转化治疗后 mRECIST 评估为 PR，计划由系统治疗调整为转化后肝切除，需重新审核。",
    tasks: [],
    warnings: [
      { id: "W-1", level: "WARN", message: "Child-Pugh B 级，术后肝功能不全风险需重点评估。" },
      { id: "W-2", level: "RISK", message: "门静脉癌栓退缩程度待病理确认，可能影响切除范围。" },
    ],
    validation: [
      { level: "WARNING", label: "安全校验", detail: "Child-Pugh B 级、ICG R15 18.6%，需麻醉科与肝病科二次评估。" },
      { level: "PASS", label: "版本保留", detail: "原计划 P2 保留为历史版本。" },
      { level: "PASS", label: "疗效证据", detail: "mRECIST PR，肿瘤负荷下降 42%。" },
    ],
    evidence: [
      { ref: "EV-001", title: "原发性肝癌诊疗指南（2024年版）", source: "国家卫生健康委员会" },
      { ref: "EV-007", title: "原发性肝癌MDT诊疗共识（2023）", source: "中国抗癌协会肝癌专业委员会" },
    ],
    differences: { added: 1, removed: 1, changed: 2, note: "由系统治疗计划调整为转化后肝切除计划；新增麻醉科二次评估。" },
  },
];

export function getPlans(instanceId: string) {
  return PLANS.filter((p) => p.instanceId === instanceId);
}

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id);
}

/* ------------------------------ 规划任务草案 ------------------------------ */

export interface DraftTask {
  nodeKey: string;
  name: string;
  stage: string;
  role: Task["role"];
  required: boolean;
  dependsOn: string[];
  offsetHours: number;
  windowHours: number;
  evidence: string[];
  issue?: string;
}

export const HCC_PLAN_DRAFT: DraftTask[] = [
  { nodeKey: "admission", name: "入院评估与病史采集", stage: "术前评估", role: "DOCTOR", required: true, dependsOn: [], offsetHours: 2, windowHours: 4, evidence: ["EV-002"] },
  { nodeKey: "lab", name: "入院实验室检验", stage: "术前检查", role: "DOCTOR", required: true, dependsOn: ["admission"], offsetHours: 6, windowHours: 6, evidence: ["EV-004"] },
  { nodeKey: "imaging", name: "上腹部增强 MRI", stage: "术前检查", role: "DOCTOR", required: true, dependsOn: ["admission"], offsetHours: 24, windowHours: 8, evidence: ["EV-001"] },
  { nodeKey: "icg", name: "ICG 清除试验", stage: "术前检查", role: "DOCTOR", required: true, dependsOn: ["admission"], offsetHours: 24, windowHours: 6, evidence: ["EV-002"] },
  { nodeKey: "cardio", name: "心肺功能评估", stage: "术前检查", role: "DOCTOR", required: true, dependsOn: ["admission"], offsetHours: 24, windowHours: 8, evidence: [] },
  { nodeKey: "nutrition", name: "营养风险筛查（NRS 2002）", stage: "术前检查", role: "NURSE", required: true, dependsOn: ["admission"], offsetHours: 12, windowHours: 12, evidence: ["EV-005"], issue: "数据缺失" },
  { nodeKey: "mdt", name: "MDT 讨论", stage: "治疗方案确认", role: "DOCTOR", required: true, dependsOn: ["imaging", "icg", "cardio"], offsetHours: 48, windowHours: 12, evidence: ["EV-007"] },
  { nodeKey: "decision", name: "手术指征判断", stage: "治疗方案确认", role: "DOCTOR", required: true, dependsOn: ["mdt"], offsetHours: 48, windowHours: 6, evidence: ["EV-001", "EV-004"] },
  { nodeKey: "prehab", name: "术前 ERAS 宣教与营养干预", stage: "治疗方案确认", role: "DOCTOR", required: true, dependsOn: ["decision"], offsetHours: 66, windowHours: 12, evidence: ["EV-005"] },
  { nodeKey: "anesthesia", name: "麻醉会诊与评估", stage: "治疗方案确认", role: "ANESTHESIOLOGIST", required: true, dependsOn: ["decision"], offsetHours: 72, windowHours: 8, evidence: [] },
  { nodeKey: "consent", name: "手术知情同意", stage: "治疗方案确认", role: "DOCTOR", required: true, dependsOn: ["anesthesia"], offsetHours: 80, windowHours: 8, evidence: [] },
  { nodeKey: "surgery", name: "肝段切除术", stage: "手术及术后", role: "SURGEON", required: true, dependsOn: ["consent", "prehab", "anesthesia"], offsetHours: 96, windowHours: 48, evidence: ["EV-002", "EV-004"] },
  { nodeKey: "pathology", name: "术后病理检查", stage: "手术及术后", role: "DOCTOR", required: true, dependsOn: ["surgery"], offsetHours: 120, windowHours: 72, evidence: [] },
  { nodeKey: "analgesia", name: "术后多模式镇痛", stage: "手术及术后", role: "DOCTOR", required: true, dependsOn: ["surgery"], offsetHours: 100, windowHours: 6, evidence: ["EV-005"] },
  { nodeKey: "nursing", name: "术后引流管护理", stage: "手术及术后", role: "NURSE", required: true, dependsOn: ["surgery"], offsetHours: 100, windowHours: 72, evidence: [] },
  { nodeKey: "day1", name: "术后首次查房", stage: "手术及术后", role: "DOCTOR", required: true, dependsOn: ["surgery"], offsetHours: 120, windowHours: 24, evidence: [] },
  { nodeKey: "discharge", name: "出院标准评估", stage: "出院与随访", role: "DOCTOR", required: true, dependsOn: ["day1"], offsetHours: 168, windowHours: 48, evidence: ["EV-003"] },
  { nodeKey: "follow_up", name: "出院随访与复查计划", stage: "出院与随访", role: "NURSE", required: true, dependsOn: ["discharge"], offsetHours: 240, windowHours: 120, evidence: ["EV-003"] },
];

/* ------------------------------ 任务实例 ------------------------------ */

export const TASKS: Task[] = [
  { id: "T-101", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "admission", stage: "术前评估", name: "入院评估与病史采集", type: "ASSESSMENT", status: "COMPLETED", role: "DOCTOR", assignee: "张启明", earliestStartAt: at(-3, 14, 0), dueAt: at(-3, 18, 0), startedAt: at(-3, 15, 0), completedAt: at(-3, 17, 5), overdue: false, required: true, summary: "完成病史、体格检查与合并症评估，签署入院评估记录。" },
  { id: "T-102", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "nursing_assess", stage: "术前评估", name: "入院护理评估", type: "NURSING", status: "COMPLETED", role: "NURSE", assignee: "赵倩", earliestStartAt: at(-3, 14, 0), dueAt: at(-3, 20, 0), startedAt: at(-3, 15, 20), completedAt: at(-3, 17, 40), overdue: false, required: true, summary: "跌倒、压疮、VTE 风险评估及健康宣教。" },
  { id: "T-103", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "lab", stage: "术前检查", name: "入院实验室检验", type: "LAB_TEST", status: "COMPLETED", role: "DOCTOR", assignee: "李文博", earliestStartAt: at(-3, 16, 0), dueAt: at(-3, 22, 0), startedAt: at(-3, 16, 30), completedAt: at(-3, 18, 0), overdue: false, required: true, summary: "血常规、生化、凝血、肿瘤标志物、HBV-DNA。" },
  { id: "T-104", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "liver", stage: "术前评估", name: "肝功能与手术风险评估", type: "ASSESSMENT", status: "COMPLETED", role: "DOCTOR", assignee: "张启明", earliestStartAt: at(-3, 18, 0), dueAt: at(-2, 12, 0), startedAt: at(-2, 9, 0), completedAt: at(-2, 11, 20), overdue: false, required: true, summary: "Child-Pugh A 级，ALBI -2.41，Caprini 5 分。" },
  { id: "T-105", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "imaging", stage: "术前检查", name: "上腹部增强 MRI", type: "EXAMINATION", status: "COMPLETED", role: "DOCTOR", assignee: "李文博", earliestStartAt: at(-2, 8, 0), dueAt: at(-2, 18, 0), startedAt: at(-2, 9, 30), completedAt: at(-2, 10, 45), overdue: false, required: true, summary: "S6 段 3.2cm 强化灶，考虑 HCC；未见肝外转移。" },
  { id: "T-106", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "cardio", stage: "术前检查", name: "胸部 CT 与心肺功能评估", type: "EXAMINATION", status: "COMPLETED", role: "DOCTOR", assignee: "李文博", earliestStartAt: at(-2, 8, 0), dueAt: at(-1, 18, 0), startedAt: at(-1, 9, 0), completedAt: at(-1, 11, 20), overdue: false, required: true, summary: "双肺未见转移，FEV1 84% 预计值，心功能 NYHA Ⅰ级。" },
  { id: "T-107", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "icg", stage: "术前检查", name: "ICG 清除试验", type: "LAB_TEST", status: "COMPLETED", role: "DOCTOR", assignee: "李文博", earliestStartAt: at(-1, 8, 0), dueAt: at(-1, 12, 0), startedAt: at(-1, 9, 20), completedAt: at(-1, 10, 5), overdue: false, required: true, summary: "ICG R15 12.4%，≤ 15%，符合手术分支条件。" },
  { id: "T-108", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "nutrition", stage: "术前检查", name: "营养风险筛查（NRS 2002）", type: "ASSESSMENT", status: "READY", role: "NURSE", assignee: "赵倩", earliestStartAt: at(-1, 8, 0), dueAt: at(0, 11, 0), overdue: true, required: true, summary: "筛查结果未录入，路径规划按 UNKNOWN 处理。" },
  { id: "T-109", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "anesthesia", stage: "治疗方案确认", name: "麻醉会诊与评估", type: "CONSULTATION", status: "PENDING", role: "ANESTHESIOLOGIST", assignee: "顾明", earliestStartAt: at(1, 8, 0), dueAt: at(1, 12, 0), overdue: false, required: true, summary: "ASA 分级评估与麻醉方案制定。" },
  { id: "T-110", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "mdt", stage: "治疗方案确认", name: "MDT 讨论", type: "CONSULTATION", status: "PENDING", role: "DOCTOR", assignee: "张启明", earliestStartAt: at(1, 14, 0), dueAt: at(1, 18, 0), overdue: false, required: true, summary: "肝胆外科、肿瘤内科、影像科、病理科联合讨论。" },
  { id: "T-111", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "prehab", stage: "治疗方案确认", name: "术前 ERAS 宣教与营养干预", type: "TREATMENT", status: "PENDING", role: "DOCTOR", assignee: "李文博", earliestStartAt: at(1, 8, 0), dueAt: at(2, 20, 0), overdue: false, required: true, summary: "ERAS 宣教、碳水化合物负荷、营养支持。" },
  { id: "T-112", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "consent", stage: "治疗方案确认", name: "手术知情同意", type: "ASSESSMENT", status: "PENDING", role: "DOCTOR", assignee: "张启明", earliestStartAt: at(2, 8, 0), dueAt: at(2, 20, 0), overdue: false, required: true, summary: "告知手术风险、替代方案与输血同意。" },
  { id: "T-113", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "surgery", stage: "手术及术后", name: "肝段切除术（S6）", type: "SURGERY", status: "PENDING", role: "SURGEON", assignee: "张启明", earliestStartAt: at(3, 8, 0), dueAt: at(3, 18, 0), overdue: false, required: true, summary: "四级手术，全身麻醉，预计 180 分钟，备血 2U。" },
  { id: "T-114", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "analgesia", stage: "手术及术后", name: "术后多模式镇痛", type: "MEDICATION", status: "PENDING", role: "DOCTOR", assignee: "李文博", earliestStartAt: at(3, 12, 0), dueAt: at(3, 20, 0), overdue: false, required: true, summary: "PCIA + 对乙酰氨基酚，48 小时。" },
  { id: "T-115", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "nursing", stage: "手术及术后", name: "术后引流管护理", type: "NURSING", status: "PENDING", role: "NURSE", assignee: "赵倩", earliestStartAt: at(3, 12, 0), dueAt: at(5, 12, 0), overdue: false, required: true, summary: "记录引流量与性状，预防管道滑脱。" },
  { id: "T-116", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "pathology", stage: "手术及术后", name: "术后病理检查", type: "LAB_TEST", status: "PENDING", role: "DOCTOR", assignee: "病理科", earliestStartAt: at(3, 12, 0), dueAt: at(6, 12, 0), overdue: false, required: true, summary: "大体与镜下诊断、切缘评估、微血管侵犯。" },
  { id: "T-117", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "day1", stage: "手术及术后", name: "术后首次查房", type: "ASSESSMENT", status: "PENDING", role: "DOCTOR", assignee: "张启明", earliestStartAt: at(4, 8, 0), dueAt: at(4, 12, 0), overdue: false, required: true, summary: "评估生命体征、引流、疼痛与活动情况。" },
  { id: "T-118", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "discharge", stage: "出院与随访", name: "出院标准评估", type: "ASSESSMENT", status: "PENDING", role: "DOCTOR", assignee: "张启明", earliestStartAt: at(6, 8, 0), dueAt: at(7, 18, 0), overdue: false, required: true, summary: "依据 RULE-007 出院标准规则评估。" },
  { id: "T-119", instanceId: "INST-HCC-001", planId: "PLAN-HCC-P1", nodeKey: "follow_up", stage: "出院与随访", name: "出院随访与复查计划", type: "FOLLOW_UP", status: "PENDING", role: "NURSE", assignee: "赵倩", earliestStartAt: at(7, 8, 0), dueAt: at(8, 18, 0), overdue: false, required: false, summary: "电话随访 + 30 天复查增强 MRI。" },
];

/* ---------------------- 生成任务中心展示用任务 ---------------------- */

function buildCrossDeptTasks(): Task[] {
  const statuses: Task["status"][] = ["READY", "IN_PROGRESS", "PENDING", "COMPLETED", "PENDING", "READY", "IN_PROGRESS"];
  const taskNames = [
    "术前评估记录签署",
    "复查增强 MRI",
    "肝功能与 ICG 评估",
    "MDT 讨论准备",
    "术后引流管护理",
    "出院标准评估",
    "营养风险筛查",
    "手术知情同意",
    "麻醉会诊",
    "术后首次查房",
    "随访计划确认",
    "介入术后监测",
  ];
  const tasks: Task[] = [];
  const pool = PATIENTS.filter((p) => p.status === "IN_PATHWAY" || p.status === "PENDING_ADMISSION").slice(3, 43);
  pool.forEach((patient, i) => {
    const role: Task["role"] = i % 4 === 0 ? "NURSE" : i % 7 === 0 ? "ANESTHESIOLOGIST" : "DOCTOR";
    const status = statuses[i % statuses.length];
    const overdue = status !== "COMPLETED" && i % 9 === 0;
    const dueOffset = overdue ? -1 : i % 3 === 0 ? 0 : 1;
    tasks.push({
      id: `T-X${String(i + 1).padStart(3, "0")}`,
      instanceId: patient.instanceId ?? "INST-HCC-001",
      nodeKey: "generic",
      stage: ["术前评估", "术前检查", "治疗方案确认", "手术及术后", "出院与随访"][i % 5],
      name: taskNames[i % taskNames.length],
      type: role === "NURSE" ? "NURSING" : "ASSESSMENT",
      status,
      role,
      assignee: role === "NURSE" ? patient.nurse : patient.attending,
      earliestStartAt: minutesAgo(60 * (i + 2)),
      dueAt: at(dueOffset, 9 + (i % 8), (i * 7) % 60),
      startedAt: status === "IN_PROGRESS" || status === "COMPLETED" ? minutesAgo(60 * i + 30) : undefined,
      completedAt: status === "COMPLETED" ? minutesAgo(30 * i + 10) : undefined,
      overdue,
      required: i % 5 !== 0,
      summary: `${patient.name} · ${patient.diagnosis} · ${patient.pathwayName ?? "待入径评估"}`,
      planId: "PLAN-HCC-P1",
    });
  });
  return tasks;
}

export const ALL_TASKS: Task[] = [...TASKS, ...buildCrossDeptTasks()];

export function getTasks(instanceId: string) {
  return ALL_TASKS.filter((t) => t.instanceId === instanceId);
}

export function getTask(id: string) {
  return ALL_TASKS.find((t) => t.id === id);
}

export const TASK_STATS = {
  total: ALL_TASKS.length,
  pending: ALL_TASKS.filter((t) => t.status === "PENDING").length,
  ready: ALL_TASKS.filter((t) => t.status === "READY").length,
  inProgress: ALL_TASKS.filter((t) => t.status === "IN_PROGRESS").length,
  completed: ALL_TASKS.filter((t) => t.status === "COMPLETED").length,
  overdue: ALL_TASKS.filter((t) => t.overdue && t.status !== "COMPLETED").length,
};

export const TASK_EVENTS: TaskEvent[] = [
  { id: "TE-001", taskId: "T-108", type: "CREATED", at: at(-1, 8, 0), actor: "系统", note: "由计划 P1 生成" },
  { id: "TE-002", taskId: "T-108", type: "OVERDUE", at: at(0, 11, 2), actor: "系统", note: "超过最迟完成时间，标记超时（不改变执行状态）" },
  { id: "TE-003", taskId: "T-107", type: "COMPLETED", at: at(-1, 10, 5), actor: "李文博", note: "ICG R15 12.4%" },
];

export function getTaskEvents(taskId: string) {
  return TASK_EVENTS.filter((e) => e.taskId === taskId);
}

/* ------------------------------ 变异记录 ------------------------------ */

export const VARIATIONS: Variation[] = [
  {
    id: "VAR-2026-0081",
    patientId: "HCC-DEMO-001",
    patientName: "陈志远",
    pathwayName: "肝癌手术临床路径",
    type: "DATA",
    severity: "MEDIUM",
    title: "营养风险筛查（NRS 2002）结果缺失",
    description: "计划要求术前完成 NRS 2002 筛查，但护理记录中未录入结果。规划引擎按 UNKNOWN 处理，未自动视为低风险。",
    detectedAt: at(-1, 10, 12),
    status: "OPEN",
    source: "规划校验 · 数据完整性检查",
    affectedNodes: ["nutrition", "prehab", "surgery"],
    impact: "影响术前营养干预任务与手术排期建议，不阻断当前阶段。",
    ruleRef: "RULE-003@1.0.3",
    evidence: ["计划 P2 数据完整性校验", "护理记录缺失提示"],
  },
  {
    id: "VAR-2026-0080",
    patientId: "HCC-DEMO-002",
    patientName: "王丽华",
    pathwayName: "肝癌转化治疗后手术路径",
    type: "CLINICAL",
    severity: "HIGH",
    title: "转化治疗后肿瘤明显退缩，手术时机与范围需重新评估",
    description: "靶向联合免疫治疗 3 周期后 mRECIST 评估为 PR，肿瘤负荷下降 42%，门静脉癌栓退缩，原系统治疗计划需调整为转化后肝切除。",
    detectedAt: at(0, 7, 5),
    status: "REPLAN_PENDING",
    source: "临床事件 · 疗效评估结果",
    affectedNodes: ["response", "decision", "surgery"],
    impact: "影响 3 项后续任务，已生成重规划草案 P3 待医务处审核。",
    ruleRef: "RULE-004@1.3.0",
    evidence: ["mRECIST 疗效评估（2026-11-26）", "MDT 讨论记录"],
  },
  {
    id: "VAR-2026-0079",
    patientId: "HCC-DEMO-001",
    patientName: "陈志远",
    pathwayName: "肝癌手术临床路径",
    type: "TIME",
    severity: "LOW",
    title: "ICG 检查任务接近时间窗口上限",
    description: "ICG 清除试验于入径后 19 小时完成，接近 24 小时窗口上限；未超时。",
    detectedAt: at(-1, 10, 6),
    status: "CLOSED",
    source: "运行引擎 · 时间约束检查",
    affectedNodes: ["icg"],
    impact: "无任务延误，已记录用于流程效率分析。",
    ruleRef: "时间约束 TC-ICG-24H",
    evidence: ["任务执行时间戳"],
    resolvedBy: "系统",
    resolution: "无需人工干预，自动关闭。",
  },
  {
    id: "VAR-2026-0078",
    patientId: "PT-0017",
    patientName: "赵海峰",
    pathwayName: "肝癌手术临床路径",
    type: "SAFETY",
    severity: "HIGH",
    title: "凝血功能异常触发安全阻断",
    description: "术前复查 INR 1.68（> 1.5），触发 RULE-005 安全约束，手术相关任务被阻断。",
    detectedAt: at(0, 6, 40),
    status: "ASSESSING",
    source: "安全约束引擎",
    affectedNodes: ["surgery", "anesthesia", "consent"],
    impact: "手术任务 T-113 暂停推进，已通知责任医生与麻醉科。",
    ruleRef: "RULE-005@1.0.0",
    evidence: ["凝血功能报告 INR 1.68", "PLT 62×10⁹/L"],
  },
  {
    id: "VAR-2026-0077",
    patientId: "PT-0021",
    patientName: "孙建国",
    pathwayName: "肝癌手术临床路径",
    type: "RESOURCE",
    severity: "MEDIUM",
    title: "手术间资源冲突导致排期顺延",
    description: "原计划手术间因急诊肝破裂手术占用，肝段切除术顺延 6 小时。",
    detectedAt: at(0, 8, 15),
    status: "OPEN",
    source: "资源调度接口（模拟）",
    affectedNodes: ["surgery"],
    impact: "影响当日 2 台肝癌手术排期，住院日可能延长 0.5 天。",
    ruleRef: "资源约束 RC-OR-01",
    evidence: ["手术间排期表"],
  },
  {
    id: "VAR-2026-0076",
    patientId: "PT-0032",
    patientName: "李文静",
    pathwayName: "肝癌手术临床路径",
    type: "PATIENT",
    severity: "LOW",
    title: "患者拒绝术前门静脉癌栓影像复核",
    description: "患者因经济原因拒绝再次行增强 MRI 复核门静脉癌栓，要求直接手术。已由责任医生沟通并记录知情过程。",
    detectedAt: at(0, 9, 5),
    status: "RESOLVED",
    source: "医生登记",
    affectedNodes: ["imaging"],
    impact: "以最近一次影像结果评估，需在手术同意书中注明。",
    ruleRef: "—",
    evidence: ["医患沟通记录"],
    resolvedBy: "张启明",
    resolution: "已完成沟通并补充知情同意，路径继续执行。",
  },
  {
    id: "VAR-2026-0075",
    patientId: "PT-0040",
    patientName: "周志强",
    pathwayName: "肝癌手术临床路径",
    type: "PROCESS",
    severity: "MEDIUM",
    title: "术后镇痛方案偏离路径",
    description: "护理执行记录显示术后镇痛未使用路径推荐的多模式方案，改为单药镇痛。",
    detectedAt: at(-1, 16, 30),
    status: "OPEN",
    source: "流程挖掘 · 执行偏离检测（模拟）",
    affectedNodes: ["analgesia"],
    impact: "可能影响术后疼痛评分与早期活动，需质控复核。",
    ruleRef: "RULE-006@1.0.1",
    evidence: ["护理执行记录", "医嘱对照"],
  },
  {
    id: "VAR-2026-0074",
    patientId: "PT-0048",
    patientName: "王秀英",
    pathwayName: "肝癌手术临床路径",
    type: "CLINICAL",
    severity: "HIGH",
    title: "术中探查发现门静脉癌栓，需调整切除范围",
    description: "术中探查发现门静脉右支癌栓，原 S6 段切除方案调整为右半肝切除 + 癌栓取出。",
    detectedAt: at(-2, 11, 20),
    status: "RESOLVED",
    source: "术中事件登记",
    affectedNodes: ["surgery", "discharge"],
    impact: "手术方式变更，住院日延长 2 天，生成新的计划版本。",
    ruleRef: "RULE-004@1.3.0",
    evidence: ["术中记录", "术后病理"],
    resolvedBy: "张启明",
    resolution: "完成右半肝切除 + 门静脉癌栓取出，路径继续执行，已生成调整计划。",
  },
];

export function getVariations(patientId: string) {
  return VARIATIONS.filter((v) => v.patientId === patientId);
}

export const VARIATION_STATS = {
  total: VARIATIONS.length,
  open: VARIATIONS.filter((v) => v.status === "OPEN").length,
  replan: VARIATIONS.filter((v) => v.status === "REPLAN_PENDING").length,
  high: VARIATIONS.filter((v) => v.severity === "HIGH").length,
  resolved: VARIATIONS.filter((v) => v.status === "RESOLVED" || v.status === "CLOSED").length,
};

/* ---------------------- 状态机（运行时引擎演示） ---------------------- */

export const INSTANCE_TRANSITIONS: Record<InstanceStatus, InstanceStatus[]> = {
  PENDING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "REPLAN_REQUIRED", "COMPLETED", "EXITED"],
  PAUSED: ["ACTIVE", "REPLAN_REQUIRED", "EXITED"],
  REPLAN_REQUIRED: ["ACTIVE", "PAUSED", "EXITED"],
  COMPLETED: [],
  EXITED: [],
  CANCELLED: [],
};

export const TASK_TRANSITIONS: Record<Task["status"], Task["status"][]> = {
  PENDING: ["READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "SKIPPED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  SKIPPED: [],
  CANCELLED: [],
  BLOCKED: ["READY", "CANCELLED"],
};
