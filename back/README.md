# HCC-CIP Backend · V0.6 · S1–S3 (T03–T11)

FastAPI + SQLAlchemy + Alembic backend for **HCC-CIP V0.6**. Local development uses **SQLite**; production should use PostgreSQL.

> Scope: HCC only (C22.0), synthetic/demo data by default. This is not a clinical system, not validated for patient care, and not cleared by any regulator.

## 当前状态

| 任务 | 状态 | 内容 |
| --- | --- | --- |
| T03 后端骨架、迁移、种子数据 | ✅ | FastAPI app、SQLAlchemy 模型、Alembic 初始迁移、demo seed |
| T04 身份、RBAC、对象授权、审计 | ✅ | JWT 登录、DEPT 数据范围、对象级患者授权、拒绝留痕 |
| T05 患者/事件/快照 API | ✅ | 患者列表/详情/就诊/观测、临床事件幂等导入、不可变快照 |
| T06 路径保存、图校验、版本审批 | ✅ | 草稿保存、图/规则校验、提交、审批、发布冻结 |
| T07 三值规则、入径 | ✅ | RULE-001/002/003/004/005/008/009/010、UNKNOWN 阻断 |
| T08 计划、任务状态机 | ✅ | 规则+快照生成任务、审核后激活、依赖与乐观锁 |
| T09 变异与重规划 | ✅ | 登记、分级、处理、重规划草案（保留已完成任务） |
| T10 专病评估 | ✅ | 最新快照生成分期/肝储备/肿瘤负荷/缺失项评估 |
| T11 随访/风险队列/结局 | ✅ | 随访计划、联系记录、人工升级、关闭；结局记录 |
| T12 前端 API 替换 / S4 | ⏳ | 待下一批 |

## 启动（SQLite）

```bash
cd back
python3 -m pip install -r requirements.txt
cp .env.example .env                 # 按需修改；.env 不提交
alembic upgrade head
python3 -m app.seed                  # 演示账号 + HCC 合成病例
python3 -m uvicorn app.main:app --reload --port 8000
```

- API base：`http://127.0.0.1:8000/api/v1`
- Swagger：`http://127.0.0.1:8000/api/docs`
- 健康检查：`GET /api/v1/health`
- 默认数据库文件：`back/hcc-cip.db`（已加入 `.gitignore`）

重置本地数据库：

```bash
rm -f hcc-cip.db
alembic upgrade head
python3 -m app.seed
```

## 演示账号

统一密码：`cpip-demo`

| 工号 | 用户 | 角色 | 数据范围 |
| --- | --- | --- | --- |
| RH0236 | 李文博 | CLINICIAN | 本科室（肝胆外科） |
| RH0218 | 张启明 | EXPERT | 本科室 |
| RH0451 | 赵倩 | NURSE | 本科室 |
| RH0311 | 陈立 | CLINICIAN | 介入科 |
| RH0102 | 周敏 | MEDICAL_AFFAIRS | 全院聚合，可读审计 |
| RH0009 | 林海 | EXECUTIVE | 全院聚合 |
| RH0001 | 王建国 | ADMIN | 全院不含病历，可读审计 |

## 已实现 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 数据库真实状态；外部服务为 `NOT_CONFIGURED`，不伪造成功 |
| POST | `/auth/login` | 工号 + 密码，返回 Bearer JWT |
| GET | `/me` | 当前用户与数据范围 |
| GET | `/patients` | 科室范围内分页患者列表 |
| GET | `/patients/overview` | 患者中心聚合 DTO（床位/路径/进度/风险/缺失项） |
| GET | `/patients/{id}/overview` | 患者详情聚合 DTO（就诊/观测/评估/实例/计划/变异/随访/结局） |
| POST | `/patients` | 创建合成 HCC 患者（仅临床/专家） |
| GET | `/patients/{id}` | 患者详情（对象级授权） |
| GET | `/patients/{id}/encounters` | 就诊记录 |
| GET | `/patients/{id}/observations` | 观测列表，保留 UNKNOWN |
| POST | `/patients/{id}/snapshots` | 不可变状态快照，校验观测引用 |
| POST | `/clinical-events/import` | 临床事件导入，支持幂等键 |
| GET | `/pathways` | 路径模板最新版本列表 |
| GET | `/pathways/overview` | 路径库聚合视图（版本/实例/节点/负责人） |
| POST | `/pathways` | 创建路径模板与草稿版本 |
| GET/POST | `/pathways/{id}/versions` | 版本列表 / 派生新草稿 |
| POST | `/pathway-versions/{id}/validate` | 图结构、可达性、环、角色、规则绑定校验 |
| POST | `/pathway-versions/{id}/submit` | 提交审核并生成审批单 |
| POST | `/pathway-versions/{id}/publish` | 医务处发布；发布后不可变 |
| GET | `/approvals` | 审批队列 |
| POST | `/approvals/{id}/approve` | 审核通过（路径版本 / 计划） |
| POST | `/approvals/{id}/reject` | 审核拒绝并退回草稿 |
| POST | `/rules/evaluate` | 三值规则计算 |
| POST | `/enrollment/evaluate` | 入径评估，UNKNOWN → PENDING_SUPPLEMENT |
| POST/GET | `/instances` / `/instances/{id}` | 仅 ELIGIBLE + 医生确认后创建实例 |
| POST/GET | `/instances/{id}/plans` / `/plans/{id}` | 生成/读取个体化计划 |
| POST | `/plans/{id}/submit` | 计划提交审核 |
| POST | `/plans/{id}/approve` | 计划审核通过 |
| POST | `/plans/{id}/activate` | 重新检查安全规则后激活 |
| GET | `/tasks` | 科室范围任务队列 |
| GET | `/tasks/overview` | 任务工作队列聚合（患者/路径/依赖/超时） |
| POST | `/tasks/{id}/transition` | 依赖、角色、乐观锁、必需结果校验 |
| GET | `/audit-events` | 审计列表（ADMIN / MEDICAL_AFFAIRS） |
| GET/POST | `/variations` | 变异列表 / 登记 |
| POST | `/variations/{id}/resolve` | 处理或关闭变异 |
| POST | `/variations/{id}/replan` | 生成重规划草案，保留已完成任务 |
| GET/POST | `/followups` | 随访队列 / 创建计划 |
| POST | `/followups/{id}/contacts` | 记录联系与结构化抽取（人工确认） |
| POST | `/followups/{id}/escalate` | 人工升级为 HIGH 风险队列 |
| POST | `/followups/{id}/close` | 关闭随访并留痕 |
| GET | `/patients/{id}/specialty-assessment` | 最新专病评估 |
| GET/POST | `/patients/{id}/outcomes` | 结局记录 / 查询 |
| GET | `/analytics/summary` | 聚合指标与口径定义 |

统一错误信封：

```json
{"error":{"code":"FORBIDDEN","message":"...","request_id":"req-...","details":[]}}
```

所有响应带 `X-Request-ID`，可透传上游请求 ID。

> 说明：`contracts/openapi.yaml` 的 **45 个路径均已实现**。`POST /knowledge/retrieve` 与 `POST /predictions` 在外部适配器未配置时返回明确的 `503 + request_id`，不返回伪造证据/预测。

## 授权模型

- 角色：`ADMIN` / `CLINICIAN` / `EXPERT` / `MEDICAL_AFFAIRS` / `NURSE` / `EXECUTIVE`
- 数据范围：`DEPT` / `ORG` / `ALL_NO_RECORD`
- 只有 `CLINICIAN` / `EXPERT` / `NURSE` 可读取患者记录。
- `DEPT` 用户仅能访问本科室患者；跨科室请求返回 `403` 并写审计。
- 管理员、医务处、院级管理为聚合角色，默认**无患者病历访问权限**。
- 登录失败、越权访问、患者导入、快照创建均落审计事件。
- 前端 token/角色不是授权依据；服务端每次从数据库加载用户。

## 测试

```bash
cd back
python3 -m pytest -q
```

当前覆盖 48 项测试：健康检查、登录成功/失败、JWT 鉴权、请求 ID、参数错误信封、科室范围列表、跨科室拒绝、管理员无病历权限、UNKNOWN 保留、快照引用校验、事件导入幂等、审计拒绝留痕等。

## 验收脚本与备份

```bash
python3 scripts/demo_e2e.py          # 完整 API 端到端演示
python3 scripts/backup_sqlite.py    # 在线备份 + integrity_check
python3 scripts/restore_sqlite.py backups/<file>.db --yes
```

见 [S4 部署与演示手册](../docs/V0.6-S4-DEPLOYMENT.md)。

## 数据库迁移

- `5f3bd1fad641`：S1 患者/事件/快照/审计
- `6ed97d3e943e`：S2 路径版本/入径/实例/计划/任务/审批
- `6b18382ccd2d`：S3 变异/随访/结局
- 本地使用 SQLite；迁移开启 `render_as_batch`，便于后续 SQLite 兼容变更。
- 生产切 PostgreSQL 时设置 `HCC_CIP_DATABASE_URL=postgresql+psycopg://...`，重新执行 `alembic upgrade head`；不得把 SQLite 文件当生产数据库。
- 所有时间戳按 UTC 存储，API 返回 RFC 3339。

## 已知边界（S1）

- 未实现密码找回、刷新令牌、令牌吊销、MFA；JWT 密钥仅为本地开发默认值。
- 未实现“本人负责患者”的显式分配模型；`SELF` 范围暂不放行。
- 路径编辑仅支持 JSON 图/规则输入，尚无前端可视化保存接口；发布后版本不可变。
- 规则引擎为代码内置规则目录（并非 KEE 真实适配器）；阈值仍需临床专家确认。
- 审批为单级审核，尚无会签、超时提醒、SLA；发布后不自动通知。
- 变异重规划已生成新草稿，但尚未自动触发审批或替换生效计划。
- 随访危险信号需人工升级；尚无自动通知渠道、通达确认回执对接。
- 结局和随访为结构化记录，尚无外部随访系统/患者端接入。
- 审计与业务写操作仍分事务（确保拒绝也留痕）；S2 之后需引入事务性 outbox/统一审计事务。
- 分析接口为聚合计数，尚未实现完整指标口径、分病区/阶段/周期钻取。
- 外部 KEE/MWM/HIS 适配器未接入，健康检查明确返回 `NOT_CONFIGURED`。
- 全部数据为合成数据，`clinical_use=false`，不用于临床决策。

## 相关契约与文档

- [V0.6 实施清单](../docs/HCC-CIP-V0.6-IMPLEMENTATION-CHECKLIST.md)
- [T01 基线](../docs/V0.6-T01-BASELINE.md)
- [T02 领域契约](../docs/V0.6-T02-DOMAIN-CONTRACTS.md)
- [OpenAPI / JSON Schema](../contracts/README.md)
