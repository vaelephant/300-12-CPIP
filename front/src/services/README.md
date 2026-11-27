# 前端 API 服务层

V0.6 前端接入后端的服务层与查询层。融资主演示使用 **Server 模式**（`VITE_DATA_MODE=server`）。

## 文件

- `http.ts`：API base URL、Bearer token、`X-Request-ID`、统一错误信封
- `hcc-api.ts`：认证、患者、路径（含版本写入）、入径、实例、计划、任务、审批、审计、重评、临床事件、变异、随访、结局、评估、聚合指标
- `pathway-graph.ts`：设计器画布 → 后端 PathwayGraphIn
- `types.ts`：后端契约对应的 TypeScript 类型
- `adapters.ts`：overview → 前端 Patient 视图模型
- `../queries/backend.ts`：TanStack Query hooks

## 配置

```bash
cp .env.example .env.local
# VITE_DATA_MODE=server
# VITE_HCC_API_URL=http://127.0.0.1:8000/api/v1
```

## 已接入的页面（Server）

- 登录、患者中心、患者详情、路径库、路径设计器（保存/校验/提交）、审核中心、任务、规划、重评队列、变异、随访、运营分析、审计日志

## 仍为 Demo / 研究预览

- 工作台大屏氛围、知识库、模拟、世界模型观测台、院长驾驶舱、流程挖掘、用户/角色设置页

## 原则

- Server 模式不回退合成数据
- 后端 token 仅作 API 凭证；前端角色不构成服务端授权
- UNKNOWN 不会被客户端转换为正常值
