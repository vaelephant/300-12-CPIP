# 路径图下一轮：先清噪音，再换节点卡 {#pathway-map-next}

壳层已经够薄；下一轮优先清**画布上的重复角标与默认打开的检查器**，再换 QuietGraph 节点卡。

- 图组件仍叠「只读 / 演示路径图」角标，和左上焦点浮层抢视线。
- 进入页默认选中节点且检查器常开，吃掉约 320px 主面。
- 侧栏「每次进入就收起」会写 cookie，离开后别的列表页也变窄。
- 节点卡仍是 VIS-001 旧样式；kit 里 QuietGraph 尚未替换。

@answer scope="路径图 map · 下一轮抛光优先级"
@meta locale=zh-CN style=product
@source map title="患者路径实时视图" path=front/src/pages/patients/map.tsx lines=61:79
@source graph title="LivePathwayGraph 角标" path=front/src/visualization/pathway/LivePathwayGraph.tsx lines=260:273

## 按伤害排序改什么？ {#priority}

| 项 {#pr} | 改什么 | 为什么 | 建议 |
| --- | --- | --- | --- |
| P0-角标 | 关掉图内「演示路径图」与重复只读角标 | 工具条已有模式与图例，角标是噪音 {bad:抢眼} | `LivePathwayGraph` 增加可关 props，map 全关 [](source:graph) |
| P0-检查器 | 默认收起检查器 | 主面优先被 320px 栏抵消 {bad:占宽} | 进入无选中或仅点击再开；默认 `inspectorOpen=false` |
| P1-浮层 | 左上焦点浮层可收 | 与检查器内容重复，遮节点 {caution:叠层} | 有选中时自动收；或「焦点」开关 |
| P1-侧栏 | 侧栏收起策略 | 每次 `setOpen(false)` 污染全局 cookie {caution:副作用} | 仅本路由收起，离开恢复；或记住用户手势 [](source:map) |
| P2-高度 | 画布高度不用 magic rem | `100vh-11.5rem` 易与顶栏错位 {caution:脆} | 父级 flex 填满，`height: 100%` |
| P2-节点卡 | 替换 QuietGraph 节点卡 | 布局好了，节点仍偏卡片墙 | 选定 LP-01 后再换 VIS-001 |
| 后置-回放 | 回放页同构 | replay 仍是旧页头栈 | 复用 map 壳后再动 |

@comparison id=do-next columns="现在就做,可以等" label="取舍"
| 清角标 / 默认收检查器 | 半小时内可见提升 {good:做} | — |
| 侧栏进出恢复 | 避免污染其他页 {good:做} | — |
| QuietGraph 换卡 | — | 视觉选型确认后 {caution:等} |
| 回放 / 详情同构 | — | 路径图稳定后再铺 {caution:等} |

## 建议落地顺序？ {#order}

@steps id=next-order
| n1 | 关角标 | map 调用处关掉图内演示徽标与重复只读条。 |
| n2 | 默认收检查器 | 进入页主面全宽；点节点再开。 |
| n3 | 修侧栏生命周期 | 进入收起、离开恢复上次展开态。 |
| n4 | flex 填满画布 | 去掉 fragile 的 viewport rem 计算。 |
| n5 | 换 QuietGraph | 确认 LP-01 后替换节点卡，不动布局壳。 |

- [ ] 1440 宽进入 map：检查器关闭时画布接近全宽
- [ ] 画布四角无「演示路径图」字样
- [ ] 从 map 返回患者列表后，侧栏恢复进入前状态
- [ ] 选中节点时左上焦点浮层不挡关键节点（收起或让位）
