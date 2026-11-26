# HCC-CIP Contracts · 0.6.0

> 拟议研发契约，仅覆盖**肝细胞癌（HCC，C22.0）**。不是临床验证、伦理批准或上线许可。

## 内容

| 文件 | 用途 |
| --- | --- |
| `openapi.yaml` | OpenAPI 3.1 · 35 个路径 · 统一 `/api/v1` |
| `schemas/*.schema.json` | 13 个 Draft 2020-12 领域 Schema |
| `examples/hcc-surgery-case.json` | 合成端到端验收病例 `HCC-ACC-001` |
| `validate.py` | Schema、语义引用与 OpenAPI 形状校验 |

## 校验

依赖：Python 3.11+、`jsonschema`、`PyYAML`。

```bash
python3 contracts/validate.py
```

预期最后一行：`All contract checks passed`。

## 约定摘要

- 所有临床时间：RFC 3339 带时区；服务端存 UTC，区分发生时间/录入时间。
- `Patient.diagnosis_code` 固定 `C22.0`；其他肝癌亚型不得复用 HCC 规则。
- 三值逻辑：FALSE 优先、UNKNOWN 不被默认 TRUE；未知规则/单位不匹配/过期观测不得通过。
- 入径必需条件 UNKNOWN 或排除条件 UNKNOWN → `PENDING_SUPPLEMENT`，`auto_enroll_allowed=false`。
- 路径版本发布后不可变；计划需 `APPROVED` 后才可 `ACTIVE`；任务完成需结果和来源。
- 随访失败/危险信号不得自动完成或自动关闭；必须人工升级并留痕。
- 外部 KEE/MWM/LLM 不可用时返回真实状态，禁止伪造成功。
- 预测接口 `clinical_use` 恒为 `false`；本契约不包含真实 PHI。

## 变更流程

1. 修改 Schema 或路径时必须同时更新 `openapi.yaml`、示例和 `validate.py` 断言。
2. 破坏性字段变更提升 minor 版本（`0.6.0 → 0.7.0`），并在 `docs/V0.6-T02-DOMAIN-CONTRACTS.md` 记录迁移说明。
3. 每次变更运行 `python3 contracts/validate.py`；CI 接入后作为 PR 门禁。
4. 规则阈值、分期版本、随访危险信号必须经临床专家确认后才能从 `proposed` 转为 `approved`。

## 非目标

- 不定义真实医院数据接入协议、KEE/MWM 内部实现或 LLM 提示词。
- 不证明临床有效性、安全性或监管合规性。
- 不包含数据库迁移、服务实现或前端状态管理。
