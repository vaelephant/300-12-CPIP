import { NavLink, useLocation } from "react-router-dom";
import { ChevronsLeft, CircleDot, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { useSessionStore } from "@/stores/session-store";
import { ORGANIZATION } from "@/data/org";
import { NAV_GROUPS, type NavItem } from "./nav-config";
import { BrandMark } from "./brand-mark";
import { CountBadge } from "./toolbar";

function useVisible(item: NavItem) {
  const has = useSessionStore((s) => s.has);
  const hasAny = useSessionStore((s) => s.hasAny);
  if (!item.permissions?.length) return true;
  return item.permissions.length === 1 ? has(item.permissions[0]) : hasAny(item.permissions);
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const visible = useVisible(item);
  const location = useLocation();
  if (!visible) return null;
  const matches = item.match ?? [item.to];
  const active = matches.some((m) => location.pathname === m || location.pathname.startsWith(`${m}/`));
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-[5px] px-2.5 text-[12.5px] font-medium transition-colors",
        active ? "bg-white/8 text-white" : "text-white/55 hover:bg-white/5 hover:text-white/85",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span className="absolute top-1/2 left-0 h-3.5 w-[2px] -translate-y-1/2 rounded-r-full bg-[#9db4cd]" />}
      <Icon className={cn("size-[15px] shrink-0", active ? "text-[#b7cadd]" : "text-white/45 group-hover:text-white/70")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <span className="ml-auto">
          <CountBadge count={item.badge} tone={item.tone === "risk" ? "risk" : item.tone === "warn" ? "warn" : "neutral"} />
        </span>
      )}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#b23b36]" />
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const user = useSessionStore((s) => s.user);

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-white/6 bg-ink text-white transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[232px]",
      )}
    >
      {/* 品牌 */}
      <div className={cn("flex h-[58px] items-center gap-2.5 border-b border-white/6 px-4", collapsed && "justify-center px-0")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-white/8 text-[#b7cadd] ring-1 ring-white/10">
          <BrandMark className="size-[19px]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] leading-none font-semibold tracking-[0.05em]">HCC-CIP</span>
              <span className="font-mono text-[8.5px] text-white/35">V0.5</span>
            </div>
            <p className="mt-1 truncate text-[8.5px] tracking-[0.04em] text-white/35">肝癌全病程智能诊疗平台</p>
          </div>
        )}
      </div>

      {/* 组织 */}
      {!collapsed && (
        <div className="border-b border-white/6 px-3 py-2.5">
          <button className="flex w-full items-center gap-2 rounded-[5px] px-1.5 py-1 text-left transition-colors hover:bg-white/5">
            <span className="flex size-5 items-center justify-center rounded-[3px] bg-white/8 font-mono text-[9px] text-white/60">RH</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-medium text-white/75">{ORGANIZATION.name}</span>
              <span className="block text-[9.5px] text-white/35">{ORGANIZATION.level} · 私有化部署</span>
            </span>
            <ChevronsLeft className="size-3 rotate-[-90deg] text-white/25" />
          </button>
        </div>
      )}

      {/* 导航 */}
      <nav className={cn("scrollbar-slim flex-1 space-y-4 overflow-y-auto py-3", collapsed ? "px-2" : "px-2.5")}>
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((i) => {
            const has = useSessionStore.getState().has;
            const hasAny = useSessionStore.getState().hasAny;
            if (!i.permissions?.length) return true;
            return i.permissions.length === 1 ? has(i.permissions[0]) : hasAny(i.permissions);
          });
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-2 font-mono text-[9px] tracking-[0.16em] text-white/28 uppercase">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavRow key={item.to} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 底部 */}
      <div className={cn("border-t border-white/6 p-2.5", collapsed && "px-2")}>
        {!collapsed ? (
          <>
            <div className="rounded-[6px] border border-white/8 bg-white/[0.035] px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <CircleDot className="size-2.5 text-[#7e9a8c]" />
                <span className="text-[10px] font-medium text-white/60">演示环境 · 合成数据</span>
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-white/30">
                不连接真实医院数据，不用于临床决策。
              </p>
            </div>
            <button
              onClick={toggle}
              className="mt-2 flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-[10.5px] text-white/35 transition-colors hover:bg-white/5 hover:text-white/60"
            >
              <PanelLeftClose className="size-3.5" />
              收起侧边栏
            </button>
          </>
        ) : (
          <button
            onClick={toggle}
            className="flex h-8 w-full items-center justify-center rounded-[5px] text-white/40 hover:bg-white/5 hover:text-white/70"
            title="展开侧边栏"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        {!collapsed && user && (
          <div className="mt-2 flex items-center gap-2 rounded-[5px] px-1 py-1">
            <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-white/75">
              {user.name.slice(-2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10.5px] text-white/60">{user.name}</p>
              <p className="truncate text-[9px] text-white/30">{user.title}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
