import { Fragment, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Bell,
  CircleHelp,
  Command as CommandIcon,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { NOTIFICATIONS, LAST_SYNC } from "@/data/analytics";
import { fmtTime, relTime } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { ModeToggle } from "@/components/mode-toggle";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const [notifOpen, setNotifOpen] = useState(false);
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
              全部通知
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
      </div>
    </header>
  );
}
