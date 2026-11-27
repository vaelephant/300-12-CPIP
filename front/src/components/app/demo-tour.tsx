import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    path: "/patients/HCC-DEMO-001",
    title: "患者状态与数据完整性",
    body: "先看患者身份、当前阶段、风险与数据完整度。UNKNOWN 字段不会被当作阴性条件。",
  },
  {
    path: "/patients/HCC-DEMO-001/map",
    title: "路径执行与分支选择",
    body: "按服务端执行状态查看已完成、执行中、变异、UNKNOWN 与未选路径；选中节点可看证据与规则。",
  },
  {
    path: "/approvals",
    title: "计划审批与责任边界",
    body: "计划必须经非提交人审核、绑定执行指纹后才能激活；AI 建议不会自动变成医嘱。",
  },
  {
    path: "/tasks",
    title: "任务执行与依赖约束",
    body: "任务推进受计划状态、角色、依赖和版本号约束；完成必须留下结果记录。",
  },
  {
    path: "/dashboard",
    title: "全貌与安全边界",
    body: "最后回到工作台：所有数据均为合成数据，生产环境仍需临床签署与 PostgreSQL 验证。",
  },
];

export function DemoTour() {
  const open = useUiStore((state) => state.tourOpen);
  const step = useUiStore((state) => state.tourStep);
  const close = useUiStore((state) => state.closeTour);
  const setStep = useUiStore((state) => state.setTourStep);
  const navigate = useNavigate();
  const location = useLocation();
  const current = STEPS[step];

  useEffect(() => {
    if (!open) return;
    if (location.pathname !== current.path) navigate(current.path);
  }, [current.path, location.pathname, navigate, open]);

  if (!open) return null;
  return (
    <div className="fixed right-4 bottom-4 left-4 z-[70] sm:left-auto sm:w-[520px]" role="dialog" aria-label="">
      <div className="rounded-lg border border-line bg-card p-4 shadow-pop">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-wash font-mono text-[11px] font-semibold text-brand">
            {step + 1}/{STEPS.length}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold">{current.title}</p>
              <button onClick={close} className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="关闭">
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{current.body}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {STEPS.map((item, index) => (
            <button
              key={item.path}
              onClick={() => setStep(index)}
              className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-brand" : "bg-line")}
              aria-label={`第 ${index + 1} 步：${item.title}`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[8.5px] tracking-wide text-muted-foreground/70">GUIDED DEMO · SYNTHETIC</span>
          <div className="flex gap-1.5">
            <Button size="xs" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-3" /> 上一步
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="xs" onClick={() => setStep(step + 1)}>
                下一步 <ArrowRight className="size-3" />
              </Button>
            ) : (
              <Button size="xs" onClick={close}>完成</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
