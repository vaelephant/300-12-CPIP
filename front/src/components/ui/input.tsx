import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 text-[13px] text-foreground shadow-[inset_0_1px_0_rgba(20,30,26,0.02)] transition-[border-color,box-shadow] outline-none",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-[border-color,box-shadow]",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
