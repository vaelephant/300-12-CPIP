# 观测台为什么「杂」：按 Vercel 克制法则收 {#vercel-calm}

杂乱不是信息太多，而是**同一事实被说了三遍**，再用彩色面板、字轨标签和卡片墙互相抢戏。Vercel 风格的本质是：一屏一个主角、灰阶扛层级、色只标状态、字比盒子重要。

- Vercel 产品面：近白/近黑底、Geist 系无衬线、发丝线、一个黑底主按钮、其余安静。
- 我们观测台：阶段轨 + 三色带 + Flow + A/B/C 三卡 + 展开区 + Inspector 叠在同一竖轴，每层都有 `WORLD MODEL` / `FUTURE · COMPARE` 这类字轨。
- 医疗不能照搬营销站，但应借它的**克制规则**；Fraunces 编辑风 + 青绿色氛围适合 Demo 海报，不适合日用临床面。
- 下一刀不是再加组件，而是删重复层、统一灰阶、对比改「一行表」而不是「三张卡」。

@answer scope="视觉方向 · 观测台/世界模型 · 借鉴 Vercel 克制而非抄品牌"
@meta locale=zh-CN style=product

## Vercel 到底在克制什么？ {#vercel-rules}

| 法则 {#vr} | Vercel 怎么做 | 我们现状 | 改法 |
| --- | --- | --- | --- |
| 一屏一主角 | 登录页只推一个 Continue | 画布、对比轨、Inspector 同权重 {bad:抢戏} | 竖轴只留「阶段轨 → 画布」；对比与详情进次层 |
| 灰阶分层 | 黑字 / 灰字 / 发丝边 | 青绿底带 + 多色边框同时喊 {caution:吵} | 面板一律白/浅灰；色只给 risk/active |
| 字 > 盒子 | 标题本身就是层级 | 先画圆角卡再塞字 {caution:卡墙} | 对比用表格行，不是三张同构卡 |
| 少标签 | 几乎不用 ALL-CAPS 眉题 | `WORLD MODEL` `CDSS · NOW` 过密 {bad:装饰} | 删字轨；需要时一句人话 |
| 一主操作 | 一个实心黑按钮 | 路径图/CDSS/闸门并排抢 {caution:散} | 工具条：左上下文，右一个「CDSS」 |
| 重复禁止 | 同一数据只出现一次 | 情景在 Flow、三卡、Inspector 各说一遍 {bad:三遍} | 选中后只在一侧详述 |

@callout level=note title="不是做成 Vercel 克隆"
医疗界面要更高信息密度；借的是「冷静与唯一主角」，不是三角 Logo 或营销留白。密度可以高，嘈杂不可以。

## 观测台竖轴现在多了什么？ {#stack-now}

@architecture id=noisy-stack title="当前观测台竖轴（嘈杂）"
| chrome | 工具条 · 字轨 · 徽章 | frontend |
| stages | 阶段轨 | frontend |
| bands | Past / Now / Future 色带 | frontend |
| flow | React Flow 画布 | frontend |
| compare | A/B/C 三卡 + 展开 | frontend |
| inspect | Selection Inspector | frontend |
| chrome > stages | |
| stages > bands | |
| bands > flow | emphasis |
| flow > compare | 再讲一遍 Future |
| compare > inspect | 又讲一遍 | dashed |

@steps id=noise-read
| n1 | 工具条 · 字轨 · 徽章 | `WORLD MODEL` 与 `clinical_use=false` 芯片占第一眼。 | noisy-stack | chrome |
| n2 | React Flow 画布 | 真正的世界模型主角，却被上下夹击。 | noisy-stack | flow |
| n3 | A/B/C 三卡 + 展开 | 与画布右侧扇出重复叙述情景。 | noisy-stack | compare |
| n4 | Selection Inspector | 第三次复述选中节点。 | noisy-stack | inspect |

## 按 Vercel 法则，竖轴应收成什么样？ {#stack-calm}

@architecture id=calm-stack title="克制后的观测台竖轴"
| bar | 一行上下文 · 一个 CDSS | frontend |
| stages | 细阶段轨（无彩带标题） | frontend |
| flow | 全宽 Past\|Now\|Future 画布 | frontend |
| detail | 底栏或右抽屉：对比表 / 详情二选一 | frontend |
| bar > stages | |
| stages > flow | 主角 | emphasis |
| flow > detail | 点选才展开 | dashed |

| 区域 {#calm} | 内容 | 不做 |
| --- | --- | --- |
| 顶栏 | `陈志远 · 术前检查 · 46%` + 按钮「CDSS」 | 不要 WORLD MODEL 字轨、双按钮 |
| 阶段轨 | 细进度条，选中微高亮 | 不要大段 summary 卡片 |
| 画布 | 唯一主角；Future 扇出即对比入口 | 不要再叠三色大标题带 |
| 底/侧 | **对比表**一行一情景；点行展开前提/证据 | 不要三张同构卡 + 下方再 Inspector |
| 色 | 默认墨与灰；超时/风险才红；推演用一条虚线 | 不要整块青绿未来底 |

@comparison id=compare-form columns="现在,Vercel 化" label="Future 对比形态"
| 呈现 | 三张圆角卡并排 {caution:卡墙} | 三行表：情景 / 窗口 / 30d / 90d / 风险 {good:表} |
| 选中 | 卡下再开大面板 | 表下行内展开，或右侧一列详情 {good:一层} |
| 与 Flow | 扇出节点 + 卡 + Inspector | 扇出点选 → 只驱动详情列 {good:单源} |

## 字体与色：怎么换才不「Demo 海报」？ {#tokens}

| Token {#tk} | 建议 | 原因 |
| --- | --- | --- |
| 正文字体 | 单一无衬线（Geist / 系统 UI / 现有 Plex Sans 择一） | 双字体 + 衬线标题偏编辑杂志 |
| 数字 | 等宽只用于数值与 ID，不用于章节眉题 | 避免满屏 `TRACKING` 标签 |
| 底 | `#FAFAFA` 画布 · `#FFF` 面 · `#EAEAEA` 线 | 对齐 Vercel 发丝线体系 |
| 墨 | `#171717` 主字 · `#666` 次字 | 用灰阶分层，不用色块分层 |
| 语义色 | 仅 risk / warn / ok；推演不用大面积青底 | 色 = 状态，不是氛围 |
| 圆角 | 统一 6–8px | 与 Vercel 控件一致，少「胶囊」 |

@callout level=warning title="最该先删的三样"
1. 满屏字轨眉题（`FUTURE · COMPARE` 等）。  
2. A/B/C 三卡与 Flow 扇出 + Inspector 的三重复述。  
3. Past/Now/Future 整条色带标题——改成画布内极淡分区或虚线即可。

## 建议落地顺序？ {#order}

@steps id=calm-order
| c1 | 删重复层 | 底栏只留「对比表」；去掉独立 Inspector 或合并进表的展开行。 |
| c2 | 灰阶化 | 去掉 futureBand 大块着色；风险只用字色/小点。 |
| c3 | 顶栏一句人话 | 换成患者·阶段·进度；CDSS 单按钮开抽屉。 |
| c4 | 字轨清零 | 章节标题改句子或直接省略。 |
| c5 | 字体收敛 | 观测台日用面去掉 Fraunces；衬线留给对外介绍页。 |

- [ ] 首屏只能明确指出一个视觉主角（画布）
- [ ] 任一情景的窗口/负担在页面上只出现一处权威展示
- [ ] 不含选中态时，页面上没有大面积青绿/暖色底
- [ ] 工具条只有一个实心或高对比主操作
