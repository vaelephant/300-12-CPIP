import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 百分比显示；分母为 0 时按规范返回“不可计算”，而非 0%。 */
export function pct(numerator: number, denominator: number, digits = 1) {
  if (!denominator) return "不可计算";
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
}

export function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `¥${n.toLocaleString("zh-CN")}`;
}

export function fmtDate(iso: string | Date, withTime = false) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (v: number) => String(v).padStart(2, "0");
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function relTime(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return "刚刚";
  if (mins > 0) {
    if (mins < 60) return `${mins} 分钟前`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)} 小时前`;
    return `${Math.round(mins / 1440)} 天前`;
  }
  const ahead = -mins;
  if (ahead < 60) return `${ahead} 分钟后`;
  if (ahead < 60 * 24) return `${Math.round(ahead / 60)} 小时后`;
  return `${Math.round(ahead / 1440)} 天后`;
}

export function initials(name: string) {
  if (!name) return "?";
  const isAscii = /^[A-Za-z\s.]+$/.test(name);
  if (isAscii) {
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return name.replace(/[·\s]/g, "").slice(-2);
}

export function hoursBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function groupBy<T, K extends string | number>(arr: T[], key: (item: T) => K) {
  return arr.reduce<Record<K, T[]>>(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
