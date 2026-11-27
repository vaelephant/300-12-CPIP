import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { ArrowRight, ClipboardList, CornerDownLeft, Route, Search, Users } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { PATIENTS } from "@/data/patients";
import { PATHWAYS } from "@/data/pathways";
import { ALL_TASKS } from "@/data/runtime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ALL_NAV_ITEMS } from "./nav-config";
import { StatusBadge } from "./status-badge";
import { TASK_STATUS_META } from "@/lib/clinical";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const tasks = useMemo(() => ALL_TASKS.slice(0, 6), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showClose={false} className="top-[18%] max-w-[640px] translate-y-0 overflow-hidden p-0">
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase"
        >
          <div className="flex h-11 items-center gap-2 border-b border-line px-3.5">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="搜索患者、路径、任务或跳转页面…"
              className="h-full flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
            />
            <kbd className="rounded border border-line bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">ESC</kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto scrollbar-slim p-1.5">
            <Command.Empty className="py-10 text-center text-[12px] text-muted-foreground">
              未找到匹配结果。
            </Command.Empty>

            <Command.Group heading="导航">
              {ALL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.to}
                    value={`${item.label} ${item.group} ${item.to}`}
                    onSelect={() => go(item.to)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[12.5px] outline-none data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                  >
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">{item.group}</span>
                    <ArrowRight className="size-3 text-muted-foreground/40" />
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="路径模板">
              {PATHWAYS.slice(0, 4).map((p) => (
                <Command.Item
                  key={p.id}
                  value={`路径 ${p.name} ${p.code} ${p.diseaseName}`}
                  onSelect={() => go(`/pathways/${p.id}/studio`)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[12.5px] outline-none data-[selected=true]:bg-secondary"
                >
                  <Route className="size-3.5 text-muted-foreground" />
                  <span className="flex-1">{p.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{p.code}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="患者">
              {PATIENTS.slice(0, 4).map((p) => (
                <Command.Item
                  key={p.id}
                  value={`患者 ${p.name} ${p.mrn} ${p.diagnosis}`}
                  onSelect={() => go(`/patients/${p.id}`)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[12.5px] outline-none data-[selected=true]:bg-secondary"
                >
                  <Users className="size-3.5 text-muted-foreground" />
                  <span className="w-14 shrink-0">{p.name}</span>
                  <span className="flex-1 text-[11px] text-muted-foreground">{p.diagnosis}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{p.mrn}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="任务">
              {tasks.map((t) => (
                <Command.Item
                  key={t.id}
                  value={`任务 ${t.name} ${t.summary ?? ""}`}
                  onSelect={() => go("/tasks")}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[12.5px] outline-none data-[selected=true]:bg-secondary"
                >
                  <ClipboardList className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{t.name}</span>
                  <StatusBadge tone={TASK_STATUS_META[t.status].tone} dot={false}>
                    {TASK_STATUS_META[t.status].label}
                  </StatusBadge>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-4 border-t border-line bg-secondary/30 px-3.5 py-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="rounded border border-line bg-card px-1 font-mono text-[9px]">↑</kbd><kbd className="rounded border border-line bg-card px-1 font-mono text-[9px]">↓</kbd> 选择</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="size-2.5" /> 打开</span>
            <span className="ml-auto font-mono">HCC-CIP</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
