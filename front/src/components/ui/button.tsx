import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-[color,background-color,border-color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_1px_rgba(24,24,27,0.10)] hover:bg-primary/92 active:bg-primary/98",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline:
          "border border-input bg-card text-foreground hover:bg-secondary/60 hover:border-line-strong",
        ghost: "text-foreground/80 hover:bg-secondary/70 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92 shadow-[0_1px_1px_rgba(80,10,6,0.14)]",
        "destructive-outline":
          "border border-risk/30 bg-risk-wash text-risk hover:bg-risk/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-[11.5px] rounded",
        sm: "h-8 px-2.5 text-[12.5px] rounded-md",
        default: "h-9 px-3.5",
        lg: "h-10 px-4",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
