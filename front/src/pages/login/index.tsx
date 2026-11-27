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

const LAYERS = [
  {
    mark: "内核",
    title: "医疗模型",
    desc: "患者连续状态、风险与演化表征",
  },
  {
    mark: "能力",
    title: "专病 CDSS",
    desc: "把模型与指南编成可审计建议",
  },
  {
    mark: "应用",
    title: "临床路径",
    desc: "审核后执行、变异跟踪与随访",
  },
];

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
        description: `当前角色：${user ? ROLE_SYSTEM_LABELS[user.role] : "账号"}，所有操作将写入审计日志。`,
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
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-[#1e2a3a] px-12 py-10 text-[#f4f5f3] lg:flex xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(900px_480px_at_85%_-10%,rgba(255,255,255,0.07),transparent_55%)]" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-[6px] bg-white/10 text-white">
            <BrandMark className="size-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold tracking-[-0.02em]">DR.SeeK · HCC-CIP</span>
            <span className="font-mono text-[11px] text-white/45">V0.6.1</span>
          </div>
        </div>

        <div className="relative max-w-[520px]">
          <p className="mb-4 text-[13px] font-medium text-white/50">原发性肝癌 · HCC-CIP</p>
          <h1 className="text-[36px] leading-[1.18] font-semibold tracking-[-0.03em] text-balance">
            以医疗模型为核心的
            <br />
            肝癌全病程平台
          </h1>
          <p className="mt-3 font-mono text-[12px] tracking-[0.02em] text-white/40">
            Model-driven Clinical Intelligence · HCC-CIP
          </p>
          <p className="mt-5 max-w-[28em] text-[15px] leading-relaxed text-white/65">
            用患者状态模型组织诊断、规划与执行。
          </p>

          <div className="mt-10 grid max-w-[520px] grid-cols-3 gap-0 border-t border-white/15">
            {LAYERS.map((layer, i) => (
              <div
                key={layer.title}
                className={cn("py-5 pr-5", i > 0 && "border-l border-white/15 pl-5")}
              >
                <p className="font-mono text-[11px] text-white/40">{layer.mark}</p>
                <p className="mt-2 text-[15px] font-semibold tracking-[-0.015em]">{layer.title}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-[440px]">
          <div className="border border-white/12 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/50">
                <span className="size-1.5 rounded-full bg-white/80" />
                路径运行中 · 合成演示
              </span>
              <span className="font-mono text-[11px] text-white/40">INST-HCC-001</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <PatientAvatar name="陈志远" id="HCC-DEMO-001" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-white/90">陈志远 · 肝细胞癌 Ⅰb 期</p>
                  <span className="tabular text-[12px] text-white/45">46%</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[46%] rounded-full bg-white/70" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="border border-white/12 px-2 py-0.5 text-[11px] text-white/45">入院评估 已完成</span>
              <span className="border border-white/20 px-2 py-0.5 text-[11px] font-medium text-white/85">术前检查 执行中</span>
              <span className="border border-white/12 px-2 py-0.5 text-[11px] text-white/45">治疗方案 待执行</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/35">模型驱动 · 路径承载 · 医生审核把关</p>
        </div>
      </aside>

      <main className="relative flex flex-col justify-center bg-background px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[360px] animate-in-up">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-[6px] bg-brand text-white">
                <BrandMark className="size-4" />
              </div>
              <span className="text-[14px] font-semibold tracking-[-0.02em]">HCC-CIP</span>
            </div>
            <SyntheticTag />
          </div>

          <div className="mb-7 hidden justify-end lg:flex">
            <SyntheticTag />
          </div>

          <div className="mb-7">
            <h2 className="text-[22px] font-semibold tracking-[-0.025em]">登录工作台</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              使用院内工号进入。角色决定可见模块与数据范围。
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
            <span className="text-[10px] tracking-wider text-muted-foreground">或使用角色快速登录</span>
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
                    active ? "border-foreground/20 bg-secondary" : "border-line bg-card hover:bg-secondary/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-medium",
                      active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground",
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
                  {active && <span className="size-1.5 rounded-full bg-foreground" />}
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
              管理员账号默认无病历访问权限；越权请求将返回 403 并记录审计。
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between text-[9.5px] text-muted-foreground/60">
            <span>© 2026 仁和医院 · HCC-CIP</span>
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
