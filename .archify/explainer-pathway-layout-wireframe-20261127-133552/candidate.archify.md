# 路径实时视图：布局 Before / After 线框 {#pathway-layout-wireframe}

路径实时视图应把**路径图画布顶到首屏**；身份与阶段只占一条 sticky 条，状态与决策贴在图上，不再叠卡片墙。

- 现状页头栈过厚：大标题、患者卡、两张状态卡压在画布之上，主面进屏太晚。
- After 把常驻壳层压成「顶栏 + 身份条 + 工具条」，侧栏深工作页默认收成 icon rail。
- 进度、阶段、决策只保留一处权威展示，消除 banner / 卡 / 轨上的重复数字。
- 本页对照范围仅限路径实时视图的垂直分区，不含工作台 KPI 与患者 Tab 细节。

@answer scope="路径实时视图 · 1440 宽 · 垂直分区线框"
@meta locale=zh-CN style=product
@source cw-kit title="Clinical Workspace 主面优先约定" path=front/src/components/patient/clinical-workspace.tsx lines=1:7
@source preview-map title="路径图预览截图" path=front/docs/preview/clinical-workspace-v2/pathway-map-demo-1440.png

## 垂直分区怎么叠？ {#stack}

@architecture id=layout-stack title="Before 与 After 的垂直分区"
| chrome | 应用壳：侧栏 + 顶栏 | frontend |
| beforeHead | Before：大标题 · 说明 · Meta | frontend |
| beforeCards | Before：患者卡 + 阶段卡 + 决策卡 | frontend |
| beforeBar | Before：实况/计划 · 视图 · 图例 | frontend |
| beforeCanvas | Before：路径画布（偏矮） | frontend |
| afterId | After：sticky 身份条 | frontend |
| afterBar | After：精简工具条 | frontend |
| afterCanvas | After：全高路径画布 | frontend |
| chrome > beforeHead | 常驻 | dashed |
| beforeHead > beforeCards | 再叠 | dashed |
| beforeCards > beforeBar | 再叠 | dashed |
| beforeBar > beforeCanvas | 主面最后 | emphasis |
| chrome > afterId | 常驻变薄 | dashed |
| afterId > afterBar | 精简 | dashed |
| afterBar > afterCanvas | 主面优先 | emphasis |

@steps id=stack-read
| s1 | 应用壳：侧栏 + 顶栏 | 两侧方案共用；深工作页 After 侧栏收成 icon rail。 | layout-stack | chrome |
| s2 | Before：大标题 · 说明 · Meta | 说明句与 INST/版本占一整段高度。[](source:preview-map) | layout-stack | beforeHead |
| s3 | Before：患者卡 + 阶段卡 + 决策卡 | 身份与决策再占两行卡片墙。 | layout-stack | beforeCards |
| s4 | After：sticky 身份条 | 姓名 · 阶段 · 进度 · 过敏并成一条。 | layout-stack | afterId |
| s5 | After：全高路径画布 | 阶段与决策改挂节点 / Inspector，画布吃满余高。 | layout-stack | afterCanvas |

## Before 线框读什么？ {#before-wire}

| 分区 {#bf-zone} | 常驻内容 | 问题 |
| --- | --- | --- |
| 侧栏 | 全部分组导航 | 常开，挤压画布横向宽度 {bad:常开} |
| 顶栏 | 面包屑 · 导览 · 搜索 | 可保留 |
| 页头 | 大标题「患者 · 路径实时视图」+ 说明句 | 句子与重复身份 {bad:占高} |
| Meta 行 | INST · 版本 · 锁定 · 阶段 · 46% | 与下方卡重复进度 {caution:重复} |
| 患者卡 | 头像 · 诊断 · 床位 · 进度条 | 与 sticky 身份目标重复 {bad:重复} |
| 状态双卡 | 当前阶段 · 关键决策 | 抢主面注意力 {bad:卡片墙} |
| 工具条 | 实况/计划 · 三视图 · 证据 · 适应 · 图例 | 按钮偏散 {caution:可收} |
| 画布 | 节点图 + 只读徽标 | 真正答案却进屏最晚 {caution:偏矮} |

@callout level=note title="与代码约定的关系"
`clinical-workspace.tsx` 已写明「主面优先 · 副驾抽屉」。[](source:cw-kit) Before 线框违反的是这条约定，不是缺组件。

## After 线框怎么排？ {#after-wire}

| 分区 {#af-zone} | 常驻内容 | 变化 |
| --- | --- | --- |
| Icon rail | 图标导航，可展开 | 默认收起侧栏全文 {good:让宽} |
| 顶栏 | 面包屑 · 搜索 | 导览可进溢出 |
| 身份条 | 姓名 · 性别年龄 · 阶段 · 进度 · 过敏 | 一条 sticky，形状固定 {good:定形} |
| 工具条 | 实况/计划 · 图/列表 · 溢出菜单 · 图例 | 证据与适应进「更多」 {good:精简} |
| 画布 | 全高路径图 | 主面占满首屏余高 {good:主面} |
| 节点 / Inspector | 当前阶段焦点 · 关键决策 · Meta | 从卡片墙迁到图上 {good:贴图} |

@comparison id=zone-compare columns="Before,After" label="分区去留"
| 大标题 + 说明句 | 整段占高 {bad:留} | 去掉；说明进空态 / tooltip {good:去} |
| 独立患者卡 | 再占一行 {bad:留} | 并入身份条 {good:并} |
| 阶段 / 决策双卡 | 画布之上 {bad:留} | 焦点节点 + 右侧抽屉 {good:迁} |
| 进度数字 | 三处重复 {caution:散} | 身份条一处权威 {good:一} |
| 侧栏 | 全文常开 {caution:宽} | 深工作默认 icon rail {good:收} |

## 改动顺序怎么落地？ {#rollout}

@steps id=rollout-steps
| r1 | 并身份条 | 去掉大标题块与患者卡；Meta 非关键字段进抽屉。 |
| r2 | 迁状态卡 | 「当前阶段 / 关键决策」改为画布焦点与 Inspector。 |
| r3 | 收工具条 | 常驻只留模式切换与视图；其余进溢出。 |
| r4 | 收侧栏 | 路径图 / 世界模型 / 观测台进入时默认 icon rail。 |

- [ ] 1440 宽下，工具条以下画布高度目测超过半屏
- [ ] 进度百分比在页面上只出现一次
- [ ] 过敏仍在身份条用强色；指标级标签不与过敏同级
- [ ] 深工作页刷新后侧栏仍为收起态（或按角色记忆）
