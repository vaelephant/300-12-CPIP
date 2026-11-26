import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={18}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-line !bg-card !text-foreground !shadow-pop !text-[12.5px] !gap-2",
          title: "!font-medium !text-[12.5px]",
          description: "!text-muted-foreground !text-[11.5px]",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md !text-[11px]",
          cancelButton: "!bg-secondary !text-secondary-foreground !rounded-md !text-[11px]",
          icon: "!text-primary",
        },
      }}
    />
  );
}
