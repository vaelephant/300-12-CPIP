import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Patient, Pathway } from "@/types";
import { PATHWAYS, PATIENTS } from "@/data";
import { getStateForPatient } from "./patient-state";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/app/status-badge";
import { Callout } from "@/components/app/section";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { TriStateBadge, type TriState } from "./ui";

interface RuleRef {
  admission: string;
  exclusion: string;
  completeness: string;
}

const RULE_BY_PATHWAY: Record<string, RuleRef> = {
  "PW-HCC-001": { admission: "RULE-001@1.2.0", exclusion: "RULE-002@1.1.0", completeness: "RULE-003@1.0.3" },
  "PW-HCC-002": { admission: "RULE-008@2.0.0", exclusion: "RULE-002@1.1.0", completeness: "RULE-003@1.0.3" },
  "PW-HCC-003": { admission: "RULE-009@1.1.0", exclusion: "RULE-002@1.1.0", completeness: "RULE-003@1.0.3" },
  "PW-HCC-004": { admission: "RULE-004@1.3.0", exclusion: "RULE-002@1.1.0", completeness: "RULE-003@1.0.3" },
};

const MISSING_BY_PATHWAY: Record<string, string[]> = {
  "PW-HCC-001": ["NRS 2002 营养风险筛查", "门静脉癌栓影像复核", "术中输血知情同意"],
  "PW-HCC-002": ["NRS 2002 营养风险筛查", "消融术前影像融合资料", "麻醉风险评估"],
  "PW-HCC-003": ["NRS 2002 营养风险筛查", "TACE 术前肝功能复评", "碘对比剂过敏史确认"],
  "PW-HCC-004": ["mRECIST 疗效评估报告", "门静脉癌栓影像复核", "麻醉科二次评估"],
};

interface Candidate {
  pathway: Pathway;
  admission: TriState;
  exclusion: TriState;
  completeness: "UNKNOWN" | "WARN";
  missing: string[];
  rules: RuleRef;
  recommended: boolean;
  detail: string;
}

function buildCandidates(patient: Patient): Candidate[] {
  const published = PATHWAYS.filter((p) => p.status === "PUBLISHED");
  const owned = published.find((p) => p.id === patient.pathwayId);
  const ordered = owned ? [owned, ...published.filter((p) => p.id !== owned.id)] : published;
  return ordered.slice(0, 4).map((pathway, index) => {
    const rules = RULE_BY_PATHWAY[pathway.id] ?? RULE_BY_PATHWAY["PW-HCC-001"];
    if (index === 0) {
      const completeness = patient.scenario === "MISSING_DATA" || index === 0 ? "UNKNOWN" : "WARN";
      return {
        pathway,
        admission: "TRUE",
        exclusion: "FALSE",
        completeness,
        missing: MISSING_BY_PATHWAY[pathway.id] ?? ["术前检查报告（部分未归档）"],
        rules,
        recommended: true,
        detail: `患者主要诊断 ${patient.diagnosis}（${patient.diagnosisCode}），结合分期与治疗目标，准入规则 ${rules.admission} 判定 TRUE，排除规则 ${rules.exclusion} 未命中。`,
      };
    }
    return {
      pathway,
      admission: "FALSE",
      exclusion: "FALSE",
      completeness: "WARN",
      missing: [],
      rules: { admission: "—", exclusion: "—", completeness: "—" },
      recommended: false,
      detail: `当前分期 / 治疗目标与「${pathway.name}」不匹配，准入判定 FALSE；可转 MDT 再评估。`,
    };
  });
}

export function EnrollmentMatchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pendingPatients = useMemo(() => {
    const list = PATIENTS.filter((p) => p.status === "PENDING_ADMISSION");
    const demo = list.find((p) => p.id === "HCC-DEMO-003");
    return demo ? [demo, ...list.filter((p) => p.id !== demo.id)] : list;
  }, []);

  const [patientId, setPatientId] = useState(pendingPatients[0]?.id ?? "HCC-DEMO-003");
  const patient = PATIENTS.find((p) => p.id === patientId) ?? pendingPatients[0];
  const candidates = useMemo(() => (patient ? buildCandidates(patient) : []), [patient]);
  const [selectedPathwayId, setSelectedPathwayId] = useState(candidates[0]?.pathway.id ?? "");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedPathwayId(candidates[0]?.pathway.id ?? "");
    setConfirmed(false);
  }, [open, patientId, candidates]);

  if (!patient) return null;
  const state = getStateForPatient(patient);
  const selected = candidates.find((c) => c.pathway.id === selectedPathwayId) ?? candidates[0];
  const needsConfirmation = selected?.completeness === "UNKNOWN";
  const eligible = selected?.admission === "TRUE";
  const canConfirm = Boolean(selected) && eligible && (!needsConfirmation || confirmed);
  const blockingReason = !selected
    ? "请选择候选路径"
    : !eligible
      ? "当前候选路径准入规则为 FALSE，不可确认入径"
      : needsConfirmation && !confirmed
        ? "存在 UNKNOWN 数据，需医生显式确认后才可提交"
        : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            智能入径匹配
            <span className="font-mono text-[10px] font-normal tracking-wider text-muted-foreground">M05 · 三态规则判定</span>
          </DialogTitle>
          <DialogDescription>
            基于患者状态快照执行准入 / 排除规则与数据完整性校验。UNKNOWN 表示数据不足，不会被自动视为满足条件。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto scrollbar-slim px-5 py-4">
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-secondary/35 px-3 py-2.5">
            <div className="min-w-[220px] flex-1">
              <label className="label-micro mb-1 block">待入径患者</label>
              <Select
                value={patientId}
                onValueChange={(v) => {
                  setPatientId(v);
                  setConfirmed(false);
                }}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="选择患者" />
                </SelectTrigger>
                <SelectContent>
                  {pendingPatients.slice(0, 10).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.mrn} · {p.diagnosis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2.5 pb-0.5">
              <PatientAvatar name={patient.name} id={patient.id} size="sm" risk={patient.riskLevel} />
              <div>
                <div className="flex items-center gap-1.5 text-[12px] font-medium">
                  {patient.name}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {patient.gender === "M" ? "男" : "女"} · {patient.age} 岁
                  </span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {patient.diagnosis} {patient.diagnosisCode} · 完整度 {state.dataCompleteness}%
                </div>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              {patient.departmentName} · {patient.bed} 床
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">候选路径 · 规则评估</h3>
              <span className="font-mono text-[10px] text-muted-foreground">{candidates.length} 个候选</span>
            </div>
            {candidates.map((c) => {
              const active = c.pathway.id === selectedPathwayId;
              const missing = c.missing;
              return (
                <div
                  key={c.pathway.id}
                  className={cn(
                    "overflow-hidden rounded-lg border transition-colors",
                    active ? "border-primary/35 bg-accent/25" : "border-line bg-card hover:border-line-strong",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPathwayId(c.pathway.id)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
                      )}
                    >
                      {active && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12.5px] font-medium">{c.pathway.name}</span>
                        <Badge variant="outline" className="font-mono text-[9.5px]">
                          V{c.pathway.currentVersion}
                        </Badge>
                        <span className="text-[10.5px] text-muted-foreground">{c.pathway.departmentName}</span>
                        {c.recommended ? (
                          <StatusBadge tone="ok" dot={false} className="ml-0.5">
                            推荐入径
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="risk" dot={false} className="ml-0.5">
                            场景不符
                          </StatusBadge>
                        )}
                      </div>
                      <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
                        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span className="w-[52px] shrink-0">准入规则</span>
                          <TriStateBadge value={c.admission} />
                          <span className="truncate font-mono text-[9px]">{c.rules.admission}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span className="w-[52px] shrink-0">排除规则</span>
                          <TriStateBadge value={c.exclusion} />
                          <span className="truncate font-mono text-[9px]">{c.rules.exclusion}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <span className="w-[52px] shrink-0">数据完整性</span>
                          <TriStateBadge value={c.completeness} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {active && (
                    <div className="space-y-2 border-t border-line/80 bg-card/70 px-3 py-2.5">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{c.detail}</p>
                      {c.completeness === "UNKNOWN" && missing.length > 0 && (
                        <div className="rounded-md border border-warn/25 bg-warn-wash/60 px-2.5 py-2">
                          <p className="flex items-center gap-1 text-[11px] font-medium text-warn">
                            <AlertTriangle className="size-3" /> 数据完整性 UNKNOWN · 需补充资料
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {missing.map((m) => (
                              <span
                                key={m}
                                className="rounded-[3px] border border-warn/25 bg-card px-1.5 py-px text-[10.5px] text-warn"
                              >
                                {m} · 待补充
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            缺失数据不会被自动视为满足条件；系统不会自动完成入径，需医生确认后方可提交。
                          </p>
                        </div>
                      )}
                      {c.completeness === "UNKNOWN" && (
                        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-line bg-secondary/40 px-2.5 py-2">
                          <Checkbox
                            checked={confirmed}
                            onCheckedChange={(v) => setConfirmed(v === true)}
                            className="mt-0.5"
                          />
                          <span className="text-[11px] leading-relaxed text-foreground/80">
                            医生确认：已知悉存在 UNKNOWN 数据，在资料补充前按「未知」处理，不视为满足入径条件。
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Callout tone="info" title="三态判定说明" icon>
            TRUE / FALSE / UNKNOWN 三态独立判定：UNKNOWN ≠ FALSE，缺失数据既不能作为通过依据，也不能自动判定为排除。
            确认入径后仍将生成「待补充资料」任务，由责任医生与护理人员在执行阶段闭环。
          </Callout>
        </div>

        <DialogFooter className="justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Info className="size-3 shrink-0" />
            <span className="truncate">
              {canConfirm
                ? `将提交：${patient.name} → ${selected?.pathway.name}（${selected?.pathway.currentVersion}）`
                : blockingReason}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              size="sm"
              disabled={!canConfirm}
              onClick={() => {
                if (!selected) return;
                toast.success(`已提交入径确认 · ${patient.name} → ${selected.pathway.name}`);
                toast.info("入径结果不会写入真实 HIS / EMR");
                onOpenChange(false);
              }}
            >
              <ClipboardCheck className="size-3.5" />
              医生确认入径
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

