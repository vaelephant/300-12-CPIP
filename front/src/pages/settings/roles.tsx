import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSION_GROUPS, ROLES } from "@/data";
import type { DataScope } from "@/types";
import type { Tone } from "@/lib/clinical";
import { cn } from "@/lib/utils";

/* ===========================================================================
 * M01 · 角色权限（RBAC）
 * 权限矩阵可编辑：保存 / 还原；系统内置角色不可删除，仅可调整业务权限。
 * 系统管理员不默认拥有患者病历访问权限。
 * ========================================================================= */

interface LocalRole {
  key: string;
  name: string;
  description: string;
  userCount: number;
  dataScope: DataScope;
  system: boolean;
  permissions: string[];
}

const DATA_SCOPE_META: Record<DataScope, { label: string; tone: Tone }> = {
  ALL: { label: "全院 · 不含病历", tone: "ink" },
  ORG: { label: "全院聚合", tone: "info" },
  DEPT: { label: "本科室", tone: "neutral" },
  SELF: { label: "本人", tone: "neutral" },
};

const TOTAL_PERMISSIONS = PERMISSION_GROUPS.reduce((acc, g) => acc + g.items.length, 0);

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
}

export default function RolesPage() {
  const [roles, setRoles] = useState<LocalRole[]>(ROLES.map((r) => ({ ...r, permissions: [...r.permissions] })));
  const initialRole = ROLES[1] ?? ROLES[0];
  const [selectedKey, setSelectedKey] = useState<string>(initialRole.key);
  const [draftPerms, setDraftPerms] = useState<string[]>([...initialRole.permissions]);
  const [draftScope, setDraftScope] = useState<DataScope>(initialRole.dataScope);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "", dataScope: "DEPT" as DataScope });

  const selectedRole = roles.find((r) => r.key === selectedKey) ?? roles[0];

  useEffect(() => {
    setDraftPerms([...selectedRole.permissions]);
    setDraftScope(selectedRole.dataScope);
    // 仅随角色切换重置草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole.key]);

  const dirty = draftScope !== selectedRole.dataScope || !sameSet(draftPerms, selectedRole.permissions);

  const stats = useMemo(() => {
    const assigned = roles.reduce((acc, r) => acc + r.userCount, 0);
    return {
      roleCount: roles.length,
      assigned,
      permissionCount: TOTAL_PERMISSIONS,
      systemCount: roles.filter((r) => r.system).length,
    };
  }, [roles]);

  const patientPerms = draftPerms.filter((p) => p.startsWith("patient."));

  function togglePerm(key: string) {
    setDraftPerms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleGroup(groupKeys: string[]) {
    setDraftPerms((prev) => {
      const all = groupKeys.every((k) => prev.includes(k));
      if (all) return prev.filter((k) => !groupKeys.includes(k));
      return Array.from(new Set([...prev, ...groupKeys]));
    });
  }

  function saveRole() {
    setRoles((prev) =>
      prev.map((r) => (r.key === selectedRole.key ? { ...r, permissions: [...draftPerms], dataScope: draftScope } : r)),
    );
    toast.success("角色权限已保存", {
      description: selectedRole.system
        ? "系统内置角色仅业务权限可调整；变更已写入审计日志，用户下次登录后生效。"
        : "自定义角色权限与数据范围已更新，变更已写入审计日志。",
    });
  }

  function revertRole() {
    setDraftPerms([...selectedRole.permissions]);
    setDraftScope(selectedRole.dataScope);
    toast("已还原为已保存权限", { description: "未保存的勾选变更已丢弃。" });
  }

  function createRole() {
    const name = newRole.name.trim();
    if (!name) {
      toast.error("请填写角色名称", { description: "角色名称用于权限分配与审计展示。" });
      return;
    }
    const role: LocalRole = {
      key: `CUSTOM_${roles.length + 1}`,
      name,
      description: newRole.description.trim() || "自定义角色，权限以模板角色为基础，可继续调整。",
      userCount: 0,
      dataScope: newRole.dataScope,
      system: false,
      permissions: [...selectedRole.permissions],
    };
    setRoles((prev) => [...prev, role]);
    setSelectedKey(role.key);
    setCreateOpen(false);
    setNewRole({ name: "", description: "", dataScope: "DEPT" });
    toast.success("自定义角色已创建", {
      description: `已复制「${selectedRole.name}」权限为模板，可在右侧矩阵继续调整并保存。`,
    });
  }

  return (
    <Page>
      <PageHeader
        module="M01 · 组织权限"
        title="角色权限"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="权限组" value={`${PERMISSION_GROUPS.length} 组`} mono />
            <PageMeta label="权限项" value={`${TOTAL_PERMISSIONS} 项`} mono />
            <PageMeta label="数据范围" value="ALL / ORG / DEPT / SELF" mono />
          </>
        }
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            新建角色
          </Button>
        }
      />

      {/* ------------------------------- 概览 ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="角色数"
          value={String(stats.roleCount)}
          unit="个"
          hint="系统内置角色 + 自定义角色"
          footer={<span className="font-mono text-[10px]">TOTAL ROLES</span>}
        />
        <StatCard
          label="已分配用户"
          value={String(stats.assigned)}
          unit="人"
          tone="ok"
          hint="各角色用户数合计；实际用户见「用户管理」"
          footer={<span className="font-mono text-[10px]">role assignments</span>}
        />
        <StatCard
          label="权限项"
          value={String(stats.permissionCount)}
          unit="项"
          tone="info"
          hint="路径、患者、计划、变异与系统共 5 个权限组"
          footer={<span className="font-mono text-[10px]">RBAC permissions</span>}
        />
        <StatCard
          label="系统角色"
          value={String(stats.systemCount)}
          unit="个"
          tone="info"
          hint="系统内置角色不可删除，仅可调整业务权限"
          footer={<span className="inline-flex items-center gap-1 text-[10px]"><Lock className="size-2.5" />内置</span>}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ------------------------------ 角色列表 ------------------------------ */}
        <div className="space-y-3 lg:col-span-4 xl:col-span-3">
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <SectionHead title="角色" count={roles.length} description="选择角色编辑权限" />
              <Button variant="ghost" size="xs" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3" />
                新建
              </Button>
            </div>
            <div className="max-h-[600px] overflow-y-auto scrollbar-slim p-2">
              <div className="space-y-1.5">
                {roles.map((role) => {
                  const active = role.key === selectedKey;
                  return (
                    <button
                      key={role.key}
                      onClick={() => setSelectedKey(role.key)}
                      className={cn(
                        "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                        active
                          ? "border-primary/35 bg-accent/40 shadow-card"
                          : "border-line bg-card hover:border-line-strong hover:bg-secondary/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium">
                          {role.system ? (
                            <Lock className="size-3 shrink-0 text-muted-foreground" />
                          ) : (
                            <ShieldCheck className="size-3 shrink-0 text-primary" />
                          )}
                          {role.name}
                        </span>
                        {active && <Check className="size-3.5 shrink-0 text-primary" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
                        {role.description}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <StatusBadge tone={DATA_SCOPE_META[role.dataScope].tone} dot={false}>
                          <span className="font-mono text-[9.5px]">{role.dataScope}</span>
                          <span className="text-[10px] font-normal">{DATA_SCOPE_META[role.dataScope].label}</span>
                        </StatusBadge>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <Users className="size-2.5" />
                          {role.userCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-line px-3.5 py-2 text-[10px] text-muted-foreground">
              已分配用户合计 <span className="font-mono text-foreground/80">{stats.assigned}</span> 人
            </div>
          </Card>

          <Callout tone="warn" title="系统管理员不默认拥有患者病历访问权限">
            系统管理员的 `ALL` 数据范围表示「全院但不含病历」；患者级权限（patient.view / patient.export）需显式授予，
            所有患者级接口仍须校验医院、科室、患者归属与操作权限。
          </Callout>

          {selectedRole.system && (
            <Callout tone="neutral" title="系统内置角色">
              系统内置角色不可删除，只能调整业务权限；如需完全自定义权限组合，请新建自定义角色。
            </Callout>
          )}
        </div>

        {/* ------------------------------ 权限矩阵 ------------------------------ */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[13.5px] font-semibold tracking-tight">权限矩阵 · {selectedRole.name}</h2>
                  {selectedRole.system ? (
                    <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10px] text-muted-foreground">
                      <Lock className="size-2.5" />
                      系统内置
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-[3px] border border-primary/25 bg-accent px-1.5 py-px text-[10px] text-accent-foreground">
                      <ShieldCheck className="size-2.5" />
                      自定义角色
                    </span>
                  )}
                  {dirty && <StatusBadge tone="warn">有未保存变更</StatusBadge>}
                </div>
                <p className="mt-1 max-w-[560px] text-[11px] leading-relaxed text-muted-foreground">
                  {selectedRole.description}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    已分配用户 <span className="font-mono text-foreground/80">{selectedRole.userCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserRoundCheck className="size-3" />
                    已授予权限{" "}
                    <span className="font-mono text-foreground/80">
                      {draftPerms.length}/{TOTAL_PERMISSIONS}
                    </span>
                  </span>
                  <span className="font-mono">role: {selectedRole.key}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-muted-foreground">数据范围</span>
                  <Select value={draftScope} onValueChange={(v) => setDraftScope(v as DataScope)}>
                    <SelectTrigger size="sm" className="w-[152px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DATA_SCOPE_META) as DataScope[]).map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {scope} · {DATA_SCOPE_META[scope].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={revertRole} disabled={!dirty}>
                  <RotateCcw className="size-3.5" />
                  还原
                </Button>
                <Button size="sm" onClick={saveRole} disabled={!dirty}>
                  <Save className="size-3.5" />
                  保存
                </Button>
              </div>
            </div>

            {patientPerms.length === 0 && (
              <div className="border-b border-line px-4 py-2">
                <Callout tone="info" title="当前角色未授予任何患者级权限">
                  未勾选 patient.* 权限时，该角色无法查看或导出患者病历；系统管理员默认即为此状态，符合最小权限原则。
                </Callout>
              </div>
            )}

            <div className="max-h-[520px] overflow-y-auto scrollbar-slim">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 border-b border-line bg-card pl-4">权限项</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[210px] border-b border-line bg-card">权限编码</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[110px] border-b border-line bg-card pr-4 text-right">授予</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_GROUPS.map((group) => {
                    const keys = group.items.map((i) => i.key);
                    const granted = keys.filter((k) => draftPerms.includes(k)).length;
                    const all = granted === keys.length;
                    const some = granted > 0 && !all;
                    return [
                      <TableRow key={`group-${group.group}`} className="bg-secondary/50 hover:bg-secondary/50">
                        <TableCell colSpan={3} className="py-1.5 pl-4">
                          <div className="flex items-center justify-between gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <Checkbox
                                checked={all ? true : some ? "indeterminate" : false}
                                onCheckedChange={() => toggleGroup(keys)}
                                aria-label={`${group.group} 全选`}
                              />
                              <span className="text-[11.5px] font-medium">{group.group}</span>
                            </label>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {granted}/{keys.length}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>,
                      ...group.items.map((item) => (
                        <TableRow key={item.key} className="hover:bg-secondary/25">
                          <TableCell className="py-1.5 pl-9">
                            <label htmlFor={`perm-${item.key}`} className="cursor-pointer text-[11.5px] text-foreground/85">
                              {item.label}
                            </label>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <label htmlFor={`perm-${item.key}`} className="cursor-pointer font-mono text-[10px] text-muted-foreground">
                              {item.key}
                            </label>
                          </TableCell>
                          <TableCell className="py-1.5 pr-4 text-right">
                            <Checkbox
                              id={`perm-${item.key}`}
                              checked={draftPerms.includes(item.key)}
                              onCheckedChange={() => togglePerm(item.key)}
                              aria-label={item.label}
                            />
                          </TableCell>
                        </TableRow>
                      )),
                    ];
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Info className="size-3" />
                保存后用户下次登录生效；未保存的勾选不会影响线上权限。
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Lock className="size-3" />
                permission changes are audited
              </span>
            </div>
          </Card>

          {/* 角色分配摘要 */}
          <Card className="mt-4 gap-0 py-0">
            <div className="border-b border-line px-4 py-3">
              <SectionHead title="角色分配摘要" description="按角色统计已分配用户" />
            </div>
            <CardContent className="grid grid-cols-2 gap-x-6 px-4 py-2.5 lg:grid-cols-3">
              {roles.map((role) => (
                <div key={role.key} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] text-foreground/80">
                    {role.system ? <Lock className="size-3 shrink-0 text-muted-foreground" /> : <ShieldCheck className="size-3 shrink-0 text-primary" />}
                    <span className="truncate">{role.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                    {role.userCount} 人 · {role.permissions.length} 权限
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3 shrink-0" />
            权限与数据范围取交集后生效；患者级访问、导出与角色变更均写入审计日志（M12），可按操作人追溯。
          </div>
        </div>
      </div>

      {/* ============================== 新建角色 ============================== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新建自定义角色</DialogTitle>
            <DialogDescription>
              新角色以「{selectedRole.name}」的权限为模板创建，创建后可在矩阵中继续调整并保存。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">角色名称 *</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole((f) => ({ ...f, name: e.target.value }))}
                placeholder="例如：日间手术协调员"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">角色说明</Label>
              <Textarea
                id="role-desc"
                value={newRole.description}
                onChange={(e) => setNewRole((f) => ({ ...f, description: e.target.value }))}
                placeholder="说明该角色的职责范围与权限边界。"
                className="min-h-[72px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>数据范围 *</Label>
              <Select value={newRole.dataScope} onValueChange={(v) => setNewRole((f) => ({ ...f, dataScope: v as DataScope }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATA_SCOPE_META) as DataScope[]).map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope} · {DATA_SCOPE_META[scope].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-line bg-secondary/40 px-3 py-2">
              <Field label="权限模板" value={selectedRole.name} />
              <Field label="模板权限数" value={`${selectedRole.permissions.length} / ${TOTAL_PERMISSIONS}`} mono />
              <Field label="数据范围说明" value={DATA_SCOPE_META[newRole.dataScope].label} />
            </div>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              自定义角色可删除；创建与权限变更均写入审计日志。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={createRole}>
              <Plus className="size-3.5" />
              创建角色
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
