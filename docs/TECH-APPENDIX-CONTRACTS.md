# 技术附录 · 契约 / 三值逻辑 / 状态机

> 融资与技术合作一页纸。产品内页面：`/about/tech`。  
> 非临床验证材料；非器械注册卷宗。

## 契约

| 资产 | 说明 |
| --- | --- |
| OpenAPI 3.1 | `contracts/openapi.yaml` · 53 paths |
| JSON Schema | `contracts/schemas/` · 13 个 |
| 验收病例 | `contracts/examples/hcc-surgery-case.json` · `HCC-ACC-001` |
| 校验 | `make contract` → `python3 contracts/validate.py` |
| 路由 parity | `back/tests/test_contract_parity.py` |

## 三值逻辑

- 规则结果：`TRUE` / `FALSE` / `UNKNOWN`
- 缺失字段、单位不匹配 → `UNKNOWN`，不默认为满足条件
- 入径：`PENDING_SUPPLEMENT` 当完整性 UNKNOWN；排除 UNKNOWN 阻断自动入径

## 状态机（摘要）

1. **路径版本**：DRAFT → IN_REVIEW → PUBLISHED（不可变）
2. **计划**：DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE（每实例唯一 ACTIVE）
3. **任务**：依赖 + 乐观锁；非法转换 409
4. **重评**：事件 → OPEN → DRAFT 重规划；原 ACTIVE 保留

## 诚实降级

- KEE / MWM / HIS：`NOT_CONFIGURED` / 503
- `clinical_use=false`
- Server 模式不回退 mock
