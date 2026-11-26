import type { ReactNode } from "react";
import { Building2, CalendarDays, MapPin, Stethoscope, UserRound, Users } from "lucide-react";
import type { Patient } from "@/types";
import { cn, fmtDate } from "@/lib/utils";
import { PATIENT_SCENARIO_META, PATIENT_STATUS_META, RISK_META } from "@/lib/clinical";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AllergyChips, FlagChips } from "./ui";

export function PatientHeaderCard({
  patient,
  actions,
  meta,
  className,
}: {
  patient: Patient;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  const status = PATIENT_STATUS_META[patient.status];
  const risk = RISK_META[patient.riskLevel];
  const scenario = PATIENT_SCENARIO_META[patient.scenario];
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-wrap items-start gap-4 px-4 py-4">
        <PatientAvatar name={patient.name} id={patient.id} size="lg" risk={patient.riskLevel} />
        <div className="min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h2 className="text-[18px] leading-tight font-semibold tracking-tight">{patient.name}</h2>
            <span className="text-[12px] text-muted-foreground">
              {patient.gender === "M" ? "男" : "女"} · {patient.age} 岁
            </span>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={risk.tone} dot={false}>
              {risk.label}
            </StatusBadge>
            <Badge variant="outline" className="font-mono text-[10.5px]">
              {patient.mrn}
            </Badge>
            <Badge variant="outline" className="gap-1 text-[10.5px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", scenario.tone === "ok" ? "bg-ok" : scenario.tone === "risk" ? "bg-risk" : scenario.tone === "warn" ? "bg-warn" : "bg-muted-foreground/50")} />
              {scenario.label}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5 opacity-70" />
              {patient.departmentName}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 opacity-70" />
              {patient.ward} · <span className="font-mono">{patient.bed}</span> 床
            </span>
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="size-3.5 opacity-70" />
              {patient.diagnosis} <span className="font-mono text-[11px]">{patient.diagnosisCode}</span> · {patient.stage}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <AllergyChips allergies={patient.allergy} />
            <FlagChips flags={patient.flags} max={3} />
          </div>
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 lg:max-w-[360px]">{actions}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5 opacity-70" /> 入院日期 {fmtDate(patient.admissionAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <UserRound className="size-3.5 opacity-70" /> 责任医生{" "}
          <span className="font-medium text-foreground/85">{patient.attending}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5 opacity-70" /> 责任护士{" "}
          <span className="font-medium text-foreground/85">{patient.nurse}</span>
        </span>
        <span>
          住院 <span className="font-mono text-foreground/85 tabular">{patient.los}</span> 天
        </span>
        <span>
          路径进度 <span className="font-mono text-foreground/85 tabular">{patient.progress}%</span>
        </span>
        {patient.enrolledAt && <span>入径 {fmtDate(patient.enrolledAt)}</span>}
        {meta && <span className="flex flex-wrap items-center gap-x-4 gap-y-1">{meta}</span>}
      </div>
    </Card>
  );
}
