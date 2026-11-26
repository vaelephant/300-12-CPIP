import { useMemo, useState } from "react";
import {
  Clock3,
  FileText,
  ListChecks,
  PanelsTopLeft,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { EVIDENCE_ITEMS } from "@/data";
import { NODE_META, ROLE_LABELS } from "@/lib/clinical";
import type { ClinicalRole, PathwayNode, TimeConstraint } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, Field } from "@/components/app/section";
import { DonutChart } from "@/components/charts/advanced";

export interface InspectorSummary {
  nodeCount: number;
  edgeCount: number;
  stageCoverage: number;
  totalStages: number;
  errors: number;
  warnings: number;
  infos: number;
}

export interface InspectorStructure {
  /** 按 NODE_GROUPS 归并的节点类型构成 */
  groups: { name: string; value: number; color: string }[];
  /** 阶段覆盖（顺序与画布阶段一致） */
  stages: { name: string; count: number; expected: boolean }[];
}

interface NodeInspectorProps {
  node: PathwayNode | null;
  stageOptions: string[];
  summary: InspectorSummary;
  structure: InspectorStructure;
  onChange: (patch: Partial<PathwayNode>) => void;
  onChangeTimeConstraint: (tc: TimeConstraint | undefined) => void;
  onRemoveSelected: () => void;
  onAddEvidence: (ref: string) => void;
  onRemoveEvidence: (ref: string) => void;
}

const ANCHOR_OPTIONS: { value: TimeConstraint["anchor"]; label: string }[] = [
  { value: "ENROLLMENT", label: "入径时间" },
  { value: "PREVIOUS_NODE", label: "前序节点" },
  { value: "ADMISSION", label: "入院时间" },
];

export function NodeInspector({
  node,
  stageOptions,
  summary,
  structure,
  onChange,
  onChangeTimeConstraint,
  onRemoveSelected,
  onAddEvidence,
  onRemoveEvidence,
}: NodeInspectorProps) {
  const [pendingEvidence, setPendingEvidence] = useState("");

  const evidenceRefs = node?.evidenceRefs ?? [];
  const remainingEvidence = useMemo(
    () => EVIDENCE_ITEMS.filter((item) => !evidenceRefs.includes(item.id)),
    [evidenceRefs],
  );

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-line bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2.5">
        <div>
          <p className="label-micro">INSPECTOR</p>
          <p className="mt-1 text-[12px] font-semibold">节点检查器</p>
        </div>
        {node && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemoveSelected}
            title="删除选中节点"
            className="text-muted-foreground hover:text-risk"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {!node ? (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-3 py-4">
          <EmptyState
            icon={<PanelsTopLeft className="size-4" />}
            title="未选择节点"
            description="在画布中单击节点，即可编辑属性、完成规则、时间约束与证据引用。"
            className="py-8"
          />
          <div className="mt-2 rounded-md border border-line bg-secondary/30 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="label-micro">路径概况</span>
              <span className="font-mono text-[9px] text-muted-foreground">V0.6.1</span>
            </div>
            <Field label="节点总数" value={summary.nodeCount} mono />
            <Field label="连线总数" value={summary.edgeCount} mono />
            <Field label="阶段覆盖" value={`${summary.stageCoverage} / ${summary.totalStages}`} mono />

            <div className="mt-2 border-t border-line pt-2">
              <p className="label-micro mb-1.5">校验结果</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-risk/20 bg-risk-wash px-1.5 py-px text-[10.5px] font-medium text-risk">
                  错误 {summary.errors}
                </span>
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-warn/25 bg-warn-wash px-1.5 py-px text-[10.5px] font-medium text-warn">
                  警告 {summary.warnings}
                </span>
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-info/20 bg-info-wash px-1.5 py-px text-[10.5px] font-medium text-info">
                  提示 {summary.infos}
                </span>
              </div>
              {summary.errors > 0 ? (
                <p className="mt-2 text-[10.5px] leading-relaxed text-risk">
                  存在阻断性错误，提交审核前须修复。
                </p>
              ) : (
                <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                  无阻断性错误，可提交医务处审核。
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-md border border-line bg-card p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold">结构分析</p>
              <span className="font-mono text-[9px] text-muted-foreground">当前画布 · 合成</span>
            </div>

            {structure.groups.length === 0 ? (
              <p className="py-4 text-center text-[10.5px] text-muted-foreground">画布暂无节点</p>
            ) : (
              <div className="flex items-center gap-2">
                <DonutChart
                  data={structure.groups}
                  height={108}
                  showLegend={false}
                  unit="节点"
                  centerLabel="合计"
                  centerValue={summary.nodeCount}
                  className="shrink-0"
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-1">
                  {structure.groups.map((group) => (
                    <div key={group.name} className="flex min-w-0 items-center gap-1 text-[9px] leading-[12px]">
                      <span className="size-1.5 shrink-0 rounded-[1px]" style={{ background: group.color }} />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{group.name}</span>
                      <span className="tabular shrink-0 font-mono text-[8.5px] text-foreground/75">{group.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 border-t border-line pt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="label-micro">阶段覆盖</span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {summary.stageCoverage}/{summary.totalStages}
                </span>
              </div>
              <div className="space-y-1">
                {structure.stages.map((stage) => {
                  const max = Math.max(...structure.stages.map((item) => item.count), 1);
                  return (
                    <div key={stage.name} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-[56px] shrink-0 truncate text-[9.5px]",
                          stage.expected ? "text-muted-foreground" : "text-muted-foreground/55",
                        )}
                        title={`${stage.name}${stage.expected ? "" : "（自定义阶段）"}`}
                      >
                        {stage.name}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn("h-full rounded-full", stage.count > 0 ? "bg-primary/75" : "bg-transparent")}
                          style={{ width: `${(stage.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="tabular w-4 shrink-0 text-right font-mono text-[9px] text-foreground/75">
                        {stage.count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground/70">
                节点类型按 NODE_GROUPS 归并 · 阶段覆盖为当前画布节点分布
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-line px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-px size-3.5 shrink-0 text-primary/70" />
            <span>安全约束由规则引擎统一执行：必做节点不可跳过，关键 UNKNOWN 不视为满足。</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-start gap-2 border-b border-line px-3 py-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[5px]",
                NODE_META[node.type].chip,
              )}
            >
              {(() => {
                const Icon = NODE_META[node.type].icon;
                return <Icon className="size-4" />;
              })()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold">{node.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <span>{node.type}</span>
                <span>·</span>
                <span>{node.nodeKey}</span>
              </p>
            </div>
          </div>

          <Tabs defaultValue="attributes" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="shrink-0 px-3">
              <TabsTrigger value="attributes">属性</TabsTrigger>
              <TabsTrigger value="rules">规则</TabsTrigger>
              <TabsTrigger value="timing">时间约束</TabsTrigger>
              <TabsTrigger value="evidence">证据</TabsTrigger>
            </TabsList>

            {/* ------------------------------ 属性 ------------------------------ */}
            <TabsContent value="attributes" className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-3 py-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-line bg-secondary/30 px-2.5 py-1.5">
                  <span className="label-micro">节点类型</span>
                  <span className="font-mono text-[10.5px] text-foreground/80">{node.type}</span>
                </div>

                <div>
                  <Label htmlFor="studio-node-name">节点名称</Label>
                  <Input
                    id="studio-node-name"
                    value={node.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="studio-node-desc">节点说明</Label>
                  <Textarea
                    id="studio-node-desc"
                    value={node.description ?? ""}
                    onChange={(event) => onChange({ description: event.target.value || undefined })}
                    placeholder="补充执行要点、临床注意事项…"
                    className="mt-1 min-h-[72px] text-[12px]"
                  />
                </div>

                <div>
                  <Label>执行角色</Label>
                  <Select
                    value={node.responsibleRole}
                    onValueChange={(value) => onChange({ responsibleRole: value as ClinicalRole })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as ClinicalRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>所属阶段</Label>
                  <Select value={node.stage} onValueChange={(value) => onChange({ stage: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stageOptions.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-md border border-line px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium">必做节点</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                      必做节点在患者计划中不可跳过
                    </p>
                  </div>
                  <Switch checked={node.required} onCheckedChange={(checked) => onChange({ required: checked })} />
                </div>

                <div className="border-t border-line pt-2">
                  <Field label="节点 ID" value={node.id} mono />
                  <Field label="nodeKey" value={node.nodeKey} mono />
                  <Field label="配置项" value={`${Object.keys(node.configuration ?? {}).length} 项`} mono />
                </div>
              </div>
            </TabsContent>

            {/* ------------------------------ 规则 ------------------------------ */}
            <TabsContent value="rules" className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-3 py-3">
              {node.completionRule ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-line p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="label-micro">完成规则</span>
                      <Badge variant="outline">{node.completionRule.type}</Badge>
                    </div>
                    <p className="mt-1 text-[12.5px] font-medium">{node.completionRule.name}</p>
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
                      <span>{node.completionRule.id}</span>
                      <span className="text-line-strong">@</span>
                      <span>{node.completionRule.version}</span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="label-micro">表达式（只读）</span>
                      <span className="font-mono text-[9.5px] text-muted-foreground">JSON</span>
                    </div>
                    <pre className="max-h-[240px] overflow-auto rounded-md border border-line bg-secondary/40 p-2.5 font-mono text-[10px] leading-relaxed text-foreground/80 scrollbar-slim">
                      {JSON.stringify(node.completionRule.expression, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                    <ListChecks className="mt-px size-3.5 shrink-0 text-primary/70" />
                    <span>规则表达式在规则库维护，设计器仅引用已发布版本，避免版本漂移。</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      onChange({
                        completionRule: {
                          id: "CR-NEW",
                          name: `${node.name}完成`,
                          version: "1.0.0",
                          type: "COMPLETION",
                          expression: { field: "task.completed", operator: "eq", value: true },
                        },
                      })
                    }
                  >
                    <Sparkles className="size-3.5" />
                    更新完成规则引用（演示）
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <EmptyState
                    icon={<ListChecks className="size-4" />}
                    title="未绑定完成规则"
                    description="缺少可计算的完成条件时，校验将给出警告，任务无法自动判定完成。"
                    className="py-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      onChange({
                        completionRule: {
                          id: "CR-NEW",
                          name: `${node.name}完成`,
                          version: "1.0.0",
                          type: "COMPLETION",
                          expression: { field: "task.completed", operator: "eq", value: true },
                        },
                      })
                    }
                  >
                    <Plus className="size-3.5" />
                    引用完成规则（演示）
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ---------------------------- 时间约束 ---------------------------- */}
            <TabsContent value="timing" className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-3 py-3">
              {node.timeConstraint ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-line bg-secondary/30 px-2.5 py-1.5">
                    <span className="label-micro">时间锚点</span>
                    <span className="font-mono text-[10.5px] text-foreground/80">{node.timeConstraint.anchor}</span>
                  </div>

                  <div>
                    <Label>锚点类型</Label>
                    <Select
                      value={node.timeConstraint.anchor}
                      onValueChange={(value) =>
                        onChangeTimeConstraint({
                          ...node.timeConstraint!,
                          anchor: value as TimeConstraint["anchor"],
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANCHOR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="studio-offset">偏移（小时）</Label>
                    <Input
                      id="studio-offset"
                      type="number"
                      min={0}
                      value={node.timeConstraint.offsetHours}
                      onChange={(event) =>
                        onChangeTimeConstraint({
                          ...node.timeConstraint!,
                          offsetHours: Number(event.target.value) || 0,
                        })
                      }
                      className="mt-1 font-mono tabular"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="studio-window-before">提前窗口</Label>
                      <Input
                        id="studio-window-before"
                        type="number"
                        min={0}
                        placeholder="—"
                        value={node.timeConstraint.windowBeforeHours ?? ""}
                        onChange={(event) =>
                          onChangeTimeConstraint({
                            ...node.timeConstraint!,
                            windowBeforeHours: event.target.value === "" ? undefined : Number(event.target.value),
                          })
                        }
                        className="mt-1 font-mono tabular"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studio-window-after">延后窗口</Label>
                      <Input
                        id="studio-window-after"
                        type="number"
                        min={0}
                        placeholder="—"
                        value={node.timeConstraint.windowAfterHours ?? ""}
                        onChange={(event) =>
                          onChangeTimeConstraint({
                            ...node.timeConstraint!,
                            windowAfterHours: event.target.value === "" ? undefined : Number(event.target.value),
                          })
                        }
                        className="mt-1 font-mono tabular"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-md border border-line px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium">硬约束</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                        超出窗口将触发时间变异并阻断任务
                      </p>
                    </div>
                    <Switch
                      checked={node.timeConstraint.hard}
                      onCheckedChange={(checked) =>
                        onChangeTimeConstraint({ ...node.timeConstraint!, hard: checked })
                      }
                    />
                  </div>

                  <div className="rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                    <p className="label-micro mb-1">预览</p>
                    <p className="font-mono text-[11px] text-foreground/80">
                      {ANCHOR_OPTIONS.find((o) => o.value === node.timeConstraint?.anchor)?.label ?? "—"}后{" "}
                      {node.timeConstraint.offsetHours}h
                      {node.timeConstraint.windowBeforeHours || node.timeConstraint.windowAfterHours
                        ? ` ±${node.timeConstraint.windowAfterHours ?? node.timeConstraint.windowBeforeHours ?? 0}h`
                        : ""}
                    </p>
                  </div>

                  <Button
                    variant="destructive-outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onChangeTimeConstraint(undefined)}
                  >
                    <Trash2 className="size-3.5" />
                    移除时间约束
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <EmptyState
                    icon={<Clock3 className="size-4" />}
                    title="未设置时间约束"
                    description="该节点不受时间窗口约束；如需质控时限，请添加锚点与偏移。"
                    className="py-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      onChangeTimeConstraint({ anchor: "PREVIOUS_NODE", offsetHours: 24, hard: false })
                    }
                  >
                    <Plus className="size-3.5" />
                    添加时间约束
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ------------------------------ 证据 ------------------------------ */}
            <TabsContent value="evidence" className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-3 py-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="label-micro">证据引用</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{evidenceRefs.length} 条</span>
                </div>

                {evidenceRefs.length === 0 && (
                  <div className="rounded-md border border-dashed border-line-strong px-3 py-5 text-center">
                    <FileText className="mx-auto size-4 text-muted-foreground/60" />
                    <p className="mt-1.5 text-[11.5px] font-medium">尚未绑定证据</p>
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">证据完备性校验将给出警告</p>
                  </div>
                )}

                {evidenceRefs.map((ref) => {
                  const item = EVIDENCE_ITEMS.find((evidence) => evidence.id === ref);
                  return (
                    <div key={ref} className="group flex items-start gap-2 rounded-md border border-line bg-card px-2.5 py-2">
                      <FileText className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium">{item?.title ?? ref}</p>
                        <p className="mt-0.5 truncate font-mono text-[9.5px] text-muted-foreground">
                          {ref} · {item?.source ?? "未知来源"} · {item?.year ?? "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveEvidence(ref)}
                        className="rounded p-0.5 text-muted-foreground/50 outline-none transition-colors hover:bg-secondary hover:text-risk focus-visible:ring-2 focus-visible:ring-ring/30"
                        title={`移除证据 ${ref}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}

                <div className="border-t border-line pt-2.5">
                  <Label>添加证据条目</Label>
                  <Select value={pendingEvidence} onValueChange={setPendingEvidence}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="选择知识库证据…" />
                    </SelectTrigger>
                    <SelectContent>
                      {remainingEvidence.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.id} · {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    disabled={!pendingEvidence}
                    onClick={() => {
                      if (!pendingEvidence) return;
                      onAddEvidence(pendingEvidence);
                      setPendingEvidence("");
                    }}
                  >
                    <Plus className="size-3.5" />
                    添加证据
                  </Button>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                    证据条目来自知识库 `EVIDENCE_ITEMS`，发布前需通过证据完备性校验。
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="shrink-0 border-t border-line bg-secondary/30 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] text-muted-foreground">{node.id}</span>
              <span className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground">
                <ShieldAlert className="size-3" />
                {node.required ? "必做" : "可选"} · {ROLE_LABELS[node.responsibleRole]}
              </span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
