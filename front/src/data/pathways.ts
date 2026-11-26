import type {
  Approval,
  ConditionNode,
  Pathway,
  PathwayEdge,
  PathwayNode,
  PathwayVersion,
  RuleExpression,
  ValidationIssue,
} from "@/types";
import { at, daysAgo } from "./time";

const f = (field: string, operator: RuleExpression["expression"]["operator"], value?: unknown): ConditionNode => ({
  field,
  operator,
  value,
});

const rule = (
  id: string,
  name: string,
  type: RuleExpression["type"],
  expression: ConditionNode,
  version = "1.0.0",
): RuleExpression => ({ id, name, version, type, expression });

/* ------------------------------ 路径模板 ------------------------------ */

export const PATHWAYS: Pathway[] = [
  {
    id: "PW-HCC-001",
    code: "HCC_SURGERY_001",
    name: "肝癌手术临床路径",
    diseaseCode: "C22.0",
    diseaseCodeSystem: "ICD-10",
    diseaseName: "肝细胞癌",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    description: "面向可切除肝细胞癌患者的围术期标准路径，覆盖术前评估、MDT、肝段切除、术后管理与随访。",
    status: "PUBLISHED",
    currentVersion: "1.3.0",
    versionId: "PV-HCC-130",
    updatedAt: at(-6, 10, 24),
    createdAt: daysAgo(320),
    ownerName: "张启明",
    instanceCount: 42,
    tags: ["国家级", "外科", "四级手术"],
    clinicalUse: true,
    evidenceRefs: ["EV-001", "EV-002", "EV-003", "EV-004"],
  },
  {
    id: "PW-HCC-002",
    code: "HCC_ABLATION_002",
    name: "肝癌消融治疗路径",
    diseaseCode: "C22.0",
    diseaseCodeSystem: "ICD-10",
    diseaseName: "肝细胞癌",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    description: "面向早期或不宜手术的小肝癌患者，规范影像评估、消融治疗、围术期护理与疗效随访。",
    status: "PUBLISHED",
    currentVersion: "2.0.1",
    versionId: "PV-HCC2-201",
    updatedAt: at(-14, 15, 8),
    createdAt: daysAgo(280),
    ownerName: "王海峰",
    instanceCount: 31,
    tags: ["国家级", "消融", "微创"],
    clinicalUse: true,
    evidenceRefs: ["EV-001", "EV-005"],
  },
  {
    id: "PW-HCC-003",
    code: "HCC_TACE_003",
    name: "肝癌介入治疗（TACE）路径",
    diseaseCode: "C22.0",
    diseaseCodeSystem: "ICD-10",
    diseaseName: "肝细胞癌",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    description: "面向中期肝细胞癌的经导管动脉化疗栓塞治疗路径，含肝功能评估、栓塞方案与术后监测。",
    status: "PUBLISHED",
    currentVersion: "1.2.0",
    versionId: "PV-HCC3-120",
    updatedAt: at(-30, 9, 40),
    createdAt: daysAgo(240),
    ownerName: "陈立",
    instanceCount: 27,
    tags: ["国家级", "介入", "TACE"],
    clinicalUse: true,
    evidenceRefs: ["EV-001", "EV-007"],
  },
  {
    id: "PW-HCC-004",
    code: "HCC_CONVERSION_004",
    name: "肝癌转化治疗后手术路径",
    diseaseCode: "C22.0",
    diseaseCodeSystem: "ICD-10",
    diseaseName: "肝细胞癌",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    description: "初始不可切除、经靶向/免疫/介入转化治疗后重新评估手术机会的肝癌路径，强调 MDT 与疗效评估。",
    status: "PUBLISHED",
    currentVersion: "1.3.0",
    versionId: "PV-HCC4-130",
    updatedAt: at(-6, 15, 30),
    createdAt: daysAgo(190),
    ownerName: "张启明",
    instanceCount: 12,
    tags: ["转化治疗", "MDT", "手术评估"],
    clinicalUse: true,
    evidenceRefs: ["EV-001", "EV-007"],
  },
  {
    id: "PW-HCC-005",
    code: "HCC_SYSTEMIC_005",
    name: "肝癌系统治疗路径",
    diseaseCode: "C22.0",
    diseaseCodeSystem: "ICD-10",
    diseaseName: "肝细胞癌",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    description: "晚期肝细胞癌靶向联合免疫治疗路径，覆盖分子评估、用药监测、不良反应管理与疗效评价。",
    status: "DRAFT",
    currentVersion: "0.9.0",
    versionId: "PV-HCC5-090",
    updatedAt: at(-9, 14, 5),
    createdAt: daysAgo(60),
    ownerName: "刘欣",
    instanceCount: 0,
    tags: ["系统治疗", "靶向+免疫", "草稿"],
    clinicalUse: false,
    evidenceRefs: ["EV-001"],
  },
  {
    id: "PW-HCC-006",
    code: "HCC_FOLLOWUP_006",
    name: "肝癌术后随访路径",
    diseaseCode: "C22.0",
    diseaseCodeSystem: "ICD-10",
    diseaseName: "肝细胞癌",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    description: "肝癌根治性治疗后 5 年随访路径，规范影像复查、肿瘤标志物监测与复发预警。",
    status: "IN_REVIEW",
    currentVersion: "0.1.0",
    versionId: "PV-HCC6-010",
    updatedAt: at(-2, 16, 30),
    createdAt: daysAgo(25),
    ownerName: "李文博",
    instanceCount: 0,
    tags: ["随访", "复发监测", "审核中"],
    clinicalUse: false,
    evidenceRefs: ["EV-001", "EV-003"],
  },
];

export function getPathway(id: string) {
  return PATHWAYS.find((p) => p.id === id);
}

/* ------------------------------ 版本记录 ------------------------------ */

export const PATHWAY_VERSIONS: PathwayVersion[] = [
  {
    id: "PV-HCC-150",
    pathwayId: "PW-HCC-001",
    version: "1.5.0",
    status: "DRAFT",
    graphHash: "sha256:9f2c41e7…b83a",
    createdAt: at(-2, 16, 42),
    createdBy: "张启明",
    changeSummary: "围术期 ERAS 流程修订：新增营养风险评估与术后早期活动节点，调整术后镇痛方案。",
    nodeCount: 27,
    edgeCount: 32,
    validation: { errors: 1, warnings: 3 },
  },
  {
    id: "PV-HCC-140",
    pathwayId: "PW-HCC-001",
    version: "1.4.0",
    status: "IN_REVIEW",
    graphHash: "sha256:1a77c0d9…4e12",
    createdAt: at(-6, 10, 24),
    createdBy: "张启明",
    changeSummary: "ICG R15 阈值由 10% 调整为 15%；新增 MDT 讨论前置节点；删除常规术前肠道准备。",
    nodeCount: 25,
    edgeCount: 30,
    validation: { errors: 0, warnings: 2, passedAt: at(-6, 11, 2) },
  },
  {
    id: "PV-HCC-130",
    pathwayId: "PW-HCC-001",
    version: "1.3.0",
    status: "PUBLISHED",
    graphHash: "sha256:4c9b81aa…d027",
    effectiveAt: daysAgo(45),
    publishedAt: daysAgo(45),
    createdAt: daysAgo(52),
    createdBy: "张启明",
    changeSummary: "依据《原发性肝癌诊疗指南（2024年版）》更新准入规则与随访周期。",
    nodeCount: 23,
    edgeCount: 27,
    approval: { reviewer: "周敏", reviewedAt: daysAgo(46), comment: "证据与安全约束完整，同意发布。" },
    validation: { errors: 0, warnings: 1, passedAt: daysAgo(48) },
  },
  {
    id: "PV-HCC-120",
    pathwayId: "PW-HCC-001",
    version: "1.2.0",
    status: "RETIRED",
    graphHash: "sha256:7e0d32b1…9a44",
    effectiveAt: daysAgo(210),
    publishedAt: daysAgo(210),
    createdAt: daysAgo(220),
    createdBy: "张启明",
    changeSummary: "增加术前 ICG 检查节点，细化手术分级授权。",
    nodeCount: 21,
    edgeCount: 25,
    approval: { reviewer: "周敏", reviewedAt: daysAgo(212), comment: "同意发布。" },
    validation: { errors: 0, warnings: 0 },
  },
  {
    id: "PV-HCC-110",
    pathwayId: "PW-HCC-001",
    version: "1.1.0",
    status: "RETIRED",
    graphHash: "sha256:2b55de11…c0f9",
    effectiveAt: daysAgo(330),
    publishedAt: daysAgo(330),
    createdAt: daysAgo(340),
    createdBy: "李文博",
    changeSummary: "初版路径，含 18 个关键节点。",
    nodeCount: 18,
    edgeCount: 21,
    validation: { errors: 0, warnings: 0 },
  },
  {
    id: "PV-HCC2-210",
    pathwayId: "PW-HCC-002",
    version: "2.1.0",
    status: "IN_REVIEW",
    graphHash: "sha256:88ce0a3f…7710",
    createdAt: at(-1, 14, 18),
    createdBy: "王海峰",
    changeSummary: "新增术前影像融合导航节点，缩短消融术前等待时间窗口。",
    nodeCount: 14,
    edgeCount: 16,
    validation: { errors: 0, warnings: 1, passedAt: at(-1, 15, 2) },
  },
  {
    id: "PV-HCC2-201",
    pathwayId: "PW-HCC-002",
    version: "2.0.1",
    status: "PUBLISHED",
    graphHash: "sha256:3dfa1c44…bb19",
    effectiveAt: daysAgo(70),
    publishedAt: daysAgo(70),
    createdAt: daysAgo(78),
    createdBy: "王海峰",
    changeSummary: "按 2024 版肝癌指南修订消融适应证与术后随访周期。",
    nodeCount: 13,
    edgeCount: 15,
    approval: { reviewer: "周敏", reviewedAt: daysAgo(72), comment: "同意发布。" },
    validation: { errors: 0, warnings: 0, passedAt: daysAgo(73) },
  },
  {
    id: "PV-HCC3-130",
    pathwayId: "PW-HCC-003",
    version: "1.3.0",
    status: "IN_REVIEW",
    graphHash: "sha256:aa19c8f4…0d62",
    createdAt: at(-2, 9, 30),
    createdBy: "陈立",
    changeSummary: "增加 TACE 术后肝功能监测节点，更新栓塞材料与随访安排。",
    nodeCount: 12,
    edgeCount: 14,
    validation: { errors: 0, warnings: 1, passedAt: at(-2, 10, 12) },
  },
  {
    id: "PV-HCC3-120",
    pathwayId: "PW-HCC-003",
    version: "1.2.0",
    status: "PUBLISHED",
    graphHash: "sha256:51b0ea09…2f3d",
    effectiveAt: daysAgo(120),
    publishedAt: daysAgo(120),
    createdAt: daysAgo(130),
    createdBy: "陈立",
    changeSummary: "统一 TACE 术前评估与术后 24 小时监测要求。",
    nodeCount: 11,
    edgeCount: 13,
    approval: { reviewer: "周敏", reviewedAt: daysAgo(122), comment: "同意发布，关注术后肝功能。" },
    validation: { errors: 0, warnings: 0, passedAt: daysAgo(125) },
  },
  {
    id: "PV-HCC4-140",
    pathwayId: "PW-HCC-004",
    version: "1.4.0",
    status: "IN_REVIEW",
    graphHash: "sha256:1a77c0d9…4e12",
    createdAt: at(-6, 10, 24),
    createdBy: "张启明",
    changeSummary: "引入转化治疗疗效评估节点，调整再评估手术窗口与 MDT 触发条件。",
    nodeCount: 18,
    edgeCount: 21,
    validation: { errors: 0, warnings: 2, passedAt: at(-6, 11, 2) },
  },
  {
    id: "PV-HCC4-130",
    pathwayId: "PW-HCC-004",
    version: "1.3.0",
    status: "PUBLISHED",
    graphHash: "sha256:4c9b81aa…d027",
    effectiveAt: daysAgo(160),
    publishedAt: daysAgo(160),
    createdAt: daysAgo(170),
    createdBy: "张启明",
    changeSummary: "首版转化治疗后手术路径：系统治疗 → 疗效评估 → 手术决策。",
    nodeCount: 16,
    edgeCount: 19,
    approval: { reviewer: "周敏", reviewedAt: daysAgo(162), comment: "同意发布，需 MDT 记录完整。" },
    validation: { errors: 0, warnings: 1, passedAt: daysAgo(165) },
  },
  {
    id: "PV-HCC5-090",
    pathwayId: "PW-HCC-005",
    version: "0.9.0",
    status: "DRAFT",
    graphHash: "sha256:d00a3b77…aa10",
    createdAt: at(-9, 14, 5),
    createdBy: "刘欣",
    changeSummary: "初稿：靶向联合免疫治疗、不良反应管理与疗效评价。",
    nodeCount: 9,
    edgeCount: 8,
    validation: { errors: 2, warnings: 3 },
  },
  {
    id: "PV-HCC6-010",
    pathwayId: "PW-HCC-006",
    version: "0.1.0",
    status: "DRAFT",
    graphHash: "sha256:ec0f22b9…771b",
    createdAt: at(-2, 16, 30),
    createdBy: "李文博",
    changeSummary: "首版随访框架：3/6/12 月复查与复发预警。",
    nodeCount: 7,
    edgeCount: 6,
    validation: { errors: 1, warnings: 2 },
  },
];

export function getVersions(pathwayId: string) {
  return PATHWAY_VERSIONS.filter((v) => v.pathwayId === pathwayId);
}

/* --------------------------- 路径版本差异 --------------------------- */

export interface VersionDiff {
  from: string;
  to: string;
  added: { nodeKey: string; name: string; type: string; stage: string }[];
  removed: { nodeKey: string; name: string; type: string; stage: string }[];
  changed: { nodeKey: string; name: string; changes: { field: string; from: string; to: string }[] }[];
  ruleChanges: { rule: string; from: string; to: string; impact: string }[];
}

export const VERSION_DIFF: VersionDiff = {
  from: "1.3.0",
  to: "1.4.0",
  added: [
    { nodeKey: "nutrition_assess", name: "营养风险评估（NRS 2002）", type: "ASSESSMENT", stage: "术前评估" },
    { nodeKey: "mdt", name: "MDT 讨论", type: "CONSULTATION", stage: "治疗方案确认" },
    { nodeKey: "post_early_mobility", name: "术后早期下床活动", type: "NURSING", stage: "手术及术后" },
  ],
  removed: [
    { nodeKey: "bowel_prep", name: "常规术前肠道准备", type: "TREATMENT", stage: "术前准备" },
    { nodeKey: "routine_chest_xray", name: "常规术前胸片", type: "EXAMINATION", stage: "术前检查" },
  ],
  changed: [
    {
      nodeKey: "icg_test",
      name: "ICG 清除试验",
      changes: [{ field: "分支阈值（ICG R15）", from: "10%", to: "15%" }],
    },
    {
      nodeKey: "surgery",
      name: "肝段切除术",
      changes: [
        { field: "时间窗口", from: "入径后 72h ± 12h", to: "入径后 96h ± 24h" },
        { field: "执行角色", from: "外科医生", to: "外科医生 + 麻醉医生" },
      ],
    },
    {
      nodeKey: "discharge",
      name: "出院标准判断",
      changes: [{ field: "引用规则版本", from: "RULE-007 @1.1.0", to: "RULE-007 @1.2.0" }],
    },
  ],
  ruleChanges: [
    { rule: "HCC_ICG_BRANCH", from: "1.2.0", to: "1.3.0", impact: "手术指征判定阈值更新，影响 42 例在径患者" },
    { rule: "HCC_DISCHARGE", from: "1.1.0", to: "1.2.0", impact: "出院标准新增疼痛评分条件" },
    { rule: "HCC_ADMISSION", from: "1.1.0", to: "1.2.0", impact: "准入条件表述与指南对齐，逻辑等价" },
  ],
};

/* ------------------------------ 路径图 ------------------------------ */

const n = (
  nodeKey: string,
  type: PathwayNode["type"],
  name: string,
  x: number,
  y: number,
  stage: string,
  responsibleRole: PathwayNode["responsibleRole"] = "DOCTOR",
  extra: Partial<PathwayNode> = {},
): PathwayNode => ({
  id: `node-${nodeKey}`,
  nodeKey,
  type,
  name,
  required: true,
  responsibleRole,
  position: { x, y },
  stage,
  ...extra,
});

const e = (
  source: string,
  target: string,
  type: PathwayEdge["type"] = "SEQUENCE",
  extra: Partial<PathwayEdge> = {},
): PathwayEdge => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  type,
  ...extra,
});

export const HCC_GRAPH: { nodes: PathwayNode[]; edges: PathwayEdge[] } = {
  nodes: [
    n("start", "START", "开始", 40, 336, "术前评估", "COORDINATOR", { required: true }),
    n("admission", "ASSESSMENT", "入院评估与病史采集", 190, 336, "术前评估", "DOCTOR", {
      description: "完成病史采集、体格检查、合并症与用药评估。",
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 2, hard: true },
      completionRule: rule("CR-101", "入院评估完成", "COMPLETION", f("assessment.admission_signed", "eq", true)),
      evidenceRefs: ["EV-002"],
    }),
    n("split_pre", "PARALLEL_SPLIT", "术前检查并行", 340, 336, "术前检查", "COORDINATOR"),
    n("lab", "LAB_TEST", "入院实验室检验", 500, 150, "术前检查", "DOCTOR", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 6, hard: true },
      evidenceRefs: ["EV-004"],
      configuration: { panels: ["血常规", "生化全套", "凝血功能", "肿瘤标志物", "HBV-DNA"] },
    }),
    n("imaging", "EXAMINATION", "上腹部增强 MRI", 500, 272, "术前检查", "DOCTOR", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 24, hard: false },
      evidenceRefs: ["EV-001", "EV-004"],
      configuration: { modality: "MRI", contrast: true, sequence: "上腹部增强" },
    }),
    n("icg", "LAB_TEST", "ICG 清除试验", 500, 394, "术前检查", "DOCTOR", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 24, hard: false },
      evidenceRefs: ["EV-002", "EV-004"],
      configuration: { code: "ICG-R15", unit: "%", threshold: 15 },
    }),
    n("cardio", "EXAMINATION", "心肺功能评估", 500, 516, "术前检查", "DOCTOR", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 24, hard: false },
      configuration: { items: ["心电图", "肺功能", "心脏彩超"] },
    }),
    n("join_pre", "PARALLEL_JOIN", "检查结果汇聚", 660, 336, "术前检查", "COORDINATOR"),
    n("diagnosis", "DIAGNOSIS", "诊断确认与分期", 800, 336, "术前检查", "DOCTOR", {
      completionRule: rule("CR-102", "诊断确认", "COMPLETION", f("diagnosis.confirmed", "eq", true)),
      evidenceRefs: ["EV-001", "EV-003"],
    }),
    n("liver", "ASSESSMENT", "肝功能与手术风险评估", 940, 336, "术前检查", "DOCTOR", {
      completionRule: rule("CR-103", "肝功能评估完成", "COMPLETION", f("assessment.liver_function", "exists")),
      evidenceRefs: ["EV-002"],
      configuration: { scores: ["Child-Pugh", "ICG R15", "ALBI", "Caprini"] },
    }),
    n("mdt", "CONSULTATION", "MDT 讨论", 1080, 336, "治疗方案确认", "DOCTOR", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 48, hard: false },
      completionRule: rule("CR-104", "MDT 记录归档", "COMPLETION", f("mdt.record_signed", "eq", true)),
      evidenceRefs: ["EV-007"],
      configuration: { participants: ["肝胆外科", "肿瘤内科", "影像科", "病理科"] },
    }),
    n("decision", "DECISION", "手术指征判断", 1220, 336, "治疗方案确认", "DOCTOR", {
      description: "依据 ICG R15、肿瘤可切除性与患者意愿决定手术或转化治疗。",
      completionRule: rule("CR-105", "手术指征分支", "BRANCH", f("decision.surgery_indicated", "exists")),
    }),
    n("prehab", "TREATMENT", "术前 ERAS 宣教与营养干预", 1380, 210, "治疗方案确认", "DOCTOR", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 66, hard: false },
      evidenceRefs: ["EV-005"],
      configuration: { nrs2002: true, carbLoading: true },
    }),
    n("anesthesia", "CONSULTATION", "麻醉会诊与评估", 1380, 336, "治疗方案确认", "ANESTHESIOLOGIST", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 72, hard: true },
      completionRule: rule("CR-106", "麻醉评估完成", "COMPLETION", f("anesthesia.cleared", "eq", true)),
    }),
    n("consent", "ASSESSMENT", "手术知情同意", 1380, 462, "治疗方案确认", "DOCTOR", {
      completionRule: rule("CR-107", "知情同意签署", "COMPLETION", f("consent.signed", "eq", true)),
    }),
    n("surgery", "SURGERY", "肝段切除术", 1540, 336, "手术及术后", "SURGEON", {
      timeConstraint: { anchor: "ENROLLMENT", offsetHours: 96, windowBeforeHours: 24, windowAfterHours: 24, hard: true },
      completionRule: rule("CR-108", "手术记录归档", "COMPLETION", f("surgery.record_completed", "eq", true)),
      evidenceRefs: ["EV-002", "EV-004"],
      configuration: { operation: "肝段切除术（S6）", level: "四级", anesthesia: "全身麻醉", durationMinutes: 180 },
    }),
    n("recovery", "ASSESSMENT", "术后复苏与监护", 1690, 336, "手术及术后", "ANESTHESIOLOGIST", {
      timeConstraint: { anchor: "PREVIOUS_NODE", offsetHours: 4, hard: true },
    }),
    n("split_post", "PARALLEL_SPLIT", "术后并行管理", 1840, 336, "手术及术后", "COORDINATOR"),
    n("pathology", "LAB_TEST", "术后病理检查", 2000, 180, "手术及术后", "DOCTOR", {
      timeConstraint: { anchor: "PREVIOUS_NODE", offsetHours: 96, hard: false },
    }),
    n("analgesia", "MEDICATION", "术后多模式镇痛", 2000, 336, "手术及术后", "DOCTOR", {
      evidenceRefs: ["EV-005"],
      configuration: { regimen: "PCIA + 对乙酰氨基酚", durationHours: 48 },
    }),
    n("nursing", "NURSING", "术后引流管护理", 2000, 492, "手术及术后", "NURSE", {
      completionRule: rule("CR-109", "引流护理记录完成", "COMPLETION", f("nursing.drain_record", "eq", true)),
    }),
    n("join_post", "PARALLEL_JOIN", "术后任务汇聚", 2160, 336, "手术及术后", "COORDINATOR"),
    n("day1", "ASSESSMENT", "术后首次查房", 2300, 336, "手术及术后", "DOCTOR", {
      timeConstraint: { anchor: "PREVIOUS_NODE", offsetHours: 24, hard: true },
      completionRule: rule("CR-110", "首次查房记录", "COMPLETION", f("round.first_note", "exists")),
    }),
    n("discharge", "DECISION", "出院标准判断", 2440, 336, "出院与随访", "DOCTOR", {
      description: "依据出院标准规则判断是否可出院；未达标进入延长住院观察。",
      completionRule: rule("CR-111", "出院标准判断", "EXIT", f("discharge.criteria_met", "exists")),
    }),
    n("follow", "FOLLOW_UP", "出院随访与复查", 2600, 210, "出院与随访", "NURSE", {
      timeConstraint: { anchor: "PREVIOUS_NODE", offsetHours: 24 * 30, hard: false },
      evidenceRefs: ["EV-003"],
    }),
    n("prolonged", "TREATMENT", "延长住院观察/治疗", 2600, 462, "出院与随访", "DOCTOR"),
    n("conversion", "TREATMENT", "转化治疗 / 降期评估", 1380, 580, "治疗方案确认", "DOCTOR", {
      description: "ICG R15 > 15% 或临界可切除时进入转化治疗评估。",
      evidenceRefs: ["EV-001", "EV-007"],
    }),
    n("end", "END", "路径结束", 2760, 336, "出院与随访", "COORDINATOR"),
  ],
  edges: [
    e("start", "admission"),
    e("admission", "split_pre"),
    e("split_pre", "lab", "PARALLEL"),
    e("split_pre", "imaging", "PARALLEL"),
    e("split_pre", "icg", "PARALLEL"),
    e("split_pre", "cardio", "PARALLEL"),
    e("lab", "join_pre", "PARALLEL"),
    e("imaging", "join_pre", "PARALLEL"),
    e("icg", "join_pre", "PARALLEL"),
    e("cardio", "join_pre", "PARALLEL"),
    e("join_pre", "diagnosis"),
    e("diagnosis", "liver"),
    e("liver", "mdt"),
    e("mdt", "decision"),
    e(
      "decision",
      "prehab",
      "CONDITIONAL",
      {
        priority: 1,
        condition: rule("RULE-004-B1", "ICG R15 ≤ 15% 且可切除", "BRANCH", {
          all: [f("icg.r15", "lte", 15), f("surgery.resectable", "eq", true)],
        }),
      },
    ),
    e(
      "decision",
      "conversion",
      "CONDITIONAL",
      { priority: 9, isDefault: true, condition: rule("RULE-004-B2", "需转化治疗", "BRANCH", f("icg.r15", "gt", 15)) },
    ),
    e("prehab", "anesthesia"),
    e("anesthesia", "consent"),
    e("consent", "surgery"),
    e("surgery", "recovery"),
    e("recovery", "split_post"),
    e("split_post", "pathology", "PARALLEL"),
    e("split_post", "analgesia", "PARALLEL"),
    e("split_post", "nursing", "PARALLEL"),
    e("pathology", "join_post", "PARALLEL"),
    e("analgesia", "join_post", "PARALLEL"),
    e("nursing", "join_post", "PARALLEL"),
    e("join_post", "day1"),
    e("day1", "discharge"),
    e(
      "discharge",
      "follow",
      "CONDITIONAL",
      {
        priority: 1,
        condition: rule("RULE-007-B1", "满足出院标准", "EXIT", {
          all: [f("vitals.temp_normal_days", "gte", 3), f("pain.nrs", "lte", 3)],
        }),
      },
    ),
    e("discharge", "prolonged", "CONDITIONAL", {
      priority: 2,
      condition: rule("RULE-007-B2", "未满足出院标准", "EXIT", {
        any: [f("vitals.temp_normal_days", "lt", 3), f("pain.nrs", "gt", 3)],
      }),
    }),
    e("follow", "end"),
    e("prolonged", "end"),
    e("conversion", "follow"),
  ],
};

function simpleGraph(
  prefix: string,
  stageNames: [string, string, string, string],
  nodes: { key: string; type: PathwayNode["type"]; name: string; role?: PathwayNode["responsibleRole"]; evidence?: string[] }[],
): { nodes: PathwayNode[]; edges: PathwayEdge[] } {
  const built = nodes.map((item, i) =>
    n(item.key, item.type, item.name, 120 + i * 180, 300 + (i % 2 === 0 ? 0 : 80), stageNames[Math.min(Math.floor(i / 3), 3)], item.role ?? "DOCTOR", {
      evidenceRefs: item.evidence,
    }),
  );
  const edges: PathwayEdge[] = [];
  for (let i = 0; i < built.length - 1; i++) {
    if (built[i].type === "DECISION") {
      edges.push(e(built[i].nodeKey, built[i + 1].nodeKey, "CONDITIONAL", { isDefault: true, priority: 1 }));
    } else {
      edges.push(e(built[i].nodeKey, built[i + 1].nodeKey));
    }
  }
  return { nodes: built, edges };
}

export const ABLATION_GRAPH = simpleGraph(
  "abl",
  ["术前评估", "术前检查", "消融治疗", "出院与随访"],
  [
    { key: "start", type: "START", name: "开始", role: "COORDINATOR" },
    { key: "admission", type: "ASSESSMENT", name: "入院评估与肝功能分级", evidence: ["EV-001"] },
    { key: "imaging", type: "EXAMINATION", name: "增强 MRI / 超声造影" },
    { key: "mdt", type: "CONSULTATION", name: "消融适应证 MDT 讨论" },
    { key: "decision", type: "DECISION", name: "消融方式判断" },
    { key: "ablation", type: "TREATMENT", name: "超声/CT 引导下消融", role: "SURGEON" },
    { key: "nursing", type: "NURSING", name: "术后疼痛与并发症护理", role: "NURSE" },
    { key: "discharge", type: "ASSESSMENT", name: "消融疗效评估与出院" },
    { key: "follow", type: "FOLLOW_UP", name: "术后 1 个月复查", role: "NURSE" },
    { key: "end", type: "END", name: "结束", role: "COORDINATOR" },
  ],
);

export const TACE_GRAPH = simpleGraph(
  "tace",
  ["术前评估", "术前检查", "介入治疗", "出院与随访"],
  [
    { key: "start", type: "START", name: "开始", role: "COORDINATOR" },
    { key: "admission", type: "ASSESSMENT", name: "入院评估与 Child-Pugh 分级" },
    { key: "imaging", type: "EXAMINATION", name: "上腹部增强 CT / MRI" },
    { key: "labs", type: "LAB_TEST", name: "肝功能、凝血与肿瘤标志物" },
    { key: "mdt", type: "CONSULTATION", name: "介入与肝胆外科 MDT" },
    { key: "decision", type: "DECISION", name: "TACE 适应证判断" },
    { key: "tace", type: "TREATMENT", name: "经导管动脉化疗栓塞", role: "SURGEON" },
    { key: "monitor", type: "NURSING", name: "术后 24h 监测与护理", role: "NURSE" },
    { key: "discharge", type: "ASSESSMENT", name: "术后评估与出院" },
    { key: "follow", type: "FOLLOW_UP", name: "4–6 周疗效评估", role: "NURSE" },
    { key: "end", type: "END", name: "结束", role: "COORDINATOR" },
  ],
);

export const CONVERSION_GRAPH = simpleGraph(
  "conv",
  ["评估", "转化治疗", "手术评估", "手术与随访"],
  [
    { key: "start", type: "START", name: "开始", role: "COORDINATOR" },
    { key: "admission", type: "ASSESSMENT", name: "初始不可切除评估" },
    { key: "mdt", type: "CONSULTATION", name: "MDT 制定转化方案" },
    { key: "systemic", type: "MEDICATION", name: "靶向联合免疫治疗" },
    { key: "response", type: "EXAMINATION", name: "疗效评估（mRECIST）" },
    { key: "decision", type: "DECISION", name: "是否获得手术机会" },
    { key: "surgery", type: "SURGERY", name: "转化后肝切除术", role: "SURGEON" },
    { key: "pathology", type: "LAB_TEST", name: "术后病理与切缘评估" },
    { key: "follow", type: "FOLLOW_UP", name: "术后随访与辅助治疗", role: "NURSE" },
    { key: "end", type: "END", name: "结束", role: "COORDINATOR" },
  ],
);

export const SYSTEMIC_GRAPH = simpleGraph(
  "sys",
  ["评估", "系统治疗", "疗效评价", "随访"],
  [
    { key: "start", type: "START", name: "开始", role: "COORDINATOR" },
    { key: "admission", type: "ASSESSMENT", name: "分期与肝功能评估" },
    { key: "molecular", type: "LAB_TEST", name: "分子检测与用药禁忌筛查" },
    { key: "mdt", type: "CONSULTATION", name: "系统治疗 MDT 讨论" },
    { key: "treatment", type: "MEDICATION", name: "靶向联合免疫治疗" },
    { key: "toxicity", type: "ASSESSMENT", name: "不良反应监测" },
    { key: "response", type: "EXAMINATION", name: "影像学疗效评价" },
    { key: "decision", type: "DECISION", name: "继续 / 调整方案" },
    { key: "follow", type: "FOLLOW_UP", name: "长期随访", role: "NURSE" },
    { key: "end", type: "END", name: "结束", role: "COORDINATOR" },
  ],
);

export const FOLLOWUP_GRAPH = simpleGraph(
  "fu",
  ["随访登记", "复查评估", "复发预警", "结束"],
  [
    { key: "start", type: "START", name: "开始", role: "COORDINATOR" },
    { key: "registry", type: "ASSESSMENT", name: "随访登记与风险分层" },
    { key: "imaging", type: "EXAMINATION", name: "增强 MRI / CT 复查" },
    { key: "labs", type: "LAB_TEST", name: "AFP 与肝功能监测" },
    { key: "decision", type: "DECISION", name: "复发风险判断" },
    { key: "consult", type: "CONSULTATION", name: "异常结果 MDT 复核" },
    { key: "end", type: "END", name: "结束", role: "COORDINATOR" },
  ],
);

const MINI_GRAPH = simpleGraph("mini", ["评估", "检查", "治疗", "随访"], [
  { key: "start", type: "START", name: "开始", role: "COORDINATOR" },
  { key: "assess", type: "ASSESSMENT", name: "初始评估" },
  { key: "end", type: "END", name: "结束", role: "COORDINATOR" },
]);

export function getGraph(pathwayId: string) {
  if (pathwayId === "PW-HCC-001") return HCC_GRAPH;
  if (pathwayId === "PW-HCC-002") return ABLATION_GRAPH;
  if (pathwayId === "PW-HCC-003") return TACE_GRAPH;
  if (pathwayId === "PW-HCC-004") return CONVERSION_GRAPH;
  if (pathwayId === "PW-HCC-005") return SYSTEMIC_GRAPH;
  if (pathwayId === "PW-HCC-006") return FOLLOWUP_GRAPH;
  return MINI_GRAPH;
}

export function getStudioValidation(pathwayId: string): ValidationIssue[] {
  if (pathwayId === "PW-HCC-001") return STUDIO_VALIDATION;
  if (pathwayId === "PW-HCC-002") {
    return [
      {
        id: "VI-101",
        level: "INFO",
        category: "GRAPH",
        message: "消融治疗路径为演示示例，结构校验通过；影像融合导航资料为合成占位。",
        nodeKey: "imaging",
      },
    ];
  }
  if (pathwayId === "PW-HCC-006") {
    return [
      {
        id: "VI-601",
        level: "WARNING",
        category: "RULE",
        message: "随访路径尚未绑定复发预警规则，提交前需补充。",
        nodeKey: "decision",
      },
    ];
  }
  return [];
}

export const STUDIO_VALIDATION: ValidationIssue[] = [
  {
    id: "VI-001",
    level: "ERROR",
    category: "GRAPH",
    message: "决策节点「出院标准判断」缺少默认分支，条件未命中时路径无法继续。",
    nodeKey: "discharge",
  },
  {
    id: "VI-002",
    level: "WARNING",
    category: "TIME",
    message: "节点「术前 ERAS 宣教与营养干预」计划窗口与「肝段切除术」重叠 2 小时。",
    nodeKey: "prehab",
  },
  {
    id: "VI-003",
    level: "WARNING",
    category: "RULE",
    message: "节点「术后病理检查」未绑定证据条目，建议补充病理质控依据。",
    nodeKey: "pathology",
  },
  {
    id: "VI-004",
    level: "INFO",
    category: "VERSION",
    message: "当前版本基于 V1.3.0，已同步 3 条规则版本变更，请复核分支阈值。",
  },
];

/* ------------------------------ 审批 ------------------------------ */

export const APPROVALS: Approval[] = [
  {
    id: "AP-2026-0142",
    type: "PATHWAY_VERSION",
    title: "路径版本审核",
    pathwayName: "肝癌手术临床路径",
    version: "V1.4.0",
    submittedBy: "张启明",
    submittedAt: at(0, 8, 42),
    status: "PENDING",
    risk: "MEDIUM",
    deadline: at(1, 18, 0),
    checklist: [
      { key: "structure", label: "图结构校验", status: "PASS", note: "唯一入口、2 个结束节点、无环、无孤立节点" },
      { key: "rules", label: "临床规则校验", status: "PASS", note: "准入 / 排除 / 分支规则引用有效版本" },
      { key: "evidence", label: "证据完备性", status: "WARN", note: "「术后病理检查」未绑定证据条目" },
      { key: "safety", label: "安全约束校验", status: "PASS", note: "必做任务不可删除，凝血安全约束已绑定" },
      { key: "version", label: "版本与权限校验", status: "PASS", note: "基于已发布 V1.3.0 派生，未修改历史版本" },
    ],
    comments: [
      { author: "张启明", role: "临床专家", at: at(0, 8, 42), content: "已按 2024 版肝癌指南调整 ICG 阈值，新增 MDT 前置，请医务处审核。" },
      { author: "周敏", role: "医务处", at: at(0, 9, 10), content: "证据条目请补充后再发布，其余项目预审通过。" },
    ],
  },
  {
    id: "AP-2026-0141",
    type: "PLAN",
    title: "患者计划审核",
    pathwayName: "肝癌手术临床路径",
    version: "计划 P2",
    submittedBy: "李文博",
    submittedAt: at(0, 9, 26),
    status: "PENDING",
    risk: "MEDIUM",
    deadline: at(0, 17, 0),
    patientName: "陈志远",
    checklist: [
      { key: "safety", label: "安全约束校验", status: "PASS", note: "凝血功能满足手术条件" },
      { key: "data", label: "数据完整性", status: "WARN", note: "营养风险筛查（NRS 2002）缺失，已列为待决策项" },
      { key: "rules", label: "规则一致性", status: "PASS", note: "准入 TRUE / 排除 FALSE，引用规则版本 RULE-001@1.2.0" },
      { key: "plan", label: "时间窗口与依赖", status: "PASS", note: "手术窗口 96h ± 24h，依赖 6 项前置任务" },
    ],
    comments: [
      { author: "李文博", role: "临床医生", at: at(0, 9, 26), content: "ICG R15 12.4%，建议按 V1.3.0 计划执行，营养评估待补。" },
    ],
  },
  {
    id: "AP-2026-0140",
    type: "VARIATION_REPLAN",
    title: "变异重规划审核",
    pathwayName: "肝癌转化治疗后手术路径",
    version: "计划 P3",
    submittedBy: "张启明",
    submittedAt: at(0, 7, 8),
    status: "PENDING",
    risk: "HIGH",
    deadline: at(0, 15, 30),
    patientName: "王丽华",
    checklist: [
      { key: "variation", label: "转化疗效证据", status: "PASS", note: "mRECIST 评估为部分缓解（PR），肿瘤负荷下降 42%" },
      { key: "impact", label: "影响范围评估", status: "WARN", note: "需重新评估手术切除范围，影响 3 项后续任务" },
      { key: "safety", label: "安全约束校验", status: "WARN", note: "肝功能临界，需麻醉科与肝病科二次评估" },
      { key: "version", label: "版本保留", status: "PASS", note: "原计划 P2 保留，不覆盖历史记录" },
    ],
    comments: [
      { author: "张启明", role: "临床专家", at: at(0, 7, 8), content: "转化治疗后肿瘤明显退缩，建议重新评估手术切除机会，请医务处审核。" },
    ],
  },
  {
    id: "AP-2026-0139",
    type: "PATHWAY_VERSION",
    title: "路径版本审核",
    pathwayName: "肝癌转化治疗后手术路径",
    version: "V1.4.0",
    submittedBy: "张启明",
    submittedAt: at(-1, 14, 18),
    status: "PENDING",
    risk: "LOW",
    deadline: at(2, 18, 0),
    checklist: [
      { key: "structure", label: "图结构校验", status: "PASS", note: "图结构合法，无孤立节点" },
      { key: "rules", label: "临床规则校验", status: "PASS", note: "准入规则引用已发布版本" },
      { key: "evidence", label: "证据完备性", status: "PASS", note: "转化疗效评估节点已绑定共识证据" },
      { key: "timing", label: "时间约束校验", status: "WARN", note: "再评估手术窗口需结合 MDT 排期" },
    ],
    comments: [
      { author: "张启明", role: "临床专家", at: at(-1, 14, 18), content: "新增转化治疗疗效评估节点，调整再评估手术窗口。" },
    ],
  },
  {
    id: "AP-2026-0138",
    type: "PATHWAY_VERSION",
    title: "路径版本审核",
    pathwayName: "肝癌消融治疗路径",
    version: "V2.1.0",
    submittedBy: "王海峰",
    submittedAt: at(-2, 9, 30),
    status: "APPROVED",
    risk: "LOW",
    checklist: [
      { key: "structure", label: "图结构校验", status: "PASS" },
      { key: "rules", label: "临床规则校验", status: "PASS" },
      { key: "evidence", label: "证据完备性", status: "PASS" },
      { key: "safety", label: "安全约束校验", status: "PASS" },
    ],
    comments: [
      { author: "王海峰", role: "介入科专家", at: at(-2, 9, 30), content: "新增影像融合导航节点，请审核。" },
      { author: "周敏", role: "医务处", at: at(-2, 15, 40), content: "审核通过，待发布。" },
    ],
  },
];

export function getPendingApprovals() {
  return APPROVALS.filter((a) => a.status === "PENDING");
}
