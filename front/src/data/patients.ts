import type {
  ClinicalEvent,
  Encounter,
  Observation,
  Patient,
  PatientStateSnapshot,
} from "@/types";
import { at, birthDateFromAge, daysAgo, minutesAgo } from "./time";

/* --------------------------- 确定性随机工具 --------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261126);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

const SURNAMES = ["张", "王", "李", "赵", "陈", "刘", "杨", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗", "郑", "梁", "谢", "宋", "唐", "许", "韩", "冯", "邓", "曹"];
const GIVEN = ["志", "强", "伟", "敏", "静", "丽", "海", "峰", "秀", "英", "国", "华", "建", "明", "文", "博", "晓", "东", "雅", "婷", "嘉", "俊", "子", "涵", "雨", "欣", "晨", "浩", "宇", "思", "远", "春", "秋", "玉", "兰", "军", "鹏", "飞", "燕", "红"];

function makeName(i: number) {
  const s = SURNAMES[i % SURNAMES.length];
  const g1 = GIVEN[(i * 7 + 3) % GIVEN.length];
  const g2 = i % 3 === 0 ? GIVEN[(i * 11 + 5) % GIVEN.length] : "";
  return `${s}${g1}${g2}`;
}

/* --------------------------- 原发肝癌单病种 --------------------------- */

const DISEASE_PROFILES = [
  {
    pathwayId: "PW-HCC-001",
    pathwayName: "肝癌手术临床路径",
    version: "1.3.0",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    diagnosis: "肝细胞癌",
    code: "C22.0",
    stages: ["Ⅰa 期", "Ⅰb 期", "Ⅱa 期", "Ⅱb 期", "Ⅲa 期"],
    doctors: ["张启明", "李文博"],
    nurse: "赵倩",
    flags: ["Child-Pugh A 级", "HBV 感染", "ICG R15 12.4%"],
    illness: "患者因体检发现肝占位就诊，增强 MRI 提示肝右叶异常强化灶，结合肝炎病史及肿瘤标志物升高，临床诊断肝细胞癌。",
  },
  {
    pathwayId: "PW-HCC-002",
    pathwayName: "肝癌消融治疗路径",
    version: "2.0.1",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    diagnosis: "肝细胞癌",
    code: "C22.0",
    stages: ["Ⅰa 期", "Ⅰb 期", "Ⅱa 期"],
    doctors: ["王海峰", "陈立"],
    nurse: "孙悦",
    flags: ["单发结节 ≤ 3cm", "Child-Pugh A 级", "HBV 感染"],
    illness: "体检发现肝内小结节，增强 MRI 提示早期肝细胞癌，肝功能良好，经 MDT 评估拟行超声引导下消融治疗。",
  },
  {
    pathwayId: "PW-HCC-003",
    pathwayName: "肝癌介入治疗（TACE）路径",
    version: "1.2.0",
    departmentId: "dept-hpb",
    departmentName: "肝胆外科",
    diagnosis: "肝细胞癌",
    code: "C22.0",
    stages: ["Ⅱa 期", "Ⅱb 期", "Ⅲa 期"],
    doctors: ["陈立", "王海峰"],
    nurse: "赵倩",
    flags: ["中期肝癌", "Child-Pugh A 级", "HBV 感染"],
    illness: "患者因肝区不适就诊，增强 MRI 提示肝内多发强化灶，门静脉分支受侵，经 MDT 评估拟行 TACE 治疗。",
  },
];

const SCENARIO_PLAN: { scenario: Patient["scenario"]; count: number }[] = [
  { scenario: "NORMAL", count: 152 },
  { scenario: "CLINICAL_VARIATION", count: 58 },
  { scenario: "OVERDUE", count: 30 },
  { scenario: "NOT_ELIGIBLE", count: 30 },
  { scenario: "MISSING_DATA", count: 20 },
  { scenario: "EXITED", count: 10 },
];

const scenarioStream: Patient["scenario"][] = SCENARIO_PLAN.flatMap((s) =>
  Array.from({ length: s.count }, () => s.scenario),
);

/* ------------------------------ 演示患者 ------------------------------ */

export const DEMO_PATIENT_ID = "HCC-DEMO-001";

const demoHcc: Patient = {
  id: DEMO_PATIENT_ID,
  mrn: "MRN-DEMO-001",
  name: "陈志远",
  gender: "M",
  age: 58,
  birthDate: "1968-03-12",
  departmentId: "dept-hpb",
  departmentName: "肝胆外科",
  ward: "肝胆外科 3 病区",
  bed: "03-12",
  diagnosis: "肝细胞癌",
  diagnosisCode: "C22.0",
  stage: "Ⅰb 期",
  riskLevel: "MEDIUM",
  allergy: ["青霉素"],
  status: "IN_PATHWAY",
  scenario: "NORMAL",
  pathwayId: "PW-HCC-001",
  pathwayName: "肝癌手术临床路径",
  pathwayVersion: "1.3.0",
  instanceId: "INST-HCC-001",
  enrolledAt: at(-3, 15, 40),
  admissionAt: at(-3, 14, 20),
  los: 3,
  attending: "张启明",
  nurse: "赵倩",
  progress: 46,
  presentIllness:
    "患者因体检发现肝占位 10 天入院。增强 MRI 提示肝右叶 S6 段异常强化灶（3.2cm），HBV 感染史 20 年，AFP 86.4 ng/mL。Child-Pugh A 级，ICG R15 12.4%，拟行肝段切除术。",
  flags: ["Child-Pugh A 级", "ICG R15 12.4%", "HBV-DNA 2.1E3", "青霉素过敏"],
};

const demoConversion: Patient = {
  id: "HCC-DEMO-002",
  mrn: "MRN-DEMO-002",
  name: "王丽华",
  gender: "F",
  age: 56,
  birthDate: "1970-07-08",
  departmentId: "dept-hpb",
  departmentName: "肝胆外科",
  ward: "肝胆外科 2 病区",
  bed: "02-08",
  diagnosis: "肝细胞癌",
  diagnosisCode: "C22.0",
  stage: "Ⅲa 期",
  riskLevel: "HIGH",
  allergy: ["磺胺类"],
  status: "IN_PATHWAY",
  scenario: "CLINICAL_VARIATION",
  pathwayId: "PW-HCC-004",
  pathwayName: "肝癌转化治疗后手术路径",
  pathwayVersion: "1.3.0",
  instanceId: "INST-HCC-002",
  enrolledAt: at(-2, 10, 12),
  admissionAt: at(-2, 9, 0),
  los: 2,
  attending: "张启明",
  nurse: "赵倩",
  progress: 41,
  presentIllness:
    "初始不可切除肝细胞癌（Ⅲa 期，门静脉左支癌栓），接受靶向联合免疫治疗 3 周期后 mRECIST 评估为部分缓解，肿瘤负荷下降 42%，拟重新评估手术切除机会。",
  flags: ["转化治疗后 PR", "Child-Pugh B 级", "门静脉癌栓", "磺胺类过敏"],
};

const demoTace: Patient = {
  id: "HCC-DEMO-003",
  mrn: "MRN-DEMO-003",
  name: "李国强",
  gender: "M",
  age: 63,
  birthDate: "1963-11-21",
  departmentId: "dept-hpb",
  departmentName: "肝胆外科",
  ward: "肝胆外科 1 病区",
  bed: "01-05",
  diagnosis: "肝细胞癌",
  diagnosisCode: "C22.0",
  stage: "Ⅱb 期",
  riskLevel: "MEDIUM",
  allergy: [],
  status: "PENDING_ADMISSION",
  scenario: "NORMAL",
  pathwayId: "PW-HCC-003",
  pathwayName: "肝癌介入治疗（TACE）路径",
  pathwayVersion: "1.2.0",
  instanceId: "INST-HCC-003",
  enrolledAt: at(-1, 11, 20),
  admissionAt: at(-1, 8, 30),
  los: 1,
  attending: "陈立",
  nurse: "孙悦",
  progress: 8,
  presentIllness:
    "乙肝肝硬化病史 15 年，增强 MRI 提示肝内多发强化灶，最大 4.6cm，门静脉分支受侵，Child-Pugh A 级，经 MDT 讨论拟行 TACE 治疗，待入径确认。",
  flags: ["HBV 感染", "Child-Pugh A 级", "门静脉分支受侵"],
};

/* --------------------------- 生成 300 份合成病例 --------------------------- */

function buildPatients(): Patient[] {
  const list: Patient[] = [demoHcc, demoConversion, demoTace];
  const startIndex = list.length;
  for (let idx = startIndex; idx < 300; idx++) {
    const profile = DISEASE_PROFILES[idx % 3];
    const scenario = scenarioStream[idx] ?? "NORMAL";
    const age = int(34, 79);
    const los =
      scenario === "NOT_ELIGIBLE"
        ? 1
        : scenario === "EXITED"
          ? int(3, 12)
          : idx % 11 === 0
            ? int(8, 16)
            : int(2, 9);
    const inPathway = !["NOT_ELIGIBLE", "EXITED"].includes(scenario) && idx % 13 !== 0;
    const completed = scenario === "NORMAL" && idx % 17 === 0;
    const status: Patient["status"] = completed
      ? "COMPLETED"
      : scenario === "NOT_ELIGIBLE"
        ? "NOT_ELIGIBLE"
        : scenario === "EXITED"
          ? "EXITED"
          : inPathway
            ? "IN_PATHWAY"
            : "PENDING_ADMISSION";
    const progress = completed
      ? 100
      : scenario === "NOT_ELIGIBLE"
        ? 0
        : scenario === "MISSING_DATA"
          ? int(12, 38)
          : scenario === "EXITED"
            ? int(35, 72)
            : scenario === "OVERDUE"
              ? int(28, 63)
              : scenario === "CLINICAL_VARIATION"
                ? int(18, 55)
                : int(24, 96);
    const flags = [...profile.flags];
    if (scenario === "CLINICAL_VARIATION") flags.push("病情变化：需重新评估");
    if (scenario === "OVERDUE") flags.push(`任务超时 ${int(1, 3)} 项`);
    if (scenario === "MISSING_DATA") flags.push("关键数据缺失");
    if (scenario === "NOT_ELIGIBLE") flags.push("存在排除条件");
    if (scenario === "EXITED") flags.push("患者要求退出路径");
    if (idx % 9 === 0) flags.push("高血压 2 级");
    const attending = profile.doctors[idx % profile.doctors.length];
    const admissionOffset = completed ? -(los + 1) : -los;
    list.push({
      id: `PT-${String(idx + 1).padStart(4, "0")}`,
      mrn: `MRN-2026-${String(1000 + idx).slice(1)}`,
      name: makeName(idx),
      gender: idx % 5 < 3 ? "M" : "F",
      age,
      birthDate: birthDateFromAge(age),
      departmentId: profile.departmentId,
      departmentName: profile.departmentName,
      ward: `肝胆外科 ${1 + (idx % 3)} 病区`,
      bed: `${String(1 + (idx % 3)).padStart(2, "0")}-${String(1 + (idx % 28)).padStart(2, "0")}`,
      diagnosis: profile.diagnosis,
      diagnosisCode: profile.code,
      stage: profile.stages[idx % profile.stages.length],
      riskLevel: scenario === "CLINICAL_VARIATION" || scenario === "OVERDUE" ? "HIGH" : idx % 4 === 0 ? "MEDIUM" : "LOW",
      allergy: idx % 7 === 0 ? ["头孢类"] : [],
      status,
      scenario,
      pathwayId: status === "NOT_ELIGIBLE" ? undefined : profile.pathwayId,
      pathwayName: status === "NOT_ELIGIBLE" ? undefined : profile.pathwayName,
      pathwayVersion: status === "NOT_ELIGIBLE" ? undefined : profile.version,
      instanceId: status === "NOT_ELIGIBLE" ? undefined : `INST-${idx + 1}`,
      enrolledAt: status === "NOT_ELIGIBLE" ? undefined : at(admissionOffset, 10, 20),
      admissionAt: at(admissionOffset, 8, 30),
      los,
      attending,
      nurse: profile.nurse,
      progress,
      presentIllness: profile.illness,
      flags,
    });
  }
  return list;
}

export const PATIENTS: Patient[] = buildPatients();

export function getPatient(id: string) {
  return PATIENTS.find((p) => p.id === id);
}

export const PATIENT_SUMMARY = {
  total: PATIENTS.length,
  inPathway: PATIENTS.filter((p) => p.status === "IN_PATHWAY").length,
  pendingAdmission: PATIENTS.filter((p) => p.status === "PENDING_ADMISSION").length,
  notEligible: PATIENTS.filter((p) => p.status === "NOT_ELIGIBLE").length,
  completed: PATIENTS.filter((p) => p.status === "COMPLETED").length,
  exited: PATIENTS.filter((p) => p.status === "EXITED").length,
  highRisk: PATIENTS.filter((p) => p.riskLevel === "HIGH").length,
};

/* ------------------------------ 就诊记录 ------------------------------ */

export const ENCOUNTERS: Encounter[] = [
  {
    id: "ENC-HCC-001",
    patientId: demoHcc.id,
    type: "INPATIENT",
    admittedAt: demoHcc.admissionAt,
    department: "肝胆外科",
    attending: "张启明",
    diagnosis: "肝细胞癌（C22.0，Ⅰb 期）",
    bed: "03-12",
  },
  {
    id: "ENC-HCC-000",
    patientId: demoHcc.id,
    type: "OUTPATIENT",
    admittedAt: daysAgo(18),
    department: "肝胆外科门诊",
    attending: "张启明",
    diagnosis: "肝占位性病变（待查）",
    bed: "—",
  },
  {
    id: "ENC-HCC-002",
    patientId: demoConversion.id,
    type: "INPATIENT",
    admittedAt: demoConversion.admissionAt,
    department: "肝胆外科",
    attending: "张启明",
    diagnosis: "肝细胞癌（C22.0，Ⅲa 期，转化治疗后）",
    bed: "02-08",
  },
  {
    id: "ENC-HCC-003",
    patientId: demoTace.id,
    type: "INPATIENT",
    admittedAt: demoTace.admissionAt,
    department: "肝胆外科",
    attending: "陈立",
    diagnosis: "肝细胞癌（C22.0，Ⅱb 期）",
    bed: "01-05",
  },
];

export function getEncounters(patientId: string) {
  return ENCOUNTERS.filter((e) => e.patientId === patientId);
}

/* ------------------------------ 临床观测 ------------------------------ */

export const OBSERVATIONS: Observation[] = [
  { id: "OBS-001", patientId: demoHcc.id, category: "VITAL", code: "VS-TEMP", name: "体温", value: "36.8", unit: "°C", refRange: "36.0–37.2", flag: "NORMAL", observedAt: at(0, 7, 20), source: "护理系统" },
  { id: "OBS-002", patientId: demoHcc.id, category: "VITAL", code: "VS-PULSE", name: "脉搏", value: "78", unit: "次/分", refRange: "60–100", flag: "NORMAL", observedAt: at(0, 7, 20), source: "护理系统" },
  { id: "OBS-003", patientId: demoHcc.id, category: "VITAL", code: "VS-RR", name: "呼吸", value: "18", unit: "次/分", refRange: "12–20", flag: "NORMAL", observedAt: at(0, 7, 20), source: "护理系统" },
  { id: "OBS-004", patientId: demoHcc.id, category: "VITAL", code: "VS-BP", name: "血压", value: "128/82", unit: "mmHg", refRange: "90/60–140/90", flag: "NORMAL", observedAt: at(0, 7, 20), source: "护理系统" },
  { id: "OBS-005", patientId: demoHcc.id, category: "VITAL", code: "VS-SPO2", name: "血氧饱和度", value: "98", unit: "%", refRange: "≥ 95", flag: "NORMAL", observedAt: at(0, 7, 20), source: "护理系统" },
  { id: "OBS-006", patientId: demoHcc.id, category: "LAB", code: "LAB-ALT", name: "丙氨酸氨基转移酶", value: "42", unit: "U/L", refRange: "9–50", flag: "NORMAL", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-007", patientId: demoHcc.id, category: "LAB", code: "LAB-AST", name: "天门冬氨酸氨基转移酶", value: "38", unit: "U/L", refRange: "15–40", flag: "NORMAL", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-008", patientId: demoHcc.id, category: "LAB", code: "LAB-TBIL", name: "总胆红素", value: "21.3", unit: "μmol/L", refRange: "3.4–20.5", flag: "HIGH", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-009", patientId: demoHcc.id, category: "LAB", code: "LAB-ALB", name: "白蛋白", value: "39.2", unit: "g/L", refRange: "40–55", flag: "LOW", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-010", patientId: demoHcc.id, category: "LAB", code: "LAB-INR", name: "国际标准化比值", value: "1.12", unit: "", refRange: "0.8–1.2", flag: "NORMAL", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-011", patientId: demoHcc.id, category: "LAB", code: "LAB-PLT", name: "血小板计数", value: "168", unit: "×10⁹/L", refRange: "125–350", flag: "NORMAL", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-012", patientId: demoHcc.id, category: "LAB", code: "LAB-AFP", name: "甲胎蛋白 AFP", value: "86.4", unit: "ng/mL", refRange: "< 20", flag: "HIGH", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-013", patientId: demoHcc.id, category: "LAB", code: "LAB-HBVDNA", name: "HBV-DNA", value: "2.1×10³", unit: "IU/mL", refRange: "< 20", flag: "HIGH", observedAt: at(-3, 17, 30), source: "LIS" },
  { id: "OBS-014", patientId: demoHcc.id, category: "LAB", code: "LAB-ICG", name: "ICG R15", value: "12.4", unit: "%", refRange: "≤ 15", flag: "NORMAL", observedAt: at(-1, 9, 40), source: "肝胆功能室" },
  { id: "OBS-015", patientId: demoHcc.id, category: "IMAGING", code: "IMG-MRI", name: "上腹部增强 MRI", value: "肝右叶 S6 段 3.2cm 异常强化灶，考虑 HCC", unit: "", refRange: "", flag: "HIGH", observedAt: at(-2, 10, 15), source: "PACS" },
  { id: "OBS-016", patientId: demoHcc.id, category: "IMAGING", code: "IMG-CT", name: "胸部 CT 平扫", value: "双肺未见明确转移结节", unit: "", refRange: "", flag: "NORMAL", observedAt: at(-2, 10, 40), source: "PACS" },
  { id: "OBS-017", patientId: demoHcc.id, category: "PATHOLOGY", code: "PAT-BIOPSY", name: "术前穿刺病理", value: "待补充（当前按影像临床诊断）", unit: "", refRange: "", flag: "UNKNOWN", observedAt: at(-1, 8, 0), source: "病理系统" },
  { id: "OBS-018", patientId: demoHcc.id, category: "FUNCTION", code: "FUNC-PFT", name: "肺功能 FEV1", value: "2.6 L（预计值 84%）", unit: "", refRange: "> 60%", flag: "NORMAL", observedAt: at(-1, 11, 20), source: "功能检查室" },
  { id: "OBS-019", patientId: demoHcc.id, category: "VITAL", code: "VS-TEMP", name: "体温", value: "37.6", unit: "°C", refRange: "36.0–37.2", flag: "HIGH", observedAt: minutesAgo(38), source: "护理系统" },
  { id: "OBS-020", patientId: demoHcc.id, category: "LAB", code: "LAB-CRP", name: "C 反应蛋白", value: "18.2", unit: "mg/L", refRange: "< 10", flag: "HIGH", observedAt: minutesAgo(60), source: "LIS" },
];

export function getObservations(patientId: string) {
  const own = OBSERVATIONS.filter((o) => o.patientId === patientId);
  if (own.length) return own;
  const base = OBSERVATIONS.filter((o) => o.patientId === demoHcc.id).slice(0, 12);
  return base.map((o) => ({ ...o, patientId }));
}

/* ------------------------------ 临床事件 ------------------------------ */

export const CLINICAL_EVENTS: ClinicalEvent[] = [
  { id: "CE-001", patientId: demoHcc.id, eventType: "PatientCreated", title: "患者建档", description: "肝胆外科门诊建立患者档案，来源 HIS。", occurredAt: daysAgo(18), sourceSystem: "HIS", actor: "张启明", severity: "INFO" },
  { id: "CE-002", patientId: demoHcc.id, eventType: "PathwayEnrolled", title: "确认入径", description: "准入规则 RULE-001 判定 TRUE，医生确认进入肝癌手术临床路径 V1.3.0。", occurredAt: at(-3, 15, 40), sourceSystem: "HCC-CIP", actor: "张启明", severity: "INFO" },
  { id: "CE-003", patientId: demoHcc.id, eventType: "PlanApproved", title: "计划审核通过", description: "个体化计划 P1 经张启明审核通过，共生成 19 项任务。", occurredAt: at(-3, 16, 2), sourceSystem: "HCC-CIP", actor: "张启明", severity: "INFO" },
  { id: "CE-004", patientId: demoHcc.id, eventType: "PlanActivated", title: "计划生效", description: "路径实例 INST-HCC-001 激活，开始执行术前评估阶段。", occurredAt: at(-3, 16, 10), sourceSystem: "HCC-CIP", actor: "系统", severity: "INFO" },
  { id: "CE-005", patientId: demoHcc.id, eventType: "TaskCompleted", title: "入院评估完成", description: "医生完成病史采集与入院评估，签名归档。", occurredAt: at(-3, 17, 5), sourceSystem: "HCC-CIP", actor: "张启明", severity: "INFO" },
  { id: "CE-006", patientId: demoHcc.id, eventType: "ObservationReceived", title: "实验室检验结果到达", description: "接收 LIS 检验结果 26 项，AFP 86.4 ng/mL 高于参考范围。", occurredAt: at(-3, 17, 31), sourceSystem: "LIS", actor: "系统", severity: "WARN" },
  { id: "CE-007", patientId: demoHcc.id, eventType: "TaskCompleted", title: "入院实验室检验完成", description: "血常规、生化、凝血功能与肿瘤标志物结果齐备。", occurredAt: at(-3, 18, 0), sourceSystem: "HCC-CIP", actor: "李文博", severity: "INFO" },
  { id: "CE-008", patientId: demoHcc.id, eventType: "ObservationReceived", title: "影像报告归档", description: "上腹部增强 MRI 提示 S6 段 3.2cm 强化灶，考虑 HCC。", occurredAt: at(-2, 10, 20), sourceSystem: "PACS", actor: "系统", severity: "WARN" },
  { id: "CE-009", patientId: demoHcc.id, eventType: "TaskCompleted", title: "MRI 检查完成", description: "影像检查任务完成，报告已关联至路径节点。", occurredAt: at(-2, 10, 45), sourceSystem: "HCC-CIP", actor: "李文博", severity: "INFO" },
  { id: "CE-010", patientId: demoHcc.id, eventType: "PatientStateUpdated", title: "患者状态更新", description: "ICG R15 12.4% 写入状态快照，手术风险低危，数据完整度 86%。", occurredAt: at(-1, 10, 2), sourceSystem: "HCC-CIP", actor: "系统", severity: "INFO" },
  { id: "CE-011", patientId: demoHcc.id, eventType: "TaskCompleted", title: "ICG 清除试验完成", description: "ICG R15 12.4%，符合手术分支阈值（≤ 15%）。", occurredAt: at(-1, 10, 5), sourceSystem: "HCC-CIP", actor: "李文博", severity: "INFO" },
  { id: "CE-012", patientId: demoHcc.id, eventType: "VariationDetected", title: "检测到数据变异", description: "营养风险筛查（NRS 2002）缺失，已生成待补充资料提示，不阻断当前任务。", occurredAt: at(-1, 10, 12), sourceSystem: "HCC-CIP", actor: "系统", severity: "WARN" },
  { id: "CE-013", patientId: demoHcc.id, eventType: "ReplanRequested", title: "请求生成调整草案", description: "针对营养评估缺失与手术排期变化，生成计划 P2 供医生审核。", occurredAt: at(0, 8, 50), sourceSystem: "HCC-CIP", actor: "李文博", severity: "WARN" },
  { id: "CE-014", patientId: demoHcc.id, eventType: "ObservationReceived", title: "体温异常", description: "护理系统上报体温 37.6°C，已触发术后感染风险观察规则（当前未达变异阈值）。", occurredAt: minutesAgo(38), sourceSystem: "护理系统", actor: "系统", severity: "WARN" },
];

export function getClinicalEvents(patientId: string) {
  const own = CLINICAL_EVENTS.filter((e) => e.patientId === patientId);
  return own.sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

/* ------------------------------ 状态快照 ------------------------------ */

export const PATIENT_STATE: PatientStateSnapshot = {
  patientId: demoHcc.id,
  snapshotAt: minutesAgo(35),
  fields: [
    { field: "diagnosis.code", label: "主要诊断", value: "肝细胞癌 (C22.0)", status: "KNOWN" },
    { field: "diagnosis.stage", label: "临床分期", value: "Ⅰb 期", status: "KNOWN" },
    { field: "lab.child_pugh", label: "Child-Pugh 分级", value: "A 级（6 分）", status: "KNOWN" },
    { field: "lab.icg_r15", label: "ICG R15", value: "12.4%", unit: "%", status: "KNOWN" },
    { field: "lab.inr", label: "凝血 INR", value: "1.12", status: "KNOWN" },
    { field: "lab.plt", label: "血小板", value: "168 ×10⁹/L", status: "KNOWN" },
    { field: "lab.albumin", label: "白蛋白", value: "39.2 g/L", status: "KNOWN" },
    { field: "imaging.resectability", label: "可切除性评估", value: "可切除（S6 段）", status: "KNOWN" },
    { field: "vitals.temperature", label: "体温", value: "37.6 °C", status: "KNOWN" },
    { field: "assessment.nutrition", label: "营养风险筛查 NRS 2002", value: null, status: "UNKNOWN" },
    { field: "assessment.frailty", label: "衰弱评分", value: null, status: "UNKNOWN" },
    { field: "imaging.pvtt", label: "门静脉癌栓", value: "待影像复核", status: "STALE" },
    { field: "function.pft", label: "肺功能 FEV1", value: "2.6 L（84%）", status: "KNOWN" },
    { field: "consent.signed", label: "手术知情同意", value: "未签署", status: "KNOWN" },
  ],
  missingFields: ["assessment.nutrition", "assessment.frailty"],
  unknownConditions: ["门静脉癌栓（影像待复核）", "营养风险分级"],
  goals: ["完整切除肿瘤并保留足够肝体积", "术后 7 天内达到出院标准"],
  preferences: ["患者希望尽量缩短住院时间", "家属可提供术后照护", "拒绝术中输血（已沟通）"],
  dataCompleteness: 86,
};

/* ------------------------------ 辅助查询 ------------------------------ */

export const PATIENTS_BY_DEPT = PATIENTS.reduce<Record<string, number>>((acc, p) => {
  acc[p.departmentName] = (acc[p.departmentName] ?? 0) + 1;
  return acc;
}, {});

export function searchPatients(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return PATIENTS;
  return PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.diagnosis.includes(q) ||
      p.bed.includes(q),
  );
}
