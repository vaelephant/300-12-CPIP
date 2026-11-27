import { Link } from "react-router-dom";
import { useReactFlow } from "@xyflow/react";
import {
  ArrowLeft,
  CircleDot,
  Download,
  Frame,
  History,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { VERSION_STATUS_META } from "@/lib/clinical";
import type { Pathway, PathwayVersion, VersionStatus } from "@/types";
import { IS_SERVER_MODE } from "@/lib/data-mode";
import { SyntheticTag } from "@/components/app/section";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudioEdge, StudioNode } from "@/components/pathway/types";
import { INITIAL_VIEWPORT } from "./graph-utils";

interface StudioToolbarProps {
  pathway: Pathway;
  versions: PathwayVersion[];
  versionId: string;
  versionStatus: VersionStatus;
  dirty: boolean;
  nodeCount: number;
  edgeCount: number;
  errorCount: number;
  validating: boolean;
  backendBusy: boolean;
  submitDisabled: boolean;
  onVersionChange: (id: string) => void;
  onValidate: () => void;
  onSave: () => void;
  onSubmit: () => void;
  onExport: () => void;
}

export function StudioToolbar({
  pathway,
  versions,
  versionId,
  versionStatus,
  dirty,
  nodeCount,
  edgeCount,
  errorCount,
  validating,
  backendBusy,
  submitDisabled,
  onVersionChange,
  onValidate,
  onSave,
  onSubmit,
  onExport,
}: StudioToolbarProps) {
  const { fitView, setViewport } = useReactFlow<StudioNode, StudioEdge>();

  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-card px-3">
      <Button asChild variant="ghost" size="icon-sm" aria-label="返回路径库">
        <Link to="/pathways">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold">{pathway.name}</span>
          <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{pathway.code}</span>
          <SyntheticTag />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground">
          <span>{pathway.departmentName}</span>
          <span className="text-line-strong">·</span>
          <span className="font-mono">
            {nodeCount} 节点 / {edgeCount} 连线
          </span>
          <span className="text-line-strong">·</span>
          <span>负责人 {pathway.ownerName}</span>
        </div>
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        {versions.length > 0 ? (
          <Select value={versionId} onValueChange={onVersionChange}>
            <SelectTrigger size="sm" className="w-[104px] font-mono">
              <SelectValue placeholder="版本" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.id} value={version.id} className="font-mono">
                  {version.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="rounded-md border border-line bg-secondary/40 px-2 py-1 font-mono text-[10.5px] text-muted-foreground">
            {pathway.currentVersion}
          </span>
        )}
        <StatusBadge tone={VERSION_STATUS_META[versionStatus].tone}>
          {VERSION_STATUS_META[versionStatus].label}
        </StatusBadge>
        {dirty && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-[3px] border border-warn/25 bg-warn-wash px-1.5 py-px text-[10px] font-medium text-warn">
            <CircleDot className="size-2.5" />
            未保存
          </span>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fitView({ padding: 0.18, maxZoom: 1, duration: 420 })}
          title="缩放至完整路径图（最大 100%）"
        >
          <Frame className="size-3.5" />
          适应画布
        </Button>
        <Button variant="outline" size="sm" onClick={onValidate} disabled={validating}>
          {validating ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
          {validating ? "校验中…" : "校验"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onSave} disabled={backendBusy}>
          <Save className="size-3.5" />
          {IS_SERVER_MODE ? (backendBusy ? "写入中…" : "保存到后端") : "保存"}
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={submitDisabled}
          title={
            submitDisabled
              ? versionStatus === "PUBLISHED"
                ? "已发布版本不可再次提交审核"
                : "该版本已在审核流程中"
              : errorCount > 0
                ? "存在阻断性错误，需先修复"
                : "提交医务处审核"
          }
        >
          <Send className="size-3.5" />
          提交审核
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="更多操作">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[196px]">
            <DropdownMenuLabel>路径操作</DropdownMenuLabel>
            <DropdownMenuItem onClick={onExport}>
              <Download />
              导出 JSON
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/pathways/${pathway.id}/versions`}>
                <History />
                版本管理
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void fitView({ padding: 0.18, maxZoom: 1, duration: 420 })}>
              <Frame />
              适应画布
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void setViewport(INITIAL_VIEWPORT, { duration: 400 })}>
              <RefreshCw />
              恢复初始视图
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
