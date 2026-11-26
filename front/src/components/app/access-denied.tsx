import { useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session-store";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import { Page } from "./page-header";
import { SyntheticTag } from "./section";

export function AccessDenied({ module }: { module: string }) {
  const user = useSessionStore((s) => s.user);
  const navigate = useNavigate();
  const isAdminPatient = user?.role === "ADMIN" && module.includes("患者");
  return (
    <Page className="flex min-h-[calc(100vh-52px)] items-center justify-center">
      <div className="w-full max-w-[440px] rounded-lg border border-line bg-card p-7 text-center shadow-card">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-line bg-risk-wash text-risk">
          <LockKeyhole className="size-5" />
        </div>
        <h1 className="mt-4 text-[17px] font-semibold tracking-tight">无权限访问该模块</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          当前登录角色为「{user ? ROLE_SYSTEM_LABELS[user.role] : "未登录"}」，未被授予「{module}」的访问权限。
        </p>
        {isAdminPatient && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warn/25 bg-warn-wash/70 px-3 py-2 text-left">
            <ShieldAlert className="mt-px size-3.5 shrink-0 text-warn" />
            <p className="text-[11px] leading-relaxed text-foreground/70">
              系统管理员不默认拥有患者病历访问权限。如确需访问，须由医务处或院级管理员单独授予患者级数据范围，并记录审计。
            </p>
          </div>
        )}
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/60">本次访问尝试已写入审计日志（模拟）</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-3.5" />
            返回
          </Button>
          <Button size="sm" onClick={() => navigate("/dashboard")}>
            回到工作台
          </Button>
        </div>
        <div className="mt-5 flex justify-center">
          <SyntheticTag />
        </div>
      </div>
    </Page>
  );
}
