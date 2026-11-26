# HCC-CIP · 肝癌全病程智能诊疗平台 · 前端（V0.5）

肝脏专病智能诊疗平台高保真前端演示工程：**只做原发性肝癌单病种**，不覆盖肺癌、胆囊等其他病种，覆盖路径设计、发现、规划、辅助决策、执行、监测与持续优化。
视觉与产品定义参考 V0.5 产品定义，技术对应《AI 临床路径规划平台软件开发说明书》前端范围。

> **演示声明**：本工程不连接真实医院数据，全部病例、指标与预测均为**合成数据**，仅用于软件研发与界面演示，不构成任何临床决策依据。

## 界面预览

| 产品定义 · 原发性肝癌智能临床路径平台 | 登录 · 角色与数据范围 |
| --- | --- |
| ![产品定义](docs/preview/about.jpg) | ![登录](docs/preview/login.jpg) |
| **工作台 · 风险、任务与阶段** | **路径设计器 · React Flow 画布** |
| ![工作台](docs/preview/dashboard.jpg) | ![路径设计器](docs/preview/studio.jpg) |
| **患者中心 · 队列画像与入径匹配** | **个体化规划 · 阶段计划甘特** |
| ![患者中心](docs/preview/patients.jpg) | ![路径规划](docs/preview/planning.jpg) |
| **患者路径流转 Sankey · 分期构成** | **任务中心 · 状态构成与阶段负荷** |
| ![工作台可视化](docs/preview/dashboard-viz.jpg) | ![任务中心](docs/preview/tasks.jpg) |
| **质量与运营分析 · 雷达 / 热力 / 仪表** | **路径模拟 · 不确定性扇形图与成本-效果** |
| ![运营分析](docs/preview/analytics.jpg) | ![路径模拟](docs/preview/simulation.jpg) |
| **变异管理 · 类型 × 严重度矩阵** | **审核中心 · 审批效率与类型构成** |
| ![变异管理](docs/preview/variations.jpg) | ![审核中心](docs/preview/approvals.jpg) |
| **VIS-001 · 动态临床路径图** | **VIS-011 · 患者病程回放** |
| ![动态路径图](docs/preview/pathway-map.jpg) | ![病程回放](docs/preview/journey-replay.jpg) |
| **VIS-006 · 院长驾驶舱** | **VIS-009 · 临床流程挖掘** |
| ![院长驾驶舱](docs/preview/executive.jpg) | ![流程挖掘](docs/preview/process-mining.jpg) |
| **VIS-012 · 多路径推演** | **VIS-010 · 决策依据图谱** |
| ![多路径推演](docs/preview/trajectory.jpg) | ![决策依据图谱](docs/preview/evidence-graph.jpg) |

## 技术栈

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 + shadcn/ui 风格组件（Radix UI + CVA）
- React Router、TanStack Query、Zustand、React Hook Form + Zod
- React Flow（@xyflow/react）· **Apache ECharts** · Recharts · Lucide Icons · Sonner
- 统一可视化引擎（`src/visualization/`）：ECharts 主题、注册表、React Flow 图谱组件、SVG 自定义临床图形

## 快速开始

要求 Node.js ≥ 20.19（本工程在 Node 24 下验证）。

```bash
cd front
npm install
npm run dev         # http://127.0.0.1:5173
```

其他命令：

```bash
npm run build       # tsc -b && vite build
npm run typecheck   # 仅类型检查
npm run preview     # 预览生产构建
```

## 演示账号

登录页不校验真实密码（预填 `cpip-demo`），可通过“演示角色”一键进入。
不同角色获得不同菜单、操作权限与数据访问范围；系统管理员**默认无患者病历访问权限**，用于演示越权拦截。

| 角色 | 用户 | 工号 | 数据范围 |
| --- | --- | --- | --- |
| 临床医生 | 李文博 | RH0236 | 本科室 |
| 临床专家 | 张启明 | RH0218 | 本科室 |
| 医务处管理员 | 周敏 | RH0102 | 全院聚合 |
| 院级管理人员 | 林海 | RH0009 | 全院聚合（院长驾驶舱） |
| 护理人员 | 赵倩 | RH0451 | 本科室 |
| 系统管理员 | 王建国 | RH0001 | 全院（不含病历） |

## 路由

| 路由 | 模块 | 说明 |
| --- | --- | --- |
| `/login` | M01 | 登录与角色演示 |
| `/dashboard` | M00 | 工作台 · 风险提示、KPI、今日任务、阶段进度、趋势、待审核 |
| `/pathways` | M03 | 路径库 · 筛选、导入、新建 |
| `/pathways/:id/studio` | M03 | 路径设计器 · React Flow 画布、节点属性、校验、保存/提交 |
| `/pathways/:id/versions` | M03 | 版本时间线与差异比较、发布审批 |
| `/approvals` | M03/M06 | 审核中心 · 路径版本 / 患者计划 / 变异重规划 |
| `/patients` | M04/M05 | 患者中心 · 300 例原发肝癌合成病例、三值逻辑入径匹配 |
| `/patients/:id` | M04 | 患者详情 · 概览、检查检验、时间轴、变异、随访 |
| `/patients/:id/pathway` | M07 | 患者路径执行 · 任务推进、甘特图、执行分析摘要 |
| `/patients/:id/map` | VIS-001 | 动态临床路径图 · 实时节点状态、计划/实际、节点证据 |
| `/patients/:id/replay` | VIS-011 | 患者病程回放 · 六视图同步、时间滑块、决策记录 |
| `/planning/:instanceId` | M06 | 个体化规划 · 状态快照、候选计划、安全校验、审核生效 |
| `/tasks` | M07 | 任务中心 · 列表/看板、超时、状态机动作 |
| `/variations` | M08 | 变异管理 · 影响评估、重规划草案 |
| `/simulation` | M09 | 路径模拟 · 合成推演与候选方案比较 |
| `/knowledge` | M02 | 知识库 · 指南/共识/规则/证据、KEE 适配器 |
| `/analytics` | M10 | 质量与运营分析 · 指标口径、分母为零处理 |
| `/executive` | VIS-006 | 院长驾驶舱 · 全院指标、科室下钻、瓶颈与变异原因 |
| `/process-mining` | VIS-009 | 临床流程挖掘 · 流程发现、一致性、瓶颈与变体 |
| `/settings/users` | M01/M12 | 用户与数据范围 |
| `/settings/roles` | M01 | RBAC 权限矩阵 |
| `/settings/audit` | M12 | 审计日志、系统健康 |
| `/about` | VIS | 产品定义、平台定位、可视化注册表与版本边界 |

## V0.6 前端接入状态

- `src/services/` + `src/queries/` 已建立后端 API 客户端与查询层基础。
- **已接入后端**：`VITE_HCC_API_MODE=server` 时，登录走后端 `/auth/login`，患者中心读取 `/patients/overview`，患者详情读取 `/patients/{id}/overview`，路径库读取 `/pathways/overview`（只读聚合视图）。
- 任务中心：读取 `/tasks/overview`，支持受服务端状态机约束的状态推进与完成结果。
- 规划页：读取 `/instances/{id}/plans`，支持提交/审核/激活（服务端校验），任务推进仍在任务中心。
- 其余页面仍使用 `src/data` 的 V0.5 合成数据；T12 未完成全部页面替换。
- 原因：后端 Patient 契约目前只含患者主数据，缺少患者列表所需床位、风险、路径进度等字段；不能在前端拼造。
- 配置示例见 `front/.env.example`（`VITE_HCC_API_URL`）。
- 详见 `src/services/README.md`。

## Clinical Visualization Engine（临床可视化引擎）

将路径设计、患者状态、临床决策、疾病演化、路径推演与执行过程统一纳入可视化体系。
引擎位于 `src/visualization/`，按域拆分组件；页面只做编排，不堆放图表配置。

```
src/visualization/
├── core/           # theme（ECharts 主题/色板解析）、types、registry、EChart 封装、VisualFrame
├── pathway/        # LivePathwayGraph（动态路径图，React Flow）
├── timeline/       # PatientJourneyTimeline（多泳道全病程时间轴，SVG）
├── patient/        # PatientStateRadar · ClinicalTrendLinkage（多模态指标联动）
├── simulation/     # TrajectorySimulator（多路径推演 / 不确定性）
├── process/        # ProcessGraph（流程挖掘，React Flow）· ProcessCharts
├── knowledge/      # DecisionEvidenceGraph（决策依据图谱）
├── analytics/      # ExecutiveCharts（院长驾驶舱图表）
└── knowledge/ etc.
```

技术分工：**React Flow** 负责路径图与流程挖掘图；**Apache ECharts** 负责趋势、雷达、环形、桑基、甘特、热力、不确定性区间等数据图表；**SVG** 负责病程时间轴与自定义临床图形。所有 ECharts 颜色通过 `vizPalette()` 从设计令牌解析，页面不直接传 `var()`。

### 三大标志性可视化

| 看过去 | 看现在 | 看未来 |
| --- | --- | --- |
| **VIS-011 患者病程回放**：时间滑块驱动路径图、状态画像、指标趋势、临床事件、模型预测、临床决策六视图同步 | **VIS-001 动态临床路径图**：患者实例实时状态驱动节点（已完成/执行中/变异/待执行），可切换计划与实际、追溯节点证据 | **VIS-012 多路径推演**：候选路径 A/B/C 在 30/90/180 天的疾病负担演化、P10–P90 区间、干预点与实际对照 |

### 可视化注册表（节选）

| 编号 | 能力 | 阶段 | 落地位置 |
| --- | --- | --- | --- |
| VIS-001 | 动态临床路径图 | P1 | `/patients/:id/map` |
| VIS-002 | 患者全病程时间轴 | P1 | 患者详情 / 病程回放 |
| VIS-003 | 计划与实际甘特 | P1 | `/patients/:id/pathway`、`/planning/:id` |
| VIS-004 | 多模态指标联动 | P1 | 患者详情 / 病程回放 |
| VIS-005 | 路径变异热力 | P1 | `/variations` |
| VIS-006 | 院长驾驶舱 | P1 | `/executive` |
| VIS-007 | 患者状态画像 | P2 | 患者详情 / 病程回放 |
| VIS-008 | 真实路径桑基 | P2 | `/dashboard` |
| VIS-009 | 临床流程挖掘 | P2 | `/process-mining` |
| VIS-010 | 决策依据图谱 | P2 | `/planning/:id` |
| VIS-011 | 患者病程回放 | P2 | `/patients/:id/replay` |
| VIS-012–013 | 多路径推演 / 不确定性 | P3 | `/simulation` |
| VIS-014–016 | 状态空间 / 预测对比 / 影像数字孪生 | P3 | 规划中 |

注册表源码：`src/visualization/core/registry.ts`。所有模拟数据与预测均标注 `SYNTHETIC` / `clinical_use = false`；图谱与下钻不修改正式临床计划，决策仍需医生审核。

## 工程结构

```
front/
├── DESIGN.md                 # 设计语言与页面开发契约（共享组件、数据、规范）
├── src/
│   ├── main.tsx / App.tsx    # 入口与路由（各页面已接入）
│   ├── styles/globals.css    # Tailwind v4 主题 token 与全局样式
│   ├── services/             # V0.6 API 服务层（T12 基础：http / hcc-api / types）
│   ├── queries/              # V0.6 TanStack Query hooks（患者/观测/路径/任务）
│   ├── components/
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── app/              # 应用外壳：侧边栏、顶栏、页头、状态徽章、命令面板等
│   │   ├── pathway/          # 路径设计器组件
│   │   ├── patient/          # 患者域组件
│   │   ├── timeline/         # 病程时间轴
│   │   └── charts/           # 通用统计图表（Recharts）
│   ├── visualization/        # Clinical Visualization Engine（ECharts / React Flow / SVG）
│   │   ├── core/             # 主题、色板解析、注册表、EChart 封装
│   │   ├── pathway/          # VIS-001 动态路径图
│   │   ├── timeline/         # VIS-002 全病程时间轴
│   │   ├── patient/          # VIS-004 / VIS-007
│   │   ├── simulation/       # VIS-012 / VIS-013
│   │   ├── process/          # VIS-009 流程挖掘
│   │   └── knowledge/        # VIS-010 决策依据
│   ├── data/                 # 确定性合成演示数据（患者/路径/任务/变异/指标）
│   ├── lib/                  # 领域标签、临床状态元数据、工具函数
│   ├── stores/               # session / ui / runtime / studio 状态
│   ├── types/                # 领域模型（Pathway Schema、任务、变异、审批等）
│   └── pages/                # 业务页面（含路径/患者/运营/可视化与产品定义）
└── package.json
```

### 数据与接口

当前阶段为**前端高保真**：页面数据来自 `src/data` 的合成数据集，保证可复现。
后续接入后端时可保持页面不变，将 `src/data` 的读取替换为 `src/services` 中的 REST 调用
（接口契约见说明书第 12 章，统一前缀 `/api/v1`）。

### 关键交互约定

- 三值逻辑：`TRUE / FALSE / UNKNOWN`；缺失数据不视为满足条件，界面显示“未知 / 待补充”。
- 状态机：任务与路径实例的非法状态转换被拒绝并提示（`TASK_TRANSITIONS` / `INSTANCE_TRANSITIONS`）。
- 已发布路径版本不可编辑，计划版本历史保留；计划必须经医生审核后才可激活。
- 统计指标零分母返回“不可计算”，不显示为 0%。
- 模拟与 AI 结果均显式标记 `SYNTHETIC` / `clinical_use = false`。

## 验证

- 类型检查：`npm run typecheck`
- 生产构建：`npm run build`
- 浏览器验收目标：1440×900（桌面），兼容 1280 宽度。

## 已知限制（第一阶段）

- 无后端、无数据库，登录与权限为前端模拟；生产需接入 FastAPI + RBAC。
- 路径设计器的保存/校验/提交为交互演示，未持久化。
- 模拟中心与 MWM 输出为 Mock Provider 合成结果，不可用于临床。
