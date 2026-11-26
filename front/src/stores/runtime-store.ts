import { create } from "zustand";
import type { Task, TaskEvent, TaskStatus } from "@/types";
import { ALL_TASKS, TASK_TRANSITIONS } from "@/data/runtime";
import { minutesFromNow } from "@/data/time";

interface RuntimeState {
  tasks: Task[];
  events: TaskEvent[];
  lastError: string | null;
  peek: (taskId: string) => Task | undefined;
  transition: (taskId: string, to: TaskStatus, actor?: string, note?: string) => { ok: boolean; error?: string };
  startTask: (taskId: string, actor?: string) => { ok: boolean; error?: string };
  completeTask: (taskId: string, actor?: string, result?: string) => { ok: boolean; error?: string };
  cancelTask: (taskId: string, actor?: string) => { ok: boolean; error?: string };
  skipTask: (taskId: string, actor?: string) => { ok: boolean; error?: string };
  reset: () => void;
}

const STAGE_LABEL: Record<TaskStatus, string> = {
  PENDING: "待执行",
  READY: "可执行",
  IN_PROGRESS: "执行中",
  COMPLETED: "已完成",
  SKIPPED: "已跳过",
  CANCELLED: "已取消",
  BLOCKED: "被阻塞",
};

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  tasks: ALL_TASKS,
  events: [],
  lastError: null,
  peek: (taskId) => get().tasks.find((t) => t.id === taskId),
  transition: (taskId, to, actor = "当前用户", note) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: "任务不存在" };
    if (!TASK_TRANSITIONS[task.status].includes(to)) {
      const error = `非法状态转换：${STAGE_LABEL[task.status]} → ${STAGE_LABEL[to]}`;
      set({ lastError: error });
      return { ok: false, error };
    }
    const now = minutesFromNow(0);
    const updated: Task = {
      ...task,
      status: to,
      startedAt: to === "IN_PROGRESS" ? now : task.startedAt,
      completedAt: to === "COMPLETED" ? now : task.completedAt,
      overdue: to === "COMPLETED" ? false : task.overdue,
      result: to === "COMPLETED" ? note ?? "已完成" : task.result,
    };
    const event: TaskEvent = {
      id: `EVT-${Date.now()}`,
      taskId,
      type:
        to === "IN_PROGRESS"
          ? "STARTED"
          : to === "COMPLETED"
            ? "COMPLETED"
            : to === "SKIPPED"
              ? "SKIPPED"
              : "CANCELLED",
      at: now,
      actor,
      note,
    };
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
      events: [event, ...s.events],
      lastError: null,
    }));
    return { ok: true };
  },
  startTask: (taskId, actor) => get().transition(taskId, "IN_PROGRESS", actor, "开始执行任务"),
  completeTask: (taskId, actor, result) => get().transition(taskId, "COMPLETED", actor, result),
  cancelTask: (taskId, actor) => get().transition(taskId, "CANCELLED", actor, "经授权取消任务"),
  skipTask: (taskId, actor) => get().transition(taskId, "SKIPPED", actor, "非必需任务跳过"),
  reset: () => set({ tasks: ALL_TASKS, events: [], lastError: null }),
}));
