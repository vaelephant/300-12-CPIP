import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Database, GitBranch, Search, ShieldCheck } from "lucide-react";
import type { BackendPathwayOverview, BackendPathwayVersion } from "@/services/types";
import { hccApi } from "@/services/hcc-api";
import { fmtDate, fmt, cn } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/app/toolbar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBackendPathwayOverview } from "@/queries/backend";

const STATUS_TABS = ["ALL", "PUBLISHED", "IN_REVIEW", "DRAFT", "RETIRED"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "已发布",
  IN_REVIEW: "审核中",
  DRAFT: "草稿",
  RETIRED: "已停用",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral" | "info"> = {
  PUBLISHED: "ok",
  IN_REVIEW: "warn",
  DRAFT: "neutral",
  RETIRED: "neutral",
};

function VersionDetail({ templateId }: { templateId: string }) {
  const query = useQuery<BackendPathwayVersion[]>({
    queryKey: ["backend", "pathway-versions", templateId],
    queryFn: () => hccApi.listPathwayVersions(templateId),
    enabled: Boolean(templateId),
    retry: 0,
  });
  const version = query.data?.[0];
  if (query.isLoading) return <p className="text-[11px] text-muted-foreground">读取版本…</p>;
  if (!version) return <p className="text-[11px] text-muted-foreground">无版本数据</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[9px]">{version.version_id}</Badge>
        <span className="text-[11.5px] font-medium">v{version.version}</span>
        <StatusBadge tone={STATUS_TONE[version.status] ?? "neutral"}>{STATUS_LABEL[version.status] ?? version.status}</StatusBadge>
        <Badge variant="outline" className="font-mono text-[8.5px]">{version.content_hash.slice(0, 20)}…</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-line px-2.5 py-2">
          <p className="label-micro">节点</p>
          <p className="mt-1 font-mono text-[13px]">{version.graph.nodes.length}</p>
        </div>
        <div className="rounded-md border border-line px-2.5 py-2">
          <p className="label-micro">连线</p>
          <p className="mt-1 font-mono text-[13px]">{version.graph.edges.length}</p>
        </div>
        <div className="rounded-md border border-line px-2.5 py-2">
          <p className="label-micro">规则</p>
          <p className="mt-1 font-mono text-[13px]">{version.rules.length}</p>
        </div>
      </div>
      <div>
        <p className="label-micro mb-1">节点序列</p>
        <div className="flex flex-wrap gap-1">
          {version.graph.nodes.map((node) => (
            <Badge key={String(node.node_key)} variant="secondary" className="font-mono text-[8.5px]">
              {String(node.node_key)} · {String(node.type)}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="label-micro mb-1">规则绑定</p>
        <div className="flex flex-wrap gap-1">
          {version.rules.map((rule, index) => (
            <Badge key={index} variant="outline" className="font-mono text-[8.5px]">
              {String(rule.rule_id)}@{String(rule.version)} · {String(rule.binding)}
            </Badge>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-line bg-secondary/25 px-3 py-2">
        <p className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          校验：{version.validation.passed === false ? "存在阻断错误" : "结构/规则/证据通过"}
          {version.validation.errors?.length ? ` · ${version.validation.errors.length} errors` : ""}
          {version.validation.warnings?.length ? ` · ${version.validation.warnings.length} warnings` : ""}
        </p>
      </div>
      <p className="text-[9.5px] leading-relaxed text-muted-foreground">
        这是后端只读版本；设计器/版本对比/发布审批页面尚未迁移，不能在此修改。
      </p>
    </div>
  );
}

export default function ServerPathwaysPage() {
  const query = useBackendPathwayOverview();
  const [status, setStatus] = useState<StatusTab>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BackendPathwayOverview | null>(null);

  const items = query.data?.items ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = status === "ALL" || item.status === status;
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.template_id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, status]);
  const counts = useMemo(() => ({
    total: items.length,
    published: items.filter((item) => item.status === "PUBLISHED").length,
    review: items.filter((item) => item.status === "IN_REVIEW").length,
    instances: items.reduce((sum, item) => sum + item.instance_count, 0),
  }), [items]);

  if (!hccApi.hasToken()) {
    return (
      <Page>
        <EmptyState icon={<Database />} title="需要后端登录" description="请从登录页使用 server 模式重新登录。" />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        module="M03 · 路径设计 · 后端只读视图"
        title="路径库"
        description="数据来自 FastAPI /alembic seed；当前为只读聚合视图，设计器与版本审批页面仍为 demo。"
        actions={<SyntheticTag />}
        meta={
          <>
            <PageMeta label="路径模板" value={`${fmt(counts.total)} 个`} mono />
            <PageMeta label="数据源" value="FastAPI · SQLite" mono />
            <PageMeta label="最近同步" value={new Date().toLocaleTimeString("zh-CN", { hour12: false })} />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "路径模板", value: counts.total, icon: BookOpenCheck },
          { label: "已发布", value: counts.published, icon: ShieldCheck },
          { label: "审核中", value: counts.review, icon: GitBranch },
          { label: "在径实例", value: counts.instances, icon: Database },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-wide text-muted-foreground">{item.label}</p>
              <item.icon className="size-3.5 text-muted-foreground/60" />
            </div>
            <p className="mt-1 font-mono text-[22px] font-medium">{fmt(item.value)}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((key) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] transition-colors",
                  status === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "ALL" ? "全部" : STATUS_LABEL[key]}
              </button>
            ))}
          </div>
          <div className="ml-auto w-[260px] max-w-full">
            <SearchInput value={search} onChange={setSearch} placeholder="搜索路径名称 / 编码…" />
          </div>
        </div>
        {query.isLoading ? (
          <p className="py-12 text-center text-[11px] text-muted-foreground">读取后端路径库…</p>
        ) : filtered.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>路径名称</TableHead>
                <TableHead>病种</TableHead>
                <TableHead>科室</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">节点</TableHead>
                <TableHead className="text-right">在径</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>更新时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.template_id} className="cursor-pointer" onClick={() => setSelected(item)}>
                  <TableCell>
                    <p className="text-[11.5px] font-medium">{item.name}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">{item.template_id} · {item.version_count} 个版本</p>
                  </TableCell>
                  <TableCell className="font-mono text-[10px]">{item.disease_code}</TableCell>
                  <TableCell className="text-[10.5px]">{item.department_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[10px]">v{item.current_version}</TableCell>
                  <TableCell><StatusBadge tone={STATUS_TONE[item.status ?? ""] ?? "neutral"}>{STATUS_LABEL[item.status ?? ""] ?? item.status}</StatusBadge></TableCell>
                  <TableCell className="text-right font-mono text-[10px]">{item.node_count}</TableCell>
                  <TableCell className="text-right font-mono text-[10px]">{item.instance_count}</TableCell>
                  <TableCell className="text-[10.5px]">{item.owner_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[9.5px] text-muted-foreground">{item.updated_at ? fmtDate(item.updated_at, true) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12">
            <EmptyState icon={<Search />} title="没有匹配的路径" description="调整状态筛选或搜索词。" />
          </div>
        )}
      </Card>

      <Callout tone="neutral" title="只读联调视图" className="mt-3">
        路径创建、设计器保存、版本 diff 与审批发布仍使用 demo 页面；本页仅验证后端路径库聚合 API 与权限范围。
      </Callout>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-[820px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.template_id} · 当前发布版本 v{selected?.current_version} · 只读后端数据
            </DialogDescription>
          </DialogHeader>
          {selected ? <VersionDetail templateId={selected.template_id} /> : null}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
