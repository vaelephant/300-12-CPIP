import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mix } from "./tokens";
import { THEME_DARK, THEME_LIGHT, type KitTheme } from "./stage-tasks";

/**
 * 本阶段任务 · 甘特候选（Linear-quiet）
 * 预览：/dev/desgin/tasks
 */

export type KitGanttStatus = "done" | "active" | "pending" | "overdue";

export type KitGanttRow = {
  id: string;
  name: string;
  group?: string;
  role?: string;
  /** 计划起 */
  start: string;
  /** 计划止 */
  end: string;
  /** 实际起（可选） */
  actualStart?: string;
  /** 实际止（可选；执行中可省略） */
  actualEnd?: string;
  status: KitGanttStatus;
};

const STATUS_LABEL: Record<KitGanttStatus, string> = {
  done: "已完成",
  active: "执行中",
  pending: "待执行",
  overdue: "超时",
};

function Shell({
  title,
  subtitle,
  theme,
  children,
}: {
  title: string;
  subtitle: string;
  theme: KitTheme;
  children: ReactNode;
}) {
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

function useDomain(rows: KitGanttRow[], now?: string) {
  return useMemo(() => {
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
}

function dayTicks(domain: { start: number; end: number }) {
  const ticks: { ts: number; label: string }[] = [];
  const cursor = new Date(domain.start);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor.getTime() < domain.end) {
    ticks.push({ ts: cursor.getTime(), label: shortDay(cursor.getTime()) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return ticks;
}

/** E · Gantt：左任务名 + 计划/实际双条，墨色，超时才暖 */
export function StageTasksGantt({
  rows,
  stage,
  now,
  theme = THEME_LIGHT,
  labelWidth = 168,
  maxHeight = 320,
  onSelect,
  selectedId,
}: {
  rows: KitGanttRow[];
  stage?: string;
  now?: string;
  theme?: KitTheme;
  labelWidth?: number;
  maxHeight?: number;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const domain = useDomain(rows, now);
  const span = domain.end - domain.start;
  const pct = (ts: number) => ((ts - domain.start) / span) * 100;
  const ticks = useMemo(() => dayTicks(domain), [domain]);
  const tickStep = Math.max(1, Math.ceil(ticks.length / 6));
  const nowTs = now ? +new Date(now) : null;
  const done = rows.filter((r) => r.status === "done").length;
  const overdue = rows.filter((r) => r.status === "overdue").length;

  let lastGroup: string | undefined;

  return (
    <Shell title="E · Gantt" subtitle="时间轴甘特 · 计划浅条 / 实际实条 · 现在线" theme={theme}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.04em] uppercase" style={{ color: theme.muted }}>
            本阶段任务
          </p>
          <p className="mt-0.5 truncate text-[14px] font-medium tracking-[-0.02em]">
            {stage ?? "当前阶段"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[12px]">
          {overdue > 0 && (
            <span className="font-medium" style={{ color: theme.risk }}>
              超时 {overdue}
            </span>
          )}
          <span className="font-mono tabular-nums" style={{ color: theme.muted }}>
            {done}/{rows.length}
          </span>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: theme.line }}
      >
        {/* axis */}
        <div className="flex border-b" style={{ height: 28, borderColor: theme.line, background: theme.soft }}>
          <div
            className="flex shrink-0 items-center border-r px-3 font-mono text-[10px] tracking-wide uppercase"
            style={{ width: labelWidth, borderColor: theme.line, color: theme.muted }}
          >
            任务
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

        <div className="overflow-y-auto" style={{ maxHeight }}>
          {rows.map((row) => {
            const showGroup = Boolean(row.group && row.group !== lastGroup);
            if (row.group) lastGroup = row.group;
            const tone = barTone(row.status, theme);
            const start = +new Date(row.start);
            const end = +new Date(row.end);
            const left = pct(start);
            const width = Math.max(pct(end) - left, 0.6);
            const aStart = row.actualStart ? +new Date(row.actualStart) : null;
            const aEnd = row.actualEnd
              ? +new Date(row.actualEnd)
              : row.status === "active" || row.status === "overdue"
                ? nowTs
                : null;
            const aLeft = aStart !== null ? pct(aStart) : left;
            const aWidth =
              aStart !== null && aEnd !== null ? Math.max(pct(aEnd) - aLeft, 0.5) : 0;
            const selected = selectedId === row.id;

            return (
              <div key={row.id}>
                {showGroup && (
                  <div
                    className="border-t px-3 py-1 text-[11px] font-medium"
                    style={{ borderColor: theme.line, background: theme.soft, color: theme.muted }}
                  >
                    {row.group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelect?.(row.id)}
                  className="flex w-full items-center border-t text-left transition-colors"
                  style={{
                    height: 40,
                    borderColor: theme.line,
                    background: selected ? theme.soft : "transparent",
                    boxShadow: selected ? `inset 2px 0 0 ${theme.ink}` : undefined,
                  }}
                >
                  <div
                    className="flex shrink-0 items-center gap-2 border-r px-3"
                    style={{ width: labelWidth, borderColor: theme.line }}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          row.status === "overdue"
                            ? theme.risk
                            : row.status === "pending"
                              ? theme.lineStrong
                              : theme.ink,
                      }}
                    />
                    <div className="min-w-0">
                      <p
                        className="truncate text-[12px] font-medium tracking-[-0.01em]"
                        style={{
                          color: row.status === "pending" ? theme.muted : theme.ink,
                        }}
                      >
                        {row.name}
                      </p>
                      <p className="truncate text-[10px]" style={{ color: theme.muted }}>
                        {STATUS_LABEL[row.status]}
                        {row.role ? ` · ${row.role}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="relative h-full flex-1">
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
                    {/* planned */}
                    <span
                      className="absolute top-[12px] h-[7px] rounded-[2px]"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: 6,
                        background: tone.soft,
                      }}
                    />
                    {/* actual */}
                    {aWidth > 0 && (
                      <span
                        className="absolute top-[21px] h-[5px] rounded-[2px]"
                        style={{
                          left: `${aLeft}%`,
                          width: `${aWidth}%`,
                          minWidth: 4,
                          background: tone.fill,
                        }}
                      />
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-[10px]"
          style={{ borderColor: theme.line, background: theme.soft, color: theme.muted }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[5px] w-4 rounded-[1px]" style={{ background: mix(theme.ink, 0.14) }} />
            计划
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[4px] w-4 rounded-[1px]" style={{ background: theme.ink }} />
            实际
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[4px] w-4 rounded-[1px]" style={{ background: theme.risk }} />
            超时
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-px" style={{ background: mix(theme.risk, 0.7) }} />
            现在
          </span>
        </div>
      </div>
    </Shell>
  );
}

/** F · Swimlane：阶段为泳道，任务为条块（更像路径总览甘特） */
export function StageTasksSwimlane({
  rows,
  now,
  theme = THEME_LIGHT,
  onSelect,
  selectedId,
}: {
  rows: KitGanttRow[];
  now?: string;
  theme?: KitTheme;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const domain = useDomain(rows, now);
  const span = domain.end - domain.start;
  const pct = (ts: number) => ((ts - domain.start) / span) * 100;
  const ticks = useMemo(() => dayTicks(domain), [domain]);
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
    <Shell title="F · Swimlane" subtitle="阶段泳道 · 任务条落在时间轴上 · 适合路径总览" theme={theme}>
      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: theme.line }}
      >
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

        {lanes.map(([group, items]) => (
          <div key={group} className="flex border-t" style={{ borderColor: theme.line, minHeight: 56 }}>
            <div
              className="flex w-[112px] shrink-0 items-start border-r px-3 pt-3"
              style={{ borderColor: theme.line }}
            >
              <div>
                <p className="text-[12px] font-medium">{group}</p>
                <p className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: theme.muted }}>
                  {items.filter((i) => i.status === "done").length}/{items.length}
                </p>
              </div>
            </div>
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
                const selected = selectedId === row.id;
                const top = 6 + (idx % 3) * 14;
                return (
                  <button
                    key={row.id}
                    type="button"
                    title={`${row.name} · ${STATUS_LABEL[row.status]}`}
                    onClick={() => onSelect?.(row.id)}
                    className={cn(
                      "absolute h-[12px] truncate rounded-[3px] px-1.5 text-left text-[9px] leading-[12px] transition-opacity",
                      selected && "ring-1 ring-offset-0",
                    )}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: 28,
                      top,
                      background: tone.fill,
                      color: row.status === "pending" ? theme.ink : theme.onInk,
                      opacity: row.status === "pending" ? 0.55 : 1,
                      // ring uses CSS; approximate selected with outline
                      outline: selected ? `1px solid ${theme.ink}` : undefined,
                      outlineOffset: 1,
                    }}
                  >
                    {row.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export { THEME_DARK, THEME_LIGHT };
