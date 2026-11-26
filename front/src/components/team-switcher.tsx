import * as React from "react";
import { ChevronsUpDown, Hospital } from "lucide-react";
import { BrandMark } from "@/components/app/brand-mark";
import { ORGANIZATION } from "@/data/org";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const TEAMS = [
  {
    name: ORGANIZATION.shortName,
    plan: "私有化 · 演示",
    logo: BrandMark,
  },
  {
    name: "肝癌中心",
    plan: "肝胆外科",
    logo: Hospital,
  },
];

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const [active, setActive] = React.useState(TEAMS[0]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <active.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="truncate text-xs text-muted-foreground">{active.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">工作空间</DropdownMenuLabel>
            {TEAMS.map((team) => (
              <DropdownMenuItem key={team.name} onClick={() => setActive(team)} className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                <div className="flex flex-col">
                  <span>{team.name}</span>
                  <span className="text-[11px] text-muted-foreground">{team.plan}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
