import type {
  Department,
  Organization,
  PermissionGroup,
  RoleDefinition,
  User,
} from "@/types";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";

export const ORGANIZATION: Organization = {
  id: "org-rh-demo",
  name: "仁和医院（演示）",
  shortName: "仁和医院",
  code: "RH-DEMO",
  level: "三级甲等",
  city: "杭州",
  beds: 1200,
};

export const DEPARTMENTS: Department[] = [
  { id: "dept-hpb", code: "HCC", name: "肝胆外科 · 肝癌中心", shortName: "肝癌中心", type: "SURGICAL", bedCount: 120, activePatients: 100 },
  { id: "dept-hepatology", code: "HEP", name: "肝病内科", shortName: "肝病", type: "CLINICAL", bedCount: 48, activePatients: 22 },
  { id: "dept-intervention", code: "INT", name: "介入科", shortName: "介入", type: "CLINICAL", bedCount: 36, activePatients: 18 },
  { id: "dept-onco", code: "ONC", name: "肿瘤内科", shortName: "肿瘤", type: "CLINICAL", bedCount: 52, activePatients: 24 },
  { id: "dept-anesth", code: "ANS", name: "麻醉科", shortName: "麻醉", type: "SUPPORT", bedCount: 0, activePatients: 0 },
  { id: "dept-radiology", code: "RAD", name: "医学影像科", shortName: "影像", type: "SUPPORT", bedCount: 0, activePatients: 0 },
  { id: "dept-pathology", code: "PAT", name: "病理科", shortName: "病理", type: "SUPPORT", bedCount: 0, activePatients: 0 },
  { id: "dept-pharmacy", code: "PHA", name: "药学部", shortName: "药学", type: "SUPPORT", bedCount: 0, activePatients: 0 },
  { id: "dept-nursing", code: "NUR", name: "护理部", shortName: "护理", type: "NURSING", bedCount: 0, activePatients: 0 },
  { id: "dept-qc", code: "QCD", name: "质控科", shortName: "质控", type: "SUPPORT", bedCount: 0, activePatients: 0 },
];

export const USERS: User[] = [
  { id: "U-001", name: "王建国", employeeNo: "RH0001", role: "ADMIN", title: "信息中心 · 系统管理员", departmentId: "dept-qc", departmentName: "信息中心", phoneMasked: "138****2201", status: "ACTIVE", dataScope: "ALL", lastLoginAt: new Date(Date.now() - 26 * 60_000).toISOString() },
  { id: "U-002", name: "周敏", employeeNo: "RH0102", role: "MEDICAL_AFFAIRS", title: "医务处 · 主任", departmentId: "dept-qc", departmentName: "医务处", phoneMasked: "139****8830", status: "ACTIVE", dataScope: "ORG", lastLoginAt: new Date(Date.now() - 52 * 60_000).toISOString() },
  { id: "U-003", name: "张启明", employeeNo: "RH0218", role: "EXPERT", title: "肝胆外科 · 主任医师（肝癌中心）", departmentId: "dept-hpb", departmentName: "肝胆外科", phoneMasked: "137****6612", status: "ACTIVE", dataScope: "DEPT", lastLoginAt: new Date(Date.now() - 8 * 60_000).toISOString() },
  { id: "U-004", name: "李文博", employeeNo: "RH0236", role: "DOCTOR", title: "肝胆外科 · 副主任医师", departmentId: "dept-hpb", departmentName: "肝胆外科", phoneMasked: "136****5127", status: "ACTIVE", dataScope: "DEPT", lastLoginAt: new Date(Date.now() - 3 * 60_000).toISOString() },
  { id: "U-005", name: "赵倩", employeeNo: "RH0451", role: "NURSE", title: "肝胆外科 · 护士长", departmentId: "dept-nursing", departmentName: "肝胆外科护理单元", phoneMasked: "135****9074", status: "ACTIVE", dataScope: "DEPT", lastLoginAt: new Date(Date.now() - 15 * 60_000).toISOString() },
  { id: "U-006", name: "孙悦", employeeNo: "RH0478", role: "NURSE", title: "肝胆外科 · 主管护师", departmentId: "dept-nursing", departmentName: "肝胆外科护理单元", phoneMasked: "135****3302", status: "ACTIVE", dataScope: "SELF", lastLoginAt: new Date(Date.now() - 220 * 60_000).toISOString() },
  { id: "U-007", name: "陈立", employeeNo: "RH0251", role: "DOCTOR", title: "介入科 · 主治医师", departmentId: "dept-intervention", departmentName: "介入科", phoneMasked: "138****7741", status: "ACTIVE", dataScope: "SELF", lastLoginAt: new Date(Date.now() - 4 * 3600_000).toISOString() },
  { id: "U-008", name: "王海峰", employeeNo: "RH0207", role: "EXPERT", title: "介入科 · 主任医师", departmentId: "dept-intervention", departmentName: "介入科", phoneMasked: "139****1188", status: "ACTIVE", dataScope: "DEPT", lastLoginAt: new Date(Date.now() - 9 * 3600_000).toISOString() },
  { id: "U-009", name: "刘欣", employeeNo: "RH0264", role: "DOCTOR", title: "肿瘤内科 · 主治医师", departmentId: "dept-onco", departmentName: "肿瘤内科", phoneMasked: "137****0459", status: "ACTIVE", dataScope: "SELF", lastLoginAt: new Date(Date.now() - 30 * 3600_000).toISOString() },
  { id: "U-010", name: "何静", employeeNo: "RH0312", role: "QC", title: "质控科 · 质控专员", departmentId: "dept-qc", departmentName: "质控科", phoneMasked: "136****6650", status: "ACTIVE", dataScope: "ORG", lastLoginAt: new Date(Date.now() - 5 * 3600_000).toISOString() },
  { id: "U-011", name: "郑凯", employeeNo: "RH0508", role: "RESEARCHER", title: "科研部 · 副研究员", departmentId: "dept-qc", departmentName: "科研部", phoneMasked: "135****2218", status: "DISABLED", dataScope: "SELF", lastLoginAt: new Date(Date.now() - 12 * 86_400_000).toISOString() },
  { id: "U-012", name: "林海", employeeNo: "RH0009", role: "EXECUTIVE", title: "院办 · 副院长", departmentId: "dept-qc", departmentName: "院办", phoneMasked: "139****0006", status: "ACTIVE", dataScope: "ORG", lastLoginAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "路径管理",
    items: [
      { key: "pathway.view", label: "查看路径" },
      { key: "pathway.create", label: "创建路径" },
      { key: "pathway.edit", label: "编辑路径" },
      { key: "pathway.validate", label: "路径校验" },
      { key: "pathway.submit", label: "提交审核" },
      { key: "pathway.approve", label: "审核路径" },
      { key: "pathway.publish", label: "发布路径" },
      { key: "pathway.retire", label: "停用路径" },
    ],
  },
  {
    group: "患者与入径",
    items: [
      { key: "patient.view", label: "查看患者" },
      { key: "patient.create", label: "创建患者" },
      { key: "patient.edit", label: "编辑患者" },
      { key: "patient.enroll", label: "患者入径" },
      { key: "patient.export", label: "导出患者数据" },
    ],
  },
  {
    group: "计划与执行",
    items: [
      { key: "plan.approve", label: "审核计划" },
      { key: "plan.activate", label: "激活计划" },
      { key: "task.view", label: "查看任务" },
      { key: "task.assign", label: "分派任务" },
      { key: "task.start", label: "开始任务" },
      { key: "task.complete", label: "完成任务" },
      { key: "task.cancel", label: "取消任务" },
    ],
  },
  {
    group: "变异与知识",
    items: [
      { key: "variation.view", label: "查看变异" },
      { key: "variation.create", label: "登记变异" },
      { key: "variation.resolve", label: "处理变异" },
      { key: "knowledge.view", label: "查看知识" },
      { key: "knowledge.edit", label: "维护知识" },
      { key: "knowledge.approve", label: "审核知识" },
    ],
  },
  {
    group: "分析与系统",
    items: [
      { key: "analytics.dept", label: "科室统计" },
      { key: "analytics.org", label: "全院统计" },
      { key: "analytics.export", label: "导出统计" },
      { key: "user.manage", label: "用户管理" },
      { key: "role.manage", label: "角色管理" },
      { key: "audit.view", label: "审计日志" },
      { key: "system.config", label: "系统配置" },
      { key: "adapter.manage", label: "外部接口管理" },
    ],
  },
];

const P = (keys: string[]) => keys;

export const ROLES: RoleDefinition[] = [
  {
    key: "ADMIN",
    name: "系统管理员",
    description: "负责用户、组织与系统配置；不默认拥有患者病历访问权限。",
    userCount: 1,
    dataScope: "ALL",
    system: true,
    permissions: P(["user.manage", "role.manage", "audit.view", "system.config", "adapter.manage", "knowledge.view", "analytics.org"]),
  },
  {
    key: "MEDICAL_AFFAIRS",
    name: "医务处管理员",
    description: "全院路径审核、发布、质量与变异监管。",
    userCount: 3,
    dataScope: "ORG",
    system: true,
    permissions: P(["pathway.view", "pathway.create", "pathway.edit", "pathway.validate", "pathway.submit", "pathway.approve", "pathway.publish", "pathway.retire", "patient.view", "plan.approve", "task.view", "variation.view", "variation.resolve", "knowledge.view", "knowledge.approve", "analytics.dept", "analytics.org", "analytics.export", "audit.view"]),
  },
  {
    key: "EXPERT",
    name: "临床专家",
    description: "路径制定与医学规则审核，可审核计划与变异调整。",
    userCount: 8,
    dataScope: "DEPT",
    system: true,
    permissions: P(["pathway.view", "pathway.create", "pathway.edit", "pathway.validate", "pathway.submit", "pathway.approve", "patient.view", "patient.edit", "patient.enroll", "plan.approve", "plan.activate", "task.view", "variation.view", "variation.resolve", "knowledge.view", "knowledge.edit", "analytics.dept"]),
  },
  {
    key: "DOCTOR",
    name: "临床医生",
    description: "入径确认、个体化规划、任务执行与变异处理。",
    userCount: 45,
    dataScope: "DEPT",
    system: true,
    permissions: P(["pathway.view", "patient.view", "patient.create", "patient.edit", "patient.enroll", "plan.approve", "plan.activate", "task.view", "task.start", "task.complete", "variation.view", "variation.create", "variation.resolve", "knowledge.view", "analytics.dept"]),
  },
  {
    key: "NURSE",
    name: "护理人员",
    description: "护理任务执行与变异反馈，不参与路径发布。",
    userCount: 62,
    dataScope: "DEPT",
    system: true,
    permissions: P(["pathway.view", "patient.view", "task.view", "task.start", "task.complete", "variation.view", "variation.create", "knowledge.view"]),
  },
  {
    key: "QC",
    name: "质控人员",
    description: "路径执行检查、质量评价与全院审计。",
    userCount: 4,
    dataScope: "ORG",
    system: true,
    permissions: P(["pathway.view", "patient.view", "task.view", "variation.view", "analytics.dept", "analytics.org", "analytics.export", "audit.view"]),
  },
  {
    key: "RESEARCHER",
    name: "科研人员",
    description: "仅可访问经授权的脱敏数据集，禁止查看患者身份信息。",
    userCount: 6,
    dataScope: "SELF",
    system: false,
    permissions: P(["knowledge.view", "analytics.dept", "analytics.export"]),
  },
  {
    key: "EXECUTIVE",
    name: "院级管理人员",
    description: "全院运营驾驶舱，仅查看聚合指标，不含患者身份信息。",
    userCount: 2,
    dataScope: "ORG",
    system: true,
    permissions: P(["pathway.view", "variation.view", "analytics.dept", "analytics.org", "analytics.export"]),
  },
];

/** 演示登录账号：角色 → 用户 */
export const DEMO_ACCOUNTS = ["U-004", "U-003", "U-002", "U-012", "U-005", "U-001"].map((id) => {
  const user = USERS.find((u) => u.id === id)!;
  return {
    user,
    roleLabel: ROLE_SYSTEM_LABELS[user.role],
    permissions: ROLES.find((r) => r.key === user.role)?.permissions ?? [],
  };
});

export function getDepartment(id: string) {
  return DEPARTMENTS.find((d) => d.id === id);
}
