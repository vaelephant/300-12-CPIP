import { BrandMark } from "@/components/app/brand-mark";
import { ORGANIZATION } from "@/data/org";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

/**
 * V2.0：工作空间若只改显示名而不改数据上下文，不得伪装可切换组织权限。
 */
export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="pointer-events-none cursor-default">
          <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <BrandMark className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{ORGANIZATION.shortName}</span>
            <span className="truncate text-xs text-muted-foreground">肝胆外科 · 肝癌中心</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
