# HCC-CIP · 肝癌全病程智能诊疗平台（HCC Clinical Intelligence Platform）

> **V0.5 · 研发演示版本**：当前仓库已完成**前端高保真工程**，以原发性肝癌为专病应用，覆盖路径设计、发现、规划、辅助决策、执行、监测与持续优化。
>
> 产品定义：**原发性肝癌智能临床路径平台（Liver Cancer Clinical Pathway Platform）** —— 以医学知识和真实患者数据为基础，提供临床路径可设计、可挖掘、可规划、可执行、可预测、可优化的能力，并逐步接入医疗世界模型，实现预测驱动的全病程智能管理。
>
> **本阶段只做原发性肝癌单病种**，不扩展肺癌、胆囊等其他病种；全部患者、指标与预测均为**合成演示数据**，不连接真实医院系统，不构成临床决策依据。

## 当前进度

| 部分 | 状态 | 说明 |
| --- | --- | --- |
| `front/` 前端高保真 | ✅ 已完成 | React 19 + Vite 8 + TypeScript + shadcn/ui + Tailwind CSS v4 + React Flow + Apache ECharts |
| `back/` 后端服务 | ✅ S1–S3 完成（SQLite 开发） | FastAPI + SQLAlchemy + Alembic；路径/规则/入径/计划/任务/变异/随访/结局与聚合指标；75 项 pytest 通过；Playwright 6 个 server-mode 场景通过 |
| `contracts/` 数据协议 | ✅ T02 完成 | OpenAPI 3.1（36 paths）、13 个 JSON Schema、HCC 合成验收病例，`python3 contracts/validate.py` 通过 |
| V0.6.1 引擎强化 | 🚧 T20–T24/T27 完成，T25 基础，T26/T28/T29 部分 | 条件网关/执行 trace/审批指纹、时点快照/激活重评、三值单位边界、随访预警闭环、事件驱动重评、任务原子更新、唯一 ACTIVE 计划、Demo/Server 隔离、变异/随访/分析页、6 个 Playwright 场景、生产配置与登录限流已落地；T26 其余页面/T25 完整并发/CI runner 待完成 |
| V0.6 研发实施 | 🚧 S1–S3 完成，S4 进行中 | 后端契约 53/53 路径已实现；部署/备份/端到端/安全测试完成；前端登录 + 患者中心 + 患者详情 + 路径库 + 任务中心 + 规划页已接入真实 API，变异/随访/分析等页面仍待迁移 |

## 快速开始

```bash
cd front
npm install
npm run dev        # http://127.0.0.1:5173
```

演示账号见 [front/README.md](front/README.md)，登录页支持一键切换 6 种角色（临床医生 / 临床专家 / 医务处 / 院级管理 / 护理 / 系统管理员），并展示产品定义与六项能力。

## V0.6 研发基线

- [V0.6 功能调整与研发实施清单](docs/HCC-CIP-V0.6-IMPLEMENTATION-CHECKLIST.md)
- [T01 基线报告 · 干净检出构建结果与已知缺口](docs/V0.6-T01-BASELINE.md)
- [T02 领域契约 · 三值逻辑、状态机、验收病例](docs/V0.6-T02-DOMAIN-CONTRACTS.md)
- [契约目录 · OpenAPI / JSON Schema / 校验脚本](contracts/README.md)
- [后端 README · S1–S3 启动、API、演示账号与边界](back/README.md)
- [S4 部署与演示手册 · SQLite 备份/恢复、生产切换边界](docs/V0.6-S4-DEPLOYMENT.md)
- [临床规则审阅清单（待签署）](docs/V0.6-CLINICAL-REVIEW.md)
- [V0.6.1 引擎强化实施状态](docs/V0.6.1-HARDENING-STATUS.md)
- CI：`.github/workflows/ci.yml`（契约、后端测试、迁移重放、前端 typecheck/build）；本地命令见 `Makefile`

```bash
# 契约校验
python3 contracts/validate.py

# 后端（SQLite 本地开发）
cd back
python3 -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python3 -m app.seed
python3 -m uvicorn app.main:app --reload --port 8000
```

> V0.6 当前完成 **S1–S3 后端核心闭环**：患者基础 API、路径版本与审批发布、三值入径、计划与任务状态机、变异重规划、专病评估、随访与结局。前端 API 替换、端到端测试和部署手册仍待 S4；所有 P0 验收项完成前，不得视为可上线产品。

## 文档

- [前端 README · 技术栈 / 路由 / 演示账号 / 已知限制](front/README.md)
- [前端设计契约 · 设计语言、组件清单、数据与交互规范](front/DESIGN.md)
- 界面预览：`front/docs/preview/`

## 已实现的关键能力

- **路径设计器**：React Flow 画布、16 类临床节点、属性/规则/时间约束/证据检查器、图校验与提交阻断。
- **临床路径版本**：版本时间线、差异比较（新增/删除/修改/规则变更）、审批发布与已发布版本不可变。
- **患者入径（M05）**：准入 / 排除规则三值逻辑 TRUE / FALSE / UNKNOWN，缺失数据不自动视为满足条件。
- **个体化规划（M06）**：患者状态快照、候选计划、任务依赖与时间窗口、安全校验、医生审核后手动激活。
- **执行与任务（M07）**：运行时状态机、非法状态转换拒绝、超时独立标记、任务中心列表/看板。
- **变异管理（M08）**：七类变异、影响评估、重规划草案、原计划与历史差异保留。
- **知识库与 KEE Adapter**：指南/共识/规则/证据、规则 DSL 只读展示与三值试运行、适配器降级提示。
- **运营分析（M10）**：指标分子/分母/周期/排除条件口径说明，零分母显示“不可计算”。
- **系统管理（M01/M12）**：RBAC 权限矩阵、数据范围、审计日志、被拒绝请求留痕；系统管理员默认无病历访问权限。
- **AI / MWM 集成**：Mock Provider、`clinical_use = false`、不可用时回退规则规划的完整提示链路。
- **Clinical Visualization Engine**：独立可视化引擎（React Flow + Apache ECharts + SVG），落地动态临床路径图、患者病程回放、多路径推演三大标志性可视化，以及院长驾驶舱、流程挖掘、决策依据图谱、变异热力与全病程时间轴。

## 免责声明

本工程仅用于软件研发与界面演示，所有内容均为合成数据。正式医院部署前，须按《个人信息保护法》《数据安全法》《网络安全法》及网络安全等级保护、医疗器械相关监管要求完成评估与合规改造。
