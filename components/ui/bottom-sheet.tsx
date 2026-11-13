"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** md: max-w-lg, lg: max-w-2xl (hanya di layar >= sm; di HP selalu penuh dari bawah). */
  size?: "md" | "lg";
  className?: string;
}

/** Sheet dari bawah di HP, dialog di tengah di layar lebar. Body scroll, footer menempel. */
export function BottomSheet({ open, onOpenChange, title, description, children, footer, size = "md", className }: BottomSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <DialogPrimitive.Content
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "pointer-events-auto flex max-h-[92dvh] w-full flex-col rounded-t-2xl border bg-popover text-popover-foreground shadow-lg duration-200 sm:max-h-[88dvh] sm:rounded-xl",
              size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full",
              "sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=closed]:slide-out-to-bottom-4",
              className,
            )}
          >
            <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />
            <div className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-3 sm:pt-5">
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-lg font-semibold leading-tight">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className={cn("mt-1 text-sm text-muted-foreground", !description && "sr-only")}>
                  {description ?? title}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label="Tutup"
                className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-accent"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2">{children}</div>
            {footer && (
              <div className="shrink-0 border-t bg-popover px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
