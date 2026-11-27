// ---------------------------------------------------------------------------
// VIS-010 · 临床决策证据图谱
// 推荐建议 → 临床规则 → 证据条目 → 患者状态 → 生成计划 的可解释链路。
// 数据为合成演示，图谱用于展示“计算与决策依据”，不是大模型生成的解释文本。
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/visualization/core/EChart";
import { vizPalette } from "@/visualization/core/theme";
import {
  DECISION_EVIDENCE_EDGES,
  DECISION_EVIDENCE_NODES,
} from "@/data/visualization-data";
import { cn } from "@/lib/utils";

type EvidenceNode = (typeof DECISION_EVIDENCE_NODES)[number];

const KIND_META: Record<
  EvidenceNode["kind"],
  { label: string; palette: (p: ReturnType<typeof vizPalette>) => string; size: number }
> = {
  recommendation: { label: "规划建议", palette: (p) => p.chart[0], size: 62 },
  rule: { label: "临床规则", palette: (p) => p.chart[2], size: 46 },
  evidence: { label: "证据条目", palette: (p) => p.chart[3], size: 42 },
  patient: { label: "患者状态", palette: (p) => p.chart[4], size: 52 },
  plan: { label: "候选计划", palette: (p) => p.ok, size: 46 },
};

export function DecisionEvidenceGraph({
  height = 320,
  className,
  nodes = DECISION_EVIDENCE_NODES,
  edges = DECISION_EVIDENCE_EDGES,
  onSelect,
}: {
  height?: number;
  className?: string;
  nodes?: typeof DECISION_EVIDENCE_NODES;
  edges?: typeof DECISION_EVIDENCE_EDGES;
  onSelect?: (node: EvidenceNode) => void;
}) {
  const [selected, setSelected] = useState<string>("rec");
  const colors = useMemo(() => vizPalette(), []);

  const option = useMemo<EChartsOption>(() => {
    const categories = Array.from(new Set(nodes.map((n) => n.kind))).map((kind) => ({
      name: KIND_META[kind].label,
      itemStyle: { color: KIND_META[kind].palette(colors) },
    }));

    return {
      animationDuration: 400,
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as { dataType?: string; data?: { id?: string } };
          if (p.dataType === "edge") return "引用关系";
          const node = nodes.find((n) => n.id === p.data?.id);
          if (!node) return "";
          return `<b style="font-size:11px">${node.label}</b><br/><span style="font-size:10px;opacity:.7">${KIND_META[node.kind].label}</span>`;
        },
        backgroundColor: colors.card,
        borderColor: colors.line,
        textStyle: { color: colors.ink, fontSize: 10 },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          categories,
          force: { repulsion: 420, edgeLength: [92, 160], gravity: 0.06, friction: 0.2 },
          label: {
            show: true,
            position: "bottom",
            distance: 4,
            fontSize: 9,
            color: colors.muted,
            width: 96,
            overflow: "truncate",
            formatter: (params: unknown) => {
              const p = params as { data?: { name?: string } };
              return p.data?.name ?? "";
            },
          },
          lineStyle: { color: colors.lineStrong, width: 1, curveness: 0.06, opacity: 0.9 },
          edgeSymbol: ["none", "arrow"],
          edgeSymbolSize: 4,
          labelLayout: { hideOverlap: true },
          emphasis: { focus: "adjacency", lineStyle: { width: 1.8 } },
          edgeLabel: {
            show: true,
            fontSize: 8,
            color: colors.muted,
          },
          data: nodes.map((node) => ({
            id: node.id,
            name: node.label.length > 15 ? `${node.label.slice(0, 14)}…` : node.label,
            category: Array.from(new Set(nodes.map((n) => n.kind))).indexOf(node.kind),
            symbolSize: KIND_META[node.kind].size,
            itemStyle: {
              color: KIND_META[node.kind].palette(colors),
              borderColor: node.id === selected ? colors.ink : colors.card,
              borderWidth: node.id === selected ? 3 : 1.5,
              opacity: selected && selected !== node.id ? 0.86 : 1,
            },
          })),
          links: edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            label: { show: true, formatter: edge.label },
            lineStyle: { curveness: 0.06 },
          })),
        },
      ],
    };
  }, [nodes, edges, selected, colors]);

  const activeNode = nodes.find((n) => n.id === selected) ?? nodes[0];
  const related = edges.filter((e) => e.source === selected || e.target === selected);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <EChart
        option={option}
        height={height}
        ariaLabel="临床决策证据图谱"
        onEvents={{
          click: (params) => {
            const p = params as { dataType?: string; data?: { id?: string } };
            if (p.dataType === "node" && p.data?.id) {
              setSelected(p.data.id);
              const node = nodes.find((n) => n.id === p.data?.id);
              if (node) onSelect?.(node);
            }
          },
        }}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        {(Object.keys(KIND_META) as EvidenceNode["kind"][]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: KIND_META[kind].palette(colors) }} />
            {KIND_META[kind].label}
          </span>
        ))}
        <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">
          点击节点查看依据 · 可拖拽/缩放
        </span>
      </div>
      <div className="rounded-md border border-line bg-secondary/30 px-3 py-2">
        <p className="text-[11px] font-medium">{activeNode.label}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {KIND_META[activeNode.kind].label} · 关联 {related.length} 条依据关系
          {activeNode.kind === "recommendation" && " · 建议不会自动执行，需医生审核"}
          {activeNode.kind === "patient" && " · 读取自患者状态快照，可追溯原始数据"}
        </p>
      </div>
    </div>
  );
}
