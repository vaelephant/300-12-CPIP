# Clinical Workspace V2.0 · 改造前基线

| 项 | 值 |
| --- | --- |
| Commit | `8aa00c7` |
| 记录时间 | 2026-11-27 JST |
| 视口 | 1440×900 / 1920×1080（待补） |
| 数据模式 | Demo（合成） |
| 浏览器 | Cursor IDE browser |

## 源码审计摘要（对照需求文档 §1）

| 问题 | 位置 |
| --- | --- |
| 品牌紫蓝残留 | `globals.css` `--brand/#5e6ad2`；sidebar-ring |
| 正文字号偏小 | `body` 13px；多页 9–12px |
| 工作台区块等权 | `pages/dashboard/index.tsx` |
| 患者详情信息分散 | `pages/patients/detail.tsx` |
| 路径节点过载 | `visualization/pathway/LivePathwayNodeCard.tsx` |
| ECharts + Recharts 双栈 | `components/charts/*` + `visualization/*` |
| 实验 kit 独立 | `src/dev/desgin/`（正式页不得依赖） |

## 截图目录

`front/docs/preview/clinical-workspace-v2/baseline/`

- `dashboard-1440.png`
- `patient-detail-1440.png`（有会话时）
