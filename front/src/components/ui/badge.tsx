import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-px text-[11px] font-medium leading-[17px] whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-line-strong bg-transparent text-muted-foreground",
        risk: "border-risk/20 bg-risk-wash text-risk",
        warn: "border-warn/25 bg-warn-wash text-warn",
        ok: "border-ok/20 bg-ok-wash text-ok",
        info: "border-info/20 bg-info-wash text-info",
        ink: "border-transparent bg-ink text-white/85",
        dot: "border-line bg-card text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full bg-current", className)} />;
}

export { Badge, badgeVariants, Dot };
