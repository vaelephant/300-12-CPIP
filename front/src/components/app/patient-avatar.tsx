import { cn, initials } from "@/lib/utils";

const PALETTES = [
  "bg-accent text-accent-foreground",
  "bg-info-wash text-info",
  "bg-warn-wash text-warn",
  "bg-ok-wash text-ok",
  "bg-secondary text-secondary-foreground",
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface PatientAvatarProps {
  name: string;
  id?: string;
  size?: "sm" | "md" | "lg";
  risk?: "HIGH" | "MEDIUM" | "LOW";
  className?: string;
}

export function PatientAvatar({ name, id = name, size = "md", risk, className }: PatientAvatarProps) {
  const palette = PALETTES[hash(id) % PALETTES.length];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none",
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-[11.5px]",
        size === "lg" && "size-11 text-[14px]",
        palette,
        risk === "HIGH" && "ring-1 ring-risk/40 ring-offset-1 ring-offset-card",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
