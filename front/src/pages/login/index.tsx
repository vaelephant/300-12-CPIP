import { IS_SERVER_MODE } from "@/lib/data-mode";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionStore } from "@/stores/session-store";
import { DEMO_ACCOUNTS, USERS } from "@/data/org";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import { BrandMark } from "@/components/app/brand-mark";
import { SyntheticTag } from "@/components/app/section";
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
      <aside className="relative hidden flex-col overflow-hidden border-r border-line bg-[#1e2a3a] px-14 py-12 text-[#f4f5f3] lg:flex xl:px-20">
        <div className="relative flex items-center gap-2">
          <BrandMark className="size-3.5 text-white/80" />
          <span className="text-[12px] font-medium tracking-[-0.01em] text-white/80">DR.SeeK · HCC-CIP</span>
          <span className="font-mono text-[10px] text-white/35">V0.6.1</span>
        </div>

        <div className="relative my-auto max-w-[420px] py-10">
          <p className="text-[12px] text-white/45">原发性肝癌 · HCC-CIP</p>
          <h1 className="mt-3 text-[26px] leading-[1.25] font-semibold tracking-[-0.03em]">
            以医疗模型为核心的
            <br />
            肝癌全病程平台
          </h1>
          <p className="mt-3 font-mono text-[11px] text-white/35">
            Model-driven Clinical Intelligence · HCC-CIP
          </p>
          <p className="mt-5 text-[13px] leading-relaxed text-white/60">
            用患者状态模型组织诊断、规划与执行。
          </p>

          <ul className="mt-10 space-y-0 border-t border-white/12">
            {LAYERS.map((layer) => (
              <li
                key={layer.title}
                className="grid grid-cols-[3.5rem_5.5rem_1fr] items-baseline gap-3 border-b border-white/10 py-3"
              >
                <span className="font-mono text-[10px] text-white/35">{layer.mark}</span>
                <span className="text-[13px] font-medium">{layer.title}</span>
                <span className="text-[12px] leading-snug text-white/50">{layer.desc}</span>
              </li>
            ))}
          </ul>
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

          <div className="space-y-2">
            <Label htmlFor="demo-role">演示角色</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="demo-role" className="h-9 w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {DEMO_ACCOUNTS.map((acc) => (
                  <SelectItem key={acc.user.id} value={acc.user.id}>
                    {acc.roleLabel} · {acc.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {selectedAccount.user.title} · {selectedAccount.user.employeeNo}
            </p>
          </div>

         
        </div>

        <div className="absolute right-6 bottom-6 flex items-center gap-4 text-[9.5px] text-muted-foreground/60 sm:right-10">
          <span>© 2026 重庆附二医院 · HCC-CIP</span>
          <span className="flex items-center gap-2">
            <span>隐私</span>
            <span>安全</span>
            <span>帮助</span>
          </span>
        </div>
      </main>
    </div>
  );
}
