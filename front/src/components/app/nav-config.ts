import {
  Activity,
  Blocks,
  ClipboardList,
  FlaskConical,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  Presentation,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Workflow,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permissions?: string[];
  badge?: number;
  tone?: "risk" | "warn" | "neutral";
  match?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "概览",
    items: [{ label: "工作台", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "临床路径",
    items: [
      { label: "路径库", to: "/pathways", icon: Route, permissions: ["pathway.view"], match: ["/pathways"] },
      { label: "审核中心", to: "/approvals", icon: ShieldCheck, permissions: ["pathway.approve", "plan.approve", "variation.resolve"], badge: 4, tone: "neutral" },
    ],
  },
  {
    label: "患者与执行",
    items: [
      { label: "患者中心", to: "/patients", icon: Users, permissions: ["patient.view"], match: ["/patients", "/planning"] },
      { label: "任务中心", to: "/tasks", icon: ClipboardList, permissions: ["task.view"], badge: 8, tone: "neutral" },
      { label: "变异管理", to: "/variations", icon: GitBranch, permissions: ["variation.view"], badge: 3, tone: "neutral" },
      { label: "重评队列", to: "/reassessments", icon: Activity, permissions: ["patient.view"] },
      { label: "随访管理", to: "/followups", icon: HeartPulse, permissions: ["patient.view"] },
    ],
  },
  {
    label: "知识与模拟",
    items: [
      { label: "知识库", to: "/knowledge", icon: FlaskConical, permissions: ["knowledge.view"] },
      { label: "路径模拟", to: "/simulation", icon: Sparkles, permissions: ["pathway.view"], match: ["/simulation"] },
    ],
  },
  {
    label: "运营",
    items: [
      { label: "运营分析", to: "/analytics", icon: Activity, permissions: ["analytics.dept"] },
      { label: "院长驾驶舱", to: "/executive", icon: Presentation, permissions: ["analytics.org"] },
      { label: "流程挖掘", to: "/process-mining", icon: Workflow, permissions: ["analytics.dept"] },
    ],
  },
  {
    label: "系统",
    items: [
      { label: "用户管理", to: "/settings/users", icon: UsersRound, permissions: ["user.manage"] },
      { label: "角色权限", to: "/settings/roles", icon: SlidersHorizontal, permissions: ["role.manage"] },
      { label: "审计日志", to: "/settings/audit", icon: Blocks, permissions: ["audit.view"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

export const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "工作台",
  "/pathways": "路径库",
  "/approvals": "审核中心",
  "/patients": "患者中心",
  "/tasks": "任务中心",
  "/variations": "变异管理",
  "/reassessments": "重评队列",
  "/followups": "随访管理",
  "/knowledge": "知识库",
  "/simulation": "路径模拟",
  "/simulation/engine": "引擎与记录",
  "/analytics": "运营分析",
  "/executive": "院长驾驶舱",
  "/process-mining": "流程挖掘",
  "/about": "关于平台",
  "/about/tech": "技术附录",
  "/settings/users": "用户管理",
  "/settings/roles": "角色权限",
  "/settings/audit": "审计日志",
};

export function crumbForPath(pathname: string): { label: string; to?: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [];
  if (pathname.startsWith("/pathways/") && pathname.includes("/studio")) {
    crumbs.push({ label: "路径库", to: "/pathways" }, { label: "路径设计器" });
  } else if (pathname.startsWith("/pathways/") && pathname.includes("/versions")) {
    crumbs.push({ label: "路径库", to: "/pathways" }, { label: "版本管理" });
  } else if (pathname.startsWith("/patients/") && pathname.endsWith("/replay")) {
    const id = parts[1];
    crumbs.push(
      { label: "患者中心", to: "/patients" },
      { label: "患者 360", to: `/patients/${id}` },
      { label: "病程回放" },
    );
  } else if (pathname.startsWith("/patients/") && pathname.endsWith("/map")) {
    const id = parts[1];
    crumbs.push(
      { label: "患者中心", to: "/patients" },
      { label: "患者 360", to: `/patients/${id}` },
      { label: "动态路径图" },
    );
  } else if (pathname.startsWith("/patients/") && pathname.includes("/pathway")) {
    const id = parts[1];
    crumbs.push(
      { label: "患者中心", to: "/patients" },
      { label: "患者 360", to: `/patients/${id}` },
      { label: "路径执行" },
    );
  } else if (pathname.startsWith("/patients/")) {
    crumbs.push({ label: "患者中心", to: "/patients" }, { label: "患者 360" });
  } else if (pathname.startsWith("/planning/")) {
    crumbs.push({ label: "患者中心", to: "/patients" }, { label: "路径规划" });
  } else if (pathname === "/simulation/engine") {
    crumbs.push({ label: "路径模拟", to: "/simulation" }, { label: "引擎与记录" });
  } else if (pathname === "/about/tech") {
    crumbs.push({ label: "关于平台", to: "/about" }, { label: "技术附录" });
  } else if (parts.length > 1) {
    const root = `/${parts.slice(0, 2).join("/")}`;
    const rootLabel = ROUTE_TITLES[root];
    if (rootLabel) crumbs.push({ label: rootLabel, to: root });
  }
  const base = parts.length === 1 ? ROUTE_TITLES[pathname] : undefined;
  if (base) crumbs.push({ label: base });
  return crumbs.length ? crumbs : [{ label: "HCC-CIP" }];
}
