import { useState } from "react";
import { Check, Loader2, MoreHorizontal, Play, SkipForward, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRuntimeStore } from "@/stores/runtime-store";
import { useSessionStore } from "@/stores/session-store";

/** 统一的运行时任务操作：非法状态转换会以 toast.error 展示引擎返回的错误。 */
export function useTaskRunner() {
  const actor = useSessionStore((s) => s.user?.name ?? "演示医生");
  const startTask = useRuntimeStore((s) => s.startTask);
  const completeTask = useRuntimeStore((s) => s.completeTask);
  const cancelTask = useRuntimeStore((s) => s.cancelTask);
  const skipTask = useRuntimeStore((s) => s.skipTask);

  const report = (res: { ok: boolean; error?: string }, message: string) => {
    if (res.ok) toast.success(message);
    else toast.error(res.error ?? "非法状态转换，操作已被运行时引擎拒绝");
    return res.ok;
  };

  return {
    actor,
    start: (task: Task) => report(startTask(task.id, actor), `已开始任务 · ${task.name}`),
    complete: (task: Task, note: string) =>
      report(completeTask(task.id, actor, note.trim() || "已完成（演示）"), `已完成任务 · ${task.name}`),
    cancel: (task: Task) => report(cancelTask(task.id, actor), `已取消任务 · ${task.name}`),
    skip: (task: Task) => report(skipTask(task.id, actor), `已跳过任务 · ${task.name}`),
  };
}

export function TaskActions({
  task,
  compact = false,
  onChanged,
}: {
  task: Task;
  compact?: boolean;
  onChanged?: () => void;
}) {
  const runner = useTaskRunner();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (task.status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ok">
        <Check className="size-3.5" /> 已完成
      </span>
    );
  }
  if (task.status === "SKIPPED" || task.status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <XCircle className="size-3.5" /> {task.status === "SKIPPED" ? "已跳过" : "已取消"}
      </span>
    );
  }
  if (task.status === "PENDING" || task.status === "BLOCKED") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-line bg-secondary/60 px-2 py-1 text-[11px] text-muted-foreground">
            <Play className="size-3" /> 不可开始
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {task.status === "BLOCKED" ? "任务被安全约束阻塞，需先解除阻断。" : "前置任务未完成，当前任务不可开始。"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {task.status === "READY" && (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => {
            if (runner.start(task)) onChanged?.();
          }}
        >
          <Play className="size-3" /> 开始
        </Button>
      )}
      {task.status === "IN_PROGRESS" && (
        <Button size="xs" onClick={() => setOpen(true)}>
          <Check className="size-3" /> 完成
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={compact ? "icon-sm" : "icon-sm"} variant="ghost" aria-label="更多任务操作">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>任务操作 · {task.id}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => {
              if (runner.skip(task)) onChanged?.();
            }}
            disabled={task.required}
          >
            <SkipForward />
            跳过任务
            {task.required && <span className="ml-auto text-[10px] text-muted-foreground">必需任务</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              if (runner.cancel(task)) onChanged?.();
            }}
          >
            <XCircle />
            取消任务
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setNote("");
        }}
      >
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>完成任务</DialogTitle>
            <DialogDescription>
              {task.name} · {task.stage} · 执行人 {task.assignee}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            {task.summary && (
              <p className="mb-3 rounded-md border border-line bg-secondary/40 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {task.summary}
              </p>
            )}
            <label className="text-[12px] font-medium text-foreground/80" htmlFor={`task-result-${task.id}`}>
              执行结果 / 关键指标
            </label>
            <Textarea
              id={`task-result-${task.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：体温 36.8°C，已完成评估并签名（演示输入，不会写入真实病历）"
              className="mt-1.5"
            />
            <p className="mt-2 text-[10.5px] text-muted-foreground">
              结果仅保存在当前浏览器会话的演示运行时中，不会上传。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              disabled={!note.trim()}
              onClick={() => {
                if (runner.complete(task, note)) {
                  setOpen(false);
                  setNote("");
                  onChanged?.();
                }
              }}
            >
              确认完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 供工具栏按钮显示加载状态的小包装。 */
export function ActionSpinner({ loading }: { loading: boolean }) {
  return loading ? <Loader2 className="size-3.5 animate-spin" /> : null;
}
