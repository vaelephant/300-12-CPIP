import {
  Activity,
  ArrowLeftRight,
  ClipboardCheck,
  Clock,
  FlaskConical,
  GitBranch,
  HeartPulse,
  Merge,
  PhoneCall,
  Pill,
  Play,
  ScanLine,
  Scissors,
  Split,
  Square,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  ClinicalRole,
  NodeType,
  PatientScenario,
  PatientStatus,
  PlanStatus,
  RoleKey,
  TaskStatus,
  VariationType,
  PathwayStatus,
  VersionStatus,
  InstanceStatus,
} from "@/types";

export type Tone = "ok" | "warn" | "risk" | "info" | "neutral" | "ink";

export interface NodeMeta {
  label: string;
  short: string;
  icon: LucideIcon;
  group: "ENTRY" | "ASSESS" | "DIAGNOSTIC" | "TREATMENT" | "NURSING" | "COORDINATION" | "DECISION" | "END";
  /** tailwind classes for icon chip */
  chip: string;
  bar: string;
  defaultRole: ClinicalRole;
  description: string;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  START: {
    label: "开始",
    short: "开始",
    icon: Play,
    group: "ENTRY",
    chip: "bg-ink text-white/85",
    bar: "bg-ink",
    defaultRole: "COORDINATOR",
    description: "路径入口，必须有且仅有一个",
  },
  ASSESSMENT: {
    label: "临床评估",
    short: "评估",
    icon: ClipboardCheck,
    group: "ASSESS",
    chip: "bg-info-wash text-info",
    bar: "bg-info",
    defaultRole: "DOCTOR",
    description: "病史、体征与入径评估",
  },
  EXAMINATION: {
    label: "检查",
    short: "检查",
    icon: ScanLine,
    group: "DIAGNOSTIC",
    chip: "bg-info-wash text-info",
    bar: "bg-info",
    defaultRole: "DOCTOR",
    description: "影像、超声及功能检查",
  },
  LAB_TEST: {
    label: "检验",
    short: "检验",
    icon: FlaskConical,
    group: "DIAGNOSTIC",
    chip: "bg-info-wash text-info",
    bar: "bg-info",
    defaultRole: "DOCTOR",
    description: "实验室检验项目",
  },
  DIAGNOSIS: {
    label: "诊断",
    short: "诊断",
    icon: Stethoscope,
    group: "ASSESS",
    chip: "bg-info-wash text-info",
    bar: "bg-info",
    defaultRole: "DOCTOR",
    description: "诊断确认与分期",
  },
  TREATMENT: {
    label: "治疗",
    short: "治疗",
    icon: HeartPulse,
    group: "TREATMENT",
    chip: "bg-accent text-accent-foreground",
    bar: "bg-primary",
    defaultRole: "DOCTOR",
    description: "治疗活动与处置",
  },
  SURGERY: {
    label: "手术",
    short: "手术",
    icon: Scissors,
    group: "TREATMENT",
    chip: "bg-accent text-accent-foreground",
    bar: "bg-primary",
    defaultRole: "SURGEON",
    description: "手术及围术期操作",
  },
  MEDICATION: {
    label: "用药",
    short: "用药",
    icon: Pill,
    group: "TREATMENT",
    chip: "bg-accent text-accent-foreground",
    bar: "bg-primary",
    defaultRole: "DOCTOR",
    description: "药物医嘱与给药",
  },
  NURSING: {
    label: "护理",
    short: "护理",
    icon: Activity,
    group: "NURSING",
    chip: "bg-warn-wash text-warn",
    bar: "bg-warn",
    defaultRole: "NURSE",
    description: "护理评估与执行任务",
  },
  CONSULTATION: {
    label: "会诊 / MDT",
    short: "会诊",
    icon: Users,
    group: "COORDINATION",
    chip: "bg-secondary text-secondary-foreground",
    bar: "bg-line-strong",
    defaultRole: "DOCTOR",
    description: "多学科会诊与协作",
  },
  DECISION: {
    label: "决策分支",
    short: "决策",
    icon: GitBranch,
    group: "DECISION",
    chip: "bg-warn-wash text-warn",
    bar: "bg-warn",
    defaultRole: "DOCTOR",
    description: "条件分支，须配置分支规则",
  },
  PARALLEL_SPLIT: {
    label: "并行分支",
    short: "并行",
    icon: Split,
    group: "COORDINATION",
    chip: "bg-secondary text-secondary-foreground",
    bar: "bg-line-strong",
    defaultRole: "COORDINATOR",
    description: "并行任务开始",
  },
  PARALLEL_JOIN: {
    label: "并行汇聚",
    short: "汇聚",
    icon: Merge,
    group: "COORDINATION",
    chip: "bg-secondary text-secondary-foreground",
    bar: "bg-line-strong",
    defaultRole: "COORDINATOR",
    description: "并行任务完成判断",
  },
  WAIT: {
    label: "等待",
    short: "等待",
    icon: Clock,
    group: "COORDINATION",
    chip: "bg-secondary text-secondary-foreground",
    bar: "bg-line-strong",
    defaultRole: "COORDINATOR",
    description: "等待事件或时间条件",
  },
  FOLLOW_UP: {
    label: "随访",
    short: "随访",
    icon: PhoneCall,
    group: "COORDINATION",
    chip: "bg-secondary text-secondary-foreground",
    bar: "bg-line-strong",
    defaultRole: "NURSE",
    description: "出院后随访计划",
  },
  END: {
    label: "结束",
    short: "结束",
    icon: Square,
    group: "END",
    chip: "bg-ink text-white/85",
    bar: "bg-ink",
    defaultRole: "COORDINATOR",
    description: "路径终点，至少一个",
  },
};

export const NODE_GROUPS: { key: NodeMeta["group"]; label: string }[] = [
  { key: "ENTRY", label: "入口 / 出口" },
  { key: "ASSESS", label: "评估与诊断" },
  { key: "DIAGNOSTIC", label: "检查与检验" },
  { key: "TREATMENT", label: "治疗" },
  { key: "NURSING", label: "护理" },
  { key: "DECISION", label: "分支" },
  { key: "COORDINATION", label: "协作与流程" },
];

export const ROLE_LABELS: Record<ClinicalRole, string> = {
  DOCTOR: "医生",
  NURSE: "护士",
  SURGEON: "外科医生",
  ANESTHESIOLOGIST: "麻醉医生",
  PHARMACIST: "药师",
  COORDINATOR: "路径协调员",
};

export const ROLE_SYSTEM_LABELS: Record<RoleKey, string> = {
  ADMIN: "系统管理员",
  MEDICAL_AFFAIRS: "医务处管理员",
  EXPERT: "临床专家",
  DOCTOR: "临床医生",
  NURSE: "护理人员",
  QC: "质控人员",
  RESEARCHER: "科研人员",
  EXECUTIVE: "院级管理人员",
};

interface StatusMeta {
  label: string;
  tone: Tone;
}

export const PATHWAY_STATUS_META: Record<PathwayStatus, StatusMeta> = {
  DRAFT: { label: "草稿", tone: "neutral" },
  IN_REVIEW: { label: "审核中", tone: "warn" },
  PUBLISHED: { label: "已发布", tone: "ok" },
  RETIRED: { label: "已停用", tone: "neutral" },
};

export const VERSION_STATUS_META: Record<VersionStatus, StatusMeta> = {
  DRAFT: { label: "草稿", tone: "neutral" },
  IN_REVIEW: { label: "审核中", tone: "warn" },
  APPROVED: { label: "已批准", tone: "info" },
  PUBLISHED: { label: "已发布", tone: "ok" },
  REJECTED: { label: "已退回", tone: "risk" },
  RETIRED: { label: "已停用", tone: "neutral" },
};

export const PATIENT_STATUS_META: Record<PatientStatus, StatusMeta> = {
  IN_PATHWAY: { label: "路径执行中", tone: "ok" },
  PENDING_ADMISSION: { label: "待入径确认", tone: "warn" },
  NOT_ELIGIBLE: { label: "不推荐入径", tone: "risk" },
  COMPLETED: { label: "路径完成", tone: "info" },
  EXITED: { label: "已退出路径", tone: "neutral" },
};

export const PATIENT_SCENARIO_META: Record<PatientScenario, StatusMeta> = {
  NORMAL: { label: "正常路径", tone: "ok" },
  CLINICAL_VARIATION: { label: "病情变异", tone: "warn" },
  OVERDUE: { label: "任务超时", tone: "risk" },
  NOT_ELIGIBLE: { label: "不符合入径", tone: "risk" },
  MISSING_DATA: { label: "数据缺失", tone: "warn" },
  EXITED: { label: "患者退出", tone: "neutral" },
};

export const INSTANCE_STATUS_META: Record<InstanceStatus, StatusMeta> = {
  PENDING: { label: "待确认", tone: "warn" },
  ACTIVE: { label: "执行中", tone: "ok" },
  PAUSED: { label: "已暂停", tone: "warn" },
  REPLAN_REQUIRED: { label: "需要调整", tone: "risk" },
  COMPLETED: { label: "已完成", tone: "info" },
  EXITED: { label: "已退出", tone: "neutral" },
  CANCELLED: { label: "已取消", tone: "neutral" },
};

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  PENDING: { label: "待执行", tone: "neutral" },
  READY: { label: "可执行", tone: "info" },
  IN_PROGRESS: { label: "执行中", tone: "warn" },
  COMPLETED: { label: "已完成", tone: "ok" },
  SKIPPED: { label: "已跳过", tone: "neutral" },
  CANCELLED: { label: "已取消", tone: "neutral" },
  BLOCKED: { label: "被阻塞", tone: "risk" },
};

export const PLAN_STATUS_META: Record<PlanStatus, StatusMeta> = {
  DRAFT: { label: "草案", tone: "neutral" },
  PENDING_APPROVAL: { label: "待审核", tone: "warn" },
  APPROVED: { label: "已批准", tone: "info" },
  ACTIVE: { label: "生效中", tone: "ok" },
  SUPERSEDED: { label: "已被取代", tone: "neutral" },
  REJECTED: { label: "已退回", tone: "risk" },
};

export const VARIATION_TYPE_META: Record<VariationType, StatusMeta & { english: string }> = {
  CLINICAL: { label: "临床变异", english: "Clinical", tone: "warn" },
  RESOURCE: { label: "资源变异", english: "Resource", tone: "warn" },
  TIME: { label: "时间变异", english: "Time", tone: "risk" },
  PATIENT: { label: "患者变异", english: "Patient", tone: "neutral" },
  PROCESS: { label: "流程变异", english: "Process", tone: "neutral" },
  SAFETY: { label: "安全变异", english: "Safety", tone: "risk" },
  DATA: { label: "数据变异", english: "Data", tone: "info" },
};

export const RISK_META: Record<"HIGH" | "MEDIUM" | "LOW", StatusMeta> = {
  HIGH: { label: "高风险", tone: "risk" },
  MEDIUM: { label: "中风险", tone: "warn" },
  LOW: { label: "低风险", tone: "ok" },
};

export const APPROVAL_STATUS_META: Record<"PENDING" | "APPROVED" | "REJECTED", StatusMeta> = {
  PENDING: { label: "待审核", tone: "warn" },
  APPROVED: { label: "已通过", tone: "ok" },
  REJECTED: { label: "已退回", tone: "risk" },
};
