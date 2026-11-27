import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { mix } from "./tokens";
import type { KitStage } from "./pathway";
import {
  THEME_DARK,
  THEME_LIGHT,
  type KitTheme,
} from "./stage-tasks";
import type { KitGanttRow, KitGanttStatus } from "./stage-gantt";

/**
 * B · Segments + F · Swimlane 组合
 * 上：阶段分段条 · 下：阶段泳道甘特 · 点选阶段联动高亮
 * 预览：/dev/desgin/combo
 */

const STATUS_LABEL: Record<KitGanttStatus, string> = {
  done: "已完成",
  active: "执行中",
  pending: "待执行",
  overdue: "超时",
};

function shortDay(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;
}

function barTone(status: KitGanttStatus, theme: KitTheme) {
  if (status === "overdue") return { fill: theme.risk, soft: mix(theme.risk, 0.18) };
  if (status === "done") return { fill: theme.ink, soft: mix(theme.ink, 0.12) };
  if (status === "active") return { fill: mix(theme.ink, 0.55), soft: mix(theme.ink, 0.14) };
  return { fill: mix(theme.ink, 0.22), soft: mix(theme.ink, 0.08) };
}

function SegmentsStrip({
  stages,
  pathwayName,
  progress,
  selectedId,
  theme,
  onSelect,
}: {
  stages: KitStage[];
  pathwayName: string;
  progress: number;
  selectedId?: string;
  theme: KitTheme;
  onSelect?: (id: string) => void;
}) {
  const weight = stages.map((s) => Math.max(1, s.total));
  const sum = weight.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.04em] uppercase" style={{ color: theme.muted }}>
            路径进度 · B Segments
          </p>
          <p className="mt-0.5 truncate text-[14px] font-medium tracking-[-0.02em]">{pathwayName}</p>
        </div>
        <span className="shrink-0 font-mono text-[12px] tabular-nums" style={{ color: theme.muted }}>
          {progress}%
        </span>
      </div>

      <div
        className="mb-2 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => {
          const active = selectedId === s.id || (!selectedId && s.state === "active");
          return (
            <button key={s.id} type="button" onClick={() => onSelect?.(s.id)} className="min-w-0 text-left">
              <p
                className={cn("truncate text-[11px]", active ? "font-semibold" : "font-medium")}
                style={{ color: s.state === "pending" && !active ? theme.muted : theme.ink }}
              >
                {s.name}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex h-2 overflow-hidden rounded-full" style={{ background: theme.soft }} role="list">
        {stages.map((s, i) => {
          const active = selectedId === s.id;
          const fill =
            s.state === "done"
              ? theme.ink
              : s.state === "active"
                ? mix(theme.ink, 0.55)
                : s.state === "blocked"
                  ? theme.risk
                  : "transparent";
          return (
            <button
              key={s.id}
              type="button"
              role="listitem"
              onClick={() => onSelect?.(s.id)}
              className="relative h-full border-r last:border-0"
              style={{
                flex: weight[i],
                background: fill === "transparent" ? undefined : fill,
                borderColor: mix(theme.ink, 0.08),
                boxShadow: active ? `inset 0 0 0 1px ${theme.ink}` : undefined,
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
          <p key={s.id} className="truncate font-mono text-[10px] tabular-nums" style={{ color: theme.muted }}>
            {s.done}/{s.total}
            {s.overdue ? <span style={{ color: theme.risk }}> ·超时</span> : null}
          </p>
        ))}
      </div>
    </div>
  );
}

function SwimlaneBody({
  rows,
  now,
  theme,
  activeGroup,
  selectedTaskId,
  onSelectTask,
  onSelectGroup,
}: {
  rows: KitGanttRow[];
  now?: string;
  theme: KitTheme;
  activeGroup?: string;
  selectedTaskId?: string;
  onSelectTask?: (id: string) => void;
  onSelectGroup?: (group: string) => void;
}) {
  const domain = useMemo(() => {
    const times: number[] = [];
    for (const r of rows) {
      times.push(+new Date(r.start), +new Date(r.end));
      if (r.actualStart) times.push(+new Date(r.actualStart));
      if (r.actualEnd) times.push(+new Date(r.actualEnd));
    }
    if (now) times.push(+new Date(now));
    const min = Math.min(...times);
    const max = Math.max(...times);
    const pad = Math.max((max - min) * 0.04, 2 * 3600_000);
    return { start: min - pad, end: max + pad };
  }, [rows, now]);

  const span = domain.end - domain.start;
  const pct = (ts: number) => ((ts - domain.start) / span) * 100;

  const ticks = useMemo(() => {
    const list: { ts: number; label: string }[] = [];
    const cursor = new Date(domain.start);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getTime() < domain.end) {
      list.push({ ts: cursor.getTime(), label: shortDay(cursor.getTime()) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [domain]);

  const tickStep = Math.max(1, Math.ceil(ticks.length / 6));
  const nowTs = now ? +new Date(now) : null;

  const lanes = useMemo(() => {
    const map = new Map<string, KitGanttRow[]>();
    for (const r of rows) {
      const key = r.group ?? "未分组";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.04em] uppercase" style={{ color: theme.muted }}>
          执行甘特 · F Swimlane
        </p>
        {activeGroup && (
          <button
            type="button"
            className="text-[11px]"
            style={{ color: theme.muted }}
            onClick={() => onSelectGroup?.(activeGroup)}
            title="再次点击可保持选中；点分段条其它阶段切换"
          >
            聚焦 · {activeGroup}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: theme.line }}>
        <div className="flex border-b" style={{ height: 28, borderColor: theme.line, background: theme.soft }}>
          <div
            className="flex w-[112px] shrink-0 items-center border-r px-3 font-mono text-[10px] uppercase"
            style={{ borderColor: theme.line, color: theme.muted }}
          >
            阶段
          </div>
          <div className="relative flex-1">
            {ticks.map((t, i) =>
              i % tickStep === 0 ? (
                <span
                  key={t.ts}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums"
                  style={{ left: `${pct(t.ts)}%`, color: theme.muted }}
                >
                  {t.label}
                </span>
              ) : null,
            )}
          </div>
        </div>

        {lanes.map(([group, items]) => {
          const focused = !activeGroup || activeGroup === group;
          return (
            <div
              key={group}
              className="flex border-t transition-opacity"
              style={{
                borderColor: theme.line,
                minHeight: 56,
                opacity: focused ? 1 : 0.28,
                background: activeGroup === group ? theme.soft : "transparent",
                boxShadow: activeGroup === group ? `inset 2px 0 0 ${theme.ink}` : undefined,
              }}
            >
              <button
                type="button"
                className="flex w-[112px] shrink-0 items-start border-r px-3 pt-3 text-left"
                style={{ borderColor: theme.line }}
                onClick={() => onSelectGroup?.(group)}
              >
                <div>
                  <p
                    className={cn("text-[12px]", activeGroup === group ? "font-semibold" : "font-medium")}
                  >
                    {group}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: theme.muted }}>
                    {items.filter((i) => i.status === "done").length}/{items.length}
                  </p>
                </div>
              </button>
              <div className="relative flex-1 py-2">
                {ticks.map((t) => (
                  <span
                    key={t.ts}
                    className="absolute top-0 bottom-0 border-l border-dashed"
                    style={{ left: `${pct(t.ts)}%`, borderColor: theme.line }}
                  />
                ))}
                {nowTs !== null && nowTs > domain.start && nowTs < domain.end && (
                  <span
                    className="absolute top-0 bottom-0 w-px"
                    style={{ left: `${pct(nowTs)}%`, background: mix(theme.risk, 0.7) }}
                  />
                )}
                {items.map((row, idx) => {
                  const tone = barTone(row.status, theme);
                  const left = pct(+new Date(row.start));
                  const width = Math.max(pct(+new Date(row.end)) - left, 1.2);
                  const selected = selectedTaskId === row.id;
                  const top = 6 + (idx % 3) * 14;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      title={`${row.name} · ${STATUS_LABEL[row.status]}`}
                      onClick={() => onSelectTask?.(row.id)}
                      className="absolute h-[12px] truncate rounded-[3px] px-1.5 text-left text-[9px] leading-[12px]"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: 28,
                        top,
                        background: tone.fill,
                        color: row.status === "pending" ? theme.ink : theme.onInk,
                        opacity: row.status === "pending" ? 0.55 : 1,
                        outline: selected ? `1px solid ${theme.ink}` : undefined,
                        outlineOffset: 1,
                        pointerEvents: focused ? "auto" : "none",
                      }}
                    >
                      {row.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-[10px]"
          style={{ borderColor: theme.line, background: theme.soft, color: theme.muted }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[4px] w-4 rounded-[1px]" style={{ background: theme.ink }} />
            任务条
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[4px] w-4 rounded-[1px]" style={{ background: theme.risk }} />
            超时
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-px" style={{ background: mix(theme.risk, 0.7) }} />
            现在
          </span>
          <span className="ml-auto">点分段条聚焦泳道</span>
        </div>
      </div>
    </div>
  );
}

/** 组合面板：B 在上 · F 在下 · 阶段联动 */
export function PathwaySegmentsSwimlaneCombo({
  stages,
  rows,
  pathwayName,
  progress,
  now,
  theme = THEME_LIGHT,
  selectedStageId,
  selectedTaskId,
  onSelectStage,
  onSelectTask,
}: {
  stages: KitStage[];
  rows: KitGanttRow[];
  pathwayName: string;
  progress: number;
  now?: string;
  theme?: KitTheme;
  selectedStageId?: string;
  selectedTaskId?: string;
  onSelectStage?: (id: string) => void;
  onSelectTask?: (id: string) => void;
}) {
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
  const activeGroup = selectedStageId ? stageById.get(selectedStageId)?.name : undefined;

  const handleStage = (id: string) => {
    // 再点同一阶段取消聚焦
    if (selectedStageId === id) onSelectStage?.("");
    else onSelectStage?.(id);
  };

  const handleGroup = (group: string) => {
    const match = stages.find((s) => s.name === group);
    if (!match) return;
    handleStage(match.id);
  };

  return (
    <section
      className="rounded-[10px] border p-4"
      style={{
        background: theme.card,
        borderColor: theme.line,
        boxShadow: theme.shadow,
        fontFamily: theme.font,
        color: theme.ink,
      }}
    >
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold tracking-[-0.02em]">B · Segments + F · Swimlane</h3>
        <p className="mt-0.5 text-[12px]" style={{ color: theme.muted }}>
          上分段看阶段权重 · 下泳道看时间并行 · 点选联动
        </p>
      </div>

      <SegmentsStrip
        stages={stages}
        pathwayName={pathwayName}
        progress={progress}
        selectedId={selectedStageId || undefined}
        theme={theme}
        onSelect={handleStage}
      />

      <div className="my-4 h-px" style={{ background: theme.line }} />

      <SwimlaneBody
        rows={rows}
        now={now}
        theme={theme}
        activeGroup={activeGroup}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        onSelectGroup={handleGroup}
      />
    </section>
  );
}

export { THEME_DARK, THEME_LIGHT };
