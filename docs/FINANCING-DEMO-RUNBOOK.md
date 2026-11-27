# HCC-CIP · 融资 / 合作演示 Runbook（Server 模式）

> 目标：8–12 分钟内证明「状态内核 + 可运行闭环 + 可审计工程」是真系统，不是 PPT。  
> 口径：旁路工具 · 医生审核边界 · `clinical_use=false` · 合成数据 · 器械取证为后续期权。

## 0. 启动前（约 2 分钟）

```bash
# 终端 A · 后端
cd back
cp -n .env.example .env
alembic upgrade head
python3 -m app.seed
python3 -m uvicorn app.main:app --reload --port 8000

# 终端 B · 前端（必须 server）
cd front
cp -n .env.example .env.local
# 确认：VITE_DATA_MODE=server 且 VITE_HCC_API_URL=http://127.0.0.1:8000/api/v1
npm run dev -- --port 5173
```

一键验收病例包（可选，打印绑定关系）：

```bash
make demo-pack
```

API 脚本闭环（无 UI）：

```bash
make e2e
```

### 演示账号

| 角色 | 工号 | 密码 | 用途 |
| --- | --- | --- | --- |
| 临床医生 | `RH0236` | `cpip-demo` | 入径、规划、任务、设计器提交 |
| 临床专家 | `RH0218` | `cpip-demo` | 计划 / 路径审批 |
| 医务处 | `RH0102` | `cpip-demo` | 路径发布、分析、审计 |
| 系统管理员 | `RH0001` | `cpip-demo` | 审计（无病历访问） |

### 验收病例绑定

| 资产 | ID |
| --- | --- |
| 契约验收病例 | `HCC-ACC-001` → [contracts/examples/hcc-surgery-case.json](../contracts/examples/hcc-surgery-case.json) |
| Seed 患者 | `HCC-DEMO-001` |
| 路径模板 | `PW-HCC-001` |
| 已发布版本 | `PV-HCC-130` |

## 1. 演示脚本（8–12 分钟）

| 分 | 页面 | 讲什么 | 点什么 |
| --- | --- | --- | --- |
| 0:00 | 登录 | 旁路定位：不替代 HIS；不自主医嘱 | Server 登录 `RH0236` |
| 0:45 | 患者中心 → `HCC-DEMO-001` | 状态快照、完整度、UNKNOWN 不瞎判 | 打开患者 360 |
| 2:00 | 规划 / 任务 | 入径→计划→审核→激活→任务状态机 | 若已 seed 有 ACTIVE 计划则走任务；否则按 E2E 生成 |
| 4:00 | 审核中心 | 非提交人审核、执行指纹 | 切 `RH0218` 处理 PENDING |
| 5:30 | 重评队列 `/reassessments` | 事件驱动重评 → DRAFT 重规划 → 医生再激活 | 导入事件或展示已有 reassessment |
| 7:00 | 变异 / 随访 | 变异处置与随访预警闭环 | 列表只读后端数据 |
| 8:30 | 运营分析 | 分子分母口径；零分母不可计算 | `RH0102` |
| 9:30 | 审计日志 | 成功业务可追溯 | `/settings/audit` |
| 10:30 | 路径设计器 | 草稿保存 / 校验 / 提交进审批 | `/pathways/PW-HCC-001/studio` |
| 11:30 | 收束 | 模型接口预留、`clinical_use=false`；器械证是期权 | `/about` 或技术附录 |

## 2. Demo vs Server 口径（对外必须说清）

| 模式 | 用途 | 禁止说法 |
| --- | --- | --- |
| **Server** | 融资主演示：同一套服务端状态 | 「300 患者已上线」 |
| **Demo** | 可视化概念、大屏氛围 | 「已对接 HIS / 已临床使用」 |

研究预览（知识库 / 模拟 / 世界模型观测台 / 院长驾驶舱）：只标 **研究预览**，不写已交付。

## 3. 失败时诚实行为

- KEE / MWM / HIS 未配置 → `503` / `NOT_CONFIGURED`，不造假成功
- 403 → 无权限页，不回退 mock 病历
- 401 → 清 token，回登录

## 4. 成功标准

1. 技术伙伴按本文可独立跑通主路径  
2. 任意未完成能力可解释（只读 / 503 / 研究预览）  
3. 讲稿与 [README](../README.md) 边界一致  
4. 临床规则审阅已启动（见 [V0.6-CLINICAL-REVIEW.md](V0.6-CLINICAL-REVIEW.md)）
