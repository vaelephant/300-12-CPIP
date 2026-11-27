import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  Download,
  FileClock,
  HardDriveDownload,
  Loader2,
  Lock,
  RefreshCw,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  UserX,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge, StatusDot } from "@/components/app/status-badge";
import { SearchInput, Toolbar } from "@/components/app/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADAPTER_STATUS, AUDIT_LOGS, LAST_SYNC, NOW } from "@/data";
import type { AuditLog } from "@/types";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";

/* ===========================================================================
 * M12 · 审计日志
 * 追加写入、不可篡改；记录操作人 / 角色 / IP / 对象 / 结果。
 * 不记录明文密码、令牌或完整病历文本。
 * ========================================================================= */

const RESULT_META: Record<AuditLog["result"], { label: string; tone: "ok" | "risk" | "warn" }> = {
  SUCCESS: { label: "成功", tone: "ok" },
  DENIED: { label: "已拒绝", tone: "risk" },
  FAILED: { label: "失败", tone: "warn" },
};

const TARGET_TYPE_LABEL: Record<AuditLog["targetType"], string> = {
  PATHWAY: "路径",
  PATIENT: "患者",
  PLAN: "计划",
  TASK: "任务",
  USER: "用户",
  SYSTEM: "系统",
};

const ADAPTER_TONE: Record<string, "ok" | "warn" | "info" | "risk"> = {
  ONLINE: "ok",
  DEGRADED: "warn",
  SIMULATED: "info",
  OFFLINE: "risk",
};

const RANGE_OPTIONS = ["今日", "近 7 天", "近 30 天"] as const;
type RangeKey = (typeof RANGE_OPTIONS)[number];

const HIGH_RISK_ACTIONS = new Set([
  "PATHWAY_PUBLISH",
  "ROLE_UPDATE",
  "PATIENT_EXPORT",
  "PATIENT_VIEW",
  "ADAPTER_CONFIG",
]);

const PAGE_SIZE = 12;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>(AUDIT_LOGS);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AuditLog["result"] | "ALL">("ALL");
  const [actor, setActor] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [range, setRange] = useState<RangeKey>("近 7 天");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [backingUp, setBackingUp] = useState(false);

  const actors = useMemo(() => Array.from(new Set(logs.map((l) => l.actor))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.actionLabel))), [logs]);

  const stats = useMemo(() => {
    const today = logs.filter((l) => isSameDay(new Date(l.at), NOW));
    const denied = logs.filter((l) => l.result === "DENIED").length;
    const systemEvents = logs.filter((l) => l.actor === "系统" || l.targetType === "SYSTEM").length;
    const highRisk = logs.filter(
      (l) => l.result === "DENIED" || l.result === "FAILED" || HIGH_RISK_ACTIONS.has(l.action),
    ).length;
    return { today: today.length, denied, systemEvents, highRisk };
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (result !== "ALL" && log.result !== result) return false;
      if (actor !== "ALL" && log.actor !== actor) return false;
      if (action !== "ALL" && log.actionLabel !== action) return false;
      if (range === "今日" && !isSameDay(new Date(log.at), NOW)) return false;
      if (range !== "今日") {
        const diff = NOW.getTime() - new Date(log.at).getTime();
        const limit = (range === "近 7 天" ? 7 : 30) * 86_400_000;
        if (diff > limit) return false;
      }
      if (q) {
        const hay = `${log.actor} ${log.role} ${log.target} ${log.detail} ${log.actionLabel} ${log.action} ${log.ip} ${log.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, result, actor, action, range, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const backupLog = logs.find((l) => l.action === "BACKUP");
  const deniedLogs = logs.filter((l) => l.result === "DENIED");

  function runBackup() {
    if (backingUp) return;
    setBackingUp(true);
    window.setTimeout(() => {
      const log: AuditLog = {
        id: `AL-${9020 + logs.length}`,
        at: new Date().toISOString(),
        actor: "王建国",
        role: "系统管理员",
        action: "BACKUP",
        actionLabel: "数据库备份",
        target: "clinical_pathway.db",
        targetType: "SYSTEM",
        ip: "10.20.5.2",
        result: "SUCCESS",
        detail: "手动触发数据快照备份，校验和验证通过。",
      };
      setLogs((prev) => [log, ...prev]);
      setBackingUp(false);
      setRange("今日");
      setResult("ALL");
      setQuery("");
      toast.success("备份已完成", {
        description: "数据快照已生成并校验通过；审计记录已追加。",
      });
    }, 900);
  }

  function handleExport() {
    toast.success("审计日志导出已创建", {
      description: `导出范围：当前筛选 ${filtered.length} 条；导出操作本身也会被记录，导出文件不含明文凭据。`,
    });
  }

  return (
    <Page>
      <PageHeader
        module="M12 · 系统审计"
        title="审计日志"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="日志条数" value={`${logs.length} 条`} mono />
            <PageMeta label="保留策略" value="≥ 180 天" />
            <PageMeta label="最近同步" value={fmtDate(LAST_SYNC, true)} mono />
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
            导出审计
          </Button>
        }
      />

      {/* ------------------------------- KPI ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="今日操作"
          value={String(stats.today)}
          unit="条"
          tone="info"
          hint="今日 00:00 以来的全部审计事件（含系统事件）"
          footer={<span className="font-mono text-[10px]">since 00:00</span>}
        />
        <StatCard
          label="被拒绝请求"
          value={String(stats.denied)}
          unit="条"
          tone="risk"
          hint="RBAC 校验失败并被拒绝的请求，包含患者级访问与导出"
          footer={
            <button
              className="text-[10px] text-risk hover:underline"
              onClick={() => {
                setResult("DENIED");
                setRange("近 30 天");
                setPage(1);
                toast("已筛选被拒绝请求", { description: `共 ${stats.denied} 条，可展开查看拒绝原因。` });
              }}
            >
              仅查看被拒绝记录 →
            </button>
          }
        />
        <StatCard
          label="系统事件"
          value={String(stats.systemEvents)}
          unit="条"
          tone="info"
          hint="事件分发、超时扫描、备份等系统自动行为"
          footer={<span className="font-mono text-[10px]">actor = 系统</span>}
        />
        <StatCard
          label="高风险操作"
          value={String(stats.highRisk)}
          unit="条"
          tone="risk"
          hint="被拒绝 / 失败，或路径发布、权限变更、患者导出等敏感操作"
          footer={<span className="font-mono text-[10px]">DENIED + FAILED + sensitive</span>}
        />
      </div>

      {/* ------------------------------- 筛选 ------------------------------- */}
      <Card className="mt-4 gap-0 py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="w-[280px]">
            <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="搜索操作人 / 对象 / 详情 / IP" />
          </div>
          <Toolbar>
            <Select
              value={result}
              onValueChange={(v) => {
                setResult(v as AuditLog["result"] | "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[112px]">
                <SelectValue placeholder="结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部结果</SelectItem>
                <SelectItem value="SUCCESS">成功</SelectItem>
                <SelectItem value="DENIED">已拒绝</SelectItem>
                <SelectItem value="FAILED">失败</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={actor}
              onValueChange={(v) => {
                setActor(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[124px]">
                <SelectValue placeholder="操作人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部操作人</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[142px]">
                <SelectValue placeholder="操作类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部操作</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={range}
              onValueChange={(v) => {
                setRange(v as RangeKey);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-[104px]">
                <SelectValue placeholder="时间" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="font-mono text-[10px] text-muted-foreground">
              {filtered.length} / {logs.length}
            </span>
          </Toolbar>
        </CardContent>
      </Card>

      {/* RBAC 拒绝说明 */}
      {result !== "DENIED" && deniedLogs.length > 0 && (
        <Callout
          tone="risk"
          title={`${deniedLogs.length} 条请求被 RBAC 拒绝，已全量留痕`}
          className="mt-3"
          action={
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setResult("DENIED");
                setRange("近 30 天");
                setPage(1);
              }}
            >
              查看拒绝记录
            </Button>
          }
        >
          {deniedLogs
            .map((l) => `${l.actor}（${l.role}）· ${l.actionLabel}`)
            .slice(0, 2)
            .join("；")}
          。系统管理员无患者病历访问权限，科研人员无患者身份数据导出权限，拒绝原因可在展开行查看。
        </Callout>
      )}

      {/* ------------------------------- 主体 ------------------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="gap-0 py-0 lg:col-span-8 xl:col-span-9">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHead title="审计事件" count={filtered.length} description="点击行展开详情与请求 ID" />
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Lock className="size-3" />
              append-only
            </span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="没有匹配的审计事件"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setResult("ALL");
                    setActor("ALL");
                    setAction("ALL");
                    setRange("近 30 天");
                    setPage(1);
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
                    <TableHead className="w-[38px] pl-3" />
                    <TableHead className="w-[128px]">时间</TableHead>
                    <TableHead className="w-[130px]">操作人</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>对象</TableHead>
                    <TableHead className="w-[110px]">IP</TableHead>
                    <TableHead className="w-[104px] pr-4">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((log) => {
                    const meta = RESULT_META[log.result];
                    const open = expanded === log.id;
                    const denied = log.result === "DENIED";
                    return [
                      <TableRow
                        key={log.id}
                        onClick={() => setExpanded(open ? null : log.id)}
                        className={cn("cursor-pointer", denied && "bg-risk-wash/25 hover:bg-risk-wash/35")}
                      >
                        <TableCell className="pl-3">
                          <ChevronDown
                            className={cn(
                              "size-3.5 text-muted-foreground transition-transform",
                              open && "rotate-180",
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="whitespace-nowrap font-mono text-[10.5px] text-foreground/80">
                            {fmtDate(log.at, true)}
                          </p>
                          <p className="font-mono text-[9.5px] text-muted-foreground">{relTime(log.at)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-[11.5px] font-medium text-foreground/90">{log.actor}</p>
                          <p className="text-[10px] text-muted-foreground">{log.role}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-[11.5px] text-foreground/85">{log.actionLabel}</p>
                          <p className="font-mono text-[9.5px] text-muted-foreground">{log.action}</p>
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <p className="truncate text-[11px] text-foreground/80">{log.target}</p>
                          <span className="mt-0.5 inline-flex items-center rounded-[3px] border border-line bg-secondary/60 px-1 font-mono text-[9px] text-muted-foreground">
                            {TARGET_TYPE_LABEL[log.targetType]}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">
                          {log.ip}
                        </TableCell>
                        <TableCell className="pr-4">
                          <StatusBadge tone={meta.tone} dot>
                            {denied ? "拒绝 · RBAC" : meta.label}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>,
                      open && (
                        <TableRow key={`${log.id}-detail`} className="bg-secondary/30 hover:bg-secondary/30">
                          <TableCell colSpan={7} className="px-4 py-2.5">
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                              <div className="lg:col-span-2">
                                <p className="label-micro">事件详情</p>
                                <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/85">{log.detail}</p>
                                {denied && (
                                  <div className="mt-1.5 flex items-start gap-1.5 rounded-[4px] border border-risk/20 bg-risk-wash/60 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-risk">
                                    <UserX className="mt-px size-3 shrink-0" />
                                    <span>
                                      RBAC 拒绝：请求已拦截并记录，未返回患者数据。系统管理员与科研人员的数据范围不包含
                                      患者病历 / 患者身份信息，需显式授权后另行访问。
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="label-micro">请求元数据</p>
                                <div className="mt-1 divide-y divide-line">
                                  <Field label="请求 ID" value={`REQ-${log.id.replace("AL-", "")}`} mono />
                                  <Field label="日志 ID" value={log.id} mono />
                                  <Field label="对象类型" value={TARGET_TYPE_LABEL[log.targetType]} />
                                  <Field label="来源 IP" value={log.ip} mono />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ),
                    ];
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              第 {currentPage} / {pageCount} 页 · 共 {filtered.length} 条
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="size-3" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                下一页
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        </Card>

        {/* ------------------------------ 右栏 ------------------------------ */}
        <div className="space-y-4 lg:col-span-4 xl:col-span-3">
          {/* 系统健康 */}
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHead title="系统健康" description="存储 / 备份 / 外部适配器" />
              <StatusBadge tone="ok" dot pulse>
                运行正常
              </StatusBadge>
            </div>
            <CardContent className="px-4 py-2.5">
              <div className="divide-y divide-line">
                <div className="flex items-center justify-between py-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/85">
                    <DatabaseBackup className="size-3 text-muted-foreground" />
                    SQLite 数据库
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px]">
                    <StatusDot tone="ok" />
                    <span className="font-mono text-foreground/80">clinical_pathway.db</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/85">
                    <HardDriveDownload className="size-3 text-muted-foreground" />
                    最近备份
                  </span>
                  <span className="text-right text-[10.5px]">
                    <span className="block font-mono text-foreground/80">
                      {backupLog ? fmtDate(backupLog.at, true) : "—"}
                    </span>
                    <span className="block text-muted-foreground">
                      {backupLog ? `${backupLog.actor} · ${backupLog.result}` : "无记录"}
                    </span>
                  </span>
                </div>
                {ADAPTER_STATUS.map((adapter) => (
                  <div key={adapter.key} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate text-[11.5px] text-foreground/85">{adapter.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <StatusDot tone={ADAPTER_TONE[adapter.status] ?? "neutral"} />
                      <span className="font-mono text-[10px] text-muted-foreground">{adapter.status}</span>
                      <span className="font-mono text-[10px] text-foreground/70">{adapter.latency}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[10px] text-muted-foreground">
                <span>最近同步</span>
                <span className="font-mono">{fmtTime(LAST_SYNC)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 审计策略 */}
          <Card className="gap-0 py-0">
            <div className="border-b border-line px-4 py-3">
              <SectionHead title="审计策略" description="合规与数据保护" />
            </div>
            <CardContent className="px-4 py-2.5">
              <div className="divide-y divide-line">
                <Field label="保留期限" value="≥ 180 天" mono />
                <Field label="写入方式" value="追加写入 · 不可修改" />
                <Field label="完整性" value="校验链（hash chain）" mono />
                <Field label="导出权限" value="audit.view" mono />
              </div>
              <div className="mt-2 space-y-1.5 rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                <p className="inline-flex items-start gap-1">
                  <ShieldCheck className="mt-px size-3 shrink-0 text-ok" />
                  记录操作人、角色、时间、IP、对象与结果；被拒绝请求同样记录。
                </p>
                <p className="inline-flex items-start gap-1">
                  <ShieldAlert className="mt-px size-3 shrink-0 text-warn" />
                  不记录明文密码、访问令牌或完整病历文本；敏感字段统一脱敏。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 备份恢复 */}
          <Card className="gap-0 py-0">
            <div className="border-b border-line px-4 py-3">
              <SectionHead title="备份与恢复" description="数据快照" />
            </div>
            <CardContent className="px-4 py-2.5">
              <div className="divide-y divide-line">
                <Field label="备份模式" value="每日自动 + 手动" />
                <Field label="最近校验" value={backupLog ? fmtDate(backupLog.at, true) : "—"} mono />
                <Field label="恢复授权" value="双人授权" />
              </div>
              <Button variant="outline" size="sm" className="mt-2.5 w-full" onClick={runBackup} disabled={backingUp}>
                {backingUp ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                {backingUp ? "备份中…" : "立即备份"}
              </Button>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                备份会生成数据快照并追加审计记录；恢复需双人授权。
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardContent className="px-4 py-2.5">
              <div className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted-foreground">
                <Terminal className="mt-px size-3 shrink-0" />
                
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <FileClock className="size-3" />
        日志按时间倒序展示；展开行可查看事件详情与请求 ID。审计导出行为本身亦被记录。
      </div>
    </Page>
  );
}
