# HCC-CIP 现有可视化组件清单

> 梳理日期：2026-11-26 · 本目录为**候选替换集**，未接入业务页面。  
> 新组件见同目录 `kit/` + `Gallery.tsx`；确认后再替换系统内实现。

## 一、业务图表层（Recharts）· `src/components/charts/`

| 组件 | 文件 | 主要使用页 | 问题 |
| --- | --- | --- | --- |
| TrendChart / TrendLegend | chart-kit | analytics, simulation | 线粗细与轴样式偏模板 |
| HBarChart | chart-kit | patients, variations, analytics, versions | 条过高、标签密度不稳 |
| VBarChart | chart-kit | analytics | 柱顶标签噪音 |
| ChartBox / ChartTooltip | chart-kit | 全站 | 可用，样式需统一 |
| DonutChart | advanced | patients, tasks, knowledge, dashboard(旧) | 图例占宽、中心字过大 |
| SankeyFlow | advanced | dashboard(已移除) | 节点色杂 |
| QualityRadar | advanced | analytics | 填充过重 |
| StackedAreaTrend | advanced | variations, analytics | 堆叠色过多 |
| HeatmapGrid | advanced | variations, analytics | 曾用 oklch，语义色偏花 |
| GanttChart | advanced | patients/pathway | 业务甘特，可保留结构 |
| FanChart | advanced | simulation | 扇形带不清晰 |
| GaugeRing | advanced | analytics, executive | SVG 仪表偏玩具感 |
| CostEffectScatter | advanced | simulation | 散点对比可保留 |
| GroupedBarChart | advanced | tasks, versions | 分组柱样式普通 |
| ClinicalTrendChart | advanced | key-lab-trends | 参考区间可用 |
| chart-theme tokens | chart-theme | 全站 | 已 token 化，视觉仍灰闷 |

**导出约 16 个可渲染图表组件**（不含 tooltip/box 工具件）。

## 二、应用壳层小可视化 · `src/components/app/`

| 组件 | 用途 |
| --- | --- |
| Sparkline | StatCard / analytics KPI |
| StatCard | 多页 KPI（易成「盒子墙」） |

## 三、Clinical Visualization Engine · `src/visualization/`

| ID | 组件 | 技术 |
| --- | --- | --- |
| VIS-001 | LivePathwayGraph + NodeCard | React Flow |
| VIS-002 | PatientJourneyTimeline | SVG 自定义 |
| VIS-003 | GanttChart（复用 advanced） | Recharts/DOM |
| VIS-004 | ClinicalTrendLinkage | ECharts |
| VIS-005 | Heatmap（variations 页） | DOM grid |
| VIS-006 | ExecutiveCharts (Los/Donut/Enrollment) | ECharts |
| VIS-007 | PatientStateRadar | ECharts |
| VIS-008 | Sankey（历史 dashboard） | Recharts |
| VIS-009 | ProcessGraph + ProcessCharts | React Flow + ECharts |
| VIS-010 | DecisionEvidenceGraph | ECharts |
| VIS-011 | PatientTimeline / JourneyReplay | SVG/React |
| VIS-012 | TrajectorySimulator | ECharts |
| — | VisualFrame / EChart / theme | 基础设施 |

**引擎侧约 12+ 可视化场景组件**（含图/表配套）。

## 四、合计

| 层 | 可渲染组件约数 |
| --- | --- |
| charts (Recharts) | ~16 |
| app (spark/kpi) | 2 |
| visualization engine | ~12–15 |
| **合计** | **≈ 30+** |

## 五、替换策略（本目录）

1. 先在 `/dev/desgin` 预览 **Viz Kit v1**（通用图表 12 件 + token）。
2. 确认视觉与 API 后，再按页替换 `components/charts/*`，引擎层后置。
3. 路径图 / 流程挖掘 / 证据图等复杂引擎组件不在本轮 kit 内。
4. **路径阶段轨**：`/dev/desgin/pathway` · `kit/pathway.tsx`（A Spine / B Segments / C Milestones / D Focus）→ 选定后再替换 `StageProgressStrip`。
5. **本阶段任务**：`/dev/desgin/tasks` · `kit/stage-tasks.tsx`（A–D 列表）+ `kit/stage-gantt.tsx`（E Gantt / F Swimlane）→ 选定后再替换 `TaskLine` / 现网 `GanttChart`。
6. **组合预览**：`/dev/desgin/combo` · `kit/pathway-combo.tsx`（B Segments + F Swimlane 联动）。
7. **已接入业务**：`components/patient/pathway-execution.tsx` → `pages/patients/detail.tsx` 路径区（替换 StageProgressStrip）。
8. **工作空间概览**：`/dev/desgin#ov-overview` · `kit/overview.tsx`
   - **OV-01** FactRail · **OV-02** GroupedSheet ✅ · **OV-03** VitalStrip · **OV-04** Snapshot · **OV-05** DenseTable
   - 已接入：`components/patient/overview-grouped-sheet.tsx` → detail 左侧栏。
