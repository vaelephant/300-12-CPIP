import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VIZ } from "./kit/tokens";
import { THEME_LIGHT } from "./kit/stage-tasks";
import {
  KitTaskTimeline,
  KitTimeRangePills,
  overlapsKitTimeWindow,
  resolveKitTimeWindow,
  toDateInputValue,
  startOfLocalDay,
  type KitTimeRangeKey,
  type KitTimelineItem,
} from "./kit/task-timeline";

function hoursFromNow(h: number, m = 0) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function daysFromToday(offset: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const FIXTURE: KitTimelineItem[] = [
  {
    id: "t1",
    name: "营养风险筛查",
    subtitle: "林思涵 · 术前评估",
    start: hoursFromNow(8, 0),
    end: hoursFromNow(9, 30),
    tone: "warn",
    href: "/tasks",
  },
  {
    id: "t2",
    name: "出院标准评估",
    subtitle: "林思涵 · 出院与随访",
    start: hoursFromNow(10, 0),
    end: hoursFromNow(11, 0),
    tone: "warn",
  },
  {
    id: "t3",
    name: "术前 ERAS 宣教",
    subtitle: "马东浩 · 术前检查",
    start: hoursFromNow(13, 0),
    end: hoursFromNow(14, 30),
    tone: "neutral",
  },
  {
    id: "t4",
    name: "MDT 讨论",
    subtitle: "王雅静 · 治疗方案确认",
    start: daysFromToday(1, 9, 0),
    end: daysFromToday(1, 11, 0),
    tone: "info",
  },
  {
    id: "t5",
    name: "术后多模式镇痛",
    subtitle: "陈志远 · 手术及术后",
    start: daysFromToday(2, 8, 0),
    end: daysFromToday(3, 18, 0),
    overdue: true,
    tone: "risk",
  },
  {
    id: "t6",
    name: "病理会诊",
    subtitle: "赵敏 · 术前检查",
    start: daysFromToday(5, 14, 0),
    end: daysFromToday(5, 16, 0),
    tone: "ok",
  },
  {
    id: "t7",
    name: "随访电话",
    subtitle: "周启明 · 出院与随访",
    start: daysFromToday(12, 10, 0),
    end: daysFromToday(12, 10, 30),
    tone: "neutral",
  },
];

/**
 * /dev/desgin/timeline · 任务时间维 + 时间轴组件库预览
 */
export default function TaskTimelineGalleryPage() {
  const [range, setRange] = useState<KitTimeRangeKey>("today");
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(startOfLocalDay()));
  const [customTo, setCustomTo] = useState(() => toDateInputValue(startOfLocalDay()));

  const window = useMemo(
    () => resolveKitTimeWindow(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const filtered = useMemo(
    () =>
      FIXTURE.filter(
        (item) =>
          overlapsKitTimeWindow(item.start, item.end, window.start, window.end) ||
          (item.overdue && range === "today"),
      ),
    [window, range],
  );

  return (
    <div className="min-h-screen" style={{ background: VIZ.page, color: VIZ.ink, fontFamily: VIZ.font }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-md"
        style={{ borderColor: VIZ.line, background: "rgba(248,248,246,0.9)" }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[-0.02em]">Timeline · 任务时间轴</h1>
            <p className="text-[12px]" style={{ color: VIZ.muted }}>
              /dev/desgin/timeline · KitTimeRangePills + KitTaskTimeline
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-[12px]">
            <Link
              to="/dev/desgin"
              className="rounded-md border px-2.5 py-1 transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.muted }}
            >
              Viz Kit
            </Link>
            <Link
              to="/dev/desgin/tasks"
              className="rounded-md border px-2.5 py-1 transition-colors hover:bg-white"
              style={{ borderColor: VIZ.line, color: VIZ.muted }}
            >
              Tasks
            </Link>
            <span
              className="rounded-md border px-2.5 py-1 font-medium"
              style={{ borderColor: VIZ.lineStrong, background: VIZ.card, color: VIZ.ink }}
            >
              Timeline
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-4 px-4 py-5 pb-20">
        <p className="max-w-2xl text-[13px] leading-5" style={{ color: VIZ.muted }}>
          时间维放在顶栏，对列表 / 时间轴 / 看板统一生效。时间轴本身只负责按当前窗口画条带；今天用白班小时轴，本周 /
          本月 / 自定义用日刻度。
        </p>

        <section
          className="overflow-hidden rounded-[10px] border"
          style={{ borderColor: VIZ.line, background: VIZ.card, boxShadow: VIZ.shadowCard }}
        >
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: VIZ.line }}>
            <KitTimeRangePills
              value={range}
              onChange={setRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
              theme={THEME_LIGHT}
            />
            <span className="ml-auto text-[12px]" style={{ color: VIZ.muted }}>
              筛选后 {filtered.length} / {FIXTURE.length}
            </span>
          </div>
          <KitTaskTimeline items={filtered} window={window} rangeKey={range} theme={THEME_LIGHT} />
        </section>

        <section
          className="rounded-[10px] border px-4 py-3 text-[12px] leading-5"
          style={{ borderColor: VIZ.line, background: VIZ.card, color: VIZ.muted }}
        >
          <p className="font-medium text-[13px]" style={{ color: VIZ.ink }}>
            导出
          </p>
          <p className="mt-1 font-mono text-[11px]">
            KitTimeRangePills · KitTaskTimeline · resolveKitTimeWindow · overlapsKitTimeWindow
          </p>
          <p className="mt-2">业务页：`pages/tasks` 已接入；确认视觉后可继续抽到 `components/`。</p>
        </section>
      </main>
    </div>
  );
}
