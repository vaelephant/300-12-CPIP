// 所有演示数据统一基于“今天”生成，保证页面时间语义一致且可复现。
const now = new Date();
const dayStart = new Date(now);
dayStart.setHours(8, 0, 0, 0);

export const NOW = now;

/** 某天的某个时刻（相对今天，0 = 今天 08:00 起算） */
export function at(dayOffset: number, hour = 9, minute = 0): string {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function minutesAgo(minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export function minutesFromNow(minutes: number): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

export function daysAgo(days: number): string {
  return at(-days, 10, 0);
}

/** 年龄 → 出生日期（仅演示） */
export function birthDateFromAge(age: number): string {
  const y = now.getFullYear() - age;
  return `${y}-0${((age * 7) % 9) + 1}-1${(age * 3) % 9}`;
}
