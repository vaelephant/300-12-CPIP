# 医疗世界模型：下一轮强化什么 {#wm-strengthen}

先把世界模型做成**可演示的临床决策面**：Past 接真执行、Now 接阻断与 CDSS、Future 保持研究闸门；壳层学路径图「主面优先」，再谈引擎。

- 现状已有 Past|Now|Future 画布、CDSS 双向联动与激活闸门，但数据仍是 fixture。[](source:inv)
- 组件仍住在 `dev/desgin/kit`，却已挂进患者「观测台」——边界不清，难做产品化。[](source:obs)
- 与路径实时图、任务、检验未打通：同一阶段进度可能两套说法。
- Future 有 `clinical_use=false` 语义，但对比 A/B/C、证据追溯与「生成草稿」后的路径仍浅。

@answer scope="世界模型 · 观测台 · 产品强化优先级 · 不含真实计划引擎"
@meta locale=zh-CN style=product
@source inv title="设计清单 · 世界模型" path=front/src/dev/desgin/INVENTORY.md lines=79:84
@source obs title="临床观测台" path=front/src/components/patient/clinical-observatory.tsx lines=13:16
@source wm title="WM Canvas 数据模型" path=front/src/dev/desgin/kit/world-model.tsx lines=197:215

## 产品上差哪一刀？ {#gap}

@architecture id=wm-pillars title="观测台三柱与缺口"
| pathway | 标准路径执行 | frontend |
| cdss | CDSS 行动列表 | frontend |
| wm | Past · Now · Future 画布 | frontend |
| gate | 激活闸门 · 待审草稿 | security |
| engine | 计划引擎 · 未接 | backend |
| pathway > wm | 阶段应对齐 | dashed |
| cdss > wm | 已双向定位 | emphasis |
| wm > gate | 情景≠计划 | security |
| gate > engine | Demo toast 止步 | dashed |

@steps id=gap-read
| g1 | 标准路径执行 | 执行页 / 路径图已有；观测台阶段轨未共用同一数据源。 | wm-pillars | pathway |
| g2 | CDSS 行动列表 | 三条 fixture 行动可定位画布；缺任务/检验回写。 | wm-pillars | cdss |
| g3 | Past · Now · Future 画布 | 交互骨架完整；Past 未接任务事件，Future 节点过浅。 | wm-pillars | wm |
| g4 | 激活闸门 · 待审草稿 | 闸门文案对；草稿未进入审核中心。 | wm-pillars | gate |

## 建议按什么顺序强化？ {#priority}

| 波次 {#wave} | 做什么 | 读者立刻感到的变化 | 不做的后果 |
| --- | --- | --- | --- |
| W1 主面 | 观测台套用路径图壳：身份条 + 全高画布；CDSS 默认抽屉 | 世界模型成为主角 {good:主面} | 仍像三栏演示页 {bad:挤} |
| W1 对齐 | Past/阶段轨接患者实例任务与节点状态 | 「做过什么」与路径图一致 {good:同源} | 两套进度互打脸 {bad:不信} |
| W1 治理 | Future 条带常驻「研究推演 · 不可直激」；草稿进审核队列 Demo | 安全叙事可对外讲 {good:闸门} | 推演像可开医嘱 {caution:风险} |
| W2 深度 | A/B/C 对比轨：负担/风险/窗口并排；选中节点展开前提与证据 | 情景研究可开会用 {good:对比} | 仍是两张浅节点 {caution:浅} |
| W2 联动 | 路径图 ↔ 观测台深链：同阶段/同节点互跳并高亮 | 一条病程两种视图 {good:闭环} | 功能孤岛 {caution:断} |
| W3 工程 | kit 迁出 `dev/desgin` → `components/world-model`；类型与 fixture 分离 | 可维护、可接 API {good:边界} | 演示代码长在业务里 {bad:债} |
| 后置 | 接真实计划引擎 / 仿真 | 真正生成可执行计划 | 无引擎前勿承诺 {caution:范围外} |

@comparison id=now-vs-next columns="现在,强化后" label="观测台体感"
| 数据 | fixture 固定故事 {caution:假} | Past←任务事件 · Now←阻断/检验 {good:半真} |
| 布局 | CDSS 常驻左栏 + 画布 | 画布全宽 · CDSS 抽屉 {good:主面} |
| Future | 情景可点，对比弱 | A/B/C 并排指标 + 闸门草稿入审 {good:可讲} |
| 与路径图 | 各说各话 | 同 stage/nodeKey 互跳 {good:一体} |

## 第一周先交付什么？ {#week1}

@steps id=week1
| w1 | 壳层主面化 | 观测台复用 sticky 身份条与全高画布；CDSS/闸门进右侧抽屉。 |
| w2 | Past 接实例 | 用现有 tasks / replay 快照填 `WmPastEvent`，阶段轨对齐 `instance.currentStage`。 |
| w3 | Now 接阻断 | `nowBlockers` / `nowFacts` 从缺失字段与超时任务派生，CDSS 条目跟 Now 同源。 |
| w4 | 闸门闭环 Demo | 「生成待审草稿」写入本地审核列表或跳转审核中心空态，仍标合成。 |
| w5 | 深链入口 | 路径图工具条「观测台」· 观测台「打开路径图」，带 `stage` / `nodeKey`。 |

- [ ] 观测台首屏：画布面积明显大于 CDSS 栏
- [ ] Past 事件条数与该患者已完成任务可对上（允许抽样）
- [ ] Future 区域始终可见「不可直激」标识
- [ ] 从路径图能一键跳进观测台并落到同一阶段
- [ ] 世界模型类型文件不再只存在于 `dev/desgin/kit`（至少开始搬迁计划）

@callout level=note title="边界"
本页建议停在「半真数据 + 闸门 Demo」。接生产计划引擎属于后置；未接引擎前对外话术保持「研究情景 · 待审草稿」。
