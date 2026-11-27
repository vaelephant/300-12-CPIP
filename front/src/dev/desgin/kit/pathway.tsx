import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIZ, mix } from "./tokens";

export type KitStageState = "done" | "active" | "pending" | "blocked";

export type KitStage = {
  id: string;
  name: string;
  state: KitStageState;
  done: number;
  total: number;
  overdue?: number;
};

/**
 * Pathway stage candidates · Linear-quiet
 * 只在 /dev/desgin 预览，不接入业务页。
 */

const STATE_LABEL: Record<KitStageState, string> = {
  done: "已完成",
  active: "执行中",
  pending: "待执行",
  blocked: "阻塞",
};

function StageShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-[10px] border p-4", className)}
      style={{
        background: VIZ.card,
        borderColor: VIZ.line,
        boxShadow: VIZ.shadowCard,
        fontFamily: VIZ.font,
      }}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: VIZ.ink }}>
            {title}
          </h3>
          <p className="mt-0.5 text-[12px]" style={{ color: VIZ.muted }}>
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** A · 脊柱轨：细线 + 节点，当前阶段唯一加重 */
export function PathwaySpine({
  stages,
  pathwayName,
  progress,
  onSelect,
}: {
  stages: KitStage[];
  pathwayName?: string;
  progress: number;
  onSelect?: (id: string) => void;
}) {
  const active = stages.find((s) => s.state === "active");
  return (
    <StageShell title="A · Spine" subtitle="细线节点 · 当前唯一加重 · 无色块卡片">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium tracking-[-0.02em]" style={{ color: VIZ.ink }}>
            {pathwayName ?? "临床路径"}
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: VIZ.muted }}>
            {active ? `当前 · ${active.name}` : "未开始"}
            {active?.overdue ? ` · 超时 ${active.overdue}` : ""}
          </p>
        </div>
        <span className="font-mono text-[12px] tabular-nums" style={{ color: VIZ.muted }}>
          {progress}%
        </span>
      </div>

      <div className="relative pt-1 pb-6">
        <div
          className="absolute top-[11px] right-3 left-3 h-px"
          style={{ background: VIZ.lineStrong }}
          aria-hidden
        />
        <div
          className="absolute top-[11px] left-3 h-px"
          style={{
            background: VIZ.ink,
            width: `${Math.max(0, Math.min(100, progress))}%`,
            maxWidth: "calc(100% - 1.5rem)",
          }}
          aria-hidden
        />
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
          {stages.map((s) => {
            const isActive = s.state === "active";
            const isDone = s.state === "done";
            const isBlocked = s.state === "blocked";
            return (
              <li key={s.id} className="flex flex-col items-center px-1">
                <button
                  type="button"
                  onClick={() => onSelect?.(s.id)}
                  className={cn(
                    "relative z-[1] flex size-[22px] items-center justify-center rounded-full border transition-transform",
                    isActive && "scale-110",
                  )}
                  style={{
                    background: isDone || isActive ? VIZ.ink : VIZ.card,
                    borderColor: isBlocked ? VIZ.down : isDone || isActive ? VIZ.ink : VIZ.lineStrong,
                    color: isDone || isActive ? VIZ.onAccent : VIZ.muted,
                    boxShadow: isActive ? `0 0 0 4px ${mix(VIZ.ink, 0.08)}` : undefined,
                  }}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${s.name} · ${STATE_LABEL[s.state]}`}
                >
                  {isDone ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: isActive ? VIZ.card : isBlocked ? VIZ.down : VIZ.lineStrong }}
                    />
                  )}
                </button>
                <p
                  className={cn(
                    "mt-2 max-w-full truncate text-center text-[11px] leading-4",
                    isActive ? "font-semibold" : "font-medium",
                  )}
                  style={{ color: isActive ? VIZ.ink : VIZ.muted }}
                >
                  {s.name}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: VIZ.muted }}>
                  {s.done}/{s.total}
                  {s.overdue ? (
                    <span style={{ color: VIZ.down }}> · {s.overdue}</span>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </StageShell>
  );
}

/** B · 分段条：一条进度切成阶段，标签在上 */
export function PathwaySegments({
  stages,
  pathwayName,
  progress,
  onSelect,
}: {
  stages: KitStage[];
  pathwayName?: string;
  progress: number;
  onSelect?: (id: string) => void;
}) {
  const weight = stages.map((s) => Math.max(1, s.total));
  const sum = weight.reduce((a, b) => a + b, 0);
  return (
    <StageShell title="B · Segments" subtitle="单条分段进度 · 标签置顶 · 适合一览">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-[14px] font-medium" style={{ color: VIZ.ink }}>
          {pathwayName ?? "临床路径"}
        </p>
        <span className="font-mono text-[12px] tabular-nums" style={{ color: VIZ.muted }}>
          {progress}%
        </span>
      </div>

      <div
        className="mb-2 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect?.(s.id)}
            className="min-w-0 text-left"
          >
            <p
              className={cn("truncate text-[11px]", s.state === "active" ? "font-semibold" : "font-medium")}
              style={{ color: s.state === "pending" ? VIZ.muted : VIZ.ink }}
            >
              {s.name}
            </p>
          </button>
        ))}
      </div>

      <div
        className="flex h-2 overflow-hidden rounded-full"
        style={{ background: VIZ.soft }}
        role="list"
      >
        {stages.map((s, i) => {
          const flex = weight[i];
          const fill =
            s.state === "done"
              ? VIZ.ink
              : s.state === "active"
                ? mix(VIZ.ink, 0.55)
                : s.state === "blocked"
                  ? VIZ.down
                  : "transparent";
          return (
            <button
              key={s.id}
              type="button"
              role="listitem"
              onClick={() => onSelect?.(s.id)}
              className="relative h-full border-r last:border-0"
              style={{
                flex,
                background: fill === "transparent" ? undefined : fill,
                borderColor: mix(VIZ.ink, 0.06),
              }}
              title={`${s.name} ${s.done}/${s.total}`}
            />
          );
        })}
      </div>

      <div
        className="mt-2 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => (
          <p key={s.id} className="truncate font-mono text-[10px] tabular-nums" style={{ color: VIZ.muted }}>
            {s.done}/{s.total}
            {s.overdue ? <span style={{ color: VIZ.down }}> ·超时</span> : null}
          </p>
        ))}
      </div>
    </StageShell>
  );
}

/** C · 里程碑列表：纵向，当前行高亮（最像 Linear issue 列表） */
export function PathwayMilestones({
  stages,
  pathwayName,
  progress,
  selectedId,
  onSelect,
}: {
  stages: KitStage[];
  pathwayName?: string;
  progress: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <StageShell title="C · Milestones" subtitle="纵向列表 · 当前行左侧墨线 · 最克制">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-[14px] font-medium" style={{ color: VIZ.ink }}>
          {pathwayName ?? "临床路径"}
        </p>
        <span className="font-mono text-[12px] tabular-nums" style={{ color: VIZ.muted }}>
          {progress}%
        </span>
      </div>
      <ul className="divide-y" style={{ borderColor: VIZ.line }}>
        {stages.map((s) => {
          const selected = selectedId === s.id || (!selectedId && s.state === "active");
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect?.(s.id)}
                className="flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors"
                style={{
                  background: selected ? VIZ.soft : "transparent",
                  boxShadow: selected ? `inset 2px 0 0 ${VIZ.ink}` : undefined,
                }}
              >
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor:
                      s.state === "blocked"
                        ? VIZ.down
                        : s.state === "done" || s.state === "active"
                          ? VIZ.ink
                          : VIZ.lineStrong,
                    background: s.state === "done" ? VIZ.ink : VIZ.card,
                    color: s.state === "done" ? VIZ.onAccent : VIZ.muted,
                  }}
                >
                  {s.state === "done" ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : s.state === "active" ? (
                    <span className="size-1.5 rounded-full" style={{ background: VIZ.ink }} />
                  ) : s.state === "blocked" ? (
                    <span className="size-1.5 rounded-full" style={{ background: VIZ.down }} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[13px] font-medium"
                    style={{ color: s.state === "pending" ? VIZ.muted : VIZ.ink }}
                  >
                    {s.name}
                  </span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: VIZ.muted }}>
                    {STATE_LABEL[s.state]}
                    {s.overdue ? ` · 超时 ${s.overdue}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums" style={{ color: VIZ.muted }}>
                  {s.done}/{s.total}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </StageShell>
  );
}

/** D · 当前焦点卡：只强调当前阶段，其余缩成点 */
export function PathwayFocus({
  stages,
  pathwayName,
  progress,
}: {
  stages: KitStage[];
  pathwayName?: string;
  progress: number;
}) {
  const idx = Math.max(
    0,
    stages.findIndex((s) => s.state === "active" || s.state === "blocked"),
  );
  const current = stages[idx] ?? stages[0];
  return (
    <StageShell title="D · Focus" subtitle="只展开当前阶段 · 其它缩成索引点">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-[14px] font-medium" style={{ color: VIZ.ink }}>
          {pathwayName ?? "临床路径"}
        </p>
        <span className="font-mono text-[12px] tabular-nums" style={{ color: VIZ.muted }}>
          {progress}%
        </span>
      </div>

      <div className="mb-3 flex items-center gap-1.5">
        {stages.map((s, i) => (
          <span
            key={s.id}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                i < idx ? VIZ.ink : i === idx ? mix(VIZ.ink, 0.45) : VIZ.soft,
            }}
          />
        ))}
      </div>

      <div
        className="rounded-lg border px-3.5 py-3"
        style={{ borderColor: VIZ.lineStrong, background: VIZ.soft }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px]" style={{ color: VIZ.muted }}>
            阶段 {idx + 1}/{stages.length}
          </p>
          {current.overdue ? (
            <span className="text-[11px] font-medium" style={{ color: VIZ.down }}>
              超时 {current.overdue}
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: VIZ.muted }}>
              {STATE_LABEL[current.state]}
            </span>
          )}
        </div>
        <p className="mt-1 text-[16px] font-semibold tracking-[-0.03em]" style={{ color: VIZ.ink }}>
          {current.name}
        </p>
        <p className="mt-1 font-mono text-[12px] tabular-nums" style={{ color: VIZ.muted }}>
          任务 {current.done}/{current.total} 完成
        </p>
      </div>

      <p className="mt-2 text-[11px]" style={{ color: VIZ.muted }}>
        前序 {stages.filter((s) => s.state === "done").length} · 后续{" "}
        {stages.filter((s) => s.state === "pending").length}
      </p>
    </StageShell>
  );
}
