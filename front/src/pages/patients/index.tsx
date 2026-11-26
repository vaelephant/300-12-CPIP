import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BedDouble,
  Download,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { PatientScenario, PatientStatus } from "@/types";
import { PATIENT_SCENARIO_META, PATIENT_STATUS_META, RISK_META } from "@/lib/clinical";
import { fmt, fmtDate, pct, relTime } from "@/lib/utils";
import { Page, PageHeader, PageMeta } from "@/components/app/page-header";
import { EmptyState, SectionHead, SyntheticTag } from "@/components/app/section";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { FilterPill, SearchInput, Toolbar } from "@/components/app/toolbar";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlagChips, Pagination } from "@/components/patient/ui";
import { DonutChart } from "@/components/charts/advanced";
import { HBarChart } from "@/components/charts/chart-kit";
import { EnrollmentMatchDialog } from "@/components/patient/enrollment-dialog";
import { usePatientDirectory } from "@/queries/patient-directory";

const PAGE_SIZE = 20;

type StatusFilter = "ALL" | PatientStatus;

const STATUS_PILLS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "IN_PATHWAY", label: PATIENT_STATUS_META.IN_PATHWAY.label },
  { key: "PENDING_ADMISSION", label: PATIENT_STATUS_META.PENDING_ADMISSION.label },
  { key: "NOT_ELIGIBLE", label: PATIENT_STATUS_META.NOT_ELIGIBLE.label },
  { key: "COMPLETED", label: PATIENT_STATUS_META.COMPLETED.label },
  { key: "EXITED", label: PATIENT_STATUS_META.EXITED.label },
];

const SCENARIO_OPTIONS = Object.keys(PATIENT_SCENARIO_META) as PatientScenario[];

export default function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [scenario, setScenario] = useState<"ALL" | PatientScenario>("ALL");
  const [ward, setWard] = useState("ALL");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { patients, summary, lastSync, mode } = usePatientDirectory();

  const wardOptions = Array.from(new Set(patients.map((p) => p.ward)));

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.bed.includes(q) ||
        p.diagnosis.includes(q) ||
        p.attending.includes(q);
      const matchesScenario = scenario === "ALL" || p.scenario === scenario;
      const matchesWard = ward === "ALL" || p.ward === ward;
      return matchesQuery && matchesScenario && matchesWard;
    });
  }, [patients, search, scenario, ward]);

  const filtered = useMemo(
    () => (status === "ALL" ? scoped : scoped.filter((p) => p.status === status)),
    [scoped, status],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      ALL: scoped.length,
      IN_PATHWAY: 0,
      PENDING_ADMISSION: 0,
      NOT_ELIGIBLE: 0,
      COMPLETED: 0,
      EXITED: 0,
    };
    scoped.forEach((p) => {
      base[p.status] += 1;
    });
    return base;
  }, [scoped]);

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setScenario("ALL");
    setWard("ALL");
    setPage(1);
  };

  const highRisk = patients.filter((p) => p.riskLevel === "HIGH").length;
  const mediumRisk = patients.filter((p) => p.riskLevel === "MEDIUM").length;
  const pendingMissing = patients.filter(
    (p) => p.status === "PENDING_ADMISSION" && p.scenario === "MISSING_DATA",
  ).length;

  const scenarioCount = (scenario: PatientScenario) => patients.filter((p) => p.scenario === scenario).length;

  return (
    <Page>
      <PageHeader
        module="M04 · 患者管理"
        title="患者中心"
        description="全院在院与在径患者统一视图：档案、路径进度、风险与入径状态。所有数据均为合成演示数据。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("观测数据导入（演示）：模拟从 HIS / LIS / PACS 拉取最新观测记录")}
            >
              <Upload className="size-3.5" />
              导入观测
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("新建患者需通过 HIS 接口建档（演示环境未连接真实接口）")}
            >
              <Plus className="size-3.5" />
              新建患者
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Sparkles className="size-3.5" />
              智能入径匹配
            </Button>
          </>
        }
        meta={
          <>
            <SyntheticTag />
            <PageMeta label="合成病例" value={`${fmt(summary.total)} 例`} mono />
            <PageMeta label="数据源" value={mode === "server" ? "后端 API" : "V0.5 合成演示"} mono />
            <PageMeta label="最近同步" value={`${fmtDate(lastSync, true)} · ${relTime(lastSync)}`} mono />
            <PageMeta label="数据源" value="HIS / EMR / LIS / PACS" />
            <PageMeta label="专病范围" value="原发性肝癌（C22.0）· 单病种" />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="合成病例"
          value={fmt(summary.total)}
          unit="例"
          hint="演示环境中的全部病例均为合成数据，不代表真实患者"
          tone="info"
          footer="原发肝癌单病种 · 3 个病区"
          trend={[292, 294, 296, 297, 299, 300, 300]}
        />
        <StatCard
          label="在径患者"
          value={fmt(summary.inPathway)}
          unit="例"
          hint="已确认入径且路径实例处于执行中的患者数量"
          tone="ok"
          footer={`占全部病例 ${pct(summary.inPathway, summary.total)}`}
          progress={(summary.inPathway / summary.total) * 100}
          trend={[236, 240, 243, 246, 249, 252, 254]}
        />
        <StatCard
          label="待入径确认"
          value={fmt(summary.pendingAdmission)}
          unit="例"
          hint="已完成建档、等待医生确认入径的患者；含数据不完整病例"
          tone="info"
          footer={
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="size-2.5 text-warn" /> 其中数据缺失 {pendingMissing} 例
            </span>
          }
        />
        <StatCard
          label="高风险患者"
          value={fmt(highRisk)}
          unit="例"
          hint="风险等级为高风险：病情变异、任务超时或安全约束触发"
          tone="risk"
          footer={`另有中风险 ${mediumRisk} 例`}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="px-4 py-3">
          <SectionHead
            title="队列风险构成"
            count={patients.length}
            description="按最新风险等级汇总的全部合成病例"
            action={<StatusBadge tone="warn" dot={false}>需关注 {highRisk} 例</StatusBadge>}
          />
          <div className="pt-3">
            <DonutChart
              data={[
                { name: "低风险", value: patients.filter((p) => p.riskLevel === "LOW").length, color: "var(--chart-1)" },
                { name: "中风险", value: patients.filter((p) => p.riskLevel === "MEDIUM").length, color: "var(--chart-3)" },
                { name: "高风险", value: patients.filter((p) => p.riskLevel === "HIGH").length, color: "var(--chart-5)" },
              ]}
              height={132}
              centerLabel="合成病例"
              centerValue={patients.length}
              unit="例"
              footnote="风险等级用于路径关注与审核提示，不替代临床判断。"
            />
          </div>
        </Card>
        <Card className="px-4 py-3">
          <SectionHead
            title="入径场景分布"
            description="正常入径 / 病情变异 / 数据缺失等场景的队列构成"
          />
          <div className="pt-2">
            <HBarChart
              data={[
                { label: "正常路径", value: scenarioCount("NORMAL"), display: `${scenarioCount("NORMAL")} 例`, color: "var(--chart-1)" },
                { label: "病情变异", value: scenarioCount("CLINICAL_VARIATION"), display: `${scenarioCount("CLINICAL_VARIATION")} 例`, color: "var(--chart-3)" },
                { label: "任务超时", value: scenarioCount("OVERDUE"), display: `${scenarioCount("OVERDUE")} 例`, color: "var(--chart-5)" },
                { label: "不符合入径", value: scenarioCount("NOT_ELIGIBLE"), display: `${scenarioCount("NOT_ELIGIBLE")} 例`, color: "var(--chart-4)" },
                { label: "数据缺失", value: scenarioCount("MISSING_DATA"), display: `${scenarioCount("MISSING_DATA")} 例`, color: "var(--chart-2)" },
                { label: "患者退出", value: scenarioCount("EXITED"), display: `${scenarioCount("EXITED")} 例`, color: "#b3b6b1" },
              ]}
              height={172}
              labelWidth={86}
              footnote="场景分布用于研发演示，不代表真实疾病发生率。"
            />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-2.5 border-b border-line px-4 py-3">
          <Toolbar>
            <div className="w-[250px] max-w-full">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="搜索姓名 / MRN / 床位 / 诊断 / 医生…"
                shortcut="/"
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select
                value={ward}
                onValueChange={(v) => {
                  setWard(v);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue placeholder="全部病区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部病区</SelectItem>
                  {wardOptions.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={scenario}
                onValueChange={(v) => {
                  setScenario(v as "ALL" | PatientScenario);
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue placeholder="全部情景" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部情景</SelectItem>
                  {SCENARIO_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PATIENT_SCENARIO_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-3.5" />
                重置
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("已生成患者列表导出任务（演示），未创建真实导出文件")}
              >
                <Download className="size-3.5" />
                导出
              </Button>
            </div>
          </Toolbar>

          <div className="flex flex-wrap items-center gap-1">
            {STATUS_PILLS.map((pill) => (
              <FilterPill
                key={pill.key}
                active={status === pill.key}
                count={counts[pill.key]}
                onClick={() => {
                  setStatus(pill.key);
                  setPage(1);
                }}
              >
                {pill.label}
              </FilterPill>
            ))}
            <span className="ml-auto text-[10.5px] text-muted-foreground">
              筛选结果 <span className="font-mono text-foreground/80">{filtered.length}</span> 例
            </span>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="没有符合条件的患者"
            description="当前搜索与筛选条件组合无结果。可尝试清空筛选，或调整病区 / 情景 / 状态条件。"
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-3.5" /> 清空筛选
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">患者</TableHead>
                  <TableHead className="min-w-[140px]">诊断</TableHead>
                  <TableHead className="min-w-[95px]">病区 / 床位</TableHead>
                  <TableHead className="min-w-[170px]">路径</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead className="min-w-[105px]">状态</TableHead>
                  <TableHead className="min-w-[110px]">责任医生 / 入院</TableHead>
                  <TableHead className="min-w-[110px]">标记</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const statusMeta = PATIENT_STATUS_META[p.status];
                  const riskMeta = RISK_META[p.riskLevel];
                  const scenarioMeta = PATIENT_SCENARIO_META[p.scenario];
                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <PatientAvatar name={p.name} id={p.id} size="sm" risk={p.riskLevel} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground/90">{p.name}</span>
                              <span className="text-[10.5px] text-muted-foreground">
                                {p.gender === "M" ? "男" : "女"} · {p.age} 岁
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground/80">{p.mrn}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[12px] text-foreground/90">{p.diagnosis}</span>
                          <Badge variant="outline" className="font-mono text-[9px]">
                            {p.diagnosisCode}
                          </Badge>
                        </div>
                        <div className="mt-0.5 max-w-[140px] truncate text-[10.5px] text-muted-foreground" title={p.stage}>{p.stage}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11.5px] text-foreground/85">{p.ward}</div>
                        <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <BedDouble className="size-2.5" /> {p.bed}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.pathwayName ? (
                          <div className="max-w-[150px]">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[11.5px] text-foreground/85" title={p.pathwayName}>
                                {p.pathwayName}
                              </span>
                              <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                                V{p.pathwayVersion}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <Progress value={p.progress} className="h-1 w-[86px]" />
                              <span className="font-mono text-[9.5px] text-muted-foreground tabular">{p.progress}%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">未入径</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={riskMeta.tone} dot={false}>
                          {riskMeta.label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{scenarioMeta.label}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11.5px] text-foreground/85">{p.attending}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular">
                          入院 {p.los} 天 · {fmtDate(p.admissionAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <FlagChips flags={p.flags} max={1} nowrap />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={safePage}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="例"
            />
          </>
        )}
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Activity className="size-3 text-muted-foreground/70" />
          数据每 5 分钟增量同步；当前为 V0.5 研发演示环境，未连接真实院内系统。
        </span>
        <Link to="/approvals" className="inline-flex items-center gap-0.5 text-primary hover:underline">
          前往审核中心
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <EnrollmentMatchDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Page>
  );
}
