import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Patient } from "@/types";
import { cn, fmtDate, relTime } from "@/lib/utils";
import { PATIENT_STATUS_META, RISK_META } from "@/lib/clinical";
import { PatientAvatar } from "@/components/app/patient-avatar";
import { StatusBadge } from "@/components/app/status-badge";
import { AllergyChips } from "./ui";

/**
 * Linear-quiet 身份条：标题一行，关键上下文一行，动作靠右。
 */
export function PatientHeaderCard({
  patient,
  actions,
  meta,
  className,
  currentStage,
  dataAsOf,
  backTo = "/patients",
}: {
  patient: Patient;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
  currentStage?: string;
  dataAsOf?: string;
  backTo?: string;
}) {
  const status = PATIENT_STATUS_META[patient.status];
  const risk = RISK_META[patient.riskLevel];
  const stageLabel = currentStage ?? "未开始";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <Link to={backTo} className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-3.5" /> 患者中心
          </Link>
          <span className="text-line-strong">/</span>
          <span className="text-ink">患者 360</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono tabular-nums">{patient.mrn}</span>
          {dataAsOf && (
            <span className="hidden md:inline">
              {fmtDate(dataAsOf, true)} · {relTime(dataAsOf)}
            </span>
          )}
          {meta}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PatientAvatar name={patient.name} id={patient.id} size="md" risk={patient.riskLevel} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-[18px] leading-6 font-semibold tracking-[-0.03em] text-ink">
              {patient.name}
            </h1>
            <span className="text-[12px] text-muted-foreground">
              {patient.gender === "M" ? "男" : "女"} · {patient.age}
            </span>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={risk.tone} dot={false}>
              {risk.label}
            </StatusBadge>
            {patient.allergy.length > 0 && <AllergyChips allergies={patient.allergy} />}
          </div>
          <p className="mt-0.5 truncate text-[12px] leading-4 text-muted-foreground">
            <span className="text-ink">{stageLabel}</span>
            <span className="mx-1.5 text-line-strong">·</span>
            {patient.diagnosis}
            <span className="mx-1.5 text-line-strong">·</span>
            {patient.bed} 床 · {patient.attending}
            <span className="mx-1.5 text-line-strong">·</span>
            {patient.progress}%
          </p>
        </div>
        {actions && <div className="hidden shrink-0 items-center gap-1 sm:flex">{actions}</div>}
      </div>
      {actions && <div className="mt-2 flex flex-wrap gap-1 sm:hidden">{actions}</div>}
    </div>
  );
}
