import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { DEMO_ACCOUNTS } from "@/data/org";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import { useSessionStore } from "@/stores/session-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const loginAs = useSessionStore((s) => s.loginAs);
  const logout = useSessionStore((s) => s.logout);

  if (!user) return null;

  const initials = user.name.slice(-2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {ROLE_SYSTEM_LABELS[user.role]}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.title}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>切换演示账号</DropdownMenuLabel>
            {DEMO_ACCOUNTS.map((acc) => (
              <DropdownMenuItem
                key={acc.user.id}
                onClick={() => {
                  loginAs(acc.user.id);
                  navigate("/dashboard");
                }}
                className="justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <UserRound className="size-3.5" />
                  <span>{acc.roleLabel}</span>
                  <span className="text-[11px] text-muted-foreground">{acc.user.name}</span>
                </span>
                {user.id === acc.user.id && <Check className="size-3.5" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
