# HCC-CIP V0.6 功能调整与研发实施清单

> 2026-11-26 | 研发规划，待团队及临床专家确认 | 基线：V0.5 前端演示
> 本文仅定义研发任务，不代表临床验证或上线许可。

## 1. 目标与边界

保留现有 React/Vite 前端，以患者为中心打通专病评估、路径规划、审核、执行、变异、随访、结局反馈。V0.6 是可持久化、可测试的研发 MVP，而非正式临床产品。首期明确聚焦肝细胞癌（HCC，C22.0）；原发性肝癌还包括肝内胆管癌等，不共用 HCC 规则。首条端到端验证路径选择肝切除围术期及术后随访，消融、TACE、系统治疗和转化治疗逐步补齐。路径是流程管理工具，不是自动处方或治疗方案。所有演示数据标记 SYNTHETIC，模型 clinical_use=false。

## 2. 功能调整矩阵

| ID | 模块 | 调整 | 优先级 | 验收 |
|---|---|---|---|---|
| F01 | 工作台/患者中心 | 保留 UI，替换合成数据读取，统一患者纵向档案 | P0 | 同一患者跨页数据一致 |
| F02 | 路径库/设计器/版本 | 保留画布，真实保存、图校验、审核发布及版本冻结 | P0 | 刷新不丢失；非法图拒绝发布 |
| F03 | 入径匹配 | 替换预设匹配为三值规则计算 | P0 | 必需字段 UNKNOWN 不得自动入径 |
| F04 | 个体化规划 | 替换固定模板结果，按规则及患者快照实例化任务 | P0 | 计划可解释、可审核、可追溯 |
| F05 | 审核/任务/变异 | 统一服务端状态机及事件事务 | P0 | 审批后才激活；异常触发变异与重规划 |
| F06 | 专病评估 | 新增分期、肝储备、肿瘤负荷、治疗史、缺失项 | P0 | 每个结论可追溯原始观测与规则版本 |
| F07 | 随访中心 | 新增随访计划、任务、结构化记录、风险队列、人工接管 | P0 | 出院接续；异常有责任人和闭环记录 |
| F08 | 结局评价 | 新增复发/进展、疗效、不良事件及失访记录 | P0 | 结局关联治疗及观察时间 |
| F09 | KEE/证据 | 真实适配器与证据引用，移除假同步成功 | P1 | 超时降级明确；引用可定位 |
| F10 | MDT 辅助决策 | 新增患者内嵌工作台，候选方案及证据、禁忌、缺失项 | P1 | 医生确认；不自动开医嘱 |
| F11 | AI 随访 | 动态追问、结构化抽取、风险分流与人工接管 | P1 | 测试集覆盖危险症状、拒答、超时、转人工 |
| F12 | 模拟/MWM | 保留演示，隔离研究接口 | P2 | 未验证预测不能激活临床计划 |
| F13 | 运营/驾驶舱/流程挖掘 | 保留 UI，先实现基础真实指标，复杂算法延后 | P1/P2 | 指标口径、分母、周期可复算 |
| F14 | 登录/权限/审计 | 服务端身份验证、对象级授权、审计 | P0 | 越权请求被拒绝并记录 |

P0 为 V0.6 发布门槛；P1 可在核心闭环稳定后逐项交付；P2 不阻塞 V0.6。优先级是研发建议，非临床重要性排序。

## 3. 工程调整（不重写前端）

保留 front/src/components、visualization、pages、types；新增 front/src/services（API client、领域服务、错误映射）、queries（查询与缓存失效）。src/data 仅作为显式 demo provider，禁止生产环境回退合成数据。runtime-store 只保留 UI 状态或缓存，服务端为唯一事实源；session-store 不再作为授权依据。

新增目录建议：
- back/app/api/v1：HTTP 路由
- back/app/domain：患者、路径、计划、任务、变异、随访、结局、证据及规则领域
- back/app/services：用例编排、事务、状态机
- back/app/repositories：数据库访问
- back/app/adapters：HIS/LIS/PACS、KEE、MWM、LLM
- back/app/security：身份、权限、审计
- back/migrations、back/tests：迁移及测试
- contracts/：OpenAPI 与关键 JSON Schema、示例、版本说明
- docs/：研发及验收文档

技术建议：FastAPI、SQLAlchemy、Alembic、PostgreSQL、pytest；本地手动启动，不强制 Docker。初期单体模块化，不引入微服务、消息中间件或复杂工作流平台。数据库事务内写事件，外部调用需要时使用轻量 outbox 与重试。

## 4. 领域数据与一致性

| 实体 | 最小字段/约束 |
|---|---|
| Patient / Encounter | patient_id、来源系统、外部标识、就诊号、科室、时间；患者与就诊分离 |
| Observation / ClinicalEvent | patient_id、encounter_id（可空）、类型、值/单位、发生时间、记录时间、来源、质量标志 |
| PatientStateSnapshot | snapshot_id、as_of、观测引用、分期体系及版本、肝功能、肿瘤特征、缺失项 |
| PathwayTemplate / Version | template_id、version_id、图结构、规则引用、审批状态、内容哈希；发布后不可变 |
| PathwayInstance | patient_id、version_id、入径快照、状态、当前计划 ID |
| Plan / Task | plan_id、instance_id、版本、快照、规则版本、审批记录；task_id、依赖、时间窗、责任人、状态 |
| Variation / Approval | 关联实例及任务、原因、证据、处理状态、审核人、意见、时间 |
| FollowupPlan / Contact / Outcome | 患者、治疗事件、随访窗口、渠道、同意状态、结构化结果、风险、责任人、结局时间 |
| RuleVersion / EvidenceRef | 规则 ID、版本、适用范围、来源、审核状态、原文定位 |
| Prediction / AuditEvent | 模型版本、输入快照、适用范围、不确定性、clinical_use；操作人、对象、结果、时间、请求 ID |

所有临床时间采用带时区时间戳；区分发生时间和录入时间。单位标准化、缺失值与正常值分离。所有写操作校验对象权限及版本号；并发冲突返回 409；入径、计划激活、事件导入支持幂等键。审批记录和历史计划不可覆盖；更正通过追加记录完成。禁止将真实病历、密钥、患者标识提交到公共 GitHub。

## 5. 路径与规则执行

- 路径发布校验：唯一开始节点、可达性、终止节点、分支条件、依赖环、时间窗、证据引用、必需角色；显式支持经审核的循环或复评节点，禁止无界循环。
- 三值规则：TRUE/FALSE/UNKNOWN；AND 有 FALSE 则 FALSE，否则有 UNKNOWN 则 UNKNOWN；OR 有 TRUE 则 TRUE，否则有 UNKNOWN 则 UNKNOWN；NOT UNKNOWN 仍为 UNKNOWN。未注册规则、单位不匹配、过期观测、执行失败不得默认 TRUE。
- 准入必需条件 UNKNOWN 或排除条件 UNKNOWN 时进入待补充；医生知晓缺失不等于符合准入。例外须走单独的授权、理由与审核机制，不允许绕过硬性安全约束。
- 计划状态：DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → SUPERSEDED/COMPLETED；拒绝返回新草稿。激活时重新检查最新快照、规则版本及关键安全条件，原计划历史保留。
- 任务状态：PENDING → READY → IN_PROGRESS → COMPLETED；BLOCKED/SKIPPED/CANCELLED 按授权和依赖约束转换。超时独立标记；完成必须记录结果和来源。服务端验证依赖、权限、实例状态及必需结果。
- 变异：事件触发或人工登记 → 分级 → 影响评估 → 处理/重规划 → 审核 → 关闭。保留原计划、变异理由和新旧差异；重规划不得删除已完成任务。
- 随访：治疗/出院事件触发计划；允许门诊和系统治疗期间独立触发，不强制等待住院路径完成。随访失败可重试、改约或登记失访，不自动记为完成。

## 6. 专病智能与随访

专病状态字段：诊断依据、CNLC/BCLC（各自版本）、Child-Pugh/ALBI、ECOG、肿瘤数量/大小/部位、血管侵犯、肝外转移、AFP、肝炎背景、治疗史、影像报告及疗效评估。评分和分期规则必须由临床专家确认，禁止 LLM 自行补全未知值。影像疗效评价记录所用标准（如 RECIST/mRECIST）、适用场景、基线及评估日期。

MDT 工作台输出候选方案、适用条件、冲突/禁忌、待补资料、证据及版本、医生选择与理由；不生成自动执行医嘱。V0.6 先实现结构化评估和规则证据展示，生成式建议作为 P1。

随访状态：待联系 → 联系中 → 已收集 → 待审核/待处理 → 已关闭；另有拒绝、失访、改约。采集症状、复查结果、用药/治疗情况、生活质量、不良事件。危险信号按专家审核规则升级至人工队列，记录通知、签收、处置、关闭；紧急情况提示及时就医，不等待 AI 回复。LLM 仅用于受约束追问和抽取；患者原话与抽取结果分存，关键字段人工确认。对话工具白名单、参数校验、提示注入防护、最小权限；不允许模型自行修改治疗计划。

## 7. 平台边界

| 系统 | 负责 | HCC-CIP 不重复建设 |
|---|---|---|
| 数据工厂 | 多源接入、治理、脱敏、数据集与血缘 | 通用湖仓和标注平台 |
| 300-6-KEE | 知识解析、索引、检索、证据版本 | 通用知识库底座 |
| 300-2-1-Medical-World-Model | 训练、推理、模型注册、评估 | 模型训练框架 |
| HCC-CIP | 临床业务状态、路径执行、专病规则、审核、随访与结局 | 不将外部模型输出直接变为医嘱 |

接口约定为拟议契约，尚未核实外部仓库实际 API。KEE 返回证据 ID、版本、原文定位、适用范围；MWM 输入去标识患者快照及预测时点，返回模型版本、预测目标、时间窗、结果、不确定性、适用范围、clinical_use。服务不可用时显示真实状态，退回已审核规则或人工流程，不伪造成功。模型训练反馈须经数据授权、质量审查及独立验证，禁止自动在线更新临床模型。

## 8. 最小 API 清单（拟议）

统一 /api/v1；分页、错误码、请求 ID、鉴权及 OpenAPI 文档。
- POST /auth/login；GET /me
- GET/POST /patients；GET /patients/{id}/observations；POST /clinical-events/import；POST /patients/{id}/snapshots
- GET/POST /pathways；POST /pathways/{id}/versions；POST /pathway-versions/{id}/validate、/submit、/publish
- POST /enrollment/evaluate；POST /instances；GET /instances/{id}
- POST /instances/{id}/plans；POST /plans/{id}/submit、/approve、/activate
- GET /tasks；POST /tasks/{id}/transition
- GET/POST /variations；POST /variations/{id}/resolve、/replan
- GET/POST /followups；POST /followups/{id}/contacts、/escalate、/close
- GET/POST /patients/{id}/outcomes
- POST /rules/evaluate；POST /knowledge/retrieve；POST /predictions（研究环境）
- GET /analytics/summary；GET /audit-events

路径中的逗号分隔后缀表示独立端点。所有审批、发布、状态转换及数据导入在后端验证权限与业务约束。

## 9. 实施任务与依赖

| 批次 | 任务（未完成） | 责任角色 | 依赖 | 交付 |
|---|---|---|---|---|
| S0 | [ ] T01 干净检出、前端 build/typecheck、记录基线；[ ] T02 冻结领域契约和合成验收病例 | 前后端/产品 | 无 | 基线报告、契约 |
| S1 | [ ] T03 后端骨架、迁移、种子数据；[ ] T04 身份、RBAC、对象授权、审计；[ ] T05 患者/事件/快照 API | 后端 | T02 | 可启动服务与数据库 |
| S2 | [ ] T06 路径保存、图校验、版本审批；[ ] T07 规则执行、入径；[ ] T08 计划与任务状态机 | 后端/前端 | S1 | 真实路径执行 |
| S3 | [ ] T09 变异及重规划；[ ] T10 专病评估；[ ] T11 随访、风险队列、结局；[ ] T12 前端 API 替换与缓存一致性 | 全栈/临床专家 | S2 | 端到端闭环 |
| S4 | [ ] T13 自动化测试与安全测试；[ ] T14 部署手册、备份恢复、演示脚本；[ ] T15 临床规则审阅及研发验收 | QA/全栈/临床专家 | S3 | V0.6 研发发布 |
| 后续 | [ ] T16 KEE 接入；[ ] T17 MDT/AI 随访；[ ] T18 真实指标；[ ] T19 MWM 影子运行 | AI/全栈/临床专家 | V0.6 核心稳定 | P1/P2 |

建议按四周研发节奏组织 S0–S4（S0 与 S1 可在第一周衔接），不是承诺工期；实际以团队容量和临床规则审核进度为准。

## 10. 验收与发布门槛

- [ ] 干净检出可按文档启动前后端；前端 typecheck/build 通过，后端迁移可重放。
- [ ] 合成 HCC 病例完成建档、评估、入径、审核、任务执行、异常变异、重规划、出院、随访及结局；刷新和另一授权账号查看一致。
- [ ] 缺失关键数据、非法图、未审核计划、依赖未完成、过期快照、重复提交、并发冲突均有负向测试。
- [ ] 未知规则、缺失单位、超时或外部服务不可用不会默认为通过；未验证预测不能触发正式执行。
- [ ] 未登录、跨科室、无病历权限管理员、越权对象访问均被服务端拒绝；敏感数据不出现在普通日志。
- [ ] 随访危险信号进入人工队列；签收、处置、失访及通知失败均可追溯。
- [ ] 数据库备份恢复演练通过；历史版本和审计记录完整。
- [ ] 所有 P0 测试通过且无未解决的高危安全缺陷；演示与临床环境隔离，明确标记合成数据。
- [ ] 正式医院试点另行完成数据授权、伦理/合规及医疗器械适用性评估、临床验证和医院审批；V0.6 研发验收不替代这些门槛。

## 11. 已知问题及依据

基于 V0.5 静态审查，尚未执行构建或运行测试：
- front/src/pages/pathways/studio.tsx：saveDraft、runValidation、simulateFix、confirmSubmit 为演示逻辑；须替换真实持久化和校验。
- front/src/stores/runtime-store.ts：任务及事件仅内存；迁移至服务端事务。
- front/src/stores/session-store.ts：演示角色与本地权限；替换真实认证授权。
- front/src/components/patient/enrollment-dialog.tsx：预设候选及确认提示；替换真实规则和安全准入。
- front/src/pages/planning/index.tsx、approvals/index.tsx、variations/index.tsx：局部状态与固定数据；统一 API。
- front/src/pages/knowledge/index.tsx：定时器模拟同步、规则 fixture 默认 TRUE；正式系统必须移除默认通过。
- front/src/pages/simulation/index.tsx：Mock Provider，仅保留研究演示。
- front/src/pages/patients/detail.tsx：随访主要为展示；扩展独立随访业务。
- README.md、front/README.md：明确无后端、无数据库及合成数据边界。

本文仅新增研发规划，不改变现有功能代码。下一步先完成 T01/T02，再启动后端开发。
