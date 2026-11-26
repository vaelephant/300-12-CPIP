import { IS_SERVER_MODE } from "@/lib/data-mode";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSessionStore } from "@/stores/session-store";
import { DEMO_ACCOUNTS, USERS } from "@/data/org";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import { BrandMark } from "@/components/app/brand-mark";
import { StatusBadge } from "@/components/app/status-badge";
import { SyntheticTag } from "@/components/app/section";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { ApiError } from "@/services/http";
import { hccApi } from "@/services/hcc-api";
import type { BackendUser } from "@/services/types";

const API_MODE = IS_SERVER_MODE;

const schema = z.object({
  employeeNo: z.string().min(1, "请输入工号"),
  password: z.string().min(4, "密码至少 4 位"),
});

type FormValues = z.infer<typeof schema>;

const CAPABILITIES = [
  { zh: "可设计", en: "Design" },
  { zh: "可挖掘", en: "Discover" },
  { zh: "可规划", en: "Plan" },
  { zh: "可执行", en: "Execute" },
  { zh: "可预测", en: "Predict" },
  { zh: "可优化", en: "Optimize" },
];

const PRODUCT_DEFINITION =
  "以原发性肝癌为专病应用，以医学知识和真实患者数据为基础，提供临床路径设计、发现、规划、辅助决策、执行、监测及持续优化能力，并逐步接入医疗世界模型，实现预测驱动的全病程智能管理。";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginAs = useSessionStore((s) => s.loginAs);
  const loginFromBackend = useSessionStore((s) => s.loginFromBackend);
  const [selected, setSelected] = useState(DEMO_ACCOUNTS[0].user.id);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeNo: "RH0236", password: "cpip-demo" },
  });

  const target = location.state as { from?: string } | null;

  const doLogin = (userId: string) => {
    setPending(true);
    window.setTimeout(() => {
      loginAs(userId);
      const user = USERS.find((u) => u.id === userId);
      toast.success(`已登录 · ${user?.name ?? ""}`, {
        description: `当前角色：${user ? ROLE_SYSTEM_LABELS[user.role] : "演示账号"}，所有操作将写入审计日志（模拟）。`,
        duration: 2800,
      });
      navigate(target?.from && target.from !== "/login" ? target.from : "/dashboard", { replace: true });
    }, 260);
  };

  const enterAs = async (userId: string, employeeNo: string, password = "cpip-demo") => {
    if (API_MODE) {
      setPending(true);
      try {
        await hccApi.login({ employee_no: employeeNo, password });
        const me: BackendUser = await hccApi.me();
        loginFromBackend(me);
        toast.success(`已登录 · ${me.name}`, {
          description: "身份来自后端 /me；前端角色仅用于展示，授权以服务端为准。",
          duration: 3000,
        });
        navigate(target?.from && target.from !== "/login" ? target.from : "/dashboard", { replace: true });
      } catch (error) {
        const message = error instanceof ApiError ? `${error.message}（${error.requestId}）` : "后端登录失败";
        toast.error("登录失败", { description: message, duration: 4000 });
      } finally {
        setPending(false);
      }
      return;
    }
    doLogin(userId);
  };

  const onSubmit = (values: FormValues) => {
    const user = USERS.find((u) => u.employeeNo.toLowerCase() === values.employeeNo.toLowerCase());
    void enterAs(user?.id ?? selected, values.employeeNo, values.password);
  };

  const selectedAccount = DEMO_ACCOUNTS.find((a) => a.user.id === selected)!;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      {/* 左：品牌与场景 */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-card px-10 py-9 text-foreground lg:flex xl:px-14">
        <div className="grid-paper absolute inset-0 opacity-35" />
        <div className="absolute -top-24 -right-24 size-[420px] rounded-full border border-line" />
        <div className="absolute -top-10 -right-10 size-[260px] rounded-full border border-line/70" />
        <svg className="absolute right-0 bottom-[16%] left-0 h-24 w-full opacity-[0.14]" viewBox="0 0 800 100" fill="none" preserveAspectRatio="none">
          <path
            d="M0 60 H210 l14 0 10 -26 12 52 12 -34 10 18 14 -10 H420 l12 0 8 -18 10 38 12 -26 10 12 14 -6 H800"
            stroke="#C63538"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-[7px] bg-brand-wash text-brand ring-1 ring-brand/15">
            <BrandMark className="size-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-semibold tracking-[0.06em]">HCC-CIP</span>
              <span className="font-mono text-[9px] text-muted-foreground">V0.6.1</span>
            </div>
            <p className="mt-0.5 text-[9.5px] tracking-[0.08em] text-muted-foreground">肝癌全病程智能诊疗平台</p>
          </div>
        </div>

        <div className="relative max-w-[560px]">
          <div className="mb-4 flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-brand uppercase">Design System V1.0 · Product Definition</span>
            <span className="h-px w-10 bg-line-strong" />
          </div>
          <h1 className="text-[31px] leading-[1.25] font-semibold tracking-[-0.015em] text-balance">
            原发性肝癌智能临床路径平台
          </h1>
          <p className="mt-2 text-[13px] tracking-wide text-muted-foreground">Liver Cancer Clinical Pathway Platform</p>
          <p className="mt-4 max-w-[500px] text-[12.5px] leading-relaxed text-muted-foreground">
            {PRODUCT_DEFINITION}
          </p>

          <div className="mt-7 grid max-w-[500px] grid-cols-3 gap-x-4 gap-y-4 border-t border-line pt-5">
            {CAPABILITIES.map((cap) => (
              <div key={cap.zh} className="border-t border-line pt-2">
                <p className="text-[13px] font-medium tracking-wide text-foreground">{cap.zh}</p>
                <p className="mt-0.5 font-mono text-[8px] tracking-[0.16em] text-muted-foreground uppercase">{cap.en}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* 运行快照 */}
          <div className="mb-6 max-w-[430px] rounded-lg border border-line bg-secondary/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
                <span className="relative flex size-1.5">
                  <span className="absolute size-full animate-ping rounded-full bg-brand/50" />
                  <span className="relative size-1.5 rounded-full bg-brand" />
                </span>
                Pathway Runtime · 实时演示
              </span>
              <span className="font-mono text-[9px] text-muted-foreground/70">INST-HCC-001</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <PatientAvatar name="陈志远" id="HCC-DEMO-001" size="sm" className="ring-1 ring-white/15" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11.5px] font-medium text-foreground/85">陈志远 · 肝细胞癌 Ⅰb 期</p>
                  <span className="tabular text-[10px] text-muted-foreground">46%</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[46%] rounded-full bg-brand/70" />
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-[3px] border border-line px-1.5 py-px text-[9.5px] text-muted-foreground">入院评估 已完成</span>
              <span className="rounded-[3px] border border-brand/20 bg-brand-wash px-1.5 py-px text-[9.5px] text-brand">术前检查 执行中</span>
              <span className="rounded-[3px] border border-line px-1.5 py-px text-[9.5px] text-muted-foreground">治疗方案确认 待执行</span>
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-line pt-4">
            {[
              { k: "01", v: "专病 · 原发肝癌" },
              { k: "300", v: "合成病例" },
              { k: "16", v: "可视化能力" },
            ].map((s) => (
              <div key={s.v} className="flex items-baseline gap-1.5">
                <span className="font-mono text-[15px] font-medium text-foreground/85">{s.k}</span>
                <span className="text-[10px] text-muted-foreground">{s.v}</span>
              </div>
            ))}
            <span className="ml-auto text-[9px] text-muted-foreground/60">仅限研发与演示 · 不用于临床决策</span>
          </div>
        </div>
      </aside>

      {/* 右：登录表单 */}
      <main className="relative flex flex-col justify-center bg-paper px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[380px] animate-in-up">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-[6px] bg-brand-wash text-brand">
                <BrandMark className="size-4" />
              </div>
              <span className="text-[14px] font-semibold tracking-[0.06em]">HCC-CIP</span>
            </div>
            <SyntheticTag />
          </div>

          <div className="mb-7">
            <div className="mb-2 flex items-center gap-2">
              <span className="label-micro">SIGN IN</span>
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[9px] text-muted-foreground">V0.6.1</span>
            </div>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">登录智能诊疗平台</h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              使用院内工号登录，按角色获得路径、患者、执行与运营视图；所有操作写入审计记录。
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeNo">工号 / 院内账号</Label>
              <div className="relative">
                <UserRound className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input id="employeeNo" className="pl-8" placeholder="RH0236" {...register("employeeNo")} />
              </div>
              {errors.employeeNo && <p className="text-[11px] text-risk">{errors.employeeNo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">忘记密码？</button>
              </div>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="px-8"
                  placeholder="••••••••"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-risk">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-muted-foreground">
                <Checkbox defaultChecked className="size-3.5" />
                保持登录状态
              </label>
              <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground/70">
                <Lock className="size-3" />
                等保三级部署要求（规划）
              </span>
            </div>

            <Button type="submit" className="h-9 w-full justify-between px-3.5" disabled={pending}>
              <span>{pending ? "正在验证…" : "登录工作台"}</span>
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] tracking-wider text-muted-foreground">或使用演示角色快速登录</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const active = selected === acc.user.id;
              return (
                <button
                  key={acc.user.id}
                  type="button"
                  onClick={() => setSelected(acc.user.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
                    active ? "border-primary/35 bg-accent/70" : "border-line bg-card hover:border-line-strong hover:bg-secondary/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-medium",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {acc.user.name.slice(-2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium">{acc.roleLabel}</span>
                      <span className="text-[10px] text-muted-foreground">{acc.user.name}</span>
                    </span>
                    <span className="block truncate text-[9.5px] text-muted-foreground/70">{acc.user.title}</span>
                  </span>
                  {active && <span className="size-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>

          <Button
            variant="secondary"
            className="mt-3 h-8 w-full"
            onClick={() => void enterAs(selectedAccount.user.id, selectedAccount.user.employeeNo)}
            disabled={pending}
          >
            以「{selectedAccount.roleLabel}」身份进入
          </Button>

          <div className="mt-5 rounded-md border border-line bg-secondary/40 px-3 py-2.5">
            <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-px size-3 shrink-0 text-ok" />
              演示环境不校验真实密码，不包含任何真实患者数据。管理员账号默认无病历访问权限，所有越权请求将返回 403 并记录审计。
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-[9.5px] text-muted-foreground/60">
            <span>© 2026 仁和医院（演示） · HCC-CIP</span>
            <span className="flex items-center gap-2">
              <span>隐私</span>
              <span>安全</span>
              <span>帮助</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
