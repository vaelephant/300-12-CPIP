import { useEffect } from "react";
import { useLocation, useNavigate, Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "@/stores/session-store";
import { crumbForPath } from "./nav-config";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { AccessDenied } from "./access-denied";

const ROUTE_RULES: { prefix: string; module: string; permissions: string[] }[] = [
  { prefix: "/pathways", module: "临床路径", permissions: ["pathway.view"] },
  { prefix: "/approvals", module: "审核中心", permissions: ["pathway.approve", "plan.approve", "variation.resolve"] },
  { prefix: "/patients", module: "患者中心", permissions: ["patient.view"] },
  { prefix: "/planning", module: "患者中心 · 路径规划", permissions: ["patient.view"] },
  { prefix: "/tasks", module: "任务中心", permissions: ["task.view"] },
  { prefix: "/variations", module: "变异管理", permissions: ["variation.view"] },
  { prefix: "/followups", module: "随访管理", permissions: ["patient.view"] },
  { prefix: "/knowledge", module: "知识库", permissions: ["knowledge.view"] },
  { prefix: "/simulation", module: "路径模拟", permissions: ["pathway.view"] },
  { prefix: "/analytics", module: "运营分析", permissions: ["analytics.dept"] },
  { prefix: "/executive", module: "院长驾驶舱", permissions: ["analytics.org"] },
  { prefix: "/process-mining", module: "临床流程挖掘", permissions: ["analytics.dept"] },
  { prefix: "/settings/users", module: "用户管理", permissions: ["user.manage"] },
  { prefix: "/settings/roles", module: "角色权限", permissions: ["role.manage"] },
  { prefix: "/settings/audit", module: "审计日志", permissions: ["audit.view"] },
];

export function AppShell() {
  const user = useSessionStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const hasAny = useSessionStore((s) => s.hasAny);

  useEffect(() => {
    const leaf = crumbForPath(location.pathname).at(-1)?.label;
    document.title = leaf ? `${leaf} · HCC-CIP` : "HCC-CIP · 肝癌全病程智能诊疗平台";
  }, [location.pathname]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const rule = ROUTE_RULES.find((r) => location.pathname === r.prefix || location.pathname.startsWith(`${r.prefix}/`));
  const allowed = !rule || hasAny(rule.permissions);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1">{allowed ? <Outlet /> : <AccessDenied module={rule?.module ?? "该模块"} />}</main>
        {!location.pathname.endsWith("/studio") && (
          <footer className="mt-auto border-t border-line px-6 py-3">
            <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
              <span>HCC-CIP V0.5 · 肝癌全病程智能诊疗平台 · 研发演示版本</span>
              <span className="flex items-center gap-3">
                <span>所有数据均为合成演示数据</span>
                <button onClick={() => navigate("/dashboard")} className="hover:text-foreground">工作台</button>
              </span>
            </div>
          </footer>
        )}
      </div>
      <CommandPalette />
    </div>
  );
}
