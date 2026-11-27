# Viz Kit v2 · dashboard-design skill

预览：
- http://127.0.0.1:5173/dev/desgin — 主页（**OV 概览** + Viz 图表）
- http://127.0.0.1:5173/dev/desgin#ov-overview — 概览候选锚点
- http://127.0.0.1:5173/dev/desgin/pathway — 路径阶段轨候选（A/B/C/D）
- http://127.0.0.1:5173/dev/desgin/tasks — 本阶段任务（E/F 甘特优先 + A–D 列表，dark/light）
- http://127.0.0.1:5173/dev/desgin/combo — B Segments + F Swimlane 组合

按 Quiet / Wordless 重做：近单色 + `#3e63dd`；暖色只标问题；卡片 label+大数字；pastel 柱 + 一亮柱；热力 pill 分级；Few bullet；tick 目标条；3px 底部分享条；深色大数字 tooltip。

| 路径 | 说明 |
| --- | --- |
| `INVENTORY.md` | 现有 ≈30+ 组件清单 |
| `kit/` | tokens · primitives · charts · pathway · **overview** |
| `fixtures.ts` | 含超阈 / 未达标样例 |
| `Gallery.tsx` | 主预览（OV-01…05 + Viz 图表） |
| `PathwayGallery.tsx` | StageProgressStrip 替换候选 |
| `StageTasksGallery.tsx` | TaskLine / 本阶段任务替换候选 |
| `ComboGallery.tsx` | B Segments + F Swimlane 组合 |

### OV · 工作空间概览编号

| 编号 | 组件名 | 说明 |
| --- | --- | --- |
| OV-01 | FactRail | 单列事实轨，无分区标题 |
| OV-02 | GroupedSheet | 弱组头三组表 |
| OV-03 | VitalStrip | 体征网格优先 |
| OV-04 | Snapshot | 身份数字 + 只列问题 |
| OV-05 | DenseTable | 两列斑马表，最高密度 |

确认后替换工作空间左侧 Panel；路径/任务见上表其它路由。
