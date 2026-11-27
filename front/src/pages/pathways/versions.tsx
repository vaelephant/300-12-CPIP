import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  FilePlus2,
  GitCompareArrows,
  History,
  Lock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { cn, fmt, fmtDate } from "@/lib/utils";
import { NODE_META, VERSION_STATUS_META } from "@/lib/clinical";
import type { NodeType, Pathway, PathwayVersion, VersionStatus } from "@/types";
import { VERSION_DIFF, getPathway, getVersions } from "@/data";
import { VERSION_GROWTH } from "@/data/visuals";
import type { VersionDiff } from "@/data";
import { useSessionStore } from "@/stores/session-store";
import { useCustomPathway } from "@/stores/studio-store";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { GroupedBarChart } from "@/components/charts/advanced";
import { HBarChart } from "@/components/charts/chart-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

const DOT: Record<VersionStatus, string> = {
  DRAFT: "bg-muted-foreground/40",
  IN_REVIEW: "bg-warn",
  APPROVED: "bg-info",
  PUBLISHED: "bg-ok",
  REJECTED: "bg-risk",
  RETIRED: "bg-line-strong",
};

const createSchema = z.object({
  version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+$/, "版本号格式应为 1.4.0"),
  changeSummary: z.string().trim().min(5, "请填写版本变更摘要（至少 5 个字符）"),
});

type CreateValues = z.infer<typeof createSchema>;

const DIFF_SUPPORTED = new Set(["1.4.0", "1.5.0"]);

/** 演示新建的路径模板没有版本 fixture，按模板元数据合成初始草稿版本。 */
function seedVersions(pathway: Pathway): PathwayVersion[] {
  const existing = getVersions(pathway.id);
  if (existing.length > 0) return existing;
  const status: VersionStatus =
    pathway.status === "PUBLISHED"
      ? "PUBLISHED"
      : pathway.status === "IN_REVIEW"
        ? "IN_REVIEW"
        : pathway.status === "RETIRED"
          ? "RETIRED"
          : "DRAFT";
  return [
    {
      id: pathway.versionId,
      pathwayId: pathway.id,
      version: pathway.currentVersion,
      status,
      graphHash: "sha256:pending…draft",
      createdAt: pathway.updatedAt,
      createdBy: pathway.ownerName,
      changeSummary: "新建路径模板初始版本，尚未生成路径图快照，请在设计器中完成节点配置。",
      nodeCount: 0,
      edgeCount: 0,
      validation: { errors: 0, warnings: 0 },
    },
  ];
}

function bumpMinor(version: string) {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return "1.0.0";
  return `${parts[0]}.${parts[1] + 1}.0`;
}

function makeHash(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `sha256:${hash.toString(16).padStart(8, "0")}…${seed.replace(/\D/g, "").slice(0, 4) || "0000"}`;
}

export default function PathwayVersionsPage() {
  const { id = "" } = useParams();
  const customPathway = useCustomPathway(id);
  const pathway = getPathway(id) ?? customPathway;

  if (!pathway) {
    return (
      <Page>
        <PageHeader
          module="M03 · 路径设计"
          title="版本管理"
          description="未找到对应路径模板"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/pathways">
                <ArrowLeft className="size-3.5" />
                返回路径库
              </Link>
            </Button>
          }
        />
        <div className="rounded-lg border border-line bg-card">
          <EmptyState
            icon={<History className="size-4" />}
            title="路径不存在"
            description={`未找到路径 ID「${id}」，无法加载版本记录。请从路径库重新进入。`}
            action={
              <Button asChild size="sm">
                <Link to="/pathways">返回路径库</Link>
              </Button>
            }
          />
        </div>
      </Page>
    );
  }

  return <VersionsWorkspace key={pathway.id} pathway={pathway} />;
}

function VersionsWorkspace({ pathway }: { pathway: Pathway }) {
  const user = useSessionStore((state) => state.user);
  const canPublish = useSessionStore((state) => state.has("pathway.publish"));
  const canRetire = useSessionStore((state) => state.has("pathway.retire"));

  const [versions, setVersions] = useState<PathwayVersion[]>(() => seedVersions(pathway));
  const [selectedId, setSelectedId] = useState(versions[0]?.id ?? "");
  const selected = versions.find((version) => version.id === selectedId) ?? versions[0];

  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"publish" | "retire" | null>(null);

  const openCreateDialog = () => {
    const latest = versions[0];
    form.setValue("version", bumpMinor(latest?.version ?? pathway.currentVersion));
    setCreateOpen(true);
  };

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { version: "", changeSummary: "" },
  });

  const status = selected?.status ?? "DRAFT";
  const submitDisabled = status !== "DRAFT";
  const publishDisabled = !canPublish || (status !== "IN_REVIEW" && status !== "APPROVED");
  const retireDisabled = !canRetire || status !== "PUBLISHED";
  const diffSupported = selected ? DIFF_SUPPORTED.has(selected.version) : false;

  const counts = useMemo(() => {
    const base: Record<VersionStatus, number> = {
      DRAFT: 0,
      IN_REVIEW: 0,
      APPROVED: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      RETIRED: 0,
    };
    versions.forEach((version) => {
      base[version.status] += 1;
    });
    return base;
  }, [versions]);

  /** 版本规模演化：HCC 使用模板版本序列 fixture，其余路径按自身版本记录生成。 */
  const growthData = useMemo(() => {
    if (pathway.id === "PW-HCC-001") {
      return VERSION_GROWTH.map(({ version, nodes, edges }) => ({ label: version, nodes, edges }));
    }
    return [...versions]
      .reverse()
      .map((version) => ({ label: version.version, nodes: version.nodeCount, edges: version.edgeCount }));
  }, [pathway.id, versions]);

  const growthRange =
    growthData.length > 0
      ? `${growthData[0].label} → ${growthData[growthData.length - 1].label}`
      : "暂无版本";

  const updateStatus = (nextStatus: VersionStatus, patch: Partial<PathwayVersion> = {}) => {
    if (!selected) return;
    setVersions((current) =>
      current.map((version) =>
        version.id === selected.id ? { ...version, ...patch, status: nextStatus } : version,
      ),
    );
  };

  const submitForReview = () => {
    if (!selected || submitDisabled) return;
    updateStatus("IN_REVIEW");
    toast.success("已提交审核", {
      description: `版本 ${selected.version} 已进入医务处审核队列，可在审核中心跟踪（模拟）。`,
    });
  };

  const handleConfirmAction = () => {
    if (!selected || !confirmAction) return;
    if (confirmAction === "publish") {
      const now = new Date().toISOString();
      updateStatus("PUBLISHED", {
        publishedAt: now,
        effectiveAt: now,
        approval: {
          reviewer: user?.name ?? "周敏",
          reviewedAt: now,
          comment: "审核通过，同意发布。",
        },
      });
      toast.success(`版本 ${selected.version} 已发布`, {
        description: "新入径患者将引用该版本；已发布版本不可编辑，如需修改请创建新版本。",
      });
    } else {
      updateStatus("RETIRED");
      toast.success(`版本 ${selected.version} 已停用`, {
        description: "该版本不再接受新患者入径，历史执行记录保留（模拟）。",
      });
    }
    setConfirmAction(null);
  };

  const onCreateSubmit = (values: CreateValues) => {
    if (versions.some((version) => version.version === values.version)) {
      form.setError("version", { message: "该版本号已存在" });
      return;
    }
    const now = new Date().toISOString();
    const baseline = selected ?? versions[0];
    const created: PathwayVersion = {
      id: `PV-${pathway.id.replace(/[^A-Z0-9]/gi, "").slice(0, 8)}-${values.version.replace(/\./g, "")}`,
      pathwayId: pathway.id,
      version: values.version,
      status: "DRAFT",
      graphHash: makeHash(`${pathway.id}-${values.version}`),
      createdAt: now,
      createdBy: user?.name ?? "张启明",
      changeSummary: values.changeSummary,
      nodeCount: baseline?.nodeCount ?? 0,
      edgeCount: baseline?.edgeCount ?? 0,
      validation: { errors: 0, warnings: 0 },
    };
    setVersions((current) => [created, ...current]);
    setSelectedId(created.id);
    setCreateOpen(false);
    form.reset();
    toast.success(`已创建版本 ${created.version}`, {
      description: `基于 ${baseline?.version ?? "当前基线"} 派生，当前为草稿状态，可在设计器中继续修改。`,
    });
  };

  return (
    <Page>
      <PageHeader
        module="M03 · 路径设计"
        title="版本管理"
        description={`${pathway.name} · 版本修订、差异比较与发布审批。已发布版本为不可变记录，所有变更须创建新版本并重新审核。`}
        meta={
          <>
            <PageMeta label="路径编码" value={pathway.code} mono />
            <PageMeta label="疾病" value={`${pathway.diseaseName} · ${pathway.diseaseCode}`} mono />
            <PageMeta label="负责人" value={pathway.ownerName} />
            <SyntheticTag />
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/pathways">
                <ArrowLeft className="size-3.5" />
                返回路径库
              </Link>
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <FilePlus2 className="size-3.5" />
              创建版本
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-[11px] text-muted-foreground shadow-card">
        <span className="label-micro">VERSION LEDGER</span>
        <span className="font-mono text-foreground/75">{versions.length} 个版本</span>
        <span className="text-line-strong">·</span>
        <span>
          已发布 <span className="font-mono text-ok">{counts.PUBLISHED}</span>
        </span>
        <span className="text-line-strong">·</span>
        <span>
          审核中 <span className="font-mono text-warn">{counts.IN_REVIEW}</span>
        </span>
        <span className="text-line-strong">·</span>
        <span>
          草稿 <span className="font-mono">{counts.DRAFT}</span>
        </span>
        <span className="ml-auto">图哈希由路径图结构生成，用于版本溯源</span>
      </div>

      {versions.length === 0 || !selected ? (
        <div className="rounded-lg border border-line bg-card">
          <EmptyState
            icon={<History className="size-4" />}
            title="该路径暂无版本记录"
            action={
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="size-3.5" />
                创建版本
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[392px_minmax(0,1fr)]">
          {/* 版本时间线 */}
          <section className="rounded-lg border border-line bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <div>
                <p className="text-[12.5px] font-semibold">版本时间线</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">按创建时间倒序 · 单击查看详情</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{versions.length}</span>
            </div>
            <div className="px-3 py-3">
              <div className="relative space-y-2 before:absolute before:top-2 before:bottom-2 before:left-[14px] before:w-px before:bg-line">
                {versions.map((version) => {
                  const active = version.id === selected.id;
                  return (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => setSelectedId(version.id)}
                      className={cn(
                        "relative flex w-full items-start gap-3 rounded-md border px-2.5 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30",
                        active
                          ? "border-primary/30 bg-accent/60"
                          : "border-line bg-card hover:border-line-strong hover:bg-secondary/30",
                      )}
                    >
                      <span
                        className={cn(
                          "relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-card",
                          DOT[version.status],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12.5px] font-semibold">{version.version}</span>
                          <StatusBadge tone={VERSION_STATUS_META[version.status].tone} dot={false}>
                            {VERSION_STATUS_META[version.status].label}
                          </StatusBadge>
                          {active && (
                            <span className="ml-auto shrink-0 rounded-[3px] bg-primary/10 px-1 py-px font-mono text-[9px] text-primary">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span className="tabular">{fmtDate(version.createdAt)}</span>
                          <span className="text-line-strong">·</span>
                          <span>{version.createdBy}</span>
                          <span className="text-line-strong">·</span>
                          <span className="font-mono">
                            {version.nodeCount} 节点 / {version.edgeCount} 连线
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-foreground/70">
                          {version.changeSummary}
                        </p>
                        <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground/70">
                          {version.graphHash}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 版本详情 */}
          <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-card shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[17px] leading-none font-semibold">{selected.version}</span>
                  <StatusBadge tone={VERSION_STATUS_META[selected.status].tone}>
                    {VERSION_STATUS_META[selected.status].label}
                  </StatusBadge>
                  <span className="font-mono text-[10px] text-muted-foreground">{selected.id}</span>
                </div>
                <p className="mt-1.5 max-w-[620px] text-[12px] leading-relaxed text-muted-foreground">
                  {selected.changeSummary}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button variant="ghost" size="sm" onClick={submitForReview} disabled={submitDisabled}>
                        <Clock className="size-3.5" />
                        提交审核
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {submitDisabled ? "仅草稿状态的版本可提交审核；当前版本已在流程中或已发布。" : "提交医务处审核"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={publishDisabled}
                        onClick={() => setConfirmAction("publish")}
                      >
                        <ShieldCheck className="size-3.5" />
                        发布
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!canPublish
                      ? "当前登录角色无 pathway.publish 权限，需医务处管理员或被授权的临床专家执行发布。"
                      : status === "PUBLISHED"
                        ? "该版本已发布，无需重复发布。"
                        : status === "DRAFT"
                          ? "草稿版本须先提交审核，通过后方可发布。"
                          : "确认后将记录审批人并立即发布。"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="destructive-outline"
                        size="sm"
                        disabled={retireDisabled}
                        onClick={() => setConfirmAction("retire")}
                      >
                        <Lock className="size-3.5" />
                        停用
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!canRetire
                      ? "当前登录角色无 pathway.retire 权限，无法停用版本。"
                      : "仅已发布版本可停用；停用后不再接受新患者入径。"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 版本规模演化 + 结构变更 */}
            <div className="grid grid-cols-1 gap-3 border-b border-line bg-secondary/15 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_236px]">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11.5px] font-semibold">版本规模演化</p>
                  <span className="font-mono text-[9px] text-muted-foreground">{growthRange}</span>
                </div>
                <GroupedBarChart
                  data={growthData}
                  series={[
                    { key: "nodes", label: "节点", color: "var(--chart-1)" },
                    { key: "edges", label: "连线", color: "var(--chart-4)" },
                  ]}
                  height={132}
                  unit="个"
                  className="mt-0.5"
                />
                <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                  节点 / 连线数量 · 
                </p>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11.5px] font-semibold">结构变更</p>
                  <span className="font-mono text-[9px] text-muted-foreground">V1.3.0 → V1.4.0</span>
                </div>
                {diffSupported ? (
                  <>
                    <HBarChart
                      data={[
                        {
                          label: "新增",
                          value: VERSION_DIFF.added.length,
                          display: `+${VERSION_DIFF.added.length}`,
                          color: "var(--ok)",
                        },
                        {
                          label: "删除",
                          value: VERSION_DIFF.removed.length,
                          display: `−${VERSION_DIFF.removed.length}`,
                          color: "var(--risk)",
                        },
                        {
                          label: "修改",
                          value: VERSION_DIFF.changed.length,
                          display: `${VERSION_DIFF.changed.length}`,
                          color: "var(--warn)",
                        },
                        {
                          label: "规则引用",
                          value: VERSION_DIFF.ruleChanges.length,
                          display: `${VERSION_DIFF.ruleChanges.length}`,
                          color: "var(--info)",
                        },
                      ]}
                      height={124}
                      labelWidth={52}
                      rightPad={34}
                      barSize={9}
                      unit="项"
                      className="mt-0.5"
                    />
                    <p className="text-[9px] leading-relaxed text-muted-foreground/70">
                      差异快照 · 规则引用变更 {VERSION_DIFF.ruleChanges.length} 条
                    </p>
                  </>
                ) : (
                  <div className="mt-1 rounded-md border border-dashed border-line-strong px-2.5 py-6 text-center">
                    <p className="text-[10.5px] font-medium text-muted-foreground">所选版本暂无差异快照</p>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground/70">
                      提交审核与发布时自动生成结构差异
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Tabs defaultValue="overview" className="flex flex-col">
              <TabsList className="px-4">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="diff">
                  差异
                  {diffSupported && (
                    <Badge variant="outline" className="ml-1 font-mono text-[9px]">
                      {VERSION_DIFF.added.length + VERSION_DIFF.removed.length + VERSION_DIFF.changed.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approval">审批</TabsTrigger>
              </TabsList>

              {/* 概览 */}
              <TabsContent value="overview" className="px-4 py-3.5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-line">
                    <div className="border-b border-line px-3 py-2">
                      <p className="text-[12px] font-semibold">版本信息</p>
                    </div>
                    <div className="px-3 py-2">
                      <InfoRow label="版本号" value={<span className="font-mono">{selected.version}</span>} />
                      <InfoRow label="版本 ID" value={<span className="font-mono">{selected.id}</span>} />
                      <InfoRow
                        label="图哈希"
                        value={<span className="font-mono text-[10.5px]">{selected.graphHash}</span>}
                      />
                      <InfoRow label="创建时间" value={fmtDate(selected.createdAt, true)} mono />
                      <InfoRow label="创建人" value={selected.createdBy} />
                      <InfoRow
                        label="生效时间"
                        value={selected.effectiveAt ? fmtDate(selected.effectiveAt, true) : "未生效"}
                        mono={Boolean(selected.effectiveAt)}
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-line">
                    <div className="border-b border-line px-3 py-2">
                      <p className="text-[12px] font-semibold">图规模与校验</p>
                    </div>
                    <div className="px-3 py-2">
                      <InfoRow label="节点数" value={<span className="tabular font-mono">{fmt(selected.nodeCount)}</span>} />
                      <InfoRow label="连线数" value={<span className="tabular font-mono">{fmt(selected.edgeCount)}</span>} />
                      <InfoRow
                        label="校验错误"
                        value={
                          <span className={cn("font-mono", selected.validation.errors > 0 ? "text-risk" : "text-ok")}>
                            {selected.validation.errors}
                          </span>
                        }
                      />
                      <InfoRow
                        label="校验警告"
                        value={
                          <span className={cn("font-mono", selected.validation.warnings > 0 ? "text-warn" : "text-ok")}>
                            {selected.validation.warnings}
                          </span>
                        }
                      />
                      <InfoRow
                        label="校验通过时间"
                        value={
                          selected.validation.passedAt ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-ok" />
                              {fmtDate(selected.validation.passedAt, true)}
                            </span>
                          ) : (
                            <span className="text-warn">尚未通过</span>
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <Callout
                    tone={selected.status === "PUBLISHED" ? "ok" : selected.status === "IN_REVIEW" ? "warn" : "neutral"}
                    title={
                      selected.status === "PUBLISHED"
                        ? "该版本已发布，为不可变记录"
                        : selected.status === "IN_REVIEW"
                          ? "该版本正在审核中"
                          : selected.status === "RETIRED"
                            ? "该版本已停用"
                            : "该版本为工作草稿"
                    }
                  >
                    {selected.status === "PUBLISHED"
                      ? "已发布版本的节点、规则与时间约束均已锁定。若需调整，请创建新版本并重新提交审核，历史执行记录保持可追溯。"
                      : selected.status === "IN_REVIEW"
                        ? "审核期间设计器为只读视图；如需修改请退回后创建新版本，避免审查对象漂移。"
                        : selected.status === "RETIRED"
                          ? "该版本不再接受新患者入径，在径患者仍按其已生成的计划继续执行。"
                          : "草稿版本可自由编辑；提交审核前须通过图结构、规则、时间与证据完备性校验。"}
                  </Callout>
                </div>
              </TabsContent>

              {/* 差异 */}
              <TabsContent value="diff" className="px-4 py-3.5">
                {diffSupported ? (
                  <DiffPanel diff={VERSION_DIFF} />
                ) : (
                  <div className="rounded-md border border-dashed border-line-strong">
                    <EmptyState
                      icon={<GitCompareArrows className="size-4" />}
                      title="该版本暂无差异快照"
                      description={`差异对比基于两个已固化版本生成。当前版本 ${selected.version} 尚未与基线版本生成结构化差异，可在提交审核时自动生成。`}
                      className="py-10"
                    />
                  </div>
                )}
              </TabsContent>

              {/* 审批 */}
              <TabsContent value="approval" className="px-4 py-3.5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-line">
                    <div className="border-b border-line px-3 py-2">
                      <p className="text-[12px] font-semibold">审批记录</p>
                    </div>
                    <div className="px-3 py-2.5">
                      {selected.approval ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[9.5px] font-semibold">
                              {selected.approval.reviewer.slice(-2)}
                            </span>
                            <div>
                              <p className="text-[11.5px] font-medium">{selected.approval.reviewer}</p>
                              <p className="text-[10px] text-muted-foreground">医务处 · 审核人</p>
                            </div>
                            <StatusBadge tone="ok" className="ml-auto">
                              已批准
                            </StatusBadge>
                          </div>
                          <p className="rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[11.5px] leading-relaxed text-foreground/80">
                            {selected.approval.comment}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {fmtDate(selected.approval.reviewedAt, true)}
                          </p>
                        </div>
                      ) : (
                        <div className="py-3">
                          <p className="text-[11.5px] text-muted-foreground">
                            {selected.status === "IN_REVIEW"
                              ? "已提交审核，等待医务处审批。"
                              : "该版本尚无审批记录。"}
                          </p>
                          {selected.status === "IN_REVIEW" && (
                            <div className="mt-2 flex items-center gap-2 text-[10.5px] text-warn">
                              <Clock className="size-3.5" />
                              预计 1 个工作日内完成审核
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-line">
                    <div className="border-b border-line px-3 py-2">
                      <p className="text-[12px] font-semibold">校验结果</p>
                    </div>
                    <div className="space-y-2 px-3 py-2.5">
                      <InfoRow
                        label="图结构 / 规则 / 证据"
                        value={
                          selected.validation.errors === 0 ? (
                            <span className="inline-flex items-center gap-1 text-ok">
                              <CheckCircle2 className="size-3" />
                              通过
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-risk">
                              {selected.validation.errors} 项错误
                            </span>
                          )
                        }
                      />
                      <InfoRow label="警告数" value={<span className="font-mono">{selected.validation.warnings}</span>} />
                      <InfoRow
                        label="通过时间"
                        value={
                          selected.validation.passedAt ? fmtDate(selected.validation.passedAt, true) : "未执行"
                        }
                        mono={Boolean(selected.validation.passedAt)}
                      />
                      <InfoRow label="审核意见" value={selected.approval ? "已归档" : "待补充"} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <Callout
                    tone={selected.status === "PUBLISHED" ? "ok" : "neutral"}
                    title={
                      selected.status === "PUBLISHED" ? "发布不可变声明" : "审批流程说明"
                    }
                  >
                    {selected.status === "PUBLISHED"
                      ? "版本发布后，其图哈希与审批记录一并归档；任何修改都会产生新版本与新哈希，禁止原地覆盖。"
                      : "审批流程：提交审核 → 图结构与规则校验 → 医务处人工审核 → 具备权限角色发布。审核通过后版本状态为「已批准」，发布后为「已发布」。"}
                  </Callout>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      )}

      {/* 创建版本 */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="max-w-[540px]">
          <form onSubmit={form.handleSubmit(onCreateSubmit)}>
            <DialogHeader>
              <DialogTitle>创建新版本</DialogTitle>
              <DialogDescription>
                基于当前版本 {selected?.version ?? "—"} 派生新草稿。创建后可进入设计器修改，再提交审核。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 px-5 py-4">
              <div>
                <Label htmlFor="version-no">
                  版本号 <span className="text-risk">*</span>
                </Label>
                <Input
                  id="version-no"
                  placeholder={`${selected?.version ?? "1.4.0"}`}
                  className="mt-1 font-mono"
                  {...form.register("version")}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">语义化版本，例如 1.5.0 / 2.0.0</p>
                {form.formState.errors.version && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.version.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="version-summary">
                  变更摘要 <span className="text-risk">*</span>
                </Label>
                <Textarea
                  id="version-summary"
                  placeholder="说明本次修订的临床依据、节点/规则变更与影响范围…"
                  className="mt-1 min-h-[88px] text-[12.5px]"
                  {...form.register("changeSummary")}
                />
                {form.formState.errors.changeSummary && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.changeSummary.message}</p>
                )}
              </div>
              <div className="rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                节点数 {selected?.nodeCount ?? 0} · 连线数 {selected?.edgeCount ?? 0} · 基线哈希{" "}
                <span className="font-mono">{selected?.graphHash ?? "—"}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" size="sm">
                <FilePlus2 className="size-3.5" />
                创建草稿版本
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 发布 / 停用确认 */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "publish" ? `确认发布版本 ${selected?.version ?? ""}？` : `确认停用版本 ${selected?.version ?? ""}？`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "publish"
                ? "发布后该版本将立即对新的入径患者生效，并锁定为不可变记录。若需再次修改，须创建新版本并重新审核。"
                : "停用后该版本不再接受新患者入径，在径患者仍按原计划执行；该操作会写入审计日志。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                confirmAction === "retire" ? "bg-destructive text-destructive-foreground hover:bg-destructive/92" : undefined
              }
            >
              {confirmAction === "publish" ? "确认发布" : "确认停用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/70 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-right text-[11.5px] font-medium text-foreground/85", mono && "font-mono text-[10.5px]")}>
        {value}
      </span>
    </div>
  );
}

function DiffPanel({ diff }: { diff: VersionDiff }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        <GitCompareArrows className="size-3.5 text-primary/70" />
        <span>对比基线</span>
        <span className="font-mono text-foreground/80">V{diff.from}</span>
        <span className="text-line-strong">→</span>
        <span className="font-mono text-foreground/80">V{diff.to}</span>
        <span className="ml-auto">节点新增 {diff.added.length} · 删除 {diff.removed.length} · 修改 {diff.changed.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-line">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span className="size-1.5 rounded-full bg-ok" />
            <p className="text-[12px] font-semibold">新增节点</p>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">+{diff.added.length}</span>
          </div>
          <ul className="divide-y divide-line/70">
            {diff.added.map((item) => (
              <DiffNodeRow key={item.nodeKey} nodeKey={item.nodeKey} name={item.name} type={item.type} stage={item.stage} tone="ok" />
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-line">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span className="size-1.5 rounded-full bg-risk" />
            <p className="text-[12px] font-semibold">删除节点</p>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">−{diff.removed.length}</span>
          </div>
          <ul className="divide-y divide-line/70">
            {diff.removed.map((item) => (
              <DiffNodeRow key={item.nodeKey} nodeKey={item.nodeKey} name={item.name} type={item.type} stage={item.stage} tone="risk" />
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-md border border-line">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <span className="size-1.5 rounded-full bg-warn" />
          <p className="text-[12px] font-semibold">修改节点</p>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{diff.changed.length}</span>
        </div>
        <ul className="divide-y divide-line/70">
          {diff.changed.map((item) => (
            <li key={item.nodeKey} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-medium">{item.name}</span>
                <span className="font-mono text-[9.5px] text-muted-foreground">{item.nodeKey}</span>
              </div>
              <div className="mt-1.5 space-y-1">
                {item.changes.map((change) => (
                  <div key={change.field} className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="text-muted-foreground">{change.field}</span>
                    <span className="rounded-[3px] border border-risk/20 bg-risk-wash px-1 py-px font-mono text-[9.5px] text-risk">
                      {change.from}
                    </span>
                    <span className="text-line-strong">→</span>
                    <span className="rounded-[3px] border border-ok/20 bg-ok-wash px-1 py-px font-mono text-[9.5px] text-ok">
                      {change.to}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-line">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <CalendarClock className="size-3.5 text-primary/70" />
          <p className="text-[12px] font-semibold">规则引用变更</p>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{diff.ruleChanges.length}</span>
        </div>
        <div className="overflow-x-auto scrollbar-slim">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-line bg-secondary/30 text-left text-[10px] text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">规则</th>
                <th className="px-3 py-1.5 font-medium">版本变更</th>
                <th className="px-3 py-1.5 font-medium">临床影响</th>
              </tr>
            </thead>
            <tbody>
              {diff.ruleChanges.map((rule) => (
                <tr key={rule.rule} className="border-b border-line/70 last:border-0">
                  <td className="px-3 py-1.5 font-mono text-[10.5px]">{rule.rule}</td>
                  <td className="px-3 py-1.5 font-mono text-[10.5px] text-muted-foreground">
                    {rule.from} → <span className="text-foreground/80">{rule.to}</span>
                  </td>
                  <td className="px-3 py-1.5 text-[10.5px] text-foreground/75">{rule.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Callout tone="warn" title="差异影响需人工复核">
        新增 MDT 前置节点与 ICG 阈值调整将影响手术指征判定与在径患者计划，发布前须由医务处确认影响范围并通知相关科室。
      </Callout>
    </div>
  );
}

function DiffNodeRow({
  nodeKey,
  name,
  type,
  stage,
  tone,
}: {
  nodeKey: string;
  name: string;
  type: string;
  stage: string;
  tone: "ok" | "risk";
}) {
  const meta = NODE_META[type as NodeType];
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-[9px] font-medium text-muted-foreground">
        {meta ? type.slice(0, 2) : "??"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium">{name}</p>
        <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
          {nodeKey} · {stage}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-[10px]",
          tone === "ok" ? "text-ok" : "text-risk line-through decoration-risk/40",
        )}
      >
        {tone === "ok" ? "+1" : "−1"}
      </span>
    </li>
  );
}
