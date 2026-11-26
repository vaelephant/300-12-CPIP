import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[11px] font-medium leading-[17px] tracking-[-0.01em] whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-foreground",
        secondary: "border-transparent bg-secondary text-muted-foreground",
        outline: "border-line bg-transparent text-muted-foreground",
        risk: "border-transparent bg-secondary text-risk",
        warn: "border-transparent bg-secondary text-warn",
        ok: "border-transparent bg-secondary text-ok",
        info: "border-transparent bg-secondary text-info",
        ink: "border-transparent bg-foreground text-background",
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
