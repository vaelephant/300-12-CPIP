import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { WorldModelFlowGraph } from "./world-model-flow";

/**
 * WM · 世界模型工作台候选
 * 上：传统临床路径阶段轨（医生已熟悉）
 * 下：Past（真实）| Now（状态）| Future（研究推演）同一画布
 * 色板跟随系统 light / dark
 * 预览：/dev/desgin/world-model
 */

export type WmTone = {
  mode: "light" | "dark";
  void: string;
  panel: string;
  pastBand: string;
  futureBand: string;
  stateBand: string;
  ink: string;
  mute: string;
  dim: string;
  line: string;
  lineStrong: string;
  past: string;
  now: string;
  sim: string;
  simSoft: string;
  simLine: string;
  risk: string;
  warn: string;
  gateBg: string;
  cardOn: string;
  legendBg: string;
  pulse: string;
  display: string;
  sans: string;
  mono: string;
};

const WM_FONTS = {
  display: '"Fraunces", "Songti SC", "Noto Serif SC", Georgia, serif',
  sans: '"IBM Plex Sans", "PingFang SC", "Helvetica Neue", sans-serif',
  mono: '"IBM Plex Mono", "SF Mono", ui-monospace, monospace',
} as const;

export const WM_DARK: WmTone = {
  mode: "dark",
  void: "#07090c",
  panel: "#0e1218",
  pastBand: "#12161d",
  futureBand: "#0a1618",
  stateBand: "#141820",
  ink: "#e8eaed",
  mute: "#8b939e",
  dim: "#5c6570",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.16)",
  past: "#c5c9d0",
  now: "#f4f1ea",
  sim: "#2ec4b6",
  simSoft: "rgba(46,196,182,0.14)",
  simLine: "rgba(46,196,182,0.55)",
  risk: "#e85d5d",
  warn: "#e8b86d",
  gateBg: "#140e0e",
  cardOn: "rgba(255,255,255,0.03)",
  legendBg: "#0b0e13",
  pulse: "rgba(244,241,234,0.35)",
  ...WM_FONTS,
};

export const WM_LIGHT: WmTone = {
  mode: "light",
  void: "#f3f4f6",
  panel: "#ffffff",
  pastBand: "#eef0f3",
  futureBand: "#e7f5f3",
  stateBand: "#f7f7f5",
  ink: "#14181f",
  mute: "#5c6570",
  dim: "#8b939e",
  line: "rgba(15,23,42,0.08)",
  lineStrong: "rgba(15,23,42,0.14)",
  past: "#4b5563",
  now: "#1a1d24",
  sim: "#0d9488",
  simSoft: "rgba(13,148,136,0.12)",
  simLine: "rgba(13,148,136,0.45)",
  risk: "#dc2626",
  warn: "#b45309",
  gateBg: "#fef2f2",
  cardOn: "rgba(13,148,136,0.06)",
  legendBg: "#f8fafc",
  pulse: "rgba(26,29,36,0.25)",
  ...WM_FONTS,
};

/** 默认深色别名（仅字体/兜底）；组件内请用 useWm() */
export const WM = WM_DARK;

const WmToneContext = createContext<WmTone>(WM_DARK);

export function useWm(): WmTone {
  return useContext(WmToneContext);
}

export function WmToneProvider({ tone, children }: { tone: WmTone; children: ReactNode }) {
  return <WmToneContext.Provider value={tone}>{children}</WmToneContext.Provider>;
}

/** 跟随 ThemeProvider / html.dark */
export function useAppWmTone(): WmTone {
  const { theme } = useTheme();
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  return dark ? WM_DARK : WM_LIGHT;
}

export type WmStageState = "done" | "active" | "pending" | "blocked";

export type WmStage = {
  id: string;
  name: string;
  state: WmStageState;
  done: number;
  total: number;
  overdue?: number;
  window?: string;
  summary?: string;
  nextAction?: string;
};

export type WmPastEvent = {
  id: string;
  label: string;
  at: string;
  stageId: string;
  kind?: "task" | "exam" | "decision" | "note";
  status?: "done" | "partial" | "overdue";
  detail?: string;
  operator?: string;
  result?: string;
  evidence?: string[];
  department?: string;
  location?: string;
  duration?: string;
  relatedNext?: string;
  clinicalNote?: string;
  refs?: { label: string; value: string }[];
};

export type WmFutureNode = {
  id: string;
  label: string;
  detail?: string;
  estimate?: string;
  prerequisites?: string[];
  /** 节点级证据（指南/检查/规则） */
  evidence?: string[];
  /** 相对 Now 的就绪：ready 可议 · blocked 有缺口 · speculative 纯推演 */
  readiness?: "ready" | "blocked" | "speculative";
};

export type WmCandidate = {
  id: "A" | "B" | "C";
  name: string;
  hint: string;
  burden30: string;
  burden90: string;
  riskNote?: string;
  /** 决策窗口（并排对比用） */
  window?: string;
  /** 可切除/路径倾向 */
  resectability?: string;
  /** 情景级证据条 */
  evidence?: string[];
  /** 相对优势（短标签） */
  pros?: string[];
  /** 代价 / 顾虑 */
  cons?: string[];
  /** 风险等级（对比着色） */
  riskLevel?: "low" | "medium" | "high";
  nodes: [WmFutureNode, WmFutureNode];
};

export type WmNowFact = {
  id: string;
  label: string;
  value: string;
  tone?: "ok" | "warn" | "mute";
};

export type WmCanvasData = {
  patient: string;
  pathway: string;
  progress: number;
  stages: WmStage[];
  past: WmPastEvent[];
  nowLabel: string;
  nowDetail: string;
  nowFacts?: WmNowFact[];
  nowBlockers?: string[];
  candidates: WmCandidate[];
};

export type WmSelection =
  | { kind: "past"; id: string }
  | { kind: "stage"; id: string }
  | { kind: "now" }
  | { kind: "future"; candidateId: "A" | "B" | "C"; nodeId: string }
  | { kind: "candidate"; id: "A" | "B" | "C" };

export const WM_FIXTURE: WmCanvasData = {
  patient: "陈志远 · Ib 期 HCC",
  pathway: "肝切除标准路径 · V1.3",
  progress: 42,
  stages: [
    {
      id: "s1",
      name: "入院评估",
      state: "done",
      done: 4,
      total: 4,
      window: "D0",
      summary: "完成身份核验、主诉采集与入径知情。",
      nextAction: "已关闭",
    },
    {
      id: "s2",
      name: "术前检查",
      state: "done",
      done: 6,
      total: 6,
      window: "D0–D3",
      summary: "影像、ICG、心肺与肝储备均已归档。",
      nextAction: "已关闭 · 可进入 MDT",
    },
    {
      id: "s3",
      name: "MDT决策",
      state: "active",
      done: 1,
      total: 3,
      overdue: 1,
      window: "D3–D5",
      summary: "MDT 排期中；NRS 营养评估超时未闭环。",
      nextAction: "完成营养复评 → 召开 MDT",
    },
    {
      id: "s4",
      name: "手术执行",
      state: "pending",
      done: 0,
      total: 5,
      window: "待定",
      summary: "等待 MDT 指征确认后生成手术计划。",
      nextAction: "未解锁",
    },
    {
      id: "s5",
      name: "术后康复",
      state: "pending",
      done: 0,
      total: 4,
      window: "术后 D1–D7",
      summary: "路径模板已预置，尚未实例化。",
    },
    {
      id: "s6",
      name: "出院随访",
      state: "pending",
      done: 0,
      total: 3,
      window: "出院后 30/90 天",
      summary: "随访计划随出院医嘱生成。",
    },
  ],
  past: [
    {
      id: "p1",
      label: "入院登记",
      at: "D0 08:20",
      stageId: "s1",
      kind: "task",
      status: "done",
      detail: "核对身份、床位与入径知情同意，写入路径实例。",
      operator: "住院护士 · 王敏",
      result: "已入径 · 路径实例 #P-2411-08",
      evidence: ["知情同意书已签", "床位 12A-03"],
      department: "肝胆外科病区",
      location: "12A-03",
      duration: "25 min",
      relatedNext: "基础化验",
      clinicalNote: "患者知情充分，无拒绝入径记录。",
      refs: [
        { label: "路径实例", value: "P-2411-08" },
        { label: "入径规则", value: "肝切除标准 V1.3" },
      ],
    },
    {
      id: "p2",
      label: "基础化验",
      at: "D0 10:05",
      stageId: "s1",
      kind: "exam",
      status: "done",
      detail: "血常规、肝肾功能、凝血、肿瘤标志物。",
      operator: "检验科",
      result: "AFP 218 · Child-Pugh A · 余项大致正常",
      evidence: ["LIS 报告 #L-90821"],
      department: "检验科",
      location: "门诊抽血室",
      duration: "采样 8 min · 出报 3.2 h",
      relatedNext: "影像增强",
      clinicalNote: "AFP 升高与影像占位一致，已同步至主治。",
      refs: [
        { label: "AFP", value: "218 ng/mL" },
        { label: "Child-Pugh", value: "A (5)" },
        { label: "PLT", value: "168×10⁹/L" },
      ],
    },
    {
      id: "p3",
      label: "影像增强",
      at: "D1 14:40",
      stageId: "s2",
      kind: "exam",
      status: "done",
      detail: "上腹增强 MRI，病灶定位与血管关系评估。",
      operator: "影像科 · 李强",
      result: "S6 单发 · 约 3.2 cm · 未见门脉侵犯",
      evidence: ["PACS 影像", "影像报告已结构化"],
      department: "影像科",
      location: "MRI 2 号机",
      duration: "检查 42 min",
      relatedNext: "ICG 评估",
      clinicalNote: "病灶边界清晰，毗邻右肝静脉，建议术中导航。",
      refs: [
        { label: "部位", value: "S6" },
        { label: "大小", value: "3.2 cm" },
        { label: "门脉侵犯", value: "未见" },
        { label: "检查号", value: "MRI-44102" },
      ],
    },
    {
      id: "p4",
      label: "ICG 评估",
      at: "D2 09:15",
      stageId: "s2",
      kind: "exam",
      status: "done",
      detail: "ICG-R15 评估残余肝功能储备。",
      operator: "肝胆外科",
      result: "ICG-R15 = 12.8% · 临界可接受",
      evidence: ["ICG 原始曲线", "麻醉评估备注"],
      department: "肝胆外科",
      location: "日间评估室",
      duration: "30 min",
      relatedNext: "心肺评估",
      clinicalNote: "临界值，转化 vs 手术需 MDT 权衡。",
      refs: [
        { label: "ICG-R15", value: "12.8%" },
        { label: "阈值", value: "≤10% 理想 · ≤14% 可接受" },
      ],
    },
    {
      id: "p5",
      label: "心肺评估",
      at: "D2 15:30",
      stageId: "s2",
      kind: "exam",
      status: "done",
      detail: "心电图 + 心脏超声 + 肺功能筛查。",
      operator: "心内科会诊",
      result: "无绝对手术禁忌",
      evidence: ["会诊意见单"],
      department: "心内科",
      location: "会诊中心",
      duration: "会诊 40 min",
      relatedNext: "肝储备结论",
      clinicalNote: "轻度舒张功能减退，麻醉可耐受。",
      refs: [
        { label: "EF", value: "62%" },
        { label: "ECG", value: "窦律" },
      ],
    },
    {
      id: "p6",
      label: "肝储备结论",
      at: "D3 11:00",
      stageId: "s2",
      kind: "decision",
      status: "done",
      detail: "综合 Child-Pugh、ICG 与残肝体积，给出可切除倾向。",
      operator: "主治 · 张伟",
      result: "倾向手术优先 · 提交 MDT",
      evidence: ["残肝体积 68%", "决策记录 #D-441"],
      department: "肝胆外科",
      location: "医师站",
      duration: "决策记录 15 min",
      relatedNext: "MDT 定案",
      clinicalNote: "建议 MDT 确认切缘策略与备选转化方案。",
      refs: [
        { label: "残肝体积", value: "68%" },
        { label: "决策倾向", value: "手术优先 (A)" },
        { label: "记录号", value: "D-441" },
      ],
    },
  ],
  nowLabel: "MDT 决策中",
  nowDetail: "术前检查完成 · 待 MDT 定案 · NRS 营养评估超时",
  nowFacts: [
    { id: "f1", label: "路径进度", value: "42%", tone: "mute" },
    { id: "f2", label: "当前阶段", value: "MDT 决策", tone: "ok" },
    { id: "f3", label: "超时任务", value: "NRS ×1", tone: "warn" },
    { id: "f4", label: "UNKNOWN", value: "营养数据缺口", tone: "warn" },
  ],
  nowBlockers: ["NRS 营养评估超时未闭环", "MDT 会议尚未排定最终结论"],
  candidates: [
    {
      id: "A",
      name: "手术优先",
      hint: "沿标准路径 · 肝段切除",
      burden30: "低",
      burden90: "中低",
      window: "D4–D8",
      resectability: "倾向可切除",
      riskLevel: "low",
      evidence: ["残肝体积 68%", "ICG-R15 12.8% 可接受", "影像未见门脉侵犯", "CSCO 可切除指征"],
      pros: ["路径最短", "治愈意图清晰"],
      cons: ["需营养闭环", "术中出血风险"],
      nodes: [
        {
          id: "a1",
          label: "MDT / 指征",
          detail: "确认可切除指征、切缘策略与术式选择。",
          estimate: "D4–D5",
          prerequisites: ["营养复评闭环", "MDT 出席齐全"],
          evidence: ["决策记录 #D-441", "肝储备结论"],
          readiness: "blocked",
        },
        {
          id: "a2",
          label: "肝段切除",
          detail: "拟行 S6 解剖性切除，预计术时 3–4 h。",
          estimate: "D6–D8",
          prerequisites: ["麻醉评估有效", "备血完成"],
          evidence: ["麻醉评估有效期内", "备血申请单"],
          readiness: "speculative",
        },
      ],
    },
    {
      id: "B",
      name: "转化治疗",
      hint: "ICG 临界 · 降期后再评",
      burden30: "中",
      burden90: "中",
      window: "4–10 周",
      resectability: "降期后再评",
      riskLevel: "medium",
      riskNote: "延长窗口 · 进展风险",
      evidence: ["ICG 临界", "肿瘤内科路径备选", "转化后再切除文献口径"],
      pros: ["降低切除难度", "争取肝储备"],
      cons: ["住院负担上升", "可能丧失手术窗"],
      nodes: [
        {
          id: "b1",
          label: "转化方案",
          detail: "系统治疗 / 局部治疗组合以降期。",
          estimate: "4–8 周",
          prerequisites: ["肿瘤内科会诊", "患者知情"],
          evidence: ["转化方案备选库", "知情同意模板"],
          readiness: "speculative",
        },
        {
          id: "b2",
          label: "再评估",
          detail: "复查影像与肝储备后决定是否手术。",
          estimate: "转化结束后 1 周内",
          prerequisites: ["疗效评估完整"],
          evidence: ["影像复查计划", "ICG 复测"],
          readiness: "speculative",
        },
      ],
    },
    {
      id: "C",
      name: "观察强化",
      hint: "补齐营养/合并症后再入径",
      burden30: "中低",
      burden90: "不确定",
      window: "48–96 h",
      resectability: "暂缓决策",
      riskLevel: "high",
      riskNote: "UNKNOWN 阻断 · 数据未齐",
      evidence: ["NRS UNKNOWN", "白蛋白 32 g/L", "路径规则 · 术前营养必填"],
      pros: ["先闭环安全缺口", "不绑定术式"],
      cons: ["延误手术窗", "90 天负担不确定"],
      nodes: [
        {
          id: "c1",
          label: "补数据",
          detail: "补齐 NRS、白蛋白趋势与合并症清单。",
          estimate: "48–72 h",
          prerequisites: ["营养科会诊"],
          evidence: ["NRS 2002 缺口", "营养会诊申请"],
          readiness: "ready",
        },
        {
          id: "c2",
          label: "重评入径",
          detail: "数据闭环后重新判定是否维持手术优先。",
          estimate: "补数据后 D1",
          prerequisites: ["UNKNOWN 清零"],
          evidence: ["入径规则引擎", "状态快照"],
          readiness: "blocked",
        },
      ],
    },
  ],
};

const KIND_MARK: Record<NonNullable<WmPastEvent["kind"]>, string> = {
  task: "任",
  exam: "检",
  decision: "决",
  note: "记",
};

const KIND_LABEL: Record<NonNullable<WmPastEvent["kind"]>, string> = {
  task: "任务",
  exam: "检查",
  decision: "决策",
  note: "备注",
};

const STAGE_STATE_LABEL: Record<WmStageState, string> = {
  done: "已完成",
  active: "执行中",
  pending: "待执行",
  blocked: "阻塞",
};

function WmFonts() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
    />
  );
}

function WmKeyframes({ pulse }: { pulse: string }) {
  return (
    <style>{`
      @keyframes wm-now-pulse {
        0%, 100% { box-shadow: 0 0 0 0 ${pulse}; }
        50% { box-shadow: 0 0 0 10px rgba(0,0,0,0); }
      }
      @keyframes wm-branch-draw {
        from { stroke-dashoffset: 120; opacity: 0.2; }
        to { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes wm-past-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes wm-panel-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .wm-now-pulse, .wm-branch, .wm-past-node, .wm-panel-in { animation: none !important; }
      }
    `}</style>
  );
}

function FactCell({
  label,
  value,
  warn,
  span,
}: {
  label: string;
  value: string;
  warn?: boolean;
  span?: boolean;
}) {
  const WM = useWm();
  return (
    <div
      className={cn("rounded-md border px-2.5 py-2", span && "sm:col-span-2")}
      style={{ borderColor: WM.line, background: WM.panel }}
    >
      <p className="text-[10px] leading-3" style={{ color: WM.dim }}>
        {label}
      </p>
      <p
        className="mt-1 text-[12.5px] font-medium leading-5"
        style={{ color: warn ? WM.risk : WM.ink }}
      >
        {value}
      </p>
    </div>
  );
}

const RISK_TONE = {
  low: "低",
  medium: "中",
  high: "高",
} as const;

const READINESS_LABEL = {
  ready: "可议",
  blocked: "有缺口",
  speculative: "纯推演",
} as const;

function riskColor(level: WmCandidate["riskLevel"] | undefined, WM: WmTone) {
  if (level === "high") return WM.risk;
  if (level === "medium") return WM.warn;
  return WM.sim;
}

/**
 * A/B/C 对比表（Vercel 克制）：一行一情景，行内展开前提/证据；不做三卡墙。
 */
export function WmCandidateCompareRail({
  candidates,
  activeId,
  selection,
  onPickCandidate,
  onPickNode,
}: {
  candidates: WmCandidate[];
  activeId: "A" | "B" | "C";
  selection: WmSelection | null;
  onPickCandidate: (id: "A" | "B" | "C") => void;
  onPickNode: (candidateId: "A" | "B" | "C", nodeId: string) => void;
}) {
  const WM = useWm();
  const selectedNodeId = selection?.kind === "future" ? selection.nodeId : null;
  const selectedCandId =
    selection?.kind === "future"
      ? selection.candidateId
      : selection?.kind === "candidate"
        ? selection.id
        : activeId;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium" style={{ color: WM.ink }}>
          情景对比
        </p>
        <p className="text-[11px]" style={{ color: WM.dim }}>
          研究推演 · 不可直激
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border" style={{ borderColor: WM.lineStrong }}>
        <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
          <thead>
            <tr
              className="border-b text-[11px]"
              style={{ borderColor: WM.line, color: WM.dim, background: WM.void }}
            >
              <th className="px-3 py-2 font-medium">情景</th>
              <th className="px-3 py-2 font-medium">窗口</th>
              <th className="px-3 py-2 font-medium">可切除</th>
              <th className="px-3 py-2 font-medium">30d</th>
              <th className="px-3 py-2 font-medium">90d</th>
              <th className="px-3 py-2 font-medium">风险</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const on = c.id === selectedCandId;
              const tone = riskColor(c.riskLevel, WM);
              return (
                <Fragment key={c.id}>
                  <tr
                    role="button"
                    tabIndex={0}
                    onClick={() => onPickCandidate(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPickCandidate(c.id);
                      }
                    }}
                    className="cursor-pointer border-b transition-colors"
                    style={{
                      borderColor: WM.line,
                      background: on ? WM.cardOn : WM.panel,
                      color: WM.ink,
                      boxShadow: on ? `inset 3px 0 0 ${tone}` : undefined,
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium">
                        {c.id} · {c.name}
                      </span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: WM.mute }}>
                        {c.hint}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: WM.mute }}>
                      {c.window ?? "—"}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: WM.mute }}>
                      {c.resectability ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">{c.burden30}</td>
                    <td className="px-3 py-2.5">{c.burden90}</td>
                    <td className="px-3 py-2.5">
                      <span style={{ color: tone }}>风险 {RISK_TONE[c.riskLevel ?? "low"]}</span>
                      {c.riskNote ? (
                        <span className="mt-0.5 block text-[10px]" style={{ color: WM.risk }}>
                          {c.riskNote}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  {on ? (
                    <tr style={{ background: WM.void, color: WM.ink }}>
                      <td colSpan={6} className="border-b px-3 py-3" style={{ borderColor: WM.line }}>
                        <div className="flex flex-wrap gap-1">
                          {(c.pros ?? []).map((p) => (
                            <span
                              key={p}
                              className="rounded border px-1.5 py-0.5 text-[10px]"
                              style={{ borderColor: WM.lineStrong, color: WM.mute }}
                            >
                              + {p}
                            </span>
                          ))}
                          {(c.cons ?? []).map((p) => (
                            <span
                              key={p}
                              className="rounded border px-1.5 py-0.5 text-[10px]"
                              style={{ borderColor: WM.lineStrong, color: WM.risk }}
                            >
                              − {p}
                            </span>
                          ))}
                          {(c.evidence ?? []).map((e) => (
                            <span
                              key={e}
                              className="rounded border px-1.5 py-0.5 text-[10px]"
                              style={{ borderColor: WM.line, color: WM.dim }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                          {c.nodes.map((n) => {
                            const nodeOn = selectedNodeId === n.id;
                            const ready = n.readiness ?? "speculative";
                            const readyTone =
                              ready === "ready" ? WM.ink : ready === "blocked" ? WM.risk : WM.warn;
                            return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPickNode(c.id, n.id);
                                }}
                                className="rounded-md border px-2.5 py-2 text-left"
                                style={{
                                  borderColor: nodeOn ? WM.lineStrong : WM.line,
                                  background: nodeOn ? WM.panel : "transparent",
                                }}
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-[12px] font-medium">{n.label}</span>
                                  <span className="font-mono text-[10px] tabular-nums" style={{ color: WM.dim }}>
                                    {n.estimate ?? "—"}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[10px]" style={{ color: readyTone }}>
                                  {READINESS_LABEL[ready]}
                                </p>
                                {nodeOn ? (
                                  <div className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: WM.line }}>
                                    {n.detail ? (
                                      <p className="text-[11px] leading-4" style={{ color: WM.mute }}>
                                        {n.detail}
                                      </p>
                                    ) : null}
                                    <div className="flex flex-wrap gap-1">
                                      {(n.prerequisites ?? []).map((p) => (
                                        <span
                                          key={p}
                                          className="rounded border px-1.5 py-0.5 text-[10px]"
                                          style={{ borderColor: WM.lineStrong, color: WM.ink }}
                                        >
                                          前置 · {p}
                                        </span>
                                      ))}
                                      {(n.evidence ?? []).map((e) => (
                                        <span
                                          key={e}
                                          className="rounded border px-1.5 py-0.5 text-[10px]"
                                          style={{ borderColor: WM.line, color: WM.dim }}
                                        >
                                          {e}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 传统路径阶段轨 */
function PathwayStageRail({
  stages,
  progress,
  focusId,
  selectedStageId,
  onFocus,
  onSelectStage,
}: {
  stages: WmStage[];
  progress: number;
  focusId: string | null;
  selectedStageId: string | null;
  onFocus: (id: string | null) => void;
  onSelectStage: (id: string) => void;
}) {
  const WM = useWm();
  const weight = stages.map((s) => Math.max(1, s.total));
  const sum = weight.reduce((a, b) => a + b, 0);
  const active = stages.find((s) => s.state === "active");

  return (
    <div className="border-b px-5 py-4" style={{ borderColor: WM.line, background: WM.panel }}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mt-0.5 text-[13px]" style={{ color: WM.ink }}>
            {active ? (
              <>
                当前阶段 · <span style={{ color: WM.now }}>{active.name}</span>
                {active.overdue ? (
                  <span style={{ color: WM.risk }}> · 超时 {active.overdue}</span>
                ) : null}
              </>
            ) : (
              "未开始"
            )}
          </p>
        </div>
        <span className="font-mono text-[12px] tabular-nums" style={{ color: WM.mute }}>
          {progress}%
        </span>
      </div>

      <div
        className="mb-1.5 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => {
          const focused = focusId === s.id;
          const selected = selectedStageId === s.id;
          const muted = s.state === "pending";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectStage(s.id);
                onFocus(focused ? null : s.id);
              }}
              className="min-w-0 text-left"
              title={`${s.name} ${s.done}/${s.total}`}
            >
              <p
                className={cn(
                  "truncate text-[11px]",
                  s.state === "active" || focused || selected ? "font-semibold" : "font-medium",
                )}
                style={{
                  color: selected || focused ? WM.sim : muted ? WM.dim : s.state === "active" ? WM.now : WM.past,
                }}
              >
                {s.name}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex h-2 overflow-hidden rounded-sm" style={{ background: WM.line }}>
        {stages.map((s, i) => {
          const focused = focusId === s.id;
          const selected = selectedStageId === s.id;
          const fill =
            s.state === "done"
              ? WM.past
              : s.state === "active"
                ? WM.now
                : s.state === "blocked"
                  ? WM.risk
                  : "transparent";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectStage(s.id);
                onFocus(focused ? null : s.id);
              }}
              className="relative h-full border-r last:border-0"
              style={{
                flex: weight[i],
                background: fill === "transparent" ? undefined : fill,
                borderColor: "rgba(0,0,0,0.35)",
                boxShadow: selected || focused ? `inset 0 0 0 1px ${WM.sim}` : undefined,
                opacity: focusId && !focused ? 0.45 : 1,
              }}
              aria-pressed={selected}
              aria-label={`查看阶段 ${s.name}`}
            />
          );
        })}
      </div>

      <div
        className="mt-1.5 grid gap-1"
        style={{ gridTemplateColumns: weight.map((w) => `${(w / sum) * 100}%`).join(" ") }}
      >
        {stages.map((s) => (
          <p key={s.id} className="truncate font-mono text-[10px] tabular-nums" style={{ color: WM.dim }}>
            {s.done}/{s.total}
            {s.overdue ? <span style={{ color: WM.risk }}> ·超时</span> : null}
          </p>
        ))}
      </div>
    </div>
  );
}

function SelectionInspector({
  data,
  selection,
  onClear,
  onPickCandidate,
}: {
  data: WmCanvasData;
  selection: WmSelection | null;
  onClear: () => void;
  onPickCandidate: (id: "A" | "B" | "C") => void;
}) {
  const WM = useWm();
  const stageMap = useMemo(() => new Map(data.stages.map((s) => [s.id, s])), [data.stages]);

  if (!selection || selection.kind === "now") {
    return (
      <div className="wm-panel-in" style={{ animation: "wm-panel-in 280ms ease both" }}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px]" style={{ color: WM.mute }}>
            现在 · 状态详情
          </p>
          <span className="text-[10px]" style={{ color: WM.now }}>
            当前
          </span>
        </div>
        <p className="mt-1 text-[15px] font-medium" style={{ color: WM.ink, fontFamily: WM.display }}>
          {data.nowLabel}
        </p>
        <p className="mt-1 text-[13px] leading-5" style={{ color: WM.mute }}>
          {data.nowDetail}
        </p>
        {data.nowFacts?.length ? (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {data.nowFacts.map((f) => (
              <div
                key={f.id}
                className="rounded-md border px-2.5 py-2"
                style={{ borderColor: WM.line, background: WM.panel }}
              >
                <dt className="text-[10px]" style={{ color: WM.dim }}>
                  {f.label}
                </dt>
                <dd
                  className="mt-0.5 text-[13px] font-medium"
                  style={{
                    color: f.tone === "warn" ? WM.risk : f.tone === "ok" ? WM.now : WM.ink,
                  }}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {data.nowBlockers?.length ? (
          <ul className="mt-3 space-y-1">
            {data.nowBlockers.map((b) => (
              <li key={b} className="text-[12px]" style={{ color: WM.risk }}>
                · {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (selection.kind === "past") {
    const ev = data.past.find((p) => p.id === selection.id);
    if (!ev) return null;
    const stage = stageMap.get(ev.stageId);
    const idx = data.past.findIndex((p) => p.id === ev.id);
    const prev = idx > 0 ? data.past[idx - 1] : null;
    const next = idx >= 0 && idx < data.past.length - 1 ? data.past[idx + 1] : null;
    const statusLabel =
      ev.status === "overdue" ? "超时" : ev.status === "partial" ? "部分完成" : "已完成";
    return (
      <div className="wm-panel-in" style={{ animation: "wm-panel-in 280ms ease both" }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px]" style={{ color: WM.mute }}>
              {ev.kind ? KIND_LABEL[ev.kind] : "事件"}
              {stage ? ` · ${stage.name}` : ""}
            </p>
            <p className="mt-0.5 text-[16px] font-medium" style={{ color: WM.ink, fontFamily: WM.display }}>
              {ev.label}
            </p>
          </div>
          <button type="button" className="shrink-0 text-[11px]" style={{ color: WM.sim }} onClick={onClear}>
            返回现在
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-5" style={{ color: WM.mute }}>
          {ev.detail ?? "暂无补充说明"}
        </p>
        {ev.clinicalNote ? (
          <p
            className="mt-2 rounded-md border px-2.5 py-2 text-[12px] leading-5"
            style={{ borderColor: WM.line, background: WM.panel, color: WM.ink }}
          >
            临床备注 · {ev.clinicalNote}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FactCell label="时间" value={ev.at} />
          <FactCell label="状态" value={statusLabel} warn={ev.status === "overdue"} />
          <FactCell label="执行" value={ev.operator ?? "—"} />
          <FactCell label="科室" value={ev.department ?? "—"} />
          <FactCell label="地点" value={ev.location ?? "—"} />
          <FactCell label="耗时" value={ev.duration ?? "—"} />
          <FactCell label="结果" value={ev.result ?? "—"} span />
          <FactCell label="下一节点" value={ev.relatedNext ?? next?.label ?? "—"} />
          <FactCell label="上一节点" value={prev?.label ?? "—"} />
        </div>

        {ev.refs?.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ev.refs.map((r) => (
              <FactCell key={`${r.label}-${r.value}`} label={r.label} value={r.value} />
            ))}
          </div>
        ) : null}

        {ev.evidence?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ev.evidence.map((e) => (
              <span
                key={e}
                className="rounded border px-2 py-1 text-[11px]"
                style={{ borderColor: WM.lineStrong, color: WM.ink, background: WM.panel }}
              >
                {e}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (selection.kind === "stage") {
    const s = stageMap.get(selection.id);
    if (!s) return null;
    const events = data.past.filter((p) => p.stageId === s.id);
    return (
      <div className="wm-panel-in" style={{ animation: "wm-panel-in 280ms ease both" }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px]" style={{ color: WM.mute }}>
              阶段 · {STAGE_STATE_LABEL[s.state]}
            </p>
            <p className="mt-0.5 text-[16px] font-medium" style={{ color: WM.ink, fontFamily: WM.display }}>
              {s.name}
            </p>
          </div>
          <button type="button" className="text-[11px]" style={{ color: WM.sim }} onClick={onClear}>
            返回现在
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-5" style={{ color: WM.mute }}>
          {s.summary ?? "暂无阶段说明"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FactCell label="窗口" value={s.window ?? "—"} />
          <FactCell label="任务进度" value={`${s.done}/${s.total}`} />
          <FactCell label="下一步" value={s.nextAction ?? "—"} warn={Boolean(s.overdue)} span />
          {s.overdue ? <FactCell label="超时" value={`${s.overdue} 项`} warn /> : null}
        </div>
        {events.length ? (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="rounded-md border px-2.5 py-2"
                style={{ borderColor: WM.line, background: WM.panel }}
              >
                <p className="text-[12px] font-medium" style={{ color: WM.ink }}>
                  {e.label}
                </p>
                <p className="mt-0.5 font-mono text-[10px]" style={{ color: WM.dim }}>
                  {e.at}
                  {e.result ? ` · ${e.result}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[12px]" style={{ color: WM.dim }}>
            该阶段尚无回放事件
          </p>
        )}
      </div>
    );
  }

  if (selection.kind === "future") {
    const cand = data.candidates.find((c) => c.id === selection.candidateId);
    const node = cand?.nodes.find((n) => n.id === selection.nodeId);
    if (!cand || !node) return null;
    const ready = node.readiness ?? "speculative";
    return (
      <div className="wm-panel-in" style={{ animation: "wm-panel-in 280ms ease both" }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px]" style={{ color: WM.mute }}>
              推演 · 情景 {cand.id} {cand.name} · {READINESS_LABEL[ready]}
            </p>
            <p className="mt-0.5 text-[16px] font-medium" style={{ color: WM.ink, fontFamily: WM.display }}>
              {node.label}
            </p>
          </div>
          <button type="button" className="text-[11px]" style={{ color: WM.sim }} onClick={onClear}>
            返回现在
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-5" style={{ color: WM.mute }}>
          {node.detail ?? cand.hint}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FactCell label="情景" value={`${cand.id} · ${cand.name}`} />
          <FactCell label="节点窗口" value={node.estimate ?? "—"} />
          <FactCell label="情景窗口" value={cand.window ?? "—"} />
          <FactCell label="30 天负担" value={cand.burden30} />
          <FactCell label="90 天负担" value={cand.burden90} />
          <FactCell label="可切除倾向" value={cand.resectability ?? "—"} />
          {cand.riskNote ? <FactCell label="风险提示" value={cand.riskNote} warn span /> : null}
        </div>
        {node.prerequisites?.length ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px]" style={{ color: WM.dim }}>
              前置条件
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {node.prerequisites.map((p) => (
                <div
                  key={p}
                  className="rounded-md border px-2.5 py-2 text-[12px]"
                  style={{ borderColor: WM.line, background: WM.panel, color: WM.ink }}
                >
                  前置 · {p}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {node.evidence?.length || cand.evidence?.length ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px]" style={{ color: WM.dim }}>
              证据
            </p>
            <div className="flex flex-wrap gap-1">
              {(node.evidence ?? cand.evidence ?? []).map((e) => (
                <span
                  key={e}
                  className="rounded border px-1.5 py-0.5 text-[10px]"
                  style={{ borderColor: WM.lineStrong, color: WM.dim, background: WM.panel }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[11px]" style={{ color: WM.dim }}>
            研究情景，不直接写入生效计划
          </span>
          <button
            type="button"
            className="text-[11px] underline-offset-2 hover:underline"
            style={{ color: WM.sim }}
            onClick={() => onPickCandidate(cand.id)}
          >
            查看完整候选 {cand.id}
          </button>
        </div>
      </div>
    );
  }

  // candidate
  const cand = data.candidates.find((c) => c.id === selection.id);
  if (!cand) return null;
  return (
    <div className="wm-panel-in" style={{ animation: "wm-panel-in 280ms ease both" }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px]" style={{ color: WM.mute }}>
          候选情景 · 风险 {RISK_TONE[cand.riskLevel ?? "low"]}
        </p>
        <button type="button" className="text-[10px]" style={{ color: WM.sim }} onClick={onClear}>
          返回现在
        </button>
      </div>
      <p className="mt-1 text-[15px] font-medium" style={{ color: WM.ink, fontFamily: WM.display }}>
        路径 {cand.id} · {cand.name}
      </p>
      <p className="mt-1 text-[13px] leading-5" style={{ color: WM.mute }}>
        {cand.hint}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FactCell label="窗口" value={cand.window ?? "—"} />
        <FactCell label="可切除" value={cand.resectability ?? "—"} />
        <FactCell label="30 天负担" value={cand.burden30} />
        <FactCell label="90 天负担" value={cand.burden90} />
      </div>
      {(cand.pros?.length || cand.cons?.length) ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {(cand.pros ?? []).map((p) => (
            <span
              key={p}
              className="rounded border px-1.5 py-0.5 text-[10px]"
              style={{ borderColor: WM.simLine, color: WM.sim, background: WM.simSoft }}
            >
              + {p}
            </span>
          ))}
          {(cand.cons ?? []).map((p) => (
            <span
              key={p}
              className="rounded border px-1.5 py-0.5 text-[10px]"
              style={{ borderColor: "rgba(232,93,93,0.35)", color: WM.risk }}
            >
              − {p}
            </span>
          ))}
        </div>
      ) : null}
      {cand.evidence?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {cand.evidence.map((e) => (
            <span
              key={e}
              className="rounded border px-1.5 py-0.5 text-[10px]"
              style={{ borderColor: WM.lineStrong, color: WM.dim, background: WM.panel }}
            >
              {e}
            </span>
          ))}
        </div>
      ) : null}
      <ul className="mt-3 space-y-1">
        {cand.nodes.map((n) => (
          <li key={n.id} className="flex justify-between gap-2 text-[12px]">
            <span style={{ color: WM.ink }}>
              {n.label}
              {n.readiness ? (
                <span className="ml-1.5 text-[10px]" style={{ color: WM.dim }}>
                  · {READINESS_LABEL[n.readiness]}
                </span>
              ) : null}
            </span>
            <span className="font-mono" style={{ color: WM.dim }}>
              {n.estimate ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      {cand.riskNote ? (
        <p className="mt-2 text-[11px]" style={{ color: WM.risk }}>
          注意 · {cand.riskNote}
        </p>
      ) : null}
    </div>
  );
}

type WorldModelCanvasProps = {
  data?: WmCanvasData;
  className?: string;
  selection?: WmSelection | null;
  onSelectionChange?: (next: WmSelection) => void;
  focusStageId?: string | null;
  onFocusStageChange?: (id: string | null) => void;
  activeCandidate?: "A" | "B" | "C";
  onActiveCandidateChange?: (id: "A" | "B" | "C") => void;
  /** 嵌入工作空间时隐藏右侧候选卡，由外层 CDSS 承担 */
  compactInspector?: boolean;
  /** React Flow 画布高度，默认 300 */
  flowHeight?: number;
  /** 外层已有患者身份条时隐藏画布标题头，避免三重复述 */
  hideHeader?: boolean;
};

/** WM-01 WorldModelCanvas · 跟随系统主题 · 支持受控 selection */
export function WorldModelCanvas(props: WorldModelCanvasProps) {
  const tone = useAppWmTone();
  return (
    <WmToneProvider tone={tone}>
      <WorldModelCanvasInner {...props} />
    </WmToneProvider>
  );
}

function WorldModelCanvasInner({
  data = WM_FIXTURE,
  className,
  selection: selectionProp,
  onSelectionChange,
  focusStageId: focusStageProp,
  onFocusStageChange,
  activeCandidate: activeProp,
  onActiveCandidateChange,
  compactInspector: _compactInspector,
  flowHeight = 300,
  hideHeader = false,
}: WorldModelCanvasProps) {
  const WM = useWm();
  const [activeInner, setActiveInner] = useState<"A" | "B" | "C">("A");
  const [focusInner, setFocusInner] = useState<string | null>(null);
  const [selectionInner, setSelectionInner] = useState<WmSelection | null>({ kind: "now" });

  const active = activeProp ?? activeInner;
  const focusStage = focusStageProp !== undefined ? focusStageProp : focusInner;
  const selection = selectionProp !== undefined ? selectionProp : selectionInner;

  const setActive = (id: "A" | "B" | "C") => {
    onActiveCandidateChange?.(id);
    if (activeProp === undefined) setActiveInner(id);
  };
  const setFocusStage = (id: string | null) => {
    onFocusStageChange?.(id);
    if (focusStageProp === undefined) setFocusInner(id);
  };
  const setSelection = (next: WmSelection) => {
    onSelectionChange?.(next);
    if (selectionProp === undefined) setSelectionInner(next);
  };

  const stageMap = useMemo(() => new Map(data.stages.map((s) => [s.id, s])), [data.stages]);
  const activeStage = data.stages.find((s) => s.state === "active");
  const selectedStageId = selection?.kind === "stage" ? selection.id : null;

  const pickStage = (id: string) => setSelection({ kind: "stage", id });
  const pickCandidate = (id: "A" | "B" | "C") => {
    setActive(id);
    setSelection({ kind: "candidate", id });
  };
  const clearToNow = () => setSelection({ kind: "now" });

  const onFlowSelect = (next: WmSelection) => {
    setSelection(next);
    if (next.kind === "future") setActive(next.candidateId);
    if (next.kind === "candidate") setActive(next.id);
    if (next.kind === "past") {
      const ev = data.past.find((p) => p.id === next.id);
      if (ev) setFocusStage(ev.stageId);
    }
  };

  return (
    <div
      className={cn("overflow-hidden rounded-[14px] border", className)}
      style={{
        background: WM.panel,
        borderColor: WM.lineStrong,
        fontFamily: WM.sans,
        color: WM.ink,
      }}
    >
      <WmFonts />

      {!hideHeader ? (
        <div
          className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-3 md:px-5"
          style={{ borderColor: WM.line, background: WM.panel }}
        >
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.02em]" style={{ color: WM.ink }}>
              {data.patient}
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: WM.mute }}>
              {data.pathway}
              <span className="mx-1.5" style={{ color: WM.dim }}>
                ·
              </span>
              {activeStage?.name ?? "—"}
              <span className="mx-1.5" style={{ color: WM.dim }}>
                ·
              </span>
              <span className="tabular-nums">{data.progress}%</span>
            </p>
          </div>
          <p className="text-[11px]" style={{ color: WM.dim }}>
            过去 · 现在 · 未来
          </p>
        </div>
      ) : null}

      <PathwayStageRail
        stages={data.stages}
        progress={data.progress}
        focusId={focusStage}
        selectedStageId={selectedStageId}
        onFocus={setFocusStage}
        onSelectStage={pickStage}
      />

      <div
        className="grid grid-cols-3 border-b px-4 text-[11px] md:px-5"
        style={{ borderColor: WM.line, color: WM.dim }}
      >
        <div className="border-r py-1.5" style={{ borderColor: WM.line }}>
          已执行
          {focusStage ? ` · ${stageMap.get(focusStage)?.name}` : ""}
        </div>
        <div className="border-r py-1.5 text-center" style={{ borderColor: WM.line, color: WM.ink }}>
          现在 · {activeStage?.name ?? "—"}
        </div>
        <div className="py-1.5 text-right">推演 · 不可直激</div>
      </div>

      <WorldModelFlowGraph
        data={data}
        tone={WM}
        pastEvents={data.past}
        selection={selection}
        activeCandidate={active}
        focusStage={focusStage}
        onSelect={onFlowSelect}
        height={flowHeight}
      />

      <div className="space-y-3 border-t px-4 py-3 md:px-5" style={{ borderColor: WM.line, background: WM.panel }}>
        <WmCandidateCompareRail
          candidates={data.candidates}
          activeId={active}
          selection={selection}
          onPickCandidate={pickCandidate}
          onPickNode={(candidateId, nodeId) => {
            setActive(candidateId);
            setSelection({ kind: "future", candidateId, nodeId });
          }}
        />

        {/* Past / Now / Stage 详情；Future 已在对比表行内展开，避免三重复述 */}
        {selection && selection.kind !== "future" && selection.kind !== "candidate" ? (
          <div className="rounded-md border px-3 py-3" style={{ borderColor: WM.line, background: WM.void }}>
            <SelectionInspector
              data={data}
              selection={selection}
              onClear={clearToNow}
              onPickCandidate={pickCandidate}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** WM-02 Strip · 嵌入工作空间的压缩版 */
export function WorldModelStrip({
  data = WM_FIXTURE,
  className,
}: {
  data?: WmCanvasData;
  className?: string;
}) {
  const tone = useAppWmTone();
  return (
    <WmToneProvider tone={tone}>
      <WorldModelStripInner data={data} className={className} />
    </WmToneProvider>
  );
}

function WorldModelStripInner({
  data = WM_FIXTURE,
  className,
}: {
  data?: WmCanvasData;
  className?: string;
}) {
  const WM = useWm();
  const active = data.stages.find((s) => s.state === "active");
  return (
    <div
      className={cn("overflow-hidden rounded-[10px] border px-4 py-3", className)}
      style={{
        background: WM.panel,
        borderColor: WM.lineStrong,
        fontFamily: WM.sans,
        color: WM.ink,
      }}
    >
      <WmFonts />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px]" style={{ color: WM.mute }}>
          世界模型摘要
        </p>
        <p className="font-mono text-[10px]" style={{ color: WM.dim }}>
          {data.progress}%
        </p>
      </div>

      <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-sm" style={{ background: WM.line }}>
        {data.stages.map((s) => (
          <span
            key={s.id}
            className="h-full border-r last:border-0"
            style={{
              flex: Math.max(1, s.total),
              background:
                s.state === "done" ? WM.past : s.state === "active" ? WM.now : s.state === "blocked" ? WM.risk : "transparent",
              borderColor: WM.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.7)",
            }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: WM.mute }}>
        {active ? `当前 · ${active.name}` : "未开始"}
        {active?.overdue ? <span style={{ color: WM.risk }}> · 超时 {active.overdue}</span> : null}
      </p>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {data.past.slice(0, 4).map((p) => (
          <span
            key={p.id}
            className="shrink-0 rounded border px-2 py-1 text-[11px]"
            style={{ borderColor: WM.lineStrong, color: WM.past }}
          >
            {p.label}
          </span>
        ))}
        <span className="mx-1 h-8 w-px shrink-0" style={{ background: WM.now, opacity: 0.7 }} />
        <span
          className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium"
          style={{ borderColor: WM.now, color: WM.now, fontFamily: WM.display }}
        >
          {data.nowLabel}
        </span>
        <span className="mx-1 h-8 w-px shrink-0 border-l border-dashed" style={{ borderColor: WM.sim }} />
        {data.candidates.map((c) => (
          <span
            key={c.id}
            className="shrink-0 rounded border border-dashed px-2 py-1 font-mono text-[11px]"
            style={{ borderColor: WM.simLine, color: WM.sim }}
            title={[c.window && `窗口 ${c.window}`, `30d ${c.burden30}`, `90d ${c.burden90}`, c.riskNote]
              .filter(Boolean)
              .join(" · ")}
          >
            {c.id} {c.name}
            {c.window ? ` · ${c.window}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
