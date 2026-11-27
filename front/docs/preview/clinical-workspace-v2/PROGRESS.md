# Clinical Workspace V2.0 · 实施进度

- Commit 基线：main @ 8aa00c7（需求文档）+ 本地 UI-01/02/03 WIP
- 视口：1440×900 · Demo 模式 · 合成患者 HCC-DEMO-001（陈志远）
- 截图：`patient360-demo-1440.png` · `pathway-map-demo-1440.png`

## 已完成（P0）
- UI-01：globals token（canvas/surface/ink）、正文 14/22、标题 24、侧栏/顶栏密度
- UI-02：`clinical-workspace` 三栏壳；demo/server 患者详情共用身份摘要 + 左状态 / 中路径 / 右任务证据
- UI-03：路径节点默认仅名称+状态+必做；角色/时限/证据/ID 进检查器；点击节点打开检查器

## 待办
- 1440 右栏折叠抽屉、1920 全宽验收
- UI-04 工作台、UI-05 图表主题、UI-06 实验区治理
- 产品评审通过后再推广到其他页面

## UI-04 工作台
- 任务驱动：顶部可下钻指标 · 今日待办（超时优先）· 重点风险患者（可解释排序）
- 辅区：全科阶段负荷 / 开放变异 / 待审核（按权限）
- 已去掉硬编码「进入 HCC-DEMO-001」与单患者阶段样例冒充全局统计
- 截图：`dashboard-demo-1440.png`
