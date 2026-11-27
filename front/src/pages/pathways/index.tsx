import { IS_SERVER_MODE } from "@/lib/data-mode";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileJson2,
  MoreHorizontal,
  Plus,
  Rows2,
  Rows3,
  Search,
  Send,
  Upload,
} from "lucide-react";
import { cn, fmt, fmtDate, relTime } from "@/lib/utils";
import { PATHWAY_STATUS_META } from "@/lib/clinical";
import type { Pathway, PathwayStatus } from "@/types";
import { DEPARTMENTS, LAST_SYNC, PATHWAYS } from "@/data";
import { useSessionStore } from "@/stores/session-store";
import ServerPathwaysPage from "./index-server";
import { useStudioStore } from "@/stores/studio-store";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { EmptyState, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { FilterPill, SearchInput } from "@/components/app/toolbar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_TABS: { key: "ALL" | PathwayStatus; label: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "PUBLISHED", label: "已发布" },
  { key: "IN_REVIEW", label: "审核中" },
  { key: "DRAFT", label: "草稿" },
  { key: "RETIRED", label: "已停用" },
];

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "路径编码至少 3 个字符")
    .regex(/^[A-Z0-9_]+$/, "仅支持大写字母、数字与下划线"),
  name: z.string().trim().min(2, "请输入路径名称"),
  diseaseName: z.string().trim().min(1, "请输入疾病名称"),
  diseaseCode: z.string().trim().min(1, "请输入疾病编码（ICD-10）"),
  departmentId: z.string().min(1, "请选择所属科室"),
  description: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

const SAMPLE_IMPORT_JSON = `{
  "code": "HCC_FOLLOWUP_007",
  "name": "肝癌术后随访管理路径",
  "diseaseCode": "C22.0",
  "diseaseCodeSystem": "ICD-10",
  "diseaseName": "肝细胞癌",
  "departmentId": "dept-hpb",
  "description": "肝癌根治性治疗后 5 年随访路径（导入示例）。",
  "tags": ["导入", "随访"]
}`;

function pathwayIdSuffix() {
  return `${Date.now()}`.slice(-6);
}

function DemoPathwaysPage() {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const customPathways = useStudioStore((state) => state.customPathways);
  const addCustomPathway = useStudioStore((state) => state.addPathway);
  const [pathways, setPathways] = useState<Pathway[]>(() => {
    const fixtureIds = new Set(PATHWAYS.map((pathway) => pathway.id));
    return [...customPathways.filter((pathway) => !fixtureIds.has(pathway.id)), ...PATHWAYS];
  });
  const [tab, setTab] = useState<"ALL" | PathwayStatus>("ALL");
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [dense, setDense] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState(SAMPLE_IMPORT_JSON);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      code: "",
      name: "",
      diseaseName: "",
      diseaseCode: "",
      departmentId: "dept-hpb",
      description: "",
    },
  });

  const counts = useMemo(() => {
    const base = { ALL: pathways.length, PUBLISHED: 0, IN_REVIEW: 0, DRAFT: 0, RETIRED: 0 };
    pathways.forEach((pathway) => {
      base[pathway.status] += 1;
    });
    return base;
  }, [pathways]);

  const inPathwayPatients = useMemo(
    () => pathways.reduce((total, pathway) => total + pathway.instanceCount, 0),
    [pathways],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return pathways.filter((pathway) => {
      if (tab !== "ALL" && pathway.status !== tab) return false;
      if (departmentId !== "ALL" && pathway.departmentId !== departmentId) return false;
      if (!keyword) return true;
      return [pathway.name, pathway.code, pathway.diseaseName, pathway.diseaseCode, pathway.ownerName]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [departmentId, pathways, query, tab]);

  const resetFilters = () => {
    setTab("ALL");
    setQuery("");
    setDepartmentId("ALL");
  };

  const onCreateSubmit = (values: CreateValues) => {
    if (pathways.some((pathway) => pathway.code === values.code)) {
      form.setError("code", { message: "该路径编码已存在，请更换" });
      return;
    }
    const department = DEPARTMENTS.find((item) => item.id === values.departmentId);
    const now = new Date().toISOString();
    const suffix = pathwayIdSuffix();
    const created: Pathway = {
      id: `PW-NEW-${suffix}`,
      code: values.code,
      name: values.name,
      diseaseCode: values.diseaseCode,
      diseaseCodeSystem: "ICD-10",
      diseaseName: values.diseaseName,
      departmentId: values.departmentId,
      departmentName: department?.name ?? "未分配科室",
      description: values.description?.trim() || "新建路径模板，尚未配置节点与规则。",
      status: "DRAFT",
      currentVersion: "0.1.0",
      versionId: `PV-NEW-${suffix}`,
      updatedAt: now,
      createdAt: now,
      ownerName: user?.name ?? "张启明",
      instanceCount: 0,
      tags: ["新建"],
      clinicalUse: false,
      evidenceRefs: [],
    };
    setPathways((current) => [created, ...current]);
    addCustomPathway(created);
    setCreateOpen(false);
    form.reset();
    setTab("ALL");
    setQuery("");
    toast.success(`已创建路径「${created.name}」`, {
      description: `编码 ${created.code} · 当前为草稿状态，可在设计器中配置节点与规则。`,
      action: {
        label: "打开设计器",
        onClick: () => navigate(`/pathways/${created.id}/studio`),
      },
    });
  };

  const onImport = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch (error) {
      toast.error("JSON 解析失败", {
        description: error instanceof Error ? error.message : "请检查 JSON 语法是否正确。",
      });
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      toast.error("JSON 结构不合法", { description: "顶层必须为对象，字段定义见编辑框上方示例。" });
      return;
    }
    const raw = parsed as Record<string, unknown>;
    const requiredFields: { key: string; label: string }[] = [
      { key: "code", label: "code" },
      { key: "name", label: "name" },
      { key: "diseaseCode", label: "diseaseCode" },
      { key: "diseaseName", label: "diseaseName" },
      { key: "departmentId", label: "departmentId" },
    ];
    const missing = requiredFields.filter(
      (field) => typeof raw[field.key] !== "string" || (raw[field.key] as string).trim() === "",
    );
    if (missing.length > 0) {
      toast.error("缺少必填字段", { description: `请补充：${missing.map((field) => field.label).join("、")}` });
      return;
    }
    const code = String(raw.code).trim();
    if (pathways.some((pathway) => pathway.code === code)) {
      toast.error("路径编码重复", { description: `编码 ${code} 已存在于路径库，请修改后重新导入。` });
      return;
    }
    const department = DEPARTMENTS.find((item) => item.id === raw.departmentId);
    if (!department) {
      toast.error("科室无效", {
        description: `departmentId「${String(raw.departmentId)}」不在肝癌中心组织列表中，请使用 dept-hpb。`,
      });
      return;
    }
    const now = new Date().toISOString();
    const suffix = pathwayIdSuffix();
    const imported: Pathway = {
      id: `PW-IMP-${suffix}`,
      code,
      name: String(raw.name).trim(),
      diseaseCode: String(raw.diseaseCode).trim(),
      diseaseCodeSystem: typeof raw.diseaseCodeSystem === "string" ? raw.diseaseCodeSystem : "ICD-10",
      diseaseName: String(raw.diseaseName).trim(),
      departmentId: department.id,
      departmentName: department.name,
      description:
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim()
          : "通过 JSON 导入的路径模板，尚待配置节点与规则。",
      status: "DRAFT",
      currentVersion: "0.1.0",
      versionId: `PV-IMP-${suffix}`,
      updatedAt: now,
      createdAt: now,
      ownerName: user?.name ?? "张启明",
      instanceCount: 0,
      tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags.map(String) : ["导入"],
      clinicalUse: false,
      evidenceRefs: [],
    };
    setPathways((current) => [imported, ...current]);
    addCustomPathway(imported);
    setImportOpen(false);
    setTab("ALL");
    setQuery("");
    toast.success(`已导入路径「${imported.name}」`, {
      description: `编码 ${imported.code} · 解析成功，已置为草稿状态。`,
    });
  };

  const exportPathway = (pathway: Pathway) => {
    toast.success(`已导出「${pathway.name}」JSON`, {
      description: `包含 ${pathway.currentVersion} 版本元数据与图摘要。`,
    });
  };

  const copyCode = (pathway: Pathway) => {
    void navigator.clipboard?.writeText(pathway.code).then(
      () => toast.success("路径编码已复制", { description: pathway.code }),
      () => toast.error("复制失败", { description: "浏览器未授予剪贴板权限。" }),
    );
  };

  const submitForReview = (pathway: Pathway) => {
    if (pathway.status !== "DRAFT") {
      toast.info("当前状态不可提交审核", {
        description: `「${pathway.name}」当前为${PATHWAY_STATUS_META[pathway.status].label}状态，仅草稿可提交。`,
      });
      return;
    }
    setPathways((current) =>
      current.map((item) =>
        item.id === pathway.id ? { ...item, status: "IN_REVIEW", updatedAt: new Date().toISOString() } : item,
      ),
    );
    toast.success("已提交审核", {
      description: `「${pathway.name}」已进入医务处审核队列（模拟），可在审核中心跟踪进度。`,
    });
  };

  const retirePathway = (pathway: Pathway) => {
    if (pathway.status !== "PUBLISHED") {
      toast.info("仅已发布路径可停用", {
        description: `「${pathway.name}」当前为${PATHWAY_STATUS_META[pathway.status].label}状态。`,
      });
      return;
    }
    setPathways((current) =>
      current.map((item) =>
        item.id === pathway.id ? { ...item, status: "RETIRED", updatedAt: new Date().toISOString() } : item,
      ),
    );
    toast.success("路径已停用", {
      description: `「${pathway.name}」将不再接受新患者入径，在径患者继续执行（模拟）。`,
    });
  };

  return (
    <Page>
      <PageHeader
        module="M03 · 路径设计"
        title="路径库"
        meta={
          <>
            <PageMeta label="数据范围" value="全院 · M03" />
            <PageMeta label="最近同步" value={fmtDate(LAST_SYNC, true)} mono />
            <SyntheticTag />
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="size-3.5" />
              导入 JSON
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              新建路径
            </Button>
          </>
        }
      />

      {/* KPI */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="路径模板"
          value={fmt(pathways.length)}
          unit="个"
          trend={[4, 4, 5, 5, 6, 6]}
          hint="全院可复用的临床路径模板总数，含草稿与停用模板。"
          footer={`原发肝癌单病种 · ${pathways.length} 个路径模板 · 6 个月新增 2 个`}
        />
        <StatCard
          label="已发布"
          value={fmt(counts.PUBLISHED)}
          unit="个"
          trend={[2, 2, 3, 3, 3, 3]}
          hint="已发布版本可被新入径患者引用；已发布版本不可编辑。"
          footer={`发布率 ${pathways.length === 0 ? "不可计算" : `${((counts.PUBLISHED / pathways.length) * 100).toFixed(0)}%`}`}
        />
        <StatCard
          label="审核中"
          value={fmt(counts.IN_REVIEW)}
          unit="个"
          trend={[0, 1, 0, 1, 2, 1]}
          tone="neutral"
          hint="已提交医务处、等待审核的路径版本数量。"
          footer={
            counts.IN_REVIEW > 0 ? (
              <Link to="/approvals" className="inline-flex items-center gap-0.5 text-info hover:underline">
                前往审核中心
                <ChevronRight className="size-3" />
              </Link>
            ) : (
              "暂无待审核版本"
            )
          }
        />
        <StatCard
          label="在径患者"
          value={fmt(inPathwayPatients)}
          unit="例"
          trend={[62, 68, 74, 81, 88, 100]}
          hint="当前基于这些路径模板执行中的患者实例总数。"
          footer="较上月 +13.6%"
        />
      </div>

      {/* 过滤 + 表格 */}
      <div className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((item) => (
              <FilterPill
                key={item.key}
                active={tab === item.key}
                count={counts[item.key]}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </FilterPill>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="搜索路径名称 / 编码 / 疾病…"
              className="w-[248px]"
            />
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger size="sm" className="w-[132px]">
                <SelectValue placeholder="全部科室" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部科室</SelectItem>
                {DEPARTMENTS.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-md border border-line bg-card p-0.5">
              <button
                type="button"
                onClick={() => setDense(false)}
                title="标准行高"
                className={cn(
                  "flex size-6 items-center justify-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30",
                  !dense ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Rows3 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDense(true)}
                title="紧凑行高"
                className={cn(
                  "flex size-6 items-center justify-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30",
                  dense ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Rows2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px]">路径名称</TableHead>
              <TableHead>疾病 / 编码</TableHead>
              <TableHead>科室 / 负责人</TableHead>
              <TableHead>当前版本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">在径例数</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={<Search className="size-4" />}
                    title="没有匹配的路径模板"
                    action={
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        清除筛选条件
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((pathway) => (
                <TableRow key={pathway.id} className={cn(dense && "[&>td]:h-9")}>
                  <TableCell className="max-w-[300px]">
                    <div className="flex flex-col gap-0.5 py-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/pathways/${pathway.id}/studio`}
                          className="truncate text-[12.5px] font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                        >
                          {pathway.name}
                        </Link>
                        {pathway.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="shrink-0 rounded-[3px] border border-line bg-secondary/60 px-1 py-px text-[9.5px] whitespace-nowrap text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{pathway.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 py-1">
                      <span className="text-[12px] text-foreground/85">{pathway.diseaseName}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {pathway.diseaseCodeSystem} · {pathway.diseaseCode}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 py-1">
                      <span className="text-[12px] text-foreground/85">{pathway.departmentName}</span>
                      <span className="text-[10.5px] text-muted-foreground">负责人 {pathway.ownerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/pathways/${pathway.id}/versions`}
                      className="group inline-flex items-center gap-1 font-mono text-[11.5px] text-foreground/85 underline-offset-2 hover:text-primary hover:underline"
                      title="查看版本记录"
                    >
                      {pathway.currentVersion}
                      <ExternalLink className="size-3 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={PATHWAY_STATUS_META[pathway.status].tone}>
                      {PATHWAY_STATUS_META[pathway.status].label}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular font-mono text-[12px]">{fmt(pathway.instanceCount)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 py-1">
                      <span className="tabular text-[11.5px] text-foreground/80">{fmtDate(pathway.updatedAt)}</span>
                      <span className="text-[10px] text-muted-foreground">{relTime(pathway.updatedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="xs">
                        <Link to={`/pathways/${pathway.id}/studio`}>设计</Link>
                      </Button>
                      <Button asChild variant="ghost" size="xs">
                        <Link to={`/pathways/${pathway.id}/versions`}>版本</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`更多操作：${pathway.name}`}>
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[188px]">
                          <DropdownMenuLabel>{pathway.code}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => copyCode(pathway)}>
                            <Copy />
                            复制路径编码
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportPathway(pathway)}>
                            <Download />
                            导出路径 JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => submitForReview(pathway)}>
                            <Send />
                            提交审核
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => retirePathway(pathway)}>
                            <FileJson2 />
                            停用路径
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-[10.5px] text-muted-foreground">
          <span>
            显示 <span className="tabular font-mono text-foreground/80">{filtered.length}</span> /{" "}
            <span className="tabular font-mono">{pathways.length}</span> 条路径模板
          </span>
          <span>图结构版本由修订单管理，发布后不可回改</span>
        </div>
      </div>

      {/* 新建路径 */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="max-w-[600px]">
          <form onSubmit={form.handleSubmit(onCreateSubmit)}>
            <DialogHeader>
              <DialogTitle>新建路径模板</DialogTitle>
              <DialogDescription>
                创建一个草稿路径模板。创建后可在设计器中配置节点、规则与时间约束，提交审核后方可发布。
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 px-5 py-4">
              <div className="col-span-2">
                <Label htmlFor="pw-name">
                  路径名称 <span className="text-risk">*</span>
                </Label>
                <Input id="pw-name" placeholder="例如：肝癌手术临床路径" className="mt-1" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pw-code">
                  路径编码 <span className="text-risk">*</span>
                </Label>
                <Input
                  id="pw-code"
                  placeholder="HCC_NEW_007"
                  className="mt-1 font-mono uppercase"
                  {...form.register("code")}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">大写字母、数字与下划线</p>
                {form.formState.errors.code && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pw-disease-code">
                  疾病编码 <span className="text-risk">*</span>
                </Label>
                <Input
                  id="pw-disease-code"
                  placeholder="C22.0"
                  className="mt-1 font-mono uppercase"
                  {...form.register("diseaseCode")}
                />
                {form.formState.errors.diseaseCode && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.diseaseCode.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pw-disease-name">
                  疾病名称 <span className="text-risk">*</span>
                </Label>
                <Input id="pw-disease-name" placeholder="肝细胞癌" className="mt-1" {...form.register("diseaseName")} />
                {form.formState.errors.diseaseName && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.diseaseName.message}</p>
                )}
              </div>
              <div>
                <Label>
                  所属科室 <span className="text-risk">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择科室" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.filter((department) => department.type !== "SUPPORT").map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.departmentId && (
                  <p className="mt-1 text-[10.5px] text-risk">{form.formState.errors.departmentId.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label htmlFor="pw-description">路径说明</Label>
                <Textarea
                  id="pw-description"
                  placeholder="描述路径适用人群、覆盖阶段与关键节点…"
                  className="mt-1 min-h-[76px] text-[12.5px]"
                  {...form.register("description")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" size="sm">
                <Plus className="size-3.5" />
                创建草稿路径
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 导入 JSON */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>导入路径 JSON</DialogTitle>
            <DialogDescription>
              支持按路径模板 Schema 批量导入。解析成功后将作为草稿加入路径库，需人工复核后提交审核。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 px-5 py-4">
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-secondary/40 px-2.5 py-2 text-[10.5px] text-muted-foreground">
              <span className="label-micro">必填字段</span>
              {["code", "name", "diseaseCode", "diseaseName", "departmentId"].map((field) => (
                <span key={field} className="rounded-[3px] border border-line bg-card px-1 py-px font-mono text-[9.5px]">
                  {field}
                </span>
              ))}
              <span className="ml-auto">可选：description / tags / diseaseCodeSystem</span>
            </div>
            <Label htmlFor="import-json">路径 JSON</Label>
            <Textarea
              id="import-json"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              spellCheck={false}
              className="min-h-[220px] font-mono text-[11px] leading-relaxed"
            />
            <p className="text-[10.5px] text-muted-foreground">
              当前示例中包含 1 个路径模板；导入不会覆盖已有路径，编码重复时将被拒绝。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportText(SAMPLE_IMPORT_JSON)}>
              恢复示例
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={onImport}>
              <Upload className="size-3.5" />
              解析并导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}


export default function PathwaysPage() {
  if (IS_SERVER_MODE) return <ServerPathwaysPage />;
  return <DemoPathwaysPage />;
}
