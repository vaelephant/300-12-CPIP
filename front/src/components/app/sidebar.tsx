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
        "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon
        className={cn(
          "size-[15px] shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <span className="ml-auto">
          <CountBadge count={item.badge} tone={item.tone === "risk" ? "risk" : item.tone === "warn" ? "warn" : "neutral"} />
        </span>
      )}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-risk" />
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
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-line bg-card text-foreground transition-[width] duration-200",
        collapsed ? "w-[56px]" : "w-[220px]",
      )}
    >
      <div className={cn("flex h-12 items-center gap-2.5 px-3.5", collapsed && "justify-center px-0")}>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-brand text-white">
          <BrandMark className="size-[16px]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13.5px] leading-none font-semibold tracking-[-0.02em]">HCC-CIP</span>
              <span className="text-[10px] text-muted-foreground">0.6.1</span>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-2.5 pb-2">
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary">
            <span className="flex size-5 items-center justify-center rounded-[4px] bg-secondary text-[10px] font-medium text-muted-foreground">
              RH
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-foreground">{ORGANIZATION.name}</span>
              <span className="block text-[11px] text-muted-foreground">私有化 · 演示环境</span>
            </span>
            <ChevronsLeft className="size-3 rotate-[-90deg] text-muted-foreground/70" />
          </button>
        </div>
      )}

      <nav className={cn("scrollbar-slim flex-1 space-y-5 overflow-y-auto py-1", collapsed ? "px-2" : "px-2.5")}>
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
                <p className="mb-1 px-2.5 text-[11px] font-medium text-muted-foreground/80">{group.label}</p>
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

      <div className={cn("p-2.5", collapsed && "px-2")}>
        {!collapsed ? (
          <>
            <div className="rounded-md bg-secondary/70 px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <CircleDot className="size-2.5 text-ok" />
                <span className="text-[11px] font-medium text-foreground/80">演示环境</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">合成数据 · 不用于临床决策</p>
            </div>
            <button
              onClick={toggle}
              className="mt-1.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <PanelLeftClose className="size-3.5" />
              收起
            </button>
          </>
        ) : (
          <button
            onClick={toggle}
            className="flex h-8 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="展开侧边栏"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        {!collapsed && user && (
          <div className="mt-1.5 flex items-center gap-2 rounded-md px-1.5 py-1.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-wash text-[10px] font-medium text-brand">
              {user.name.slice(-2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-foreground">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.title}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
