import type { ComponentProps } from "react";
import { useMemo } from "react";
import { NavMain, type NavMainGroup } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { NAV_GROUPS } from "@/components/app/nav-config";
import { useSessionStore } from "@/stores/session-store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const has = useSessionStore((s) => s.has);
  const hasAny = useSessionStore((s) => s.hasAny);

  const groups = useMemo<NavMainGroup[]>(() => {
    return NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.items
        .filter((item) => {
          if (!item.permissions?.length) return true;
          return item.permissions.length === 1
            ? has(item.permissions[0])
            : hasAny(item.permissions);
        })
        .map((item) => ({
          title: item.label,
          url: item.to,
          icon: item.icon,
          badge: item.badge,
          match: item.match,
        })),
    })).filter((g) => g.items.length > 0);
  }, [has, hasAny]);

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={groups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
