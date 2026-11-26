# 前端 API 服务层（T12 基础）

这是 V0.6 前端接入后端的**服务层与查询层基础**，当前尚未替换现有页面中的 `src/data` 演示数据。

## 文件

- `http.ts`：API base URL、Bearer token、`X-Request-ID`、统一错误信封
- `hcc-api.ts`：认证、患者、观测、路径、入径、实例、计划、任务、变异、随访、结局、评估、聚合指标
- `types.ts`：后端契约对应的最小 TypeScript 类型
- `../queries/backend.ts`：TanStack Query hooks（患者、观测、路径、任务）

## 配置

```bash
cp .env.example .env.local
# VITE_HCC_API_URL=http://127.0.0.1:8000/api/v1
```

## 已接入的页面

- 登录：`VITE_HCC_API_MODE=server` 时调用 `/auth/login`，成功后保存 Bearer token；前端 session 仅用于 UI 展示。
- 患者中心：读取 `/patients/overview`，由 `adapters.ts` 映射为现有 `Patient` 视图模型；页面显示数据源为“后端 API”。
- 患者详情：读取 `/patients/{id}/overview` 聚合 DTO，使用 `detail-server.tsx` 展示评估、观测、计划/任务、变异/随访/结局；浏览器 QA 无 console error。
- 路径库：读取 `/pathways/overview`，只读展示模板/版本/节点/规则校验；设计器与审批仍为 demo。
- 任务中心：读取 `/tasks/overview`，执行状态推进；依赖未完成时按钮禁用，完成必须填写结果。
- 规划页：读取 `/instances/{id}/plans`，按计划状态提交/审核/激活；激活仍由后端安全规则校验。

## 尚未完成

其余页面仍使用 `src/data` demo 数据：入径、变异、随访、结局、分析页尚未逐页替换；需要按页面补充聚合 DTO 或改为按需查询，不能直接用演示字段拼造。

## 原则

- 不在生产环境回退合成数据；当前 demo 模式仅用于 V0.5 页面展示。
- 后端 token 仅作为 API 凭证；前端角色/权限不构成服务端授权。
- UNKNOWN 数据不会被客户端转换为正常值。
