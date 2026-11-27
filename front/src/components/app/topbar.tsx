import { Fragment, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Command as CommandIcon,
  LogOut,
  PlayCircle,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { useUiStore } from "@/stores/ui-store";
import { DEMO_ACCOUNTS, ORGANIZATION } from "@/data/org";
import { NOTIFICATIONS, LAST_SYNC } from "@/data/analytics";
import { fmtTime, relTime } from "@/lib/utils";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { crumbForPath } from "./nav-config";
import { IS_SERVER_MODE } from "@/lib/data-mode";
import { ModeToggle } from "@/components/mode-toggle";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const loginAs = useSessionStore((s) => s.loginAs);
  const logout = useSessionStore((s) => s.logout);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const crumbs = crumbForPath(location.pathname);
  const unread = NOTIFICATIONS.filter((n) => n.level !== "INFO").length;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-card px-3 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <div className="flex min-w-0 items-center gap-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap text-[13px]">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <Fragment key={`${c.label}-${i}`}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem className="min-w-0">
                    {c.to && !last ? (
                      <BreadcrumbLink asChild>
                        <Link to={c.to} className="truncate">
                          {c.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="truncate font-medium tracking-[-0.01em]">
                        {c.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {!IS_SERVER_MODE && (
        <button
          onClick={() => useUiStore.getState().openTour()}
          className="ml-1 hidden h-7 shrink-0 items-center gap-1.5 rounded-md bg-secondary px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-secondary/80 sm:flex"
        >
          <PlayCircle className="size-3.5" /> 演示导览
        </button>
      )}

      <button
        onClick={() => setCommandOpen(true)}
        className="ml-1 hidden h-7 w-[240px] items-center gap-2 rounded-md bg-secondary/80 px-2.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-secondary lg:flex"
      >
        <Search className="size-3.5 opacity-70" />
        <span className="flex-1">搜索…</span>
        <kbd className="flex items-center gap-0.5 rounded bg-card px-1 py-px font-mono text-[10px] text-muted-foreground shadow-card">
          <CommandIcon className="size-2.5" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-md bg-secondary/80 px-2 py-1 text-[11px] text-muted-foreground xl:flex">
          <span className="size-1.5 rounded-full bg-ok" />
          同步 {fmtTime(LAST_SYNC)}
        </span>

        {/* 通知 */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Bell className="size-4" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-risk ring-2 ring-paper" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <div>
                <p className="text-[12.5px] font-semibold">通知</p>
                <p className="text-[10.5px] text-muted-foreground">{NOTIFICATIONS.length} 条待关注事件</p>
              </div>
              <Link to="/tasks" onClick={() => setNotifOpen(false)} className="text-[10.5px] text-primary hover:underline">
                任务中心
              </Link>
            </div>
            <div className="max-h-[360px] overflow-y-auto scrollbar-slim">
              {NOTIFICATIONS.map((n) => (
                <Link
                  key={n.id}
                  to={n.href}
                  onClick={() => setNotifOpen(false)}
                  className="flex gap-2.5 border-b border-line/70 px-3 py-2.5 transition-colors last:border-0 hover:bg-secondary/50"
                >
                  <span
                    className={cn(
                      "mt-1 size-1.5 shrink-0 rounded-full",
                      n.level === "RISK" && "bg-risk",
                      n.level === "WARN" && "bg-warn",
                      n.level === "INFO" && "bg-info",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-medium">{n.title}</span>
                      <span className="shrink-0 text-[9.5px] text-muted-foreground">{relTime(n.at)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{n.description}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="border-t border-line bg-secondary/30 px-3 py-2 text-center text-[10px] text-muted-foreground">
              演示通知 · 合成数据
            </div>
          </PopoverContent>
        </Popover>

        <button
          onClick={() => navigate("/about")}
          title="关于平台 · 产品定义"
          className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
        >
          <CircleHelp className="size-4" />
        </button>

        <ModeToggle />

        <span className="mx-0.5 h-5 w-px bg-line" />

        {/* 用户菜单 */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 transition-colors hover:bg-secondary">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/12 text-[10.5px] text-primary">{user?.name.slice(-2) ?? "—"}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left lg:block">
                <span className="block text-[11.5px] leading-tight font-medium">{user?.name ?? "未登录"}</span>
                <span className="block text-[9.5px] leading-tight text-muted-foreground">
                  {user ? ROLE_SYSTEM_LABELS[user.role] : "—"}
                </span>
              </span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[252px]">
            <div className="px-2 py-2">
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/12 text-[11px] text-primary">{user?.name.slice(-2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium">{user?.name}</p>
                  <p className="truncate text-[10.5px] text-muted-foreground">{user?.title}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 rounded-[4px] border border-line bg-secondary/50 px-2 py-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="size-3 text-ok" />
                数据范围：{user?.dataScope === "ALL" ? "全院（不含病历）" : user?.dataScope === "ORG" ? "全院聚合" : user?.dataScope === "DEPT" ? "本科室" : "本人负责"}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>切换演示账号</DropdownMenuLabel>
            {DEMO_ACCOUNTS.map((acc) => (
              <DropdownMenuItem
                key={acc.user.id}
                onSelect={() => {
                  loginAs(acc.user.id);
                  setMenuOpen(false);
                  navigate("/dashboard");
                }}
                className="justify-between"
              >
                <span className="flex items-center gap-2">
                  <UserRound className="size-3.5" />
                  <span>{acc.roleLabel}</span>
                  <span className="text-[10px] text-muted-foreground">{acc.user.name}</span>
                </span>
                {user?.id === acc.user.id && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="size-3.5" />
              退出登录
            </DropdownMenuItem>
            <div className="px-2 pt-1.5 pb-1 font-mono text-[9px] text-muted-foreground/60">{ORGANIZATION.code} · V0.6.1</div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
