import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  Download,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { SearchInput, Toolbar } from "@/components/app/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEPARTMENTS, ORGANIZATION, ROLES, USERS } from "@/data";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import type { DataScope, RoleKey, User } from "@/types";
import type { Tone } from "@/lib/clinical";
import { fmtDate, initials, relTime } from "@/lib/utils";

/* ===========================================================================
 * M01 / M12 · 用户管理
 * RBAC：角色 → 权限集合，用户 → 角色 + 数据范围。
 * 系统管理员不默认拥有患者病历访问权限。
 * ========================================================================= */

const DATA_SCOPE_META: Record<DataScope, { label: string; short: string; tone: Tone; desc: string }> = {
  ALL: { label: "全院 · 不含病历", short: "ALL", tone: "ink", desc: "可管理用户与系统配置，但不包含患者病历访问权限" },
  ORG: { label: "全院聚合", short: "ORG", tone: "info", desc: "仅可查看全院聚合统计，不含患者身份信息" },
  DEPT: { label: "本科室", short: "DEPT", tone: "neutral", desc: "仅可访问本科室患者与任务数据" },
  SELF: { label: "本人", short: "SELF", tone: "neutral", desc: "仅可访问本人负责的患者与任务" },
};

const ROLE_KEYS = Object.keys(ROLE_SYSTEM_LABELS) as RoleKey[];

interface UserForm {
  name: string;
  employeeNo: string;
  role: RoleKey;
  dept: string;
  title: string;
  dataScope: DataScope;
}

const EMPTY_FORM: UserForm = {
  name: "",
  employeeNo: "",
  role: "DOCTOR",
  dept: "肝胆外科",
  title: "",
  dataScope: "DEPT",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(USERS);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleKey | "ALL">("ALL");
  const [status, setStatus] = useState<User["status"] | "ALL">("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [pendingToggle, setPendingToggle] = useState<User | null>(null);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === "ACTIVE").length;
    return {
      total: users.length,
      active,
      disabled: users.length - active,
      roles: new Set(users.map((u) => u.role)).size,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== "ALL" && u.role !== role) return false;
      if (status !== "ALL" && u.status !== status) return false;
      if (q) {
        const hay = `${u.name} ${u.employeeNo} ${u.departmentName} ${u.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, query, role, status]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditId(user.id);
    setForm({
      name: user.name,
      employeeNo: user.employeeNo,
      role: user.role,
      dept: user.departmentName,
      title: user.title,
      dataScope: user.dataScope,
    });
    setFormOpen(true);
  }

  function submitForm() {
    const name = form.name.trim();
    const employeeNo = form.employeeNo.trim().toUpperCase();
    const dept = form.dept.trim();
    if (!name || !employeeNo || !dept) {
      toast.error("请补全必填字段", { description: "姓名、工号与科室为必填项。" });
      return;
    }
    if (users.some((u) => u.employeeNo === employeeNo && u.id !== editId)) {
      toast.error("工号已存在", { description: `工号 ${employeeNo} 已被其他用户占用。` });
      return;
    }
    const deptRecord = DEPARTMENTS.find((d) => d.name === dept);
    if (editId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editId
            ? {
                ...u,
                name,
                employeeNo,
                role: form.role,
                departmentName: dept,
                departmentId: deptRecord?.id ?? u.departmentId,
                title: form.title.trim() || `${dept} · 成员`,
                dataScope: form.dataScope,
              }
            : u,
        ),
      );
      setFormOpen(false);
      toast.success("用户信息已更新", {
        description: `${name} · ${ROLE_SYSTEM_LABELS[form.role]} · 数据范围 ${DATA_SCOPE_META[form.dataScope].label}；变更已写入审计日志。`,
      });
      return;
    }
    const newUser: User = {
      id: `U-${String(users.length + 1).padStart(3, "0")}`,
      name,
      employeeNo,
      role: form.role,
      title: form.title.trim() || `${dept} · 成员`,
      departmentId: deptRecord?.id ?? "dept-qc",
      departmentName: dept,
      phoneMasked: "138****0000",
      status: "ACTIVE",
      dataScope: form.dataScope,
      lastLoginAt: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
    setFormOpen(false);
    setForm(EMPTY_FORM);
    toast.success("用户已创建", {
      description: `${name} · ${ROLE_SYSTEM_LABELS[form.role]}。首次登录需修改初始密码，权限按角色与数据范围生效。`,
    });
  }

  function confirmToggle() {
    if (!pendingToggle) return;
    const next = pendingToggle.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setUsers((prev) => prev.map((u) => (u.id === pendingToggle.id ? { ...u, status: next } : u)));
    toast.success(next === "ACTIVE" ? "用户已启用" : "用户已停用", {
      description:
        next === "ACTIVE"
          ? `${pendingToggle.name} 已恢复登录权限，历史操作记录保留。`
          : `${pendingToggle.name} 已无法登录；历史操作与审计记录完整保留，不会被删除。`,
    });
    setPendingToggle(null);
  }

  function handleExport() {
    toast.success("用户清单导出已创建", {
      description: "脱敏 CSV（不含手机号明文与患者数据）；导出行为已写入审计日志。",
    });
  }

  return (
    <Page>
      <PageHeader
        module="M01 · 组织权限"
        title="用户管理"
        description={`${ORGANIZATION.name} · 统一维护用户、角色与数据范围；所有数据访问遵循 RBAC 与最小权限原则。`}
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="组织" value={ORGANIZATION.shortName} />
            <PageMeta label="角色" value={`${ROLES.length} 个`} />
            <PageMeta label="数据范围策略" value="ALL / ORG / DEPT / SELF" mono />
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              导出
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-3.5" />
              新建用户
            </Button>
          </>
        }
      />

      {/* ------------------------------- 统计 ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="用户总数"
          value={String(stats.total)}
          unit="人"
          hint={`${ORGANIZATION.shortName} 演示账号（合成数据）`}
          footer={<span className="font-mono text-[10px]">ALL USERS</span>}
        />
        <StatCard
          label="启用"
          value={String(stats.active)}
          unit="人"
          tone="ok"
          hint="状态为 ACTIVE，可正常登录"
          footer={<span className="font-mono text-[10px]">ACTIVE</span>}
        />
        <StatCard
          label="停用"
          value={String(stats.disabled)}
          unit="人"
          tone="risk"
          hint="状态为 DISABLED，不可登录；历史审计记录保留"
          footer={<span className="font-mono text-[10px]">DISABLED</span>}
        />
        <StatCard
          label="角色数"
          value={String(stats.roles)}
          unit="个"
          tone="info"
          hint="当前已分配的角色种类（系统角色 + 自定义角色）"
          footer={<span className="font-mono text-[10px]">{ROLE_KEYS.length} 个可用角色</span>}
        />
      </div>

      {/* ------------------------------ RBAC 说明 ------------------------------ */}
      <Callout tone="warn" title="系统管理员不默认拥有患者病历访问权限" className="mt-4">
        所有患者级接口须同时校验医院、科室、患者归属与操作权限；系统管理员仅可管理用户、角色与系统配置。
        患者数据访问与导出（拒绝或成功）均全量写入审计日志。
      </Callout>

      {/* ------------------------------- 筛选 ------------------------------- */}
      <Card className="mt-4 gap-0 py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="w-[300px]">
            <SearchInput value={query} onChange={setQuery} placeholder="搜索姓名 / 工号 / 科室" />
          </div>
          <Toolbar>
            <Select value={role} onValueChange={(v) => setRole(v as RoleKey | "ALL")}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部角色</SelectItem>
                {ROLE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ROLE_SYSTEM_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as User["status"] | "ALL")}>
              <SelectTrigger size="sm" className="w-[116px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">启用</SelectItem>
                <SelectItem value="DISABLED">停用</SelectItem>
              </SelectContent>
            </Select>
            <span className="font-mono text-[10px] text-muted-foreground">
              {filtered.length} / {users.length}
            </span>
          </Toolbar>
        </CardContent>
      </Card>

      {/* ------------------------------- 用户表 ------------------------------- */}
      <Card className="mt-4 gap-0 py-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <SectionHead title="用户列表" count={filtered.length} description="点击「编辑」调整角色与数据范围；停用需二次确认" />
          <span className="font-mono text-[10px] text-muted-foreground">最近登录按时间倒序</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="未找到匹配用户"
            description="尝试调整关键词、角色或状态筛选；也可直接新建用户。"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setRole("ALL");
                  setStatus("ALL");
                }}
              >
                重置筛选
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>科室</TableHead>
                  <TableHead>职称 / 职务</TableHead>
                  <TableHead>数据范围</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最近登录</TableHead>
                  <TableHead className="pr-4 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const scope = DATA_SCOPE_META[user.dataScope];
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10.5px] font-medium text-accent-foreground">
                            {initials(user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-medium leading-tight">{user.name}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{user.employeeNo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10.5px] whitespace-nowrap text-foreground/75">
                          {user.role === "ADMIN" && <KeyRound className="size-2.5 text-warn" />}
                          {ROLE_SYSTEM_LABELS[user.role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11.5px] text-foreground/80">{user.departmentName}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-[11.5px] text-muted-foreground">{user.title}</TableCell>
                      <TableCell>
                        <StatusBadge tone={scope.tone} dot={false}>
                          <span className="font-mono text-[9.5px]">{scope.short}</span>
                          <span className="text-[10.5px] font-normal">{scope.label}</span>
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.status === "ACTIVE"}
                            onCheckedChange={() => setPendingToggle(user)}
                            aria-label={`${user.status === "ACTIVE" ? "停用" : "启用"} ${user.name}`}
                          />
                          <StatusBadge tone={user.status === "ACTIVE" ? "ok" : "neutral"}>
                            {user.status === "ACTIVE" ? "启用" : "停用"}
                          </StatusBadge>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">
                        <span title={fmtDate(user.lastLoginAt, true)}>{relTime(user.lastLoginAt)}</span>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="xs" onClick={() => openEdit(user)}>
                          <Pencil className="size-3" />
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" />
            密码策略：12 位以上、90 天轮换；停用用户保留历史操作记录
          </span>
          <span className="font-mono">rbac · no plaintext credentials</span>
        </div>
      </Card>

      {/* 数据范围说明 */}
      <Card className="mt-4 gap-0 py-0">
        <CardContent className="px-4 py-3">
          <SectionHead title="数据范围说明" description="数据范围为患者数据访问边界，与角色权限取交集" className="mb-2" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(Object.keys(DATA_SCOPE_META) as DataScope[]).map((scope) => (
              <div key={scope} className="rounded-md border border-line bg-secondary/20 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <StatusBadge tone={DATA_SCOPE_META[scope].tone} dot={false}>
                    <span className="font-mono text-[9.5px]">{DATA_SCOPE_META[scope].short}</span>
                  </StatusBadge>
                  <span className="text-[11.5px] font-medium">{DATA_SCOPE_META[scope].label}</span>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{DATA_SCOPE_META[scope].desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================ 新建 / 编辑用户 ============================ */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditId(null);
        }}
      >
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editId ? <Pencil className="size-4 text-primary" /> : <UserCog className="size-4 text-primary" />}
              {editId ? "编辑用户" : "新建用户"}
            </DialogTitle>
            <DialogDescription>
              角色决定权限集合，数据范围决定患者数据访问边界；变更将写入审计日志，下次登录生效。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-name">姓名 *</Label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：陈立"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-no">工号 *</Label>
                <Input
                  id="user-no"
                  value={form.employeeNo}
                  onChange={(e) => setForm((f) => ({ ...f, employeeNo: e.target.value }))}
                  placeholder="例如：RH0251"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>角色 *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as RoleKey }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {ROLE_SYSTEM_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-dept">科室 *</Label>
                <Input
                  id="user-dept"
                  value={form.dept}
                  onChange={(e) => setForm((f) => ({ ...f, dept: e.target.value }))}
                  placeholder="例如：肝胆外科"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>数据范围 *</Label>
                <Select
                  value={form.dataScope}
                  onValueChange={(v) => setForm((f) => ({ ...f, dataScope: v as DataScope }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DATA_SCOPE_META) as DataScope[]).map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {DATA_SCOPE_META[scope].short} · {DATA_SCOPE_META[scope].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-title">职称 / 职务</Label>
                <Input
                  id="user-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例如：肝胆外科 · 主治医师"
                />
              </div>
            </div>
            {form.role === "ADMIN" && (
              <Callout tone="warn" title="系统管理员默认无患者病历访问权限">
                该角色仅可管理用户、角色与系统配置；如需患者级权限，必须另行授予并单独审计。
              </Callout>
            )}
            <div className="rounded-md border border-line bg-secondary/40 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
              数据范围：{DATA_SCOPE_META[form.dataScope].label} — {DATA_SCOPE_META[form.dataScope].desc}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={submitForm}>
              {editId ? "保存修改" : "创建用户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================ 启停确认 ============================ */}
      <AlertDialog open={!!pendingToggle} onOpenChange={(open) => !open && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingToggle?.status === "ACTIVE" ? (
                <Ban className="size-4 text-risk" />
              ) : (
                <ShieldCheck className="size-4 text-ok" />
              )}
              {pendingToggle?.status === "ACTIVE" ? "停用该用户？" : "启用该用户？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.status === "ACTIVE" ? (
                <>
                  停用后 <b className="font-medium text-foreground/85">{pendingToggle?.name}</b>（
                  {pendingToggle?.employeeNo}）将无法登录系统；历史操作与审计记录完整保留，不会被删除。
                </>
              ) : (
                <>
                  启用后 <b className="font-medium text-foreground/85">{pendingToggle?.name}</b>（
                  {pendingToggle?.employeeNo}）可恢复登录，权限仍按角色与数据范围生效。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-line bg-secondary/40 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-3" />
              角色 {pendingToggle ? ROLE_SYSTEM_LABELS[pendingToggle.role] : "—"} · 数据范围{" "}
              {pendingToggle ? DATA_SCOPE_META[pendingToggle.dataScope].label : "—"}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {pendingToggle?.status === "ACTIVE" ? "确认停用" : "确认启用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4 text-[10.5px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mr-1 inline size-3" />
        所有用户、角色与数据范围变更均写入审计日志（M12）；导出与患者级访问遵循同一 RBAC 校验链路。
      </div>
    </Page>
  );
}
