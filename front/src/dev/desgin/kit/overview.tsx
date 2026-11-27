import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { VIZ, mix } from "./tokens";

/**
 * OV · 工作空间左侧概览候选
 * 替换 detail 工作空间「属性 / 分期 / 体征」三块散装事实行
 * 仅在 /dev/desgin 主页预览，不另开路由
 */

export type OvFact = {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  tone?: "default" | "warn" | "risk" | "ok";
};

export type OvVital = {
  code: string;
  label: string;
  value: string;
  unit?: string;
  flag?: "NORMAL" | "HIGH" | "LOW";
};

export type OvSnapshot = {
  admission: string;
  los: string;
  bed: string;
  attending: string;
  completeness: number;
  unknownCount?: number;
  stage: string;
  icd: string;
  missing?: string[];
  vitals: OvVital[];
};

const FIXTURE: OvSnapshot = {
  admission: "2026-11-24",
  los: "3d",
  bed: "03-12",
  attending: "张启明",
  completeness: 86,
  unknownCount: 2,
  stage: "Ib 期",
  icd: "C22.0",
  missing: ["nutrition", "frailty"],
  vitals: [
    { code: "VS-TEMP", label: "体温", value: "36.8", unit: "°C", flag: "NORMAL" },
    { code: "VS-PULSE", label: "脉搏", value: "78", unit: "bpm", flag: "NORMAL" },
    { code: "VS-RR", label: "呼吸", value: "18", unit: "/min", flag: "NORMAL" },
    { code: "VS-BP", label: "血压", value: "128/82", unit: "mmHg", flag: "NORMAL" },
    { code: "VS-SPO2", label: "血氧", value: "98", unit: "%", flag: "NORMAL" },
  ],
};

export const OV_FIXTURE = FIXTURE;

function Shell({
  code,
  name,
  blurb,
  children,
  width = 200,
}: {
  code: string;
  name: string;
  blurb: string;
  children: ReactNode;
  width?: number;
}) {
  return (
    <section
      className="rounded-[10px] border p-4"
      style={{
        background: VIZ.card,
        borderColor: VIZ.line,
        boxShadow: VIZ.shadowCard,
        fontFamily: VIZ.font,
      }}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
          style={{ background: VIZ.soft, color: VIZ.ink }}
        >
          {code}
        </span>
        <h3 className="text-[13px] font-semibold tracking-[-0.02em]" style={{ color: VIZ.ink }}>
          {name}
        </h3>
      </div>
      <p className="mb-3 text-[12px] leading-5" style={{ color: VIZ.muted }}>
        {blurb}
      </p>
      <div
        className="overflow-hidden rounded-lg border"
        style={{
          width,
          maxWidth: "100%",
          borderColor: VIZ.lineStrong,
          background: VIZ.page,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function toneColor(tone?: OvFact["tone"]) {
  if (tone === "risk") return VIZ.down;
  if (tone === "warn") return VIZ.warn;
  if (tone === "ok") return VIZ.up;
  return VIZ.ink;
}

function vitalColor(flag?: OvVital["flag"]) {
  if (flag === "HIGH") return VIZ.down;
  if (flag === "LOW") return VIZ.warn;
  return VIZ.ink;
}

/** OV-01 FactRail · 单列事实轨，无分区标题墙 */
export function OverviewFactRail({ data = FIXTURE }: { data?: OvSnapshot }) {
  const facts: OvFact[] = [
    { label: "入院", value: data.admission, mono: true },
    { label: "住院", value: data.los, mono: true },
    { label: "床位", value: data.bed, mono: true },
    { label: "医生", value: data.attending },
    {
      label: "完整度",
      value: `${data.completeness}%`,
      mono: true,
      hint: data.unknownCount ? `${data.unknownCount} UNKNOWN` : undefined,
      tone: data.unknownCount ? "warn" : "default",
    },
    { label: "分期", value: data.stage },
    { label: "ICD", value: data.icd, mono: true },
  ];

  return (
    <Shell code="OV-01" name="FactRail" blurb="单列事实轨 · 去掉「属性/分期」小标题 · 最克制">
      <div className="px-2.5 py-2">
        <p
          className="mb-1.5 px-0.5 text-[10px] font-medium tracking-[0.05em] uppercase"
          style={{ color: VIZ.muted }}
        >
          概览
        </p>
        <ul>
          {facts.map((f) => (
            <li key={f.label} className="flex items-baseline justify-between gap-2 py-1">
              <span className="shrink-0 text-[11px]" style={{ color: VIZ.muted }}>
                {f.label}
              </span>
              <div className="min-w-0 text-right">
                <div
                  className={cn("truncate text-[12px] leading-4", f.mono && "font-mono tabular-nums")}
                  style={{ color: toneColor(f.tone) }}
                >
                  {f.value}
                </div>
                {f.hint && (
                  <div className="mt-0.5 truncate text-[10px]" style={{ color: VIZ.warn }}>
                    {f.hint}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        {data.missing?.length ? (
          <p className="mt-1.5 border-t px-0.5 pt-1.5 text-[10px] leading-4" style={{ borderColor: VIZ.line, color: VIZ.warn }}>
            缺失 · {data.missing.join("、")}
          </p>
        ) : null}
        <div className="mt-2 border-t pt-2" style={{ borderColor: VIZ.line }}>
          {data.vitals.map((v) => (
            <div key={v.code} className="flex items-baseline justify-between gap-2 py-0.5">
              <span className="text-[11px]" style={{ color: VIZ.muted }}>
                {v.label}
              </span>
              <span className="font-mono text-[12px] tabular-nums" style={{ color: vitalColor(v.flag) }}>
                {v.value}
                {v.unit ? (
                  <span className="ml-0.5 text-[10px]" style={{ color: VIZ.muted }}>
                    {v.unit}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/** OV-02 GroupedSheet · 三组仍保留，但用细分隔而非独立 Panel */
export function OverviewGroupedSheet({ data = FIXTURE }: { data?: OvSnapshot }) {
  const groups: { title: string; rows: OvFact[] }[] = [
    {
      title: "属性",
      rows: [
        { label: "入院", value: data.admission, mono: true },
        { label: "住院", value: data.los, mono: true },
        { label: "床位", value: data.bed, mono: true },
        { label: "医生", value: data.attending },
        {
          label: "完整度",
          value: `${data.completeness}%`,
          mono: true,
          hint: data.unknownCount ? `${data.unknownCount} UNKNOWN` : undefined,
          tone: data.unknownCount ? "warn" : "default",
        },
      ],
    },
    {
      title: "分期",
      rows: [
        { label: "分期", value: data.stage },
        { label: "ICD", value: data.icd, mono: true },
      ],
    },
  ];

  return (
    <Shell code="OV-02" name="GroupedSheet" blurb="保留三组语义 · 组头极弱 · 行距更紧">
      <div className="py-1.5">
        {groups.map((g) => (
          <div key={g.title} className="px-2.5 py-1.5">
            <p className="mb-0.5 text-[10px] font-medium tracking-[0.05em] uppercase" style={{ color: VIZ.muted }}>
              {g.title}
            </p>
            {g.rows.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-2 py-[3px]">
                <span className="text-[11px]" style={{ color: VIZ.muted }}>
                  {f.label}
                </span>
                <div className="min-w-0 text-right">
                  <div
                    className={cn("truncate text-[12px]", f.mono && "font-mono tabular-nums")}
                    style={{ color: toneColor(f.tone) }}
                  >
                    {f.value}
                  </div>
                  {f.hint && (
                    <div className="text-[10px]" style={{ color: VIZ.warn }}>
                      {f.hint}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        {data.missing?.length ? (
          <p className="px-2.5 pb-1 text-[10px]" style={{ color: VIZ.warn }}>
            缺失 · {data.missing.join("、")}
          </p>
        ) : null}
        <div className="border-t px-2.5 py-1.5" style={{ borderColor: VIZ.line }}>
          <p className="mb-0.5 text-[10px] font-medium tracking-[0.05em] uppercase" style={{ color: VIZ.muted }}>
            体征
          </p>
          {data.vitals.map((v) => (
            <div key={v.code} className="flex items-baseline justify-between gap-2 py-[3px]">
              <span className="text-[11px]" style={{ color: VIZ.muted }}>
                {v.label}
              </span>
              <span className="font-mono text-[12px] tabular-nums" style={{ color: vitalColor(v.flag) }}>
                {v.value}
                <span className="ml-0.5 text-[10px]" style={{ color: VIZ.muted }}>
                  {v.unit}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/** OV-03 VitalStrip · 体征横条优先，属性压缩到顶 */
export function OverviewVitalStrip({ data = FIXTURE }: { data?: OvSnapshot }) {
  return (
    <Shell code="OV-03" name="VitalStrip" blurb="体征网格优先 · 属性两行压缩 · 适合异常多时" width={220}>
      <div className="p-2.5">
        <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
          {data.vitals.map((v) => (
            <div
              key={v.code}
              className="rounded-md px-2 py-1.5"
              style={{
                background: v.flag && v.flag !== "NORMAL" ? mix(VIZ.down, 0.08) : VIZ.soft,
              }}
            >
              <p className="text-[10px]" style={{ color: VIZ.muted }}>
                {v.label}
              </p>
              <p className="mt-0.5 font-mono text-[13px] font-medium tabular-nums" style={{ color: vitalColor(v.flag) }}>
                {v.value}
                <span className="ml-0.5 text-[10px] font-normal" style={{ color: VIZ.muted }}>
                  {v.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t pt-2" style={{ borderColor: VIZ.line }}>
          <p className="flex justify-between gap-2 text-[11px]">
            <span style={{ color: VIZ.muted }}>床 / 住院</span>
            <span className="font-mono tabular-nums" style={{ color: VIZ.ink }}>
              {data.bed} · {data.los}
            </span>
          </p>
          <p className="flex justify-between gap-2 text-[11px]">
            <span style={{ color: VIZ.muted }}>分期 / ICD</span>
            <span style={{ color: VIZ.ink }}>
              {data.stage} · <span className="font-mono">{data.icd}</span>
            </span>
          </p>
          <p className="flex justify-between gap-2 text-[11px]">
            <span style={{ color: VIZ.muted }}>完整度</span>
            <span
              className="font-mono tabular-nums"
              style={{ color: data.unknownCount ? VIZ.warn : VIZ.ink }}
            >
              {data.completeness}%
              {data.unknownCount ? ` · ${data.unknownCount}` : ""}
            </span>
          </p>
          {data.missing?.length ? (
            <p className="text-[10px]" style={{ color: VIZ.warn }}>
              缺失 · {data.missing.join("、")}
            </p>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

/** OV-04 Snapshot · 身份条 + 关键数字 + 问题列表 */
export function OverviewSnapshot({ data = FIXTURE }: { data?: OvSnapshot }) {
  return (
    <Shell code="OV-04" name="Snapshot" blurb="顶栏身份数字 · 下面只列问题 · 正常信息不展开" width={220}>
      <div className="p-2.5">
        <div className="mb-2 rounded-md px-2.5 py-2" style={{ background: VIZ.soft }}>
          <p className="text-[11px]" style={{ color: VIZ.muted }}>
            {data.bed} · {data.attending}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[18px] font-semibold tracking-[-0.03em]" style={{ color: VIZ.ink }}>
              {data.stage}
            </span>
            <span className="font-mono text-[11px]" style={{ color: VIZ.muted }}>
              {data.icd}
            </span>
          </p>
          <p className="mt-1 font-mono text-[11px] tabular-nums" style={{ color: VIZ.muted }}>
            入院 {data.admission} · {data.los}
          </p>
        </div>

        <div className="mb-2 flex gap-2">
          <div className="min-w-0 flex-1 rounded-md border px-2 py-1.5" style={{ borderColor: VIZ.line }}>
            <p className="text-[10px]" style={{ color: VIZ.muted }}>
              完整度
            </p>
            <p
              className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums"
              style={{ color: data.unknownCount ? VIZ.warn : VIZ.ink }}
            >
              {data.completeness}%
            </p>
          </div>
          <div className="min-w-0 flex-1 rounded-md border px-2 py-1.5" style={{ borderColor: VIZ.line }}>
            <p className="text-[10px]" style={{ color: VIZ.muted }}>
              异常体征
            </p>
            <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums" style={{ color: VIZ.ink }}>
              {data.vitals.filter((v) => v.flag && v.flag !== "NORMAL").length}
            </p>
          </div>
        </div>

        <p className="mb-1 text-[10px] font-medium tracking-[0.05em] uppercase" style={{ color: VIZ.muted }}>
          需关注
        </p>
        <ul className="space-y-1">
          {data.unknownCount ? (
            <li className="text-[12px]" style={{ color: VIZ.warn }}>
              数据 UNKNOWN · {data.unknownCount}
            </li>
          ) : null}
          {data.missing?.map((m) => (
            <li key={m} className="text-[12px]" style={{ color: VIZ.warn }}>
              缺失字段 · {m}
            </li>
          ))}
          {!data.unknownCount && !data.missing?.length && (
            <li className="text-[12px]" style={{ color: VIZ.muted }}>
              暂无异常项
            </li>
          )}
        </ul>

        <div className="mt-2 border-t pt-2" style={{ borderColor: VIZ.line }}>
          <p className="mb-1 text-[10px]" style={{ color: VIZ.muted }}>
            体征
          </p>
          <p className="font-mono text-[11px] leading-5 tabular-nums" style={{ color: VIZ.ink2 }}>
            {data.vitals.map((v) => `${v.label} ${v.value}`).join(" · ")}
          </p>
        </div>
      </div>
    </Shell>
  );
}

/** OV-05 DenseTable · 类表格两列，密度最高 */
export function OverviewDenseTable({ data = FIXTURE }: { data?: OvSnapshot }) {
  const rows: { k: string; v: string; tone?: string }[] = [
    { k: "入院", v: data.admission },
    { k: "住院", v: data.los },
    { k: "床位", v: data.bed },
    { k: "医生", v: data.attending },
    { k: "完整度", v: `${data.completeness}%${data.unknownCount ? ` / ${data.unknownCount}U` : ""}`, tone: data.unknownCount ? VIZ.warn : undefined },
    { k: "分期", v: data.stage },
    { k: "ICD", v: data.icd },
    ...data.vitals.map((v) => ({
      k: v.label,
      v: `${v.value}${v.unit ? ` ${v.unit}` : ""}`,
      tone: v.flag && v.flag !== "NORMAL" ? vitalColor(v.flag) : undefined,
    })),
  ];

  return (
    <Shell code="OV-05" name="DenseTable" blurb="两列表格 · 零分组 · 扫描最快" width={200}>
      <table className="w-full border-collapse text-left">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.k} style={{ background: i % 2 ? VIZ.soft : "transparent" }}>
              <th
                className="w-[40%] px-2.5 py-1 text-[11px] font-normal"
                style={{ color: VIZ.muted }}
              >
                {r.k}
              </th>
              <td
                className="px-2.5 py-1 text-right font-mono text-[11px] tabular-nums"
                style={{ color: r.tone ?? VIZ.ink }}
              >
                {r.v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.missing?.length ? (
        <p className="border-t px-2.5 py-1.5 text-[10px]" style={{ borderColor: VIZ.line, color: VIZ.warn }}>
          缺失 · {data.missing.join("、")}
        </p>
      ) : null}
    </Shell>
  );
}
