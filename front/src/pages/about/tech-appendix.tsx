import { Link } from "react-router-dom";
import { ArrowLeft, FileJson2, GitBranch, ShieldCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/app/page-header";
import { Callout, SectionHead, SyntheticTag } from "@/components/app/section";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CONTRACT_POINTS = [
  { title: "OpenAPI 契约", body: "contracts/openapi.yaml · 53 paths；CI 校验与后端路由 parity 测试。" },
  { title: "JSON Schema", body: "13 个领域 schema（患者、快照、计划、任务、审计等）+ 合成验收病例 HCC-ACC-001。" },
  { title: "三值逻辑", body: "TRUE / FALSE / UNKNOWN；缺失数据不默认为满足条件；单位不匹配 → UNKNOWN。" },
  { title: "状态机", body: "路径版本、计划、任务、随访预警均有显式非法转换拒绝与审计。" },
];

const STATE_MACHINES = [
  { name: "路径版本", steps: "DRAFT → IN_REVIEW → PUBLISHED（发布后不可变，调整需新版本）" },
  { name: "计划", steps: "DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE（唯一 ACTIVE / 实例）" },
  { name: "任务", steps: "依赖未完成不可推进；乐观锁 row_version；完成必须留结果" },
  { name: "重评", steps: "事件导入 → OPEN → DRAFT 重规划（原 ACTIVE 保留）→ 医生再激活" },
];

export default function TechAppendixPage() {
  return (
    <Page>
      <PageHeader
        module="TECH APPENDIX · CONTRACTS"
        title="技术附录 · 契约与状态机"
        actions={
          <div className="flex gap-1.5">
            <SyntheticTag />
            <Button asChild variant="outline" size="sm">
              <Link to="/about">
                <ArrowLeft className="size-3.5" />
                关于平台
              </Link>
            </Button>
          </div>
        }
      />

      <Callout tone="info" title="融资 / 合作技术页" className="mb-4">
        本页说明工程可信度资产，不构成临床验证或器械注册材料。预测接口保持 clinical_use=false；器械取证为后续期权。
      </Callout>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <SectionHead title="契约资产" description="contracts/ · make contract" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {CONTRACT_POINTS.map((item) => (
              <div key={item.title} className="rounded-md border border-line px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <FileJson2 className="size-3.5 text-muted-foreground" />
                  <p className="text-[12.5px] font-medium">{item.title}</p>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionHead title="核心状态机" description="非法转换拒绝 · 可审计" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {STATE_MACHINES.map((item) => (
              <div key={item.name} className="rounded-md border border-line px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <GitBranch className="size-3.5 text-muted-foreground" />
                  <p className="text-[12.5px] font-medium">{item.name}</p>
                </div>
                <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-muted-foreground">{item.steps}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <SectionHead title="安全边界（旁路工具）" description="医生审核 · 诚实降级" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            "计划须非提交人审核并绑定执行指纹后激活",
            "KEE / MWM / HIS 未配置返回 503 / NOT_CONFIGURED",
            "Server 模式不回退 mock；403/401 行为可解释",
          ].map((text) => (
            <div key={text} className="flex gap-2 rounded-md border border-line bg-secondary/20 px-3 py-2.5">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="mt-4 text-[11px] text-muted-foreground">
        演示脚本见仓库 docs/FINANCING-DEMO-RUNBOOK.md · 验收病例包 make demo-pack · API 闭环 make e2e
      </p>
    </Page>
  );
}
