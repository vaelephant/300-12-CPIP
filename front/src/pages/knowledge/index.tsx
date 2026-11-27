import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Beaker,
  CheckCircle2,
  ClipboardCheck,
  CloudDownload,
  Database,
  Download,
  FileInput,
  FlaskConical,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  SearchX,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { Callout, EmptyState, Field, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { DonutChart } from "@/components/charts/advanced";
import { SearchInput, Toolbar } from "@/components/app/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EVIDENCE_GRADE_MIX } from "@/data/visuals";
import {
  KNOWLEDGE_DOCS,
  EVIDENCE_ITEMS,
  CLINICAL_RULES,
  ADAPTER_STATUS,
  PATHWAYS,
  LAST_SYNC,
} from "@/data";
import type { ClinicalRule, EvidenceItem, KnowledgeDoc } from "@/types";
import type { Tone } from "@/lib/clinical";
import { cn, fmtDate, fmtTime, relTime } from "@/lib/utils";

/* ===========================================================================
 * M02 · 知识库
 * 指南 / 专家共识 / 国家路径 / 院内规范 / 临床规则 / 医学术语 / 证据条目
 * 外部知识更新不会自动修改已发布路径；规则三态：TRUE / FALSE / UNKNOWN。
 * ========================================================================= */

const DOC_TYPE_LABEL: Record<KnowledgeDoc["type"], string> = {
  GUIDELINE: "指南",
  CONSENSUS: "专家共识",
  NATIONAL_PATHWAY: "国家路径",
  HOSPITAL_STANDARD: "院内规范",
  CLINICAL_RULE: "临床规则",
  TERMINOLOGY: "医学术语",
};

const DOC_STATUS_META: Record<KnowledgeDoc["status"], { label: string; tone: Tone }> = {
  DRAFT: { label: "草稿", tone: "neutral" },
  IN_REVIEW: { label: "待审核", tone: "warn" },
  PUBLISHED: { label: "已发布", tone: "ok" },
  SUPERSEDED: { label: "已被取代", tone: "neutral" },
};

const RULE_TYPE_LABEL: Record<ClinicalRule["type"], string> = {
  ADMISSION: "准入",
  EXCLUSION: "排除",
  COMPLETION: "完成",
  BRANCH: "分支",
  SAFETY: "安全",
  VARIATION: "变异",
  EXIT: "退出",
};

const RULE_STATUS_META: Record<ClinicalRule["status"], { label: string; tone: Tone }> = {
  DRAFT: { label: "草稿", tone: "neutral" },
  IN_REVIEW: { label: "待审核", tone: "warn" },
  PUBLISHED: { label: "已发布", tone: "ok" },
};

const EVIDENCE_SOURCE_LABEL: Record<EvidenceItem["sourceType"], string> = {
  GUIDELINE: "指南",
  CONSENSUS: "专家共识",
  NATIONAL_PATHWAY: "国家临床路径",
  HOSPITAL_STANDARD: "院内规范",
  LITERATURE: "文献",
};

const EVIDENCE_SOURCE_ORDER: EvidenceItem["sourceType"][] = [
  "GUIDELINE",
  "CONSENSUS",
  "NATIONAL_PATHWAY",
  "HOSPITAL_STANDARD",
  "LITERATURE",
];

const DOC_TYPE_PREFIX: Record<KnowledgeDoc["type"], string> = {
  GUIDELINE: "GL",
  CONSENSUS: "CS",
  NATIONAL_PATHWAY: "NP",
  HOSPITAL_STANDARD: "HS",
  CLINICAL_RULE: "CR",
  TERMINOLOGY: "TR",
};

type TabKey =
  | "ALL"
  | "GUIDELINE"
  | "CONSENSUS"
  | "NATIONAL_PATHWAY"
  | "HOSPITAL_STANDARD"
  | "CLINICAL_RULE"
  | "TERMINOLOGY"
  | "EVIDENCE";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "GUIDELINE", label: "指南" },
  { key: "CONSENSUS", label: "专家共识" },
  { key: "NATIONAL_PATHWAY", label: "国家路径" },
  { key: "HOSPITAL_STANDARD", label: "院内规范" },
  { key: "CLINICAL_RULE", label: "临床规则" },
  { key: "TERMINOLOGY", label: "医学术语" },
  { key: "EVIDENCE", label: "证据条目" },
];

/* --------------------------- 证据关联（确定性） --------------------------- */

const EVIDENCE_KEYWORDS = ["肝癌", "肝切除", "消融", "TACE", "转化治疗", "ERAS", "VTE", "MDT", "围手术期"];

function relatedEvidence(doc: KnowledgeDoc): EvidenceItem[] {
  const hay = `${doc.title} ${doc.summary}`;
  const keywords = EVIDENCE_KEYWORDS.filter((k) => hay.includes(k));
  if (keywords.length === 0) return [];
  return EVIDENCE_ITEMS.filter((e) => {
    const target = `${e.title} ${e.summary} ${e.source}`;
    return keywords.some((k) => target.includes(k));
  });
}

/* -------------------------------- 规则 DSL -------------------------------- */

function buildRuleDsl(rule: ClinicalRule): string {
  const base = {
    ruleId: rule.code,
    version: rule.version,
    type: rule.type,
    onMissingField: "UNKNOWN" as const,
  };

  const expressions: Record<string, Record<string, unknown>> = {
    HCC_ADMISSION: {
      when: {
        all: [
          { field: "diagnosis.code", operator: "eq", value: "C22.0" },
          { field: "liver.childPughGrade", operator: "in", value: ["A", "B"] },
          { field: "surgery.resectable", operator: "eq", value: true },
          { field: "tumor.metastasis", operator: "eq", value: false },
        ],
      },
      then: { result: "TRUE", action: "ENROLL" },
      else: { result: "FALSE" },
    },
    HCC_EXCLUSION: {
      when: {
        any: [
          { field: "liver.childPughGrade", operator: "eq", value: "C" },
          { field: "liver.ascites", operator: "eq", value: "refractory" },
          { field: "neuro.encephalopathyGrade", operator: "gte", value: 2 },
        ],
      },
      then: { result: "TRUE", action: "EXCLUDE" },
      else: { result: "FALSE" },
    },
    HCC_COAG_SAFETY: {
      when: {
        any: [
          { field: "coag.inr", operator: "gt", value: 1.5 },
          { field: "coag.platelet", operator: "lt", value: 50 },
        ],
      },
      then: { result: "TRUE", action: "BLOCK_TASKS", taskScopes: ["surgery", "anesthesia"] },
      else: { result: "FALSE" },
    },
    HCC_ICG_BRANCH: {
      when: {
        all: [{ field: "liver.icgR15", operator: "exists", value: true }],
      },
      branch: [
        { condition: { field: "liver.icgR15", operator: "lte", value: 15 }, target: "SURGERY" },
        { condition: { field: "liver.icgR15", operator: "gt", value: 15 }, target: "CONVERSION_THERAPY" },
      ],
      else: { result: "UNKNOWN", reason: "ICG R15 缺失" },
    },
    HCC_ABLATION_ADMISSION: {
      when: {
        all: [
          { field: "imaging.lesionMaxMm", operator: "lte", value: 30 },
          { field: "liver.childPugh", operator: "in", value: ["A", "B"] },
          { field: "imaging.extrahepaticMetastasis", operator: "eq", value: false },
        ],
      },
      then: { result: "TRUE", action: "ENROLL" },
      else: { result: "FALSE" },
    },
    HCC_CONVERSION_SAFETY: {
      when: {
        any: [
          { field: "liver.childPugh", operator: "eq", value: "C" },
          { field: "liver.refractoryAscites", operator: "eq", value: true },
        ],
      },
      then: { result: "TRUE", action: "BLOCK_SURGERY" },
      else: { result: "FALSE" },
    },
  };

  return JSON.stringify({ ...base, ...(expressions[rule.code] ?? { when: { all: [] }, then: { result: "TRUE" } }) }, null, 2);
}

/* ---------------------------- 规则测试（确定性） ---------------------------- */

interface RuleTestResult {
  result: "TRUE" | "FALSE" | "UNKNOWN";
  missing: string[];
  note: string;
}

const RULE_TEST_FIXTURES: Record<string, RuleTestResult> = {
  HCC_ADMISSION: { result: "TRUE", missing: [], note: "诊断 C22.0、Child-Pugh A 级、可切除、无远处转移，全部条件满足。" },
  HCC_EXCLUSION: { result: "FALSE", missing: [], note: "无 Child-Pugh C 级、难治性腹水或肝性脑病记录，排除规则不成立。" },
  HCC_PREOP_COMPLETE: { result: "UNKNOWN", missing: ["nutrition.nrs2002"], note: "NRS 2002 结果缺失，按 UNKNOWN 处理，不视为未完成。" },
  HCC_ICG_BRANCH: { result: "TRUE", missing: [], note: "ICG R15 = 12.4% ≤ 15%，进入手术分支。" },
  HCC_COAG_SAFETY: { result: "TRUE", missing: [], note: "INR 1.12、PLT 168×10⁹/L，安全约束未触发。" },
  HCC_BLEED_VARIATION: { result: "UNKNOWN", missing: ["drain.outputMlPerHour"], note: "引流量记录缺失，无法判定出血变异。" },
  HCC_DISCHARGE: { result: "UNKNOWN", missing: ["pain.nrsScore"], note: "疼痛评分未记录，UNKNOWN 不能等同于满足出院标准。" },
  HCC_ABLATION: { result: "TRUE", missing: [], note: "单发结节 2.8cm、Child-Pugh A 级、无肝外转移，满足消融入径条件。" },
  HCC_TACE: { result: "UNKNOWN", missing: ["liver.portalVeinPatency"], note: "门静脉主干通畅性未记录，无法判定 TACE 入径。" },
  HCC_CONVERSION: { result: "UNKNOWN", missing: ["liver.childPugh", "liver.refractoryAscites"], note: "肝功能分级与难治性腹水未记录，UNKNOWN 阻止转化后手术自动准入。" },
};

/* -------------------------------- 新建表单 -------------------------------- */

interface NewDocForm {
  type: KnowledgeDoc["type"];
  title: string;
  source: string;
  version: string;
  summary: string;
}

const EMPTY_DOC_FORM: NewDocForm = {
  type: "GUIDELINE",
  title: "",
  source: "",
  version: "2026",
  summary: "",
};

interface ImportForm {
  fileName: string;
  type: KnowledgeDoc["type"];
  owner: string;
}

const EMPTY_IMPORT_FORM: ImportForm = { fileName: "", type: "GUIDELINE", owner: "周敏" };

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(KNOWLEDGE_DOCS);
  const [tab, setTab] = useState<TabKey>("ALL");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<KnowledgeDoc["status"] | "ALL">("ALL");

  const [docId, setDocId] = useState<string | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [docForm, setDocForm] = useState<NewDocForm>(EMPTY_DOC_FORM);
  const [importForm, setImportForm] = useState<ImportForm>(EMPTY_IMPORT_FORM);
  const [importing, setImporting] = useState(false);
  const [syncingKee, setSyncingKee] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<RuleTestResult | null>(null);

  const selectedDoc = docs.find((d) => d.id === docId) ?? null;
  const selectedRule = CLINICAL_RULES.find((r) => r.id === ruleId) ?? null;
  const kee = ADAPTER_STATUS.find((a) => a.key === "kee");

  /* -------------------------------- 统计 -------------------------------- */

  const stats = useMemo(() => {
    return {
      total: docs.length,
      published: docs.filter((d) => d.status === "PUBLISHED").length,
      inReview: docs.filter((d) => d.status === "IN_REVIEW").length,
      evidence: EVIDENCE_ITEMS.length,
      rules: CLINICAL_RULES.length,
    };
  }, [docs]);

  const tabCount = (key: TabKey): number => {
    if (key === "ALL") return docs.length;
    if (key === "CLINICAL_RULE") return CLINICAL_RULES.length;
    if (key === "EVIDENCE") return EVIDENCE_ITEMS.length;
    return docs.filter((d) => d.type === key).length;
  };

  /* ---------------------------- 文档筛选 ---------------------------- */

  const docTabType = tab === "CLINICAL_RULE" || tab === "EVIDENCE" ? null : tab === "ALL" ? "ALL" : tab;

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (docTabType && docTabType !== "ALL" && d.type !== docTabType) return false;
      if (status !== "ALL" && d.status !== status) return false;
      if (q) {
        const hay = `${d.title} ${d.code} ${d.source} ${d.owner} ${d.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [docs, docTabType, status, query]);

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLINICAL_RULES.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (q && !`${r.name} ${r.code} ${r.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [status, query]);

  const filteredEvidence = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVIDENCE_ITEMS.filter((e) => {
      if (!q) return true;
      return `${e.title} ${e.source} ${e.summary}`.toLowerCase().includes(q);
    });
  }, [query]);

  const groupedEvidence = useMemo(() => {
    return EVIDENCE_SOURCE_ORDER.map((sourceType) => ({
      sourceType,
      label: EVIDENCE_SOURCE_LABEL[sourceType],
      items: filteredEvidence.filter((e) => e.sourceType === sourceType),
    })).filter((group) => group.items.length > 0);
  }, [filteredEvidence]);

  /* -------------------------------- 动作 -------------------------------- */

  function patchDoc(id: string, patch: Partial<KnowledgeDoc>) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function openDoc(id: string) {
    setDocId(id);
  }

  function openRule(id: string) {
    setRuleId(id);
    setTestResult(null);
    setTesting(false);
  }

  function createDoc() {
    if (!docForm.title.trim() || !docForm.source.trim()) {
      toast.error("请填写标题与来源", { description: "知识条目必须可溯源。" });
      return;
    }
    const doc: KnowledgeDoc = {
      id: `KD-NEW-${String(docs.length + 1).padStart(3, "0")}`,
      code: `${DOC_TYPE_PREFIX[docForm.type]}-NEW-${String(docs.length + 1).padStart(3, "0")}`,
      title: docForm.title.trim(),
      type: docForm.type,
      source: docForm.source.trim(),
      version: docForm.version.trim() || "1.0",
      effectiveAt: new Date().toISOString(),
      department: "全院",
      status: "DRAFT",
      owner: "周敏",
      summary: docForm.summary.trim() || "新建知识条目，待补充证据与适用范围。",
      linkedPathways: [],
      evidenceCount: 0,
    };
    setDocs((prev) => [doc, ...prev]);
    setDocDialogOpen(false);
    setDocForm(EMPTY_DOC_FORM);
    setTab("ALL");
    toast.success("知识条目已创建", {
      description: `${doc.title} 已保存为草稿，需医务处审核后发布。外部知识变更不会自动修改已发布路径。`,
    });
  }

  function importDoc() {
    if (!importForm.fileName.trim()) {
      toast.error("请输入待导入文件名", { description: "示例：CS-HPB-2026-新共识.pdf" });
      return;
    }
    setImporting(true);
    window.setTimeout(() => {
      const fileName = importForm.fileName.trim();
      const title = fileName.replace(/\.[^.]+$/, "");
      const doc: KnowledgeDoc = {
        id: `KD-IMP-${String(docs.length + 1).padStart(3, "0")}`,
        code: `${DOC_TYPE_PREFIX[importForm.type]}-IMP-${String(docs.length + 1).padStart(3, "0")}`,
        title,
        type: importForm.type,
        source: "外部导入",
        version: "1.0",
        effectiveAt: new Date().toISOString(),
        department: "全院",
        status: "DRAFT",
        owner: importForm.owner || "周敏",
        summary: "外部文档已导入并完成结构化解析，待人工核对证据条目与适用范围后审核发布。",
        linkedPathways: [],
        evidenceCount: 0,
      };
      setDocs((prev) => [doc, ...prev]);
      setImporting(false);
      setImportDialogOpen(false);
      setImportForm(EMPTY_IMPORT_FORM);
      setTab("ALL");
      toast.success("外部文档已导入", {
        description: `已创建草稿「${title}」。导入内容不会自动修改已发布路径，需审核后生效。`,
      });
    }, 850);
  }

  function syncKee() {
    setSyncingKee(true);
    window.setTimeout(() => {
      setSyncingKee(false);
      toast.success("KEE 同步完成", {
        description: "本地知识库快照已是最新；远端检索仍为降级模式，不影响本地规则使用。",
      });
    }, 800);
  }

  function runRuleTest() {
    if (!selectedRule) return;
    setTesting(true);
    setTestResult(null);
    window.setTimeout(() => {
      const fixture =
        RULE_TEST_FIXTURES[selectedRule.code] ?? {
          result: "TRUE" as const,
          missing: [],
          note: "输入完整，条件全部满足。",
        };
      setTestResult(fixture);
      setTesting(false);
      if (fixture.result === "TRUE") {
        toast.success("规则测试结果：TRUE", { description: "基于患者状态快照执行，未写入患者数据。" });
      } else if (fixture.result === "UNKNOWN") {
        toast.warning("规则测试结果：UNKNOWN", {
          description: `缺少 ${fixture.missing.join("、") || "必要字段"}；UNKNOWN 不等于 FALSE，需补充资料后复测。`,
        });
      } else {
        toast("规则测试结果：FALSE", { description: "条件不满足，规则不触发。" });
      }
    }, 700);
  }

  async function copyDsl() {
    if (!selectedRule) return;
    const dsl = buildRuleDsl(selectedRule);
    try {
      await navigator.clipboard.writeText(dsl);
      toast.success("规则 DSL 已复制", { description: "JSON 为只读展示，复制不影响已发布版本。" });
    } catch {
      toast.error("复制失败", { description: "请手动选择 JSON 文本复制。" });
    }
  }

  const resultTone: Record<RuleTestResult["result"], "ok" | "risk" | "warn"> = {
    TRUE: "ok",
    FALSE: "risk",
    UNKNOWN: "warn",
  };

  return (
    <Page>
      <PageHeader
        module="M02 · 知识库"
        title="知识库"
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="本地快照" value={fmtDate(LAST_SYNC, true)} mono />
            <PageMeta label="规则引擎" value="结构化规则 DSL" />
            <PageMeta label="三态逻辑" value="TRUE / FALSE / UNKNOWN" mono />
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <FileInput className="size-3.5" />
              导入文档
            </Button>
            <Button size="sm" onClick={() => setDocDialogOpen(true)}>
              <Plus className="size-3.5" />
              新建知识条目
            </Button>
          </>
        }
      />

      {/* ------------------------------- 统计 ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="知识条目" value={String(stats.total)} unit="条" hint="含指南、共识、国家路径、院内规范、规则与术语" />
        <StatCard
          label="已发布"
          value={String(stats.published)}
          unit="条"
          tone="ok"
          hint="状态为 PUBLISHED 的知识条目，可被路径版本引用"
          footer={<span className="font-mono text-[10px]">PUBLISHED</span>}
        />
        <StatCard
          label="待审核"
          value={String(stats.inReview)}
          unit="条"
          tone="risk"
          hint="状态为 IN_REVIEW，审核通过后方可被路径引用"
          footer={<StatusBadge tone="warn">需医务处审核</StatusBadge>}
        />
        <StatCard
          label="证据条目"
          value={String(stats.evidence)}
          unit="条"
          tone="info"
          hint="指南 / 共识 / 国家路径 / 院内规范中的结构化证据摘要"
          footer={<span className="font-mono text-[10px]">EVIDENCE_ITEMS</span>}
        />
        <StatCard
          label="临床规则"
          value={String(stats.rules)}
          unit="条"
          tone="info"
          hint="准入、排除、完成、分支、安全、变异与退出规则"
          footer={<span className="font-mono text-[10px]">CLINICAL_RULES</span>}
        />
      </div>

      {/* ---------------------- KEE 适配器状态 / 证据等级构成 ---------------------- */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Card className="flex flex-col gap-0 py-0 lg:col-span-8">
        <CardContent className="flex flex-1 flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-secondary/50">
              <Database className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-medium">KEE 知识工程平台</span>
                <StatusBadge tone="warn" dot pulse>
                  {kee?.status ?? "DEGRADED"}
                </StatusBadge>
                <span className="font-mono text-[10px] text-muted-foreground">{kee?.mode ?? "Mock Adapter"}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                远端检索降级（延迟 {kee?.latency ?? "128 ms"}），<b className="font-medium text-foreground/80">本地知识库可用</b>：
                规则与证据条目从本地快照读取，缓存命中 76%，不阻断路径设计与审核。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 text-[10.5px] text-muted-foreground md:flex">
              <div>
                <p>延迟</p>
                <p className="mt-0.5 font-mono text-foreground">{kee?.latency ?? "128 ms"}</p>
              </div>
              <div>
                <p>缓存命中</p>
                <p className="mt-0.5 font-mono text-foreground">76%</p>
              </div>
              <div>
                <p>本地快照</p>
                <p className="mt-0.5 font-mono text-foreground">{fmtTime(LAST_SYNC)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={syncKee} disabled={syncingKee}>
              {syncingKee ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              {syncingKee ? "同步中…" : "重新同步"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 lg:col-span-4">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <SectionHead title="证据等级构成" description="EVIDENCE_ITEMS 分级" />
          <span className="font-mono text-[10px] text-muted-foreground">n = {EVIDENCE_ITEMS.length}</span>
        </div>
        <CardContent className="px-4 py-3">
          <DonutChart
            data={EVIDENCE_GRADE_MIX}
            height={118}
            centerLabel="证据"
            centerValue={EVIDENCE_ITEMS.length}
            unit="条"
            footnote="A / B 级来自指南与共识，院内规范单列。"
          />
        </CardContent>
      </Card>
      </div>

      {/* ------------------------------- Tabs ------------------------------- */}
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabKey);
          setQuery("");
          setStatus("ALL");
        }}
        className="mt-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="gap-x-5">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
                <span className="tabular rounded-[3px] bg-secondary px-1 font-mono text-[9.5px] text-muted-foreground">
                  {tabCount(t.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 文档类 tab（全部 / 指南 / 共识 / 国家路径 / 院内规范 / 医学术语） */}
        {TABS.filter((t) => t.key !== "CLINICAL_RULE" && t.key !== "EVIDENCE").map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-3">
            <Card className="gap-0 py-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="搜索标题 / 编号 / 来源 / 责任人"
                  className="max-w-[340px]"
                />
                <Toolbar>
                  <Select value={status} onValueChange={(v) => setStatus(v as KnowledgeDoc["status"] | "ALL")}>
                    <SelectTrigger size="sm" className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全部状态</SelectItem>
                      <SelectItem value="PUBLISHED">已发布</SelectItem>
                      <SelectItem value="IN_REVIEW">待审核</SelectItem>
                      <SelectItem value="DRAFT">草稿</SelectItem>
                      <SelectItem value="SUPERSEDED">已被取代</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {filteredDocs.length} / {docs.length}
                  </span>
                </Toolbar>
              </div>
              {filteredDocs.length === 0 ? (
                <EmptyState
                  icon={<SearchX />}
                  title="未找到知识条目"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
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
                        <TableHead className="pl-4">标题</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>来源</TableHead>
                        <TableHead>版本</TableHead>
                        <TableHead>生效时间</TableHead>
                        <TableHead>适用范围</TableHead>
                        <TableHead>审核状态</TableHead>
                        <TableHead>责任人</TableHead>
                        <TableHead className="pr-4">关联路径</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.map((doc) => (
                        <TableRow
                          key={doc.id}
                          onClick={() => openDoc(doc.id)}
                          className="cursor-pointer"
                        >
                          <TableCell className="max-w-[300px] pl-4">
                            <p className="truncate text-[12.5px] font-medium text-foreground">{doc.title}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{doc.code}</p>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10.5px] whitespace-nowrap text-muted-foreground">
                              {DOC_TYPE_LABEL[doc.type]}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-[11.5px] text-muted-foreground">{doc.source}</TableCell>
                          <TableCell className="font-mono text-[11px]">{doc.version}</TableCell>
                          <TableCell className="font-mono text-[11px] whitespace-nowrap">{fmtDate(doc.effectiveAt)}</TableCell>
                          <TableCell className="text-[11.5px] text-muted-foreground">{doc.department}</TableCell>
                          <TableCell>
                            <StatusBadge tone={DOC_STATUS_META[doc.status].tone}>
                              {DOC_STATUS_META[doc.status].label}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-[11.5px]">{doc.owner}</TableCell>
                          <TableCell className="pr-4 text-[11px] text-muted-foreground">
                            {doc.linkedPathways.length === 0 ? (
                              <span className="text-muted-foreground/60">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <Link2 className="size-3" />
                                {doc.linkedPathways.length} 条
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
                <span>点击行查看摘要、关联路径与证据条目</span>
                <span className="font-mono">all content synthetic</span>
              </div>
            </Card>
          </TabsContent>
        ))}

        {/* 临床规则 tab */}
        <TabsContent value="CLINICAL_RULE" className="mt-3">
          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <SearchInput value={query} onChange={setQuery} placeholder="搜索规则名称 / 编码" className="max-w-[300px]" />
              <Toolbar>
                <Select value={status} onValueChange={(v) => setStatus(v as ClinicalRule["status"] | "ALL")}>
                  <SelectTrigger size="sm" className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">全部状态</SelectItem>
                    <SelectItem value="PUBLISHED">已发布</SelectItem>
                    <SelectItem value="IN_REVIEW">待审核</SelectItem>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                  </SelectContent>
                </Select>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {filteredRules.length} / {CLINICAL_RULES.length}
                </span>
              </Toolbar>
            </div>
            {filteredRules.length === 0 ? (
              <EmptyState
                icon={<SearchX />}
                title="未找到临床规则"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery("");
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
                      <TableHead className="pl-4">规则编码</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>版本</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>关联路径</TableHead>
                      <TableHead>最近测试</TableHead>
                      <TableHead className="pr-4">测试</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => (
                      <TableRow key={rule.id} onClick={() => openRule(rule.id)} className="cursor-pointer">
                        <TableCell className="pl-4 font-mono text-[11px] text-foreground/80">{rule.code}</TableCell>
                        <TableCell className="text-[12.5px] font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10.5px] text-muted-foreground">
                            {RULE_TYPE_LABEL[rule.type]}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">{rule.version}</TableCell>
                        <TableCell>
                          <StatusBadge tone={RULE_STATUS_META[rule.status].tone}>
                            {RULE_STATUS_META[rule.status].label}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{rule.linkedPathways}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {rule.lastTestedAt ? relTime(rule.lastTestedAt) : "未测试"}
                        </TableCell>
                        <TableCell className="pr-4">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRule(rule.id);
                              toast("已打开测试面板", {
                                description: `${rule.code} 将在详情中执行三态测试（不写入患者数据）。`,
                              });
                            }}
                          >
                            <Beaker className="size-3" />
                            测试
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
              <span>规则采用结构化 DSL，执行结果为三态：TRUE / FALSE / UNKNOWN</span>
              <span className="font-mono">UNKNOWN ≠ FALSE</span>
            </div>
          </Card>
        </TabsContent>

        {/* 证据条目 tab */}
        <TabsContent value="EVIDENCE" className="mt-3">
          <Card className="gap-0 py-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
              <SearchInput value={query} onChange={setQuery} placeholder="搜索证据标题 / 来源 / 摘要" className="max-w-[340px]" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {filteredEvidence.length} / {EVIDENCE_ITEMS.length} 条证据
              </span>
            </div>
            {groupedEvidence.length === 0 ? (
              <EmptyState
                icon={<SearchX />}
                title="未找到证据条目"
                action={
                  <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                    清除搜索
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-line">
                {groupedEvidence.map((group) => (
                  <section key={group.sourceType} className="px-4 py-3">
                    <SectionHead
                      title={group.label}
                      count={group.items.length}
                      className="mb-2"
                      description="证据等级与出版年份用于路径证据链引用"
                    />
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.id} className="rounded-md border border-line bg-card px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-foreground">{item.title}</p>
                              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                                {item.source} · <span className="font-mono">{item.id}</span>
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className="rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                                {item.year}
                              </span>
                              <StatusBadge tone={item.grade === "A" ? "ok" : item.grade === "B" ? "info" : "neutral"}>
                                证据等级 {item.grade}
                              </StatusBadge>
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">{item.summary}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
            <div className="border-t border-line px-4 py-2 text-[10.5px] text-muted-foreground">
              证据条目为摘要展示，引用前请核对原文。
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================ 文档详情 Sheet ============================ */}
      <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setDocId(null)}>
        <SheetContent className="w-[560px] max-w-[94vw]">
          {selectedDoc && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10.5px] text-muted-foreground">
                    {DOC_TYPE_LABEL[selectedDoc.type]}
                  </span>
                  <StatusBadge tone={DOC_STATUS_META[selectedDoc.status].tone}>
                    {DOC_STATUS_META[selectedDoc.status].label}
                  </StatusBadge>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{selectedDoc.code}</span>
                </div>
                <SheetTitle className="mt-1 leading-snug">{selectedDoc.title}</SheetTitle>
                <SheetDescription>
                  版本 <span className="font-mono">{selectedDoc.version}</span>
                  <span className="mx-1 text-line-strong">·</span>
                  生效 <span className="font-mono">{fmtDate(selectedDoc.effectiveAt)}</span>
                  <span className="mx-1 text-line-strong">·</span>
                  已关联 {relatedEvidence(selectedDoc).length} 条证据
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <section>
                  <SectionHead title="摘要" className="mb-1.5" />
                  <p className="rounded-md border border-line bg-secondary/30 px-3 py-2.5 text-[12px] leading-relaxed text-foreground/85">
                    {selectedDoc.summary}
                  </p>
                </section>

                <section>
                  <SectionHead title="条目属性" className="mb-1.5" />
                  <div className="rounded-md border border-line">
                    <div className="divide-y divide-line px-3">
                      <Field label="来源" value={selectedDoc.source} />
                      <Field label="版本 / 生效时间" value={`${selectedDoc.version} · ${fmtDate(selectedDoc.effectiveAt)}`} mono />
                      <Field label="适用范围" value={selectedDoc.department} />
                      <Field label="责任人" value={selectedDoc.owner} />
                      <Field label="证据条目" value={`${selectedDoc.evidenceCount} 条`} mono />
                    </div>
                  </div>
                </section>

                <section>
                  <SectionHead title="关联路径" count={selectedDoc.linkedPathways.length} className="mb-1.5" />
                  {selectedDoc.linkedPathways.length === 0 ? (
                    <p className="rounded-md border border-dashed border-line px-3 py-2 text-[11.5px] text-muted-foreground">
                      暂无关联路径；该条目可作为证据来源被后续版本引用。
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selectedDoc.linkedPathways.map((name) => {
                        const pathway = PATHWAYS.find((p) => p.name === name);
                        return (
                          <li key={name}>
                            {pathway ? (
                              <Link
                                to={`/pathways/${pathway.id}/versions`}
                                className="flex items-center justify-between gap-3 rounded-md border border-line bg-card px-2.5 py-1.5 text-[11.5px] hover:border-line-strong hover:bg-secondary/40"
                              >
                                <span className="inline-flex items-center gap-1.5 text-foreground/85">
                                  <Link2 className="size-3 text-muted-foreground" />
                                  {name}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">{pathway.currentVersion}</span>
                              </Link>
                            ) : (
                              <span className="rounded-md border border-line px-2.5 py-1.5 text-[11.5px]">{name}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionHead title="关联证据条目" count={relatedEvidence(selectedDoc).length} className="mb-1.5" />
                  {relatedEvidence(selectedDoc).length === 0 ? (
                    <p className="rounded-md border border-dashed border-line px-3 py-2 text-[11.5px] text-muted-foreground">
                      该条目未关联结构化证据，暂不可作为路径证据链引用。
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {relatedEvidence(selectedDoc).map((item) => (
                        <li key={item.id} className="rounded-md border border-line bg-card px-2.5 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11.5px] font-medium text-foreground/90">{item.title}</p>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">等级 {item.grade}</span>
                          </div>
                          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                            {item.source} · <span className="font-mono">{item.year}</span>
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-foreground/65">{item.summary}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Callout tone="warn" title="外部知识更新不会自动修改已发布路径">
                  指南、共识或外部知识库更新后，仅生成“待评估变更”提示；已发布路径必须走版本派生 → 校验 → 审核 → 发布流程，
                  历史版本与差异完整保留。
                </Callout>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" size="sm" onClick={() => setDocId(null)}>
                  关闭
                </Button>
                {selectedDoc.status === "IN_REVIEW" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      patchDoc(selectedDoc.id, { status: "PUBLISHED" });
                      toast.success("知识条目已审核发布", {
                        description: "发布后可供新建路径版本引用；不会自动修改已有路径。",
                      });
                    }}
                  >
                    <CheckCircle2 className="size-3.5" />
                    审核通过并发布
                  </Button>
                )}
                {selectedDoc.status === "DRAFT" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      patchDoc(selectedDoc.id, { status: "IN_REVIEW" });
                      toast.success("已提交医务处审核", { description: "待审核期间不可被新建路径版本引用。" });
                    }}
                  >
                    <ClipboardCheck className="size-3.5" />
                    提交审核
                  </Button>
                )}
                {selectedDoc.status === "PUBLISHED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast("已创建版本更新任务", {
                        description: "知识条目更新将生成新版本草稿，需重新审核；已发布路径不受自动修改。",
                      })
                    }
                  >
                    <CloudDownload className="size-3.5" />
                    创建更新版本
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============================ 规则详情 Sheet ============================ */}
      <Sheet
        open={!!selectedRule}
        onOpenChange={(open) => {
          if (!open) {
            setRuleId(null);
            setTestResult(null);
          }
        }}
      >
        <SheetContent className="w-[580px] max-w-[94vw]">
          {selectedRule && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                    {selectedRule.code}
                  </span>
                  <span className="inline-flex items-center rounded-[3px] border border-line bg-secondary/60 px-1.5 py-px text-[10.5px] text-muted-foreground">
                    {RULE_TYPE_LABEL[selectedRule.type]}规则
                  </span>
                  <StatusBadge tone={RULE_STATUS_META[selectedRule.status].tone}>
                    {RULE_STATUS_META[selectedRule.status].label}
                  </StatusBadge>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">v{selectedRule.version}</span>
                </div>
                <SheetTitle className="mt-1">{selectedRule.name}</SheetTitle>
                <SheetDescription>
                  {selectedRule.description}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <section>
                  <SectionHead
                    title="规则 DSL"
                    className="mb-1.5"
                  />
                  <pre className="max-h-[260px] overflow-auto rounded-md border border-line bg-secondary/30 p-3 font-mono text-[10.5px] leading-relaxed text-foreground/80">
                    {buildRuleDsl(selectedRule)}
                  </pre>
                </section>

                <section>
                  <SectionHead
                    title="执行测试"
                    description="基于患者状态快照，不写入患者数据"
                    className="mb-1.5"
                  />
                  <div className="rounded-md border border-line">
                    <div className="divide-y divide-line px-3">
                      <Field label="输入快照" value="STATE-HCC-001 · 陈志远" mono />
                      <Field label="执行模式" value="只读试运行（dry-run）" />
                      <Field label="最近测试" value={selectedRule.lastTestedAt ? relTime(selectedRule.lastTestedAt) : "未测试"} />
                      <Field label="关联路径" value={`${selectedRule.linkedPathways} 条`} mono />
                    </div>
                  </div>
                  {testResult ? (
                    <div className="mt-2 space-y-2">
                      <div
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
                          testResult.result === "TRUE" && "border-ok/25 bg-ok-wash/60",
                          testResult.result === "FALSE" && "border-risk/25 bg-risk-wash/60",
                          testResult.result === "UNKNOWN" && "border-warn/30 bg-warn-wash/60",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {testResult.result === "TRUE" ? (
                            <ShieldCheck className="size-4 text-ok" />
                          ) : testResult.result === "UNKNOWN" ? (
                            <TriangleAlert className="size-4 text-warn" />
                          ) : (
                            <SearchX className="size-4 text-risk" />
                          )}
                          <span className="text-[12px] font-medium">测试结果</span>
                        </div>
                        <StatusBadge tone={resultTone[testResult.result]} dot={false}>
                          <span className="font-mono">{testResult.result}</span>
                        </StatusBadge>
                      </div>
                      {testResult.missing.length > 0 && (
                        <div className="rounded-md border border-warn/25 bg-warn-wash/40 px-3 py-2">
                          <p className="text-[10.5px] font-medium text-warn">缺失字段（按 UNKNOWN 处理）</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {testResult.missing.map((field) => (
                              <span
                                key={field}
                                className="rounded-[3px] border border-line bg-card px-1.5 py-px font-mono text-[10px] text-foreground/70"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="rounded-md border border-line bg-secondary/30 px-3 py-2 text-[11px] leading-relaxed text-foreground/75">
                        {testResult.note}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-dashed border-line px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">
                        {testing ? "正在按三态逻辑执行规则（约 0.7 秒）…" : "尚未执行测试。测试结果不改变患者状态。"}
                      </p>
                      <Button size="sm" variant="outline" onClick={runRuleTest} disabled={testing}>
                        {testing ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                        {testing ? "测试中…" : "测试规则"}
                      </Button>
                    </div>
                  )}
                </section>

                <Callout tone="info" title="三态逻辑：TRUE / FALSE / UNKNOWN">
                  UNKNOWN ≠ FALSE。关键字段缺失时规则返回 UNKNOWN，系统不会自动视为“不满足条件”，也不会自动跳过安全校验；
                  需医生补充资料后重新执行。安全约束返回 TRUE 时阻断相关任务推进。
                </Callout>
              </SheetBody>
              <SheetFooter>
                <Button variant="ghost" size="sm" onClick={copyDsl}>
                  <Download className="size-3.5" />
                  复制 DSL
                </Button>
                <div className="mr-auto" />
                <Button variant="outline" size="sm" onClick={() => setRuleId(null)}>
                  关闭
                </Button>
                <Button size="sm" onClick={runRuleTest} disabled={testing}>
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                  {testing ? "测试中…" : "测试规则"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============================ 新建知识条目 ============================ */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-[540px]">
          <DialogHeader>
            <DialogTitle>新建知识条目</DialogTitle>
            <DialogDescription>
              新建条目为草稿状态，需医务处审核后发布；发布的新版本不会自动修改已发布路径。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>条目类型</Label>
                <Select
                  value={docForm.type}
                  onValueChange={(v) => setDocForm((f) => ({ ...f, type: v as KnowledgeDoc["type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOC_TYPE_LABEL) as KnowledgeDoc["type"][]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {DOC_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-version">版本</Label>
                <Input
                  id="doc-version"
                  value={docForm.version}
                  onChange={(e) => setDocForm((f) => ({ ...f, version: e.target.value }))}
                  placeholder="例如 2026"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">标题</Label>
              <Input
                id="doc-title"
                value={docForm.title}
                onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例如：肝癌围手术期营养管理院内规范（2026）"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-source">来源</Label>
              <Input
                id="doc-source"
                value={docForm.source}
                onChange={(e) => setDocForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="例如：仁和医院医务处 / 国家卫生健康委员会"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-summary">摘要</Label>
              <Textarea
                id="doc-summary"
                value={docForm.summary}
                onChange={(e) => setDocForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="概述适用范围、关键推荐与证据级别。"
                className="min-h-[80px]"
              />
            </div>
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDocDialogOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={createDoc}>
              <Plus className="size-3.5" />
              创建草稿
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================== 导入文档 ============================== */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>导入外部文档</DialogTitle>
            <DialogDescription>
              支持 PDF / Word / 网页快照。导入后仅生成草稿与待核对证据，不自动生效。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="import-file">文件名</Label>
              <Input
                id="import-file"
                value={importForm.fileName}
                onChange={(e) => setImportForm((f) => ({ ...f, fileName: e.target.value }))}
                placeholder="例如：CS-HPB-2026-肝胆围术期营养共识.pdf"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>文档类型</Label>
                <Select
                  value={importForm.type}
                  onValueChange={(v) => setImportForm((f) => ({ ...f, type: v as KnowledgeDoc["type"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DOC_TYPE_LABEL) as KnowledgeDoc["type"][]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {DOC_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>责任人</Label>
                <Select value={importForm.owner} onValueChange={(v) => setImportForm((f) => ({ ...f, owner: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="周敏">周敏 · 医务处</SelectItem>
                    <SelectItem value="张启明">张启明 · 临床专家</SelectItem>
                    <SelectItem value="王建国">王建国 · 信息中心</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md border border-warn/25 bg-warn-wash/40 px-3 py-2 text-[10.5px] leading-relaxed text-warn">
              导入内容不会自动修改已发布路径。系统仅生成「待评估变更」提示，须走版本审核流程后方可被引用。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              取消
            </Button>
            <Button size="sm" onClick={importDoc} disabled={importing}>
              {importing ? <Loader2 className="size-3.5 animate-spin" /> : <FileInput className="size-3.5" />}
              {importing ? "解析中…" : "导入并解析"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
