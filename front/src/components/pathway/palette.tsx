import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_GROUPS, NODE_META } from "@/lib/clinical";
import type { NodeType } from "@/types";

interface NodePaletteProps {
  /** 每种节点类型在当前画布中的数量 */
  counts: Partial<Record<NodeType, number>>;
  /** 当前画布阶段覆盖与节点数 */
  stages: { name: string; count: number }[];
  onAdd: (type: NodeType) => void;
}

const ALL_TYPES = Object.keys(NODE_META) as NodeType[];

export function NodePalette({ counts, stages, onAdd }: NodePaletteProps) {
  return (
    <aside className="flex h-full w-[204px] shrink-0 flex-col border-r border-line bg-card/70">
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <p className="label-micro">PALETTE</p>
        <p className="mt-1 text-[12px] font-semibold">节点组件库</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
          单击添加节点，或拖拽至画布定位
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim px-2 py-2">
        {NODE_GROUPS.map((group) => {
          const items = ALL_TYPES.filter((type) => NODE_META[type].group === group.key);
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-2.5">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="label-micro">{group.label}</span>
                <span className="font-mono text-[9px] text-muted-foreground/60">{items.length}</span>
              </div>
              <div className="space-y-px">
                {items.map((type) => {
                  const meta = NODE_META[type];
                  const Icon = meta.icon;
                  const count = counts[type] ?? 0;
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/cpip-node", type);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onAdd(type)}
                      title={`添加「${meta.label}」— ${meta.description}`}
                      className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left outline-none transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring/30"
                    >
                      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[4px]", meta.chip)}>
                        <Icon className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground/85">{meta.label}</span>
                      {count > 0 ? (
                        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{count}</span>
                      ) : (
                        <Plus className="size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label-micro">阶段覆盖</span>
          <span className="font-mono text-[9px] text-muted-foreground">{stages.length} 阶段</span>
        </div>
        <div className="space-y-1">
          {stages.length === 0 && <p className="text-[10.5px] text-muted-foreground">尚未放置节点</p>}
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted-foreground">{stage.name}</span>
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground/80">{stage.count}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 border-t border-line pt-1.5 text-[9.5px] leading-relaxed text-muted-foreground/70">
          实线 SEQUENCE · 虚线 CONDITIONAL · 淡蓝 PARALLEL
        </p>
      </div>
    </aside>
  );
}
