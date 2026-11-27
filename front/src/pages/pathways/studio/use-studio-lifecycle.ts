import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Pathway, ValidationIssue, VersionStatus } from "@/types";
import { getVersions } from "@/data";
import { IS_SERVER_MODE } from "@/lib/data-mode";
import { hccApi } from "@/services/hcc-api";
import { ApiError } from "@/services/http";
import { bumpPatchVersion, studioToBackendGraph } from "@/services/pathway-graph";
import { VERSION_STATUS_META } from "@/lib/clinical";
import type { StudioEdge, StudioNode } from "@/components/pathway/types";

interface LifecycleDeps {
  pathway: Pathway;
  nodes: StudioNode[];
  edges: StudioEdge[];
  issues: ValidationIssue[];
  setIssues: (issues: ValidationIssue[]) => void;
  setDirty: (dirty: boolean) => void;
  errorCount: number;
}

export function useStudioLifecycle({
  pathway,
  nodes,
  edges,
  issues,
  setIssues,
  setDirty,
  errorCount,
}: LifecycleDeps) {
  const versions = useMemo(() => getVersions(pathway.id), [pathway.id]);
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const activeVersion = versions.find((version) => version.id === versionId) ?? versions[0];
  const [versionStatus, setVersionStatus] = useState<VersionStatus>(activeVersion?.status ?? "DRAFT");
  const [validating, setValidating] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [submitBlockedOpen, setSubmitBlockedOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [backendVersionId, setBackendVersionId] = useState<string | null>(null);
  const [backendBusy, setBackendBusy] = useState(false);

  const handleVersionChange = useCallback(
    (nextId: string) => {
      const next = versions.find((version) => version.id === nextId);
      if (!next) return;
      setVersionId(nextId);
      setVersionStatus(next.status);
      setDirty(false);
      toast(`已切换至版本 ${next.version}`, {
        description: `${VERSION_STATUS_META[next.status].label} · 画布加载该版本图快照。`,
      });
    },
    [setDirty, versions],
  );

  const saveDraft = useCallback(async () => {
    if (!IS_SERVER_MODE) {
      setDirty(false);
      toast.success("已保存草稿", {
        description: `${nodes.length} 个节点 · ${edges.length} 条连线 · 版本 ${activeVersion?.version ?? "—"}（Demo 本地）`,
      });
      return;
    }
    if (!hccApi.hasToken()) {
      toast.error("需要后端登录", { description: "Server 模式保存草稿需先登录临床医生/专家账号。" });
      return;
    }
    if (backendBusy) return;
    setBackendBusy(true);
    try {
      const remoteVersions = await hccApi.listPathwayVersions(pathway.id);
      const base = remoteVersions[0];
      if (!base) throw new Error("后端无路径版本可继承规则");
      const nextVersion = bumpPatchVersion(base.version);
      const graphPayload = studioToBackendGraph(
        nodes.map((n) => n.data.node),
        edges.flatMap((e) => (e.data ? [e.data.edge] : [])),
      );
      const created = await hccApi.createPathwayVersion(pathway.id, {
        version: nextVersion,
        graph: graphPayload,
        rules: base.rules,
      });
      setBackendVersionId(created.version_id);
      setVersionStatus("DRAFT");
      setDirty(false);
      toast.success("草稿已写入后端", {
        description: `${created.version_id} · v${created.version} · ${nodes.length} 节点`,
      });
    } catch (error) {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : String(error);
      toast.error("保存失败", { description: message, duration: 5000 });
    } finally {
      setBackendBusy(false);
    }
  }, [activeVersion?.version, backendBusy, edges, nodes, pathway.id, setDirty]);

  const exportJson = useCallback(() => {
    const payload = {
      pathwayId: pathway.id,
      pathwayCode: pathway.code,
      version: activeVersion?.version ?? null,
      exportedAt: new Date().toISOString(),
      clinical_use: false,
      nodes: nodes.map((node) => node.data.node),
      edges: edges.flatMap((edge) => (edge.data ? [edge.data.edge] : [])),
    };
    void navigator.clipboard
      ?.writeText(JSON.stringify(payload, null, 2))
      .then(() => {
        toast.success("已导出路径 JSON", {
          description: `${nodes.length} 个节点 · ${edges.length} 条连线已复制到剪贴板。`,
        });
      })
      .catch(() => {
        toast.error("导出失败", { description: "浏览器未授予剪贴板权限，请检查站点权限。" });
      });
  }, [activeVersion?.version, edges, nodes, pathway.code, pathway.id]);

  const runValidation = useCallback(async () => {
    if (validating || backendBusy) return;
    if (!IS_SERVER_MODE) {
      setValidating(true);
      window.setTimeout(() => {
        setValidating(false);
        setValidationOpen(true);
        const errors = issues.filter((issue) => issue.level === "ERROR").length;
        const warnings = issues.filter((issue) => issue.level === "WARNING").length;
        const infos = issues.filter((issue) => issue.level === "INFO").length;
        if (errors > 0) {
          toast.warning(`校验完成：${errors} 项错误需修复`, {
            description: `${warnings} 项警告 · ${infos} 项提示，详见底部校验面板。`,
          });
        } else {
          toast.success("校验完成：未发现阻断性错误", {
            description:
              warnings > 0
                ? `仍有 ${warnings} 项警告，可提交审核并在审核意见中说明。`
                : "图结构、规则与证据校验均通过。",
          });
        }
      }, 800);
      return;
    }
    if (!backendVersionId) {
      toast.warning("请先保存草稿到后端", { description: "Server 模式校验针对已写入的路径版本。" });
      return;
    }
    setValidating(true);
    try {
      const result = await hccApi.validatePathwayVersion(backendVersionId);
      const mapped: ValidationIssue[] = [
        ...result.errors.map((item, index) => {
          const row = item as { code?: string; message?: string; node_key?: string };
          return {
            id: `BE-ERR-${index}`,
            level: "ERROR" as const,
            category: "GRAPH" as const,
            message: row.message ?? row.code ?? "校验错误",
            nodeKey: row.node_key,
          };
        }),
        ...result.warnings.map((item, index) => {
          const row = item as { code?: string; message?: string; node_key?: string };
          return {
            id: `BE-WARN-${index}`,
            level: "WARNING" as const,
            category: "GRAPH" as const,
            message: row.message ?? row.code ?? "校验警告",
            nodeKey: row.node_key,
          };
        }),
      ];
      setIssues(mapped);
      setValidationOpen(true);
      if (!result.valid) {
        toast.warning(`后端校验未通过：${result.errors.length} 项错误`, {
          description: `${result.warnings.length} 项警告`,
        });
      } else {
        toast.success("后端校验通过", { description: result.content_hash ?? backendVersionId });
      }
    } catch (error) {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : String(error);
      toast.error("校验失败", { description: message });
    } finally {
      setValidating(false);
    }
  }, [backendBusy, backendVersionId, issues, setIssues, validating]);

  const submitForReview = useCallback(() => {
    if (versionStatus === "IN_REVIEW" || versionStatus === "PUBLISHED") return;
    if (errorCount > 0) {
      setValidationOpen(true);
      setSubmitBlockedOpen(true);
      return;
    }
    setSubmitConfirmOpen(true);
  }, [errorCount, versionStatus]);

  const confirmSubmit = useCallback(async () => {
    setSubmitConfirmOpen(false);
    if (!IS_SERVER_MODE) {
      setVersionStatus("IN_REVIEW");
      setDirty(false);
      toast.success("已提交审核", {
        description: `版本 ${activeVersion?.version ?? "—"} 已进入医务处审核队列（Demo 模拟）。`,
      });
      return;
    }
    if (!backendVersionId) {
      toast.warning("请先保存草稿到后端");
      return;
    }
    setBackendBusy(true);
    try {
      const submitted = await hccApi.submitPathwayVersion(backendVersionId);
      setVersionStatus("IN_REVIEW");
      setDirty(false);
      toast.success("已提交后端审核", {
        description: `${submitted.version_id} · 请在审核中心由非提交人处理`,
      });
    } catch (error) {
      const message = error instanceof ApiError ? `${error.code} · ${error.message}` : String(error);
      toast.error("提交失败", { description: message, duration: 5000 });
    } finally {
      setBackendBusy(false);
    }
  }, [activeVersion?.version, backendVersionId, setDirty]);

  const submitDisabled = versionStatus === "IN_REVIEW" || versionStatus === "PUBLISHED";

  return {
    versions,
    versionId,
    activeVersion,
    versionStatus,
    validating,
    validationOpen,
    setValidationOpen,
    submitBlockedOpen,
    setSubmitBlockedOpen,
    submitConfirmOpen,
    setSubmitConfirmOpen,
    backendBusy,
    handleVersionChange,
    saveDraft,
    exportJson,
    runValidation,
    submitForReview,
    confirmSubmit,
    submitDisabled,
  };
}

export type StudioLifecycleApi = ReturnType<typeof useStudioLifecycle>;
