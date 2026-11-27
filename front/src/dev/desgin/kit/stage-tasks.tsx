import type { ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIZ, mix } from "./tokens";

/**
 * 本阶段任务 · Linear-quiet 候选
 * 只在 /dev/desgin/tasks 预览，不接入业务页。
 */

export type KitTaskState = "done" | "ready" | "pending" | "running";

export type KitTask = {
  id: string;
  name: string;
  role: string;
  assignee: string;
  due: string;
  state: KitTaskState;
  overdue?: boolean;
};

export type KitTheme = {
  page: string;
  card: string;
  soft: string;
  ink: string;
  muted: string;
  line: string;
  lineStrong: string;
  risk: string;
  onInk: string;
  shadow: string;
  font: string;
};

export const THEME_LIGHT: KitTheme = {
  page: VIZ.page,
  card: VIZ.card,
  soft: VIZ.soft,
  ink: VIZ.ink,
  muted: VIZ.muted,
  line: VIZ.line,
  lineStrong: VIZ.lineStrong,
  risk: VIZ.down,
  onInk: VIZ.onAccent,
  shadow: VIZ.shadowCard,
  font: VIZ.font,
};

/** 对齐 Clinical Workspace dark canvas */
export const THEME_DARK: KitTheme = {
  page: "#0f1012",
  card: "#161618",
  soft: "#1c1c1f",
  ink: "#ececee",
  muted: "#8b8b93",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  risk: "#e85d5d",
  onInk: "#0f1012",
  shadow: "0 1px 2px rgba(0,0,0,.35)",
  font: VIZ.font,
};

const STATE_LABEL: Record<KitTaskState, string> = {
  done: "已完成",
  ready: "可执行",
  pending: "待执行",
  running: "执行中",
};

function Shell({
  title,
  subtitle,
  theme,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  theme: KitTheme;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-[10px] border p-4", className)}
      style={{
        background: theme.card,
        borderColor: theme.line,
        boxShadow: theme.shadow,
        fontFamily: theme.font,
        color: theme.ink,
      }}
    >
      <div className="mb-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-0.5 text-[12px]" style={{ color: theme.muted }}>
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

function PanelHead({
  theme,
  stage,
  done,
  total,
  overdue,
}: {
  theme: KitTheme;
  stage: string;
  done: number;
  total: number;
  overdue: number;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.04em] uppercase" style={{ color: theme.muted }}>
          本阶段任务
        </p>
        <p className="mt-0.5 truncate text-[14px] font-medium tracking-[-0.02em]">{stage}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[12px]">
        {overdue > 0 && (
          <span className="font-medium" style={{ color: theme.risk }}>
            超时 {overdue}
          </span>
        )}
        <span className="font-mono tabular-nums" style={{ color: theme.muted }}>
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

function StatusMark({ state, overdue, theme }: { state: KitTaskState; overdue?: boolean; theme: KitTheme }) {
  if (state === "done") {
    return (
      <span
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full"
        style={{ background: theme.ink, color: theme.onInk }}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (overdue) {
    return (
      <span
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: theme.risk }}
      >
        <span className="size-1.5 rounded-full" style={{ background: theme.risk }} />
      </span>
    );
  }
  if (state === "ready" || state === "running") {
    return (
      <span
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: theme.ink }}
      >
        <Circle className="size-1.5 fill-current" style={{ color: theme.ink }} />
      </span>
    );
  }
  return (
    <span
      className="flex size-[18px] shrink-0 items-center justify-center rounded-full border"
      style={{ borderColor: theme.lineStrong }}
    />
  );
}

/** A · Queue：待办置顶加重，已完成下沉变淡 */
export function StageTasksQueue({
  tasks,
  stage,
  theme = THEME_LIGHT,
  onSelect,
}: {
  tasks: KitTask[];
  stage: string;
  theme?: KitTheme;
  onSelect?: (id: string) => void;
}) {
  const open = tasks.filter((t) => t.state !== "done");
  const done = tasks.filter((t) => t.state === "done");
  const overdue = open.filter((t) => t.overdue).length;

  return (
    <Shell title="A · Queue" subtitle="待办置顶 · 已完成下沉 · 去掉类型图标墙" theme={theme}>
      <PanelHead
        theme={theme}
        stage={stage}
        done={done.length}
        total={tasks.length}
        overdue={overdue}
      />

      <div className="space-y-1">
        {open.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect?.(t.id)}
            className="flex w-full items-start gap-2.5 rounded-md px-2 py-2.5 text-left transition-colors"
            style={{
              background: t.overdue ? mix(theme.risk, 0.08) : theme.soft,
              boxShadow: t.overdue ? `inset 2px 0 0 ${theme.risk}` : undefined,
            }}
          >
            <StatusMark state={t.state} overdue={t.overdue} theme={theme} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium tracking-[-0.01em]">{t.name}</span>
                {t.overdue && (
                  <span className="shrink-0 text-[11px] font-medium" style={{ color: theme.risk }}>
                    超时
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11px]" style={{ color: theme.muted }}>
                {t.role} · {t.assignee}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span
                className="block text-[11px] font-medium"
                style={{ color: t.overdue ? theme.risk : theme.ink }}
              >
                {STATE_LABEL[t.state]}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] tabular-nums" style={{ color: theme.muted }}>
                {t.due}
              </span>
            </span>
          </button>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 px-2 text-[11px]" style={{ color: theme.muted }}>
            已完成 · {done.length}
          </p>
          <ul>
            {done.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(t.id)}
                  className="flex w-full items-center gap-2.5 px-2 py-1.5 text-left opacity-55 transition-opacity hover:opacity-90"
                >
                  <StatusMark state="done" theme={theme} />
                  <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: theme.muted }}>
                    {t.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: theme.muted }}>
                    {t.due}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}

/** B · Issue：单列 Linear 行，状态点 + 语义截止 */
export function StageTasksIssue({
  tasks,
  stage,
  theme = THEME_LIGHT,
  selectedId,
  onSelect,
}: {
  tasks: KitTask[];
  stage: string;
  theme?: KitTheme;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const done = tasks.filter((t) => t.state === "done").length;
  const overdue = tasks.filter((t) => t.overdue && t.state !== "done").length;
  const ordered = [...tasks].sort((a, b) => {
    const rank = (t: KitTask) => (t.overdue && t.state !== "done" ? 0 : t.state === "done" ? 2 : 1);
    return rank(a) - rank(b);
  });

  return (
    <Shell title="B · Issue" subtitle="单列 issue 行 · 选中浅底 · 截止语义色" theme={theme}>
      <PanelHead theme={theme} stage={stage} done={done} total={tasks.length} overdue={overdue} />
      <ul style={{ borderTop: `1px solid ${theme.line}` }}>
        {ordered.map((t) => {
          const selected = selectedId === t.id;
          const open = t.state !== "done";
          return (
            <li key={t.id} style={{ borderBottom: `1px solid ${theme.line}` }}>
              <button
                type="button"
                onClick={() => onSelect?.(t.id)}
                className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left transition-colors"
                style={{
                  background: selected ? theme.soft : "transparent",
                  boxShadow: selected ? `inset 2px 0 0 ${theme.ink}` : undefined,
                }}
              >
                <StatusMark state={t.state} overdue={t.overdue && open} theme={theme} />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[13px] font-medium tracking-[-0.01em]"
                    style={{ color: open ? theme.ink : theme.muted }}
                  >
                    {t.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px]" style={{ color: theme.muted }}>
                    {t.role} · {t.assignee}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className="block text-[11px]"
                    style={{
                      color: t.overdue && open ? theme.risk : open ? theme.ink : theme.muted,
                      fontWeight: open ? 500 : 400,
                    }}
                  >
                    {t.overdue && open ? "超时" : STATE_LABEL[t.state]}
                  </span>
                  <span
                    className="mt-0.5 block font-mono text-[10px] tabular-nums"
                    style={{ color: t.overdue && open ? theme.risk : theme.muted }}
                  >
                    {t.due}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

/** C · Checklist：极密勾选表，适合窄主面 */
export function StageTasksChecklist({
  tasks,
  stage,
  theme = THEME_LIGHT,
  onSelect,
}: {
  tasks: KitTask[];
  stage: string;
  theme?: KitTheme;
  onSelect?: (id: string) => void;
}) {
  const done = tasks.filter((t) => t.state === "done").length;
  const overdue = tasks.filter((t) => t.overdue && t.state !== "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <Shell title="C · Checklist" subtitle="极密勾选 · 顶部分段进度 · 无图标" theme={theme}>
      <PanelHead theme={theme} stage={stage} done={done} total={tasks.length} overdue={overdue} />
      <div className="mb-2.5 h-1 overflow-hidden rounded-full" style={{ background: theme.soft }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.ink }} />
      </div>
      <ul>
        {tasks.map((t) => {
          const open = t.state !== "done";
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect?.(t.id)}
                className="group flex w-full items-center gap-2 py-1.5 text-left"
              >
                <StatusMark state={t.state} overdue={t.overdue && open} theme={theme} />
                <span
                  className={cn("min-w-0 flex-1 truncate text-[13px]", open ? "font-medium" : "")}
                  style={{
                    color: open ? theme.ink : theme.muted,
                    textDecoration: t.state === "done" ? "line-through" : undefined,
                    textDecorationColor: mix(theme.muted, 0.5),
                  }}
                >
                  {t.name}
                </span>
                {t.overdue && open ? (
                  <span className="shrink-0 text-[11px] font-medium" style={{ color: theme.risk }}>
                    超时
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: theme.muted }}>
                    {t.due}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

/** D · Focus next：只突出下一项，其余折叠为计数 */
export function StageTasksFocus({
  tasks,
  stage,
  theme = THEME_LIGHT,
}: {
  tasks: KitTask[];
  stage: string;
  theme?: KitTheme;
}) {
  const next =
    tasks.find((t) => t.overdue && t.state !== "done") ??
    tasks.find((t) => t.state === "ready" || t.state === "running") ??
    tasks.find((t) => t.state === "pending");
  const done = tasks.filter((t) => t.state === "done").length;
  const open = tasks.filter((t) => t.state !== "done");
  const overdue = open.filter((t) => t.overdue).length;
  const rest = open.filter((t) => t.id !== next?.id);

  return (
    <Shell title="D · Next" subtitle="只展开下一项 · 其余计数 · 医生主路径最克制" theme={theme}>
      <PanelHead theme={theme} stage={stage} done={done} total={tasks.length} overdue={overdue} />

      {next ? (
        <div
          className="rounded-lg border px-3.5 py-3"
          style={{
            borderColor: next.overdue ? mix(theme.risk, 0.45) : theme.lineStrong,
            background: next.overdue ? mix(theme.risk, 0.08) : theme.soft,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px]" style={{ color: theme.muted }}>
              下一步
            </p>
            {next.overdue ? (
              <span className="text-[11px] font-medium" style={{ color: theme.risk }}>
                已超时
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: theme.muted }}>
                {STATE_LABEL[next.state]}
              </span>
            )}
          </div>
          <p className="mt-1 text-[16px] font-semibold tracking-[-0.03em]">{next.name}</p>
          <p className="mt-1 text-[12px]" style={{ color: theme.muted }}>
            {next.role} · {next.assignee} · 截止{" "}
            <span className="font-mono tabular-nums" style={{ color: next.overdue ? theme.risk : theme.muted }}>
              {next.due}
            </span>
          </p>
          <button
            type="button"
            className="mt-3 inline-flex h-8 items-center rounded-md px-3 text-[12px] font-medium"
            style={{ background: theme.ink, color: theme.onInk }}
          >
            开始执行
          </button>
        </div>
      ) : (
        <p className="py-6 text-center text-[13px]" style={{ color: theme.muted }}>
          本阶段已全部完成
        </p>
      )}

      {rest.length > 0 && (
        <p className="mt-3 text-[12px]" style={{ color: theme.muted }}>
          另有待办 {rest.length}：{rest.map((t) => t.name).join(" · ")}
        </p>
      )}
    </Shell>
  );
}
