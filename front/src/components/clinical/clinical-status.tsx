import { StatusBadge } from "@/components/app/status-badge";
import { semanticForStatus } from "@/lib/clinical-semantics";

export function ClinicalStatus({ status, label, dot = true }: { status: string | null | undefined; label?: string; dot?: boolean }) {
  const semantic = semanticForStatus(status);
  return (
    <StatusBadge tone={semantic.tone} dot={dot}>
      {label ?? semantic.label}
    </StatusBadge>
  );
}
