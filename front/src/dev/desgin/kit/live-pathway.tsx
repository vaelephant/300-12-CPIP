import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Check, Circle, Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { HCC_GRAPH } from "@/data/pathways";
import { VIZ, mix } from "./tokens";
import { THEME_DARK, THEME_LIGHT, type KitTheme } from "./stage-tasks";

/**
 * LP · 动态临床路径图候选
 * 预览：/dev/desgin/live-pathway
 * 不接入业务页；确认后再替换 VIS-001 LivePathwayGraph。
 */

export type LpState =
  | "completed"
  | "active"
  | "pending"
  | "variant"
  | "blocked"
  | "unknown";

export type LpNodeData = {
  label: string;
  stage: string;
  state: LpState;
  required?: boolean;
  selected?: boolean;
  theme: KitTheme;
};

type LpNode = Node<LpNodeData, "lp">;

const STATE_LABEL: Record<LpState, string> = {
  completed: "已完成",
  active: "执行中",
  pending: "待执行",
  variant: "变异",
  blocked: "阻塞",
  unknown: "UNKNOWN",
};

/** 演示状态：检查完成 → MDT 执行中 → 术前营养干预标变异 */
export const LP_DEMO_STATE: Record<string, LpState> = {
  start: "completed",
  admission: "completed",
  split_pre: "completed",
  lab: "completed",
  imaging: "completed",
  icg: "completed",
  cardio: "completed",
  join_pre: "completed",
  diagnosis: "completed",
  liver: "completed",
  mdt: "active",
  decision: "pending",
  prehab: "variant",
  anesthesia: "pending",
  consent: "pending",
  surgery: "pending",
  recovery: "pending",
  split_post: "pending",
  pathology: "pending",
  analgesia: "pending",
  nursing: "pending",
  join_post: "pending",
  day1: "pending",
  discharge: "pending",
  follow: "pending",
  prolonged: "pending",
  conversion: "pending",
};

function Shell({
  code,
  name,
  blurb,
  theme,
  children,
  action,
}: {
  code: string;
  name: string;
  blurb: string;
  theme: KitTheme;
  children: ReactNode;
  action?: ReactNode;
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
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
              style={{ background: theme.soft, color: theme.ink }}
            >
              {code}
            </span>
            <h3 className="text-[13px] font-semibold tracking-[-0.02em]">{name}</h3>
          </div>
          <p className="mt-1 text-[12px] leading-5" style={{ color: theme.muted }}>
            {blurb}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StateGlyph({ state, theme }: { state: LpState; theme: KitTheme }) {
  if (state === "completed") {
    return (
      <span
        className="flex size-[16px] shrink-0 items-center justify-center rounded-full"
        style={{ background: theme.ink, color: theme.onInk }}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="flex size-[16px] shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: theme.ink }}
      >
        <span className="size-1.5 rounded-full" style={{ background: theme.ink }} />
      </span>
    );
  }
  if (state === "variant" || state === "blocked") {
    return state === "blocked" ? (
      <Lock className="size-3.5 shrink-0" style={{ color: theme.risk }} />
    ) : (
      <TriangleAlert className="size-3.5 shrink-0" style={{ color: theme.risk }} />
    );
  }
  if (state === "unknown") {
    return <Circle className="size-3.5 shrink-0" style={{ color: VIZ.warn }} />;
  }
  return (
    <span
      className="size-[16px] shrink-0 rounded-full border"
      style={{ borderColor: theme.lineStrong }}
    />
  );
}

const HANDLE = {
  width: 6,
  height: 6,
  opacity: 0,
  background: "transparent",
  border: "none",
  pointerEvents: "none" as const,
};

function LpQuietNode({ data }: NodeProps<LpNode>) {
  const { theme, state, label, selected, required } = data;
  const risk = state === "variant" || state === "blocked";
  const muted = state === "pending";
  return (
    <div
      className={cn("relative w-[156px] rounded-md border px-2.5 py-2 transition-shadow")}
      style={{
        background: theme.card,
        borderColor: state === "active" ? theme.ink : risk ? theme.risk : theme.lineStrong,
        borderWidth: state === "active" ? 2 : 1,
        boxShadow: selected ? `0 0 0 3px ${mix(theme.ink, 0.12)}` : undefined,
        opacity: muted ? 0.72 : 1,
        color: theme.ink,
        fontFamily: theme.font,
      }}
    >
      {risk && (
        <span
          className="absolute inset-y-2 left-0 w-[2px] rounded-full"
          style={{ background: theme.risk }}
          aria-hidden
        />
      )}
      <Handle type="target" position={Position.Top} style={HANDLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE} />
      <div className="flex items-start gap-2">
        <StateGlyph state={state} theme={theme} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12px] leading-4 font-medium">{label}</p>
          <p className="mt-1 text-[10px]" style={{ color: risk ? theme.risk : theme.muted }}>
            {STATE_LABEL[state]}
            {required ? " · 必做" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { lp: memo(LpQuietNode) } satisfies NodeTypes;

function edgeStroke(state: LpState, theme: KitTheme) {
  if (state === "variant" || state === "blocked") return theme.risk;
  if (state === "active") return mix(theme.ink, 0.55);
  if (state === "completed") return theme.ink;
  if (state === "unknown") return VIZ.warn;
  return theme.lineStrong;
}

function useGraphModel(theme: KitTheme, selectedKey: string | null, stateMap: Record<string, LpState>) {
  return useMemo(() => {
    const scale = 1.35;
    const nodes: LpNode[] = HCC_GRAPH.nodes.map((n) => {
      const state = stateMap[n.nodeKey] ?? "pending";
      return {
        id: n.id,
        type: "lp" as const,
        position: { x: n.position.x * scale, y: n.position.y * scale },
        data: {
          label: n.name,
          stage: n.stage,
          state,
          required: n.required,
          selected: selectedKey === n.nodeKey,
          theme,
        },
        draggable: false,
        selectable: false,
        connectable: false,
      };
    });

    const idByKey = new Map(HCC_GRAPH.nodes.map((n) => [n.nodeKey, n.id]));
    const edges: Edge[] = HCC_GRAPH.edges.map((e) => {
      const srcState = stateMap[e.source] ?? "pending";
      const tgtState = stateMap[e.target] ?? "pending";
      const hot =
        srcState === "variant" ||
        srcState === "blocked" ||
        tgtState === "variant" ||
        tgtState === "blocked"
          ? ("variant" as LpState)
          : srcState === "active" || tgtState === "active"
            ? ("active" as LpState)
            : srcState === "completed" && tgtState === "completed"
              ? ("completed" as LpState)
              : ("pending" as LpState);
      const stroke = edgeStroke(hot, theme);
      return {
        id: e.id,
        source: idByKey.get(e.source) ?? `node-${e.source}`,
        target: idByKey.get(e.target) ?? `node-${e.target}`,
        type: "smoothstep",
        style: {
          stroke,
          strokeWidth: hot === "active" ? 2 : 1.25,
          strokeDasharray: hot === "variant" || hot === "pending" ? "5 4" : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: stroke },
        label: e.type === "CONDITIONAL" ? (e.isDefault ? "默认" : "条件") : undefined,
        labelStyle: { fill: theme.muted, fontSize: 9, fontFamily: theme.font },
        labelBgStyle: { fill: theme.card, fillOpacity: 0.92 },
        labelBgPadding: [3, 1] as [number, number],
        labelBgBorderRadius: 2,
      };
    });

    return { nodes, edges };
  }, [theme, selectedKey, stateMap]);
}

function FitOnce({ focusKey }: { focusKey?: string | null }) {
  const { fitView, setCenter } = useReactFlow();
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (focusKey) {
        const n = HCC_GRAPH.nodes.find((x) => x.nodeKey === focusKey);
        if (n) {
          void setCenter(n.position.x * 1.35 + 80, n.position.y * 1.35 + 30, { zoom: 0.85, duration: 0 });
          return;
        }
      }
      void fitView({ padding: 0.18, maxZoom: 0.95, duration: 0 });
    }, 40);
    return () => window.clearTimeout(t);
  }, [fitView, focusKey, setCenter]);
  return null;
}

function GraphCanvas({
  theme,
  selectedKey,
  onSelect,
  stateMap,
  height,
  focusKey,
}: {
  theme: KitTheme;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  stateMap: Record<string, LpState>;
  height: number;
  focusKey?: string | null;
}) {
  const { nodes, edges } = useGraphModel(theme, selectedKey, stateMap);
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ height, borderColor: theme.line, background: theme.page }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          minZoom={0.15}
          maxZoom={1.4}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) =>
            onSelect(HCC_GRAPH.nodes.find((x) => x.id === n.id)?.nodeKey ?? null)
          }
          onPaneClick={() => onSelect(null)}
          style={{ width: "100%", height: "100%" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color={theme.lineStrong}
          />
          <Controls showInteractive={false} className="!shadow-none" />
          <FitOnce focusKey={focusKey} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

function Legend({ theme }: { theme: KitTheme }) {
  const items: LpState[] = ["completed", "active", "pending", "variant", "blocked"];
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: theme.muted }}>
      {items.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <StateGlyph state={s} theme={theme} />
          {STATE_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

/** LP-01 QuietGraph · 墨色动态图，暖色只标变异/阻塞 */
export function LivePathwayQuietGraph({
  theme = THEME_LIGHT,
  stateMap = LP_DEMO_STATE,
}: {
  theme?: KitTheme;
  stateMap?: Record<string, LpState>;
}) {
  const [selected, setSelected] = useState<string | null>("mdt");
  const focus =
    Object.entries(stateMap).find(([, s]) => s === "active")?.[0] ??
    Object.entries(stateMap).find(([, s]) => s === "variant")?.[0] ??
    null;
  const meta = selected ? HCC_GRAPH.nodes.find((n) => n.nodeKey === selected) : null;
  const state = selected ? stateMap[selected] ?? "pending" : null;

  return (
    <Shell
      code="LP-01"
      name="QuietGraph"
      blurb="React Flow 动态图 · 节点极简 · 当前/风险加重 · 替换 VIS-001 节点卡候选"
      theme={theme}
    >
      <GraphCanvas
        theme={theme}
        selectedKey={selected}
        onSelect={setSelected}
        stateMap={stateMap}
        height={420}
        focusKey={focus}
      />
      <Legend theme={theme} />
      {meta && state && (
        <div
          className="mt-3 rounded-md border px-3 py-2 text-[12px]"
          style={{ borderColor: theme.line, background: theme.soft }}
        >
          <p className="font-medium">{meta.name}</p>
          <p className="mt-0.5" style={{ color: theme.muted }}>
            {meta.stage} · {STATE_LABEL[state]} · {meta.nodeKey}
          </p>
        </div>
      )}
    </Shell>
  );
}

/** LP-02 StageSwim · 按阶段纵向泳道，节点为横排胶囊 */
export function LivePathwayStageSwim({
  theme = THEME_LIGHT,
  stateMap = LP_DEMO_STATE,
}: {
  theme?: KitTheme;
  stateMap?: Record<string, LpState>;
}) {
  const [selected, setSelected] = useState("mdt");
  const stages = useMemo(() => {
    const map = new Map<string, typeof HCC_GRAPH.nodes>();
    for (const n of HCC_GRAPH.nodes) {
      if (!map.has(n.stage)) map.set(n.stage, []);
      map.get(n.stage)!.push(n);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <Shell
      code="LP-02"
      name="StageSwim"
      blurb="阶段泳道 · 无画布拖拽 · 适合窄屏扫一眼进度与异常"
      theme={theme}
    >
      <div className="space-y-2">
        {stages.map(([stage, nodes]) => (
          <div key={stage} className="rounded-lg border px-3 py-2" style={{ borderColor: theme.line }}>
            <p className="mb-2 text-[11px] font-medium tracking-[0.04em] uppercase" style={{ color: theme.muted }}>
              {stage}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {nodes.map((n) => {
                const state = stateMap[n.nodeKey] ?? "pending";
                const risk = state === "variant" || state === "blocked";
                const on = selected === n.nodeKey;
                return (
                  <button
                    key={n.nodeKey}
                    type="button"
                    onClick={() => setSelected(n.nodeKey)}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px]"
                    style={{
                      borderColor: on ? theme.ink : risk ? theme.risk : theme.line,
                      background: state === "completed" ? mix(theme.ink, 0.06) : theme.card,
                      color: theme.ink,
                      boxShadow: on ? `inset 2px 0 0 ${theme.ink}` : undefined,
                    }}
                    title={`${n.name} · ${STATE_LABEL[state]}`}
                  >
                    <StateGlyph state={state} theme={theme} />
                    <span className="truncate">{n.name}</span>
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

/** LP-03 FocusPath · 只展开当前关键路径（完成→当前→后续 1–2） */
export function LivePathwayFocusPath({
  theme = THEME_LIGHT,
  stateMap = LP_DEMO_STATE,
}: {
  theme?: KitTheme;
  stateMap?: Record<string, LpState>;
}) {
  const chain = useMemo(() => {
    const ordered = [...HCC_GRAPH.nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    const hotIdx = Math.max(
      0,
      ordered.findIndex((n) => {
        const s = stateMap[n.nodeKey] ?? "pending";
        return s === "active" || s === "variant" || s === "blocked";
      }),
    );
    const start = Math.max(0, hotIdx - 2);
    const end = Math.min(ordered.length, hotIdx + 4);
    return ordered.slice(start, end);
  }, [stateMap]);

  return (
    <Shell
      code="LP-03"
      name="FocusPath"
      blurb="只显示当前附近节点 · 信息最少 · 可嵌患者工作空间主面"
      theme={theme}
    >
      <ol className="relative space-y-0 pl-1">
        <span
          className="absolute top-3 bottom-3 left-[11px] w-px"
          style={{ background: theme.lineStrong }}
          aria-hidden
        />
        {chain.map((n, i) => {
          const state = stateMap[n.nodeKey] ?? "pending";
          const risk = state === "variant" || state === "blocked";
          const isHot = state === "active" || risk;
          return (
            <li key={n.nodeKey} className="relative flex gap-3 py-2.5">
              <span className="relative z-[1] mt-0.5">
                <StateGlyph state={state} theme={theme} />
              </span>
              <div
                className="min-w-0 flex-1 rounded-md border px-3 py-2"
                style={{
                  borderColor: isHot ? (risk ? theme.risk : theme.ink) : theme.line,
                  background: isHot ? theme.soft : "transparent",
                }}
              >
                <p className="text-[10px]" style={{ color: theme.muted }}>
                  {n.stage}
                  {i === 0 ? "" : ""}
                </p>
                <p className="mt-0.5 text-[13px] font-medium tracking-[-0.01em]">{n.name}</p>
                <p className="mt-1 text-[11px]" style={{ color: risk ? theme.risk : theme.muted }}>
                  {STATE_LABEL[state]}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}

export { THEME_DARK, THEME_LIGHT };
