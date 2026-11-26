import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Inbox,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn, fmt, fmtDate, initials, relTime } from "@/lib/utils";
import { APPROVAL_STATUS_META, RISK_META, ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import type { Tone } from "@/lib/clinical";
import type { Approval, ApprovalChecklistItem } from "@/types";
import { APPROVALS, PATHWAYS, PATIENTS } from "@/data";
import { APPROVAL_TYPE_MIX, APPROVAL_WEEKLY } from "@/data/visuals";
import { useSessionStore } from "@/stores/session-store";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { FilterPill } from "@/components/app/toolbar";
import { DonutChart } from "@/components/charts/advanced";
import { TrendChart } from "@/components/charts/chart-kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPE_META: Record<Approval["type"], { label: string; badge: string }> = {
  PATHWAY_VERSION: { label: "路径版本", badge: "border-info/20 bg-info-wash text-info" },
  PLAN: { label: "患者计划", badge: "border-warn/25 bg-warn-wash text-warn" },
  VARIATION_REPLAN: { label: "变异重规划", badge: "border-risk/20 bg-risk-wash text-risk" },
};

const CHECK_META: Record<
  ApprovalChecklistItem["status"],
  { label: string; tone: Tone; icon: typeof CheckCircle2; className: string }
> = {
  PASS: { label: "通过", tone: "ok", icon: CheckCircle2, className: "text-ok" },
  WARN: { label: "警告", tone: "warn", icon: AlertTriangle, className: "text-warn" },
  BLOCKED: { label: "阻断", tone: "risk", icon: XCircle, className: "text-risk" },
  PENDING: { label: "待处理", tone: "neutral", icon: Clock3, className: "text-muted-foreground" },
};

const TYPE_TABS: { key: "ALL" | Approval["type"]; label: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "PATHWAY_VERSION", label: "路径版本" },
  { key: "PLAN", label: "患者计划" },
  { key: "VARIATION_REPLAN", label: "变异重规划" },
];

function approveLabel(type: Approval["type"]) {
  if (type === "PATHWAY_VERSION") return "通过并发布";
  if (type === "VARIATION_REPLAN") return "通过并应用";
  return "通过";
}

export default function ApprovalsPage() {
  const user = useSessionStore((state) => state.user);
  const [approvals, setApprovals] = useState<Approval[]>(APPROVALS);
  const [typeFilter, setTypeFilter] = useState<"ALL" | Approval["type"]>("ALL");
  const [showProcessed, setShowProcessed] = useState(false);
  const [selectedId, setSelectedId] = useState("AP-2026-0142");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [approvedToday, setApprovedToday] = useState(
    () => APPROVALS.filter((approval) => approval.status === "APPROVED").length,
  );

  const pending = useMemo(() => approvals.filter((approval) => approval.status === "PENDING"), [approvals]);

  const approvalTrend = useMemo(
    () =>
      APPROVAL_WEEKLY.map((point) => ({
        label: point.label,
        values: { submitted: point.submitted, approved: point.approved },
      })),
    [],
  );

  const approvalTrendSeries = useMemo(
    () => [
      { key: "submitted", label: "提交审核", color: "var(--chart-4)" },
      { key: "approved", label: "审核通过", color: "var(--chart-1)" },
    ],
    [],
  );

  const weeklySubmittedAvg = useMemo(
    () => APPROVAL_WEEKLY.reduce((total, point) => total + point.submitted, 0) / APPROVAL_WEEKLY.length,
    [],
  );
  const weeklyApprovedAvg = useMemo(
    () => APPROVAL_WEEKLY.reduce((total, point) => total + point.approved, 0) / APPROVAL_WEEKLY.length,
    [],
  );
  const latestAvgHours = APPROVAL_WEEKLY[APPROVAL_WEEKLY.length - 1]?.avgHours ?? 0;

  const scope = useMemo(
    () => approvals.filter((approval) => showProcessed || approval.status === "PENDING"),
    [approvals, showProcessed],
  );

  const counts = useMemo(() => {
    const base: Record<"ALL" | Approval["type"], number> = {
      ALL: scope.length,
      PATHWAY_VERSION: 0,
      PLAN: 0,
      VARIATION_REPLAN: 0,
    };
    scope.forEach((approval) => {
      base[approval.type] += 1;
    });
    return base;
  }, [scope]);

  const list = useMemo(
    () => scope.filter((approval) => typeFilter === "ALL" || approval.type === typeFilter),
    [scope, typeFilter],
  );

  const selected = list.find((approval) => approval.id === selectedId) ?? list[0];

  const blocked = selected ? selected.checklist.some((item) => item.status === "BLOCKED") : false;
  const safetyWarning = selected
    ? selected.risk === "HIGH" && selected.checklist.some((item) => item.key === "safety" && item.status === "WARN")
    : false;
  const approveDisabled = blocked || safetyWarning;
  const approveBlockReason = blocked
    ? "检查项中存在 BLOCKED 阻断项，须先解决后才能通过。"
    : safetyWarning
      ? "高风险审批且安全约束校验为 WARN：需完成麻醉科二次评估并通过后方可批准。"
      : "";

  const resolveApproval = (
    id: string,
    status: "APPROVED" | "REJECTED",
    content: string,
  ) => {
    setApprovals((current) =>
      current.map((approval) =>
        approval.id === id
          ? {
              ...approval,
              status,
              comments: [
                ...approval.comments,
                {
                  author: user?.name ?? "周敏",
                  role: user ? ROLE_SYSTEM_LABELS[user.role] : "医务处",
                  at: new Date().toISOString(),
                  content,
                },
              ],
            }
          : approval,
      ),
    );
  };

  const confirmApprove = () => {
    if (!selected) return;
    const label = approveLabel(selected.type);
    resolveApproval(
      selected.id,
      "APPROVED",
      selected.type === "PATHWAY_VERSION"
        ? "审核通过，同意发布该版本。请注意发布后不可修改，如需调整请创建新版本。"
        : "审核通过，同意按本次方案执行。",
    );
    setApproveOpen(false);
    setApprovedToday((current) => current + 1);
    toast.success(
      selected.type === "PATHWAY_VERSION" ? "审核通过，版本已发布" : selected.type === "PLAN" ? "计划已通过" : "重规划已通过",
      {
        description: `「${selected.pathwayName}」${selected.version} 已由 ${user?.name ?? "审核人"} 完成${label === "通过并发布" ? "发布" : "审批"}，相关方已收到通知（模拟）。`,
      },
    );
  };

  const confirmReject = () => {
    if (!selected) return;
    if (rejectComment.trim().length < 4) {
      setRejectError("请填写退回意见（至少 4 个字符），说明需补充或修改的内容。");
      return;
    }
    resolveApproval(selected.id, "REJECTED", `退回修改：${rejectComment.trim()}`);
    setRejectOpen(false);
    setRejectComment("");
    setRejectError("");
    toast.success("已退回提交人", {
      description: `「${selected.pathwayName}」${selected.version} 已退回，提交人将收到修改意见（模拟）。`,
    });
  };

  const pathway = selected ? PATHWAYS.find((item) => item.name === selected.pathwayName) : undefined;
  const patient = selected?.patientName ? PATIENTS.find((item) => item.name === selected.patientName) : undefined;

  return (
    <Page>
      <PageHeader
        module="M03 / M06 · 审核"
        title="审核中心"
        description="集中处理路径版本发布、患者个体化计划与变异重规划的人工审核。所有通过/退回操作写入审计日志，高风险事项需双人复核。"
        meta={
          <>
            <PageMeta label="待处理" value={`${pending.length} 项`} mono />
            <PageMeta label="审核 SLA" value="24 小时内完成" />
            <PageMeta label="当前角色" value={user ? ROLE_SYSTEM_LABELS[user.role] : "未登录"} />
            <SyntheticTag />
          </>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast("已刷新审核队列", { description: "演示数据未变化；真实环境将拉取最新待办与审批状态。" })
            }
          >
            <RefreshCw className="size-3.5" />
            刷新队列
          </Button>
        }
      />

      {/* 统计 */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="待审核"
          value={fmt(pending.length)}
          unit="项"
          trend={[6, 5, 5, 4, 4, 4]}
          hint="跨路径版本、患者计划与变异重规划的待处理审核事项总数。"
          footer={`其中路径版本 ${pending.filter((item) => item.type === "PATHWAY_VERSION").length} 项`}
        />
        <StatCard
          label="高风险"
          value={fmt(pending.filter((item) => item.risk === "HIGH").length)}
          unit="项"
          tone="risk"
          hint="风险等级为 HIGH 的待审事项，需要医务处或临床专家复核。"
          footer="较高风险事项须双人复核并留痕"
        />
        <StatCard
          label="今日通过"
          value={fmt(approvedToday)}
          unit="项"
          tone="ok"
          trend={[1, 2, 1, 3, 2, 3]}
          hint="今日已通过的审核事项数量（含演示操作）。"
          footer="平均审批意见字数 42 字"
        />
        <StatCard
          label="平均处理时长"
          value="26"
          unit="分钟"
          hint="近 30 天审核从提交到首次处理的平均时长（合成指标）。"
          footer="SLA 达成率 96.2% · 目标 24h"
        />
      </div>


      {/* 审批效率趋势 + 待审类型构成 */}
      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-card px-3 pt-2.5 pb-2 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold">审批效率趋势</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">近 7 周提交与通过数量 · 合成演示数据</p>
            </div>
            <span className="shrink-0 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[9px] text-muted-foreground">
              WEEKLY
            </span>
          </div>
          <TrendChart
            data={approvalTrend}
            series={approvalTrendSeries}
            height={124}
            unit="项"
            digits={0}
            className="mt-1"
          />
          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            <span>
              周均提交 <span className="tabular font-mono text-foreground/75">{weeklySubmittedAvg.toFixed(1)}</span> 项 · 通过{" "}
              <span className="tabular font-mono text-foreground/75">{weeklyApprovedAvg.toFixed(1)}</span> 项
            </span>
            <span className="font-mono">
              平均处理时长 {latestAvgHours.toFixed(1)}h · 合成
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card px-3 pt-2.5 pb-2 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold">待审类型构成</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">按审核对象类型 · 合成数据</p>
            </div>
            <span className="shrink-0 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[9px] text-muted-foreground">
              MIX
            </span>
          </div>
          <DonutChart
            data={APPROVAL_TYPE_MIX}
            height={134}
            centerLabel="待审"
            unit="项"
            className="mt-1"
            footnote="合成演示快照，与队列实时状态可能存在差异"
          />
        </div>
      </div>

      {/* 列表 + 详情 */}
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <div className="flex items-center gap-1">
            {TYPE_TABS.map((tab) => (
              <FilterPill
                key={tab.key}
                active={typeFilter === tab.key}
                count={counts[tab.key]}
                onClick={() => setTypeFilter(tab.key)}
              >
                {tab.label}
              </FilterPill>
            ))}
          </div>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11.5px] text-muted-foreground">
            显示已处理
            <Switch checked={showProcessed} onCheckedChange={setShowProcessed} />
          </label>
        </div>

        {list.length === 0 ? (
          <div className="px-4 py-10">
            <EmptyState
              icon={<Inbox className="size-4" />}
              title={showProcessed ? "该类型暂无审核记录" : "待办已清空"}
              description={
                showProcessed
                  ? "当前类型筛选下没有已处理或待处理的审核事项。"
                  : "当前筛选条件下没有待审核事项。开启「显示已处理」可查看历史审批记录。"
              }
              action={
                <div className="flex items-center gap-2">
                  {typeFilter !== "ALL" && (
                    <Button variant="outline" size="sm" onClick={() => setTypeFilter("ALL")}>
                      查看全部类型
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowProcessed(true)}>
                    显示已处理
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
            {/* 左：审核队列 */}
            <div className="border-b border-line xl:border-r xl:border-b-0">
              <div className="flex items-center justify-between border-b border-line bg-secondary/25 px-3 py-1.5">
                <span className="label-micro">QUEUE · 审核队列</span>
                <span className="font-mono text-[9.5px] text-muted-foreground">{list.length} 项</span>
              </div>
              <div>
                {list.map((approval) => {
                  const active = selected?.id === approval.id;
                  const urgent =
                    approval.deadline !== undefined &&
                    approval.status === "PENDING" &&
                    new Date(approval.deadline).getTime() - Date.now() < 4 * 3600_000;
                  return (
                    <button
                      key={approval.id}
                      type="button"
                      onClick={() => setSelectedId(approval.id)}
                      className={cn(
                        "w-full border-b border-line px-3 py-2.5 text-left outline-none transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30",
                        active ? "bg-accent/60" : "hover:bg-secondary/40",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-[3px] border px-1 py-px text-[9.5px] font-medium whitespace-nowrap",
                            TYPE_META[approval.type].badge,
                          )}
                        >
                          {TYPE_META[approval.type].label}
                        </span>
                        <StatusBadge tone={RISK_META[approval.risk].tone} dot={approval.risk === "HIGH"} className="text-[10px]">
                          {RISK_META[approval.risk].label}
                        </StatusBadge>
                        {approval.status !== "PENDING" && (
                          <StatusBadge tone={APPROVAL_STATUS_META[approval.status].tone} dot={false} className="text-[10px]">
                            {APPROVAL_STATUS_META[approval.status].label}
                          </StatusBadge>
                        )}
                        <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">{approval.id}</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] font-medium text-foreground">
                        {approval.pathwayName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <span className="font-mono text-[10px]">{approval.version}</span>
                        <span className="text-line-strong">·</span>
                        <span>{approval.submittedBy}</span>
                        <span className="text-line-strong">·</span>
                        <span>{relTime(approval.submittedAt)}</span>
                        {approval.patientName && (
                          <>
                            <span className="text-line-strong">·</span>
                            <span>患者 {approval.patientName}</span>
                          </>
                        )}
                      </div>
                      {approval.deadline && approval.status === "PENDING" && (
                        <div
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-[3px] px-1 py-px font-mono text-[9.5px]",
                            urgent ? "bg-risk-wash text-risk" : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <Clock3 className="size-2.5" />
                          截止 {relTime(approval.deadline)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 右：审核详情 */}
            <div className="min-w-0">
              {selected && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[14px] font-semibold">{selected.title}</h2>
                        <span className="font-mono text-[11px] text-muted-foreground">{selected.version}</span>
                        <StatusBadge tone={APPROVAL_STATUS_META[selected.status].tone}>
                          {APPROVAL_STATUS_META[selected.status].label}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">{selected.id}</span> · 提交人 {selected.submittedBy} ·{" "}
                        {fmtDate(selected.submittedAt, true)}（{relTime(selected.submittedAt)}）
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={RISK_META[selected.risk].tone}>{RISK_META[selected.risk].label}</StatusBadge>
                      <span className="rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[9.5px] text-muted-foreground">
                        {TYPE_META[selected.type].label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 text-[11px] md:grid-cols-4">
                    <DetailMeta label="路径" value={selected.pathwayName} />
                    <DetailMeta label="患者" value={selected.patientName ?? "不适用（路径级）"} />
                    <DetailMeta
                      label="截止时间"
                      value={selected.deadline ? fmtDate(selected.deadline, true) : "无时限"}
                      mono={Boolean(selected.deadline)}
                    />
                    <DetailMeta label="检查项" value={`${selected.checklist.length} 项`} mono />
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_292px]">
                    <div className="min-w-0">
                      <SectionHead
                        title="审核检查项"
                        count={selected.checklist.length}
                        description="系统自动校验结果，人工审核需逐项确认"
                      />
                      <ul className="mt-2 space-y-1.5">
                        {selected.checklist.map((item) => {
                          const meta = CHECK_META[item.status];
                          const Icon = meta.icon;
                          return (
                            <li
                              key={item.key}
                              className={cn(
                                "flex items-start gap-2 rounded-md border px-2.5 py-2",
                                item.status === "BLOCKED"
                                  ? "border-risk/25 bg-risk-wash/40"
                                  : item.status === "WARN"
                                    ? "border-warn/20 bg-warn-wash/30"
                                    : "border-line",
                              )}
                            >
                              <Icon className={cn("mt-px size-3.5 shrink-0", meta.className)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11.5px] font-medium">{item.label}</span>
                                  <span className={cn("font-mono text-[9.5px] uppercase", meta.className)}>
                                    {meta.label}
                                  </span>
                                </div>
                                {item.note && (
                                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">{item.key}</span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="mt-4 border-t border-line pt-3">
                        <SectionHead
                          title="审核意见与讨论"
                          count={selected.comments.length}
                          action={
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MessageSquare className="size-3" />
                              全程留痕
                            </span>
                          }
                        />
                        <div className="mt-2 space-y-2.5">
                          {selected.comments.map((comment, index) => (
                            <div key={`${comment.author}-${comment.at}-${index}`} className="flex items-start gap-2">
                              <Avatar className="mt-0.5 size-6">
                                <AvatarFallback className="text-[9px]">{initials(comment.author)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 rounded-md border border-line bg-secondary/20 px-2.5 py-1.5">
                                <div className="flex flex-wrap items-center gap-x-2 text-[10.5px]">
                                  <span className="text-[11.5px] font-medium">{comment.author}</span>
                                  <span className="text-muted-foreground">{comment.role}</span>
                                  <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">
                                    {fmtDate(comment.at, true)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/80">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 右侧关联信息 */}
                    <div className="space-y-2.5">
                      <div className="rounded-md border border-line">
                        <div className="border-b border-line px-2.5 py-1.5">
                          <p className="text-[11.5px] font-semibold">关联实体</p>
                        </div>
                        <div className="px-2.5 py-2 text-[11px]">
                          {pathway ? (
                            <Link
                              to={`/pathways/${pathway.id}/versions`}
                              className="flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
                            >
                              <span className="truncate">{pathway.name}</span>
                              <ExternalLink className="size-3 shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{selected.pathwayName}</span>
                          )}
                          <div className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                            {pathway ? pathway.code : "—"} · 版本 {selected.version}
                          </div>

                          {selected.patientName && (
                            <>
                              <div className="my-2 h-px bg-line" />
                              {patient ? (
                                <Link
                                  to={`/patients/${patient.id}`}
                                  className="flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
                                >
                                  <UserRound className="size-3 shrink-0" />
                                  <span className="truncate">
                                    {patient.name} · {patient.mrn}
                                  </span>
                                  <ExternalLink className="size-3 shrink-0" />
                                </Link>
                              ) : (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <UserRound className="size-3" />
                                  {selected.patientName}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {selected.risk === "HIGH" && (
                        <Callout tone="risk" title="高风险审批">
                          该事项涉及高风险患者或安全约束，须由医务处与临床专家双人复核，并记录审批依据。
                        </Callout>
                      )}

                      {selected.checklist.some((item) => item.status === "WARN") && (
                        <Callout tone="warn" title="存在需说明的警告项">
                          警告项不阻断审批，但需在审批意见中说明处置方案，并在发布后跟踪闭环。
                        </Callout>
                      )}

                      {selected.checklist.some((item) => item.status === "PASS") && (
                        <div className="rounded-md border border-line px-2.5 py-2 text-[10.5px] text-muted-foreground">
                          <p className="mb-1 font-medium text-foreground/80">审批依据</p>
                          <p className="leading-relaxed">
                            路径版本须通过图结构、临床规则、证据完备性、安全约束与版本权限五项校验；患者计划须通过安全约束与
                            数据完整性校验。
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 底部操作 */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line bg-secondary/30 px-4 py-2.5">
                    {selected.status === "PENDING" ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <ShieldAlert className="size-3.5 text-primary/70" />
                          {approveDisabled ? "存在阻断/高风险条件，暂不可通过" : "审批后将写入审计日志并通知提交人"}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            variant="destructive-outline"
                            size="sm"
                            onClick={() => {
                              setRejectOpen(true);
                              setRejectError("");
                            }}
                          >
                            <RotateCcw className="size-3.5" />
                            退回
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>
                                <Button size="sm" disabled={approveDisabled} onClick={() => setApproveOpen(true)}>
                                  <CheckCircle2 className="size-3.5" />
                                  {approveLabel(selected.type)}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {approveDisabled ? approveBlockReason : "确认后完成审批并通知提交人"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CheckCircle2 className={cn("size-3.5", selected.status === "APPROVED" ? "text-ok" : "text-risk")} />
                          该事项已{selected.status === "APPROVED" ? "通过" : "退回"}，审批记录已归档
                        </span>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowProcessed(true)}>
                          查看历史记录
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 退回对话框 */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>退回审核事项</DialogTitle>
            <DialogDescription>
              退回意见将发送给提交人，并作为版本重新提交时的对照依据。请输入需补充或修改的具体内容（必填）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-5 py-4">
            <Label htmlFor="reject-comment">
              退回意见 <span className="text-risk">*</span>
            </Label>
            <Textarea
              id="reject-comment"
              value={rejectComment}
              onChange={(event) => {
                setRejectComment(event.target.value);
                if (rejectError) setRejectError("");
              }}
              placeholder="例如：请补充术后病理检查的证据绑定，并说明 ICG 阈值调整的指南依据。"
              className="min-h-[96px] text-[12.5px]"
            />
            {rejectError && <p className="text-[10.5px] text-risk">{rejectError}</p>}
            <p className="text-[10px] text-muted-foreground">
              演示环境：退回后事项状态变更为「已退回」，可从「显示已处理」中查看。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmReject}>
              <RotateCcw className="size-3.5" />
              确认退回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通过对话框 */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{selected ? `${approveLabel(selected.type)}` : "确认通过"}</DialogTitle>
            <DialogDescription>
              {selected?.type === "PATHWAY_VERSION"
                ? "确认后该路径版本将发布并对新入径患者生效；已发布版本不可修改。"
                : selected?.type === "VARIATION_REPLAN"
                  ? "确认后新的变异重规划方案将替换原计划，原计划保留为历史版本。"
                  : "确认后患者个体化计划将进入生效状态，并生成待执行任务。"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 px-5 py-4 text-[11.5px]">
              <div className="flex items-center justify-between rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                <span className="text-muted-foreground">审批对象</span>
                <span className="font-medium">
                  {selected.pathwayName} · <span className="font-mono">{selected.version}</span>
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                <span className="text-muted-foreground">审批人</span>
                <span className="font-medium">
                  {user?.name ?? "周敏"} · {user ? ROLE_SYSTEM_LABELS[user.role] : "医务处"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-line bg-secondary/30 px-2.5 py-2">
                <span className="text-muted-foreground">检查项结果</span>
                <span className="font-mono">
                  通过 {selected.checklist.filter((item) => item.status === "PASS").length} · 警告{" "}
                  {selected.checklist.filter((item) => item.status === "WARN").length}
                </span>
              </div>
              <p className="pt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                审批意见将自动记录为：审核通过，同意按本次方案执行。该操作不可撤销，如需调整请创建新版本或新计划。
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={confirmApprove}>
              <CheckCircle2 className="size-3.5" />
              确认通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function DetailMeta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="label-micro">{label}</p>
      <p className={cn("mt-0.5 truncate text-[11.5px] text-foreground/85", mono && "font-mono text-[10.5px]")}>{value}</p>
    </div>
  );
}
