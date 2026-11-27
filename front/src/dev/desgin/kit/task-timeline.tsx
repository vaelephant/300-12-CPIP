import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { THEME_LIGHT, type KitTheme } from "./stage-tasks";

/**
 * 任务时间轴 · 组件库
 * - KitTimeRangePills：今天 / 本周 / 本月 / 自定义
 * - KitTaskTimeline：Notion 风格日/周/月条带
 * 预览：/dev/desgin/timeline
 * 业务接入：pages/tasks（列表 / 时间轴 / 看板共用时间维）
 */

export type KitTimeRangeKey = "today" | "week" | "month" | "custom";

export type KitTimelineTone = "neutral" | "ok" | "risk" | "warn" | "info";

export type KitTimelineItem = {
  id: string;
  name: string;
  subtitle?: string;
  href?: string;
  start: string;
  end: string;
  overdue?: boolean;
  tone?: KitTimelineTone;
};

export type KitTimeWindow = {
  start: Date;
  end: Date;
  mode: "hours" | "days";
  label: string;
};

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const RANGE_OPTIONS: { key: KitTimeRangeKey; label: string }[] = [
  { key: "today", label: "今天" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "custom", label: "自定义" },
];

export const KIT_DAY_HOUR_START = 7;
export const KIT_DAY_HOUR_END = 22;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtShortDate(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtShortTime(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeekMonday(d = new Date()) {
  const day = startOfLocalDay(d);
  const wd = day.getDay();
  const delta = wd === 0 ? -6 : 1 - wd;
  day.setDate(day.getDate() + delta);
  return day;
}

export function endOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateInput(value: string, end = false) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
}

export function overlapsKitTimeWindow(startIso: string, endIso: string, rangeStart: Date, rangeEnd: Date) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return end >= rangeStart && start <= rangeEnd;
}

export function resolveKitTimeWindow(
  key: KitTimeRangeKey,
  customFrom: string,
  customTo: string,
): KitTimeWindow {
  const now = new Date();
  if (key === "today") {
    return {
      start: startOfLocalDay(now),
      end: endOfLocalDay(now),
      mode: "hours",
      label: fmtShortDate(now),
    };
  }
  if (key === "week") {
    const start = startOfWeekMonday(now);
    const end = endOfLocalDay(new Date(start.getTime() + 6 * 24 * 3600_000));
    return {
      start,
      end,
      mode: "days",
      label: `${fmtShortDate(start)} – ${fmtShortDate(end)}`,
    };
  }
  if (key === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return {
      start,
      end,
      mode: "days",
      label: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
    };
  }
  const from = parseDateInput(customFrom) ?? startOfLocalDay(now);
  const to = parseDateInput(customTo, true) ?? endOfLocalDay(now);
  const start = from <= to ? from : startOfLocalDay(to);
  const end = from <= to ? to : endOfLocalDay(from);
  return {
    start,
    end,
    mode: "days",
    label: `${fmtShortDate(start)} – ${fmtShortDate(end)}`,
  };
}

function buildDayTicks(start: Date, end: Date) {
  const ticks: { at: Date; label: string }[] = [];
  const cursor = startOfLocalDay(start);
  const last = startOfLocalDay(end);
  while (cursor <= last) {
    ticks.push({
      at: new Date(cursor),
      label: `${cursor.getMonth() + 1}/${cursor.getDate()}周${WEEKDAY_LABELS[cursor.getDay()]}`,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return ticks;
}

function toneClass(tone: KitTimelineTone | undefined, overdue: boolean | undefined, theme: KitTheme) {
  if (overdue) {
    return {
      border: `1px solid ${theme.risk}66`,
      background: `${theme.risk}18`,
      color: theme.risk,
    };
  }
  if (tone === "ok") {
    return {
      border: `1px solid ${theme.ink}22`,
      background: `${theme.ink}10`,
      color: theme.ink,
    };
  }
  return {
    border: `1px solid ${theme.lineStrong}`,
    background: theme.card,
    color: theme.ink,
    boxShadow: theme.shadow,
  };
}

/** 顶栏时间维：今天 / 本周 / 本月 / 自定义 */
export function KitTimeRangePills({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  theme = THEME_LIGHT,
  className,
}: {
  value: KitTimeRangeKey;
  onChange: (key: KitTimeRangeKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  theme?: KitTheme;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} style={{ fontFamily: theme.font }}>
      <div className="flex flex-wrap items-center gap-1">
        {RANGE_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key === "custom" && value !== "custom") {
                  const weekStart = startOfWeekMonday();
                  onCustomFromChange(toDateInputValue(weekStart));
                  onCustomToChange(toDateInputValue(new Date(weekStart.getTime() + 6 * 24 * 3600_000)));
                }
                onChange(opt.key);
              }}
              className="inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-medium transition-colors"
              style={{
                background: active ? theme.soft : "transparent",
                color: active ? theme.ink : theme.muted,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {value === "custom" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="h-7 rounded-md border px-2 text-[12px] outline-none"
            style={{ borderColor: theme.line, background: theme.card, color: theme.ink }}
          />
          <span className="text-[11px]" style={{ color: theme.muted }}>
            至
          </span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="h-7 rounded-md border px-2 text-[12px] outline-none"
            style={{ borderColor: theme.line, background: theme.card, color: theme.ink }}
          />
        </div>
      )}
    </div>
  );
}

/** Notion 风格任务时间轴（日小时 / 周日 / 月日） */
export function KitTaskTimeline({
  items,
  window,
  rangeKey,
  theme = THEME_LIGHT,
  dayHourStart = KIT_DAY_HOUR_START,
  dayHourEnd = KIT_DAY_HOUR_END,
  labelWidth = 200,
  rowHeight = 40,
  empty,
  className,
}: {
  items: KitTimelineItem[];
  window: KitTimeWindow;
  rangeKey: KitTimeRangeKey;
  theme?: KitTheme;
  dayHourStart?: number;
  dayHourEnd?: number;
  labelWidth?: number;
  rowHeight?: number;
  empty?: ReactNode;
  className?: string;
}) {
  const daySpanMin = (dayHourEnd - dayHourStart) * 60;

  const axisStart =
    window.mode === "hours"
      ? (() => {
          const s = startOfLocalDay(window.start);
          s.setHours(dayHourStart, 0, 0, 0);
          return s;
        })()
      : window.start;
  const axisEnd =
    window.mode === "hours"
      ? (() => {
          const e = startOfLocalDay(window.start);
          e.setHours(dayHourEnd, 0, 0, 0);
          return e;
        })()
      : window.end;

  const axisStartMs = axisStart.getTime();
  const axisEndMs = axisEnd.getTime();
  const spanMs = Math.max(axisEndMs - axisStartMs, 60_000);

  const nowPct = ((Date.now() - axisStartMs) / spanMs) * 100;
  const showNow = nowPct >= 0 && nowPct <= 100;

  const hourTicks =
    window.mode === "hours"
      ? Array.from({ length: dayHourEnd - dayHourStart + 1 }, (_, i) => dayHourStart + i)
      : [];
  const dayTicks = window.mode === "days" ? buildDayTicks(axisStart, axisEnd) : [];

  const rows = useMemo(() => {
    const nowMs = Date.now();
    return items
      .map((item) => {
        let startMs = new Date(item.start).getTime();
        let endMs = new Date(item.end).getTime();
        if (item.overdue && endMs < axisStartMs) {
          startMs = axisStartMs;
          endMs = Math.min(axisEndMs, Math.max(startMs + 45 * 60_000, nowMs));
        }
        startMs = Math.max(axisStartMs, Math.min(axisEndMs - 15 * 60_000, startMs));
        endMs = Math.max(startMs + 20 * 60_000, Math.min(axisEndMs, endMs));
        return {
          item,
          left: ((startMs - axisStartMs) / spanMs) * 100,
          width: Math.max(((endMs - startMs) / spanMs) * 100, window.mode === "hours" ? 2.5 : 1.2),
        };
      })
      .sort((a, b) => a.left - b.left);
  }, [items, axisStartMs, axisEndMs, spanMs, window.mode]);

  const minWidth =
    window.mode === "hours" ? 920 : Math.max(960, dayTicks.length * (rangeKey === "month" ? 36 : 88));

  if (items.length === 0) {
    return (
      empty ?? (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: theme.muted, fontFamily: theme.font }}>
          该时间范围内暂无任务
        </div>
      )
    );
  }

  return (
    <div className={cn("p-3", className)} style={{ fontFamily: theme.font, color: theme.ink }}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[12px]" style={{ color: theme.muted }}>
        <span>
          {window.label} · {rows.length} 项
        </span>
        {window.mode === "hours" ? (
          <span className="font-mono text-[11px]">
            {pad2(dayHourStart)}:00 – {pad2(dayHourEnd)}:00
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-[10px] border scrollbar-slim" style={{ borderColor: theme.line }}>
        <div style={{ minWidth }}>
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: `${labelWidth}px minmax(0,1fr)`,
              borderColor: theme.line,
              background: theme.soft,
            }}
          >
            <div className="px-3 py-2 text-[11px]" style={{ color: theme.muted }}>
              任务
            </div>
            <div className="relative h-8 border-l" style={{ borderColor: theme.line }}>
              {window.mode === "hours"
                ? hourTicks.map((h) => {
                    const left = ((h - dayHourStart) * 60) / daySpanMin;
                    return (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0 border-l"
                        style={{ left: `${left * 100}%`, borderColor: theme.line }}
                      >
                        <span
                          className="absolute top-1.5 left-1.5 font-mono text-[10px]"
                          style={{ color: theme.muted }}
                        >
                          {pad2(h)}
                        </span>
                      </div>
                    );
                  })
                : dayTicks.map((tick) => {
                    const left = ((tick.at.getTime() - axisStartMs) / spanMs) * 100;
                    return (
                      <div
                        key={tick.at.toISOString()}
                        className="absolute top-0 bottom-0 border-l"
                        style={{ left: `${left}%`, borderColor: theme.line }}
                      >
                        <span
                          className="absolute top-1.5 left-1.5 whitespace-nowrap text-[10px]"
                          style={{ color: theme.muted }}
                        >
                          {tick.label}
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr)` }}>
            <div className="divide-y" style={{ borderColor: theme.line }}>
              {rows.map(({ item }) => {
                const title = (
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{item.name}</p>
                    {item.subtitle ? (
                      <p className="truncate text-[10px]" style={{ color: theme.muted }}>
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3"
                    style={{ height: rowHeight, borderColor: theme.line }}
                  >
                    {item.href ? (
                      <Link to={item.href} className="min-w-0 hover:opacity-80">
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </div>
                );
              })}
            </div>

            <div className="relative border-l" style={{ height: rows.length * rowHeight, borderColor: theme.line }}>
              {window.mode === "hours"
                ? hourTicks.map((h) => {
                    const left = ((h - dayHourStart) * 60) / daySpanMin;
                    return (
                      <div
                        key={h}
                        className="pointer-events-none absolute inset-y-0 border-l"
                        style={{ left: `${left * 100}%`, borderColor: `${theme.line}` }}
                      />
                    );
                  })
                : dayTicks.map((tick) => {
                    const left = ((tick.at.getTime() - axisStartMs) / spanMs) * 100;
                    return (
                      <div
                        key={tick.at.toISOString()}
                        className="pointer-events-none absolute inset-y-0 border-l"
                        style={{ left: `${left}%`, borderColor: theme.line }}
                      />
                    );
                  })}

              {showNow && (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px"
                  style={{ left: `${nowPct}%`, background: theme.risk }}
                >
                  <span
                    className="absolute top-1 left-1 rounded-sm px-1 py-px font-mono text-[9px] text-white"
                    style={{ background: theme.risk }}
                  >
                    现在
                  </span>
                </div>
              )}

              {rows.map(({ item, left, width }, index) => {
                const style = toneClass(item.tone, item.overdue, theme);
                const barLabel =
                  window.mode === "hours"
                    ? `${fmtShortTime(item.start)}–${fmtShortTime(item.end)}`
                    : `${fmtShortDate(item.start)} ${fmtShortTime(item.start)}`;
                const body = (
                  <span className="truncate text-[11px] font-medium">{barLabel}</span>
                );
                const common = {
                  className:
                    "absolute z-10 flex items-center truncate rounded-md px-2 transition-opacity hover:opacity-90",
                  style: {
                    ...style,
                    left: `${left}%`,
                    width: `${width}%`,
                    top: index * rowHeight + 8,
                    height: rowHeight - 16,
                  } as CSSProperties,
                  title: `${item.name} · ${fmtShortDate(item.start)} ${fmtShortTime(item.start)} – ${fmtShortDate(item.end)} ${fmtShortTime(item.end)}`,
                };
                return item.href ? (
                  <Link key={item.id} to={item.href} {...common}>
                    {body}
                  </Link>
                ) : (
                  <div key={item.id} {...common}>
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
