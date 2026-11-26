import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: number;
  match?: string[];
};

export type NavMainGroup = {
  label: string;
  items: NavMainItem[];
};

function isActive(pathname: string, item: NavMainItem) {
  const matches = item.match ?? [item.url];
  return matches.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function NavMain({ groups }: { groups: NavMainGroup[] }) {
  const location = useLocation();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const active = isActive(location.pathname, item);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                    <Link to={item.url}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge !== undefined && item.badge > 0 && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
