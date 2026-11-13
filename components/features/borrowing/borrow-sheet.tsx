"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Microscope, Package } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useCreateBorrowing } from "@/hooks";
import { borrowDetailsFormSchema, type BorrowDetailsForm } from "@/lib/schemas/borrow-forms";
import { ServiceError } from "@/lib/services";
import { BorrowDetailsFields, defaultBorrowDetails, toCreateBorrowingInput } from "./borrow-fields";
import { QuantityStepper } from "./quantity-stepper";

export interface BorrowLine {
  kind: "eq" | "sp";
  id: string;
  name: string;
  code: string;
  /** Hanya untuk item pendukung. */
  quantity?: number;
  max?: number;
  unit?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: BorrowLine[];
  onSuccess?: () => void;
}

/** Form pinjam: bottom sheet di HP. Dipakai halaman hasil scan dan keranjang. */
export function BorrowSheet({ open, onOpenChange, lines, onSuccess }: Props) {
  const { data: session } = useSession();
  const create = useCreateBorrowing();
  const form = useForm<BorrowDetailsForm>({ resolver: zodResolver(borrowDetailsFormSchema), defaultValues: defaultBorrowDetails() });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    form.reset(defaultBorrowDetails());
    setQuantities(Object.fromEntries(lines.filter((l) => l.kind === "sp").map((l) => [l.id, l.quantity ?? 1])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const equipmentLines = lines.filter((l) => l.kind === "eq");
  const supportingLines = lines.filter((l) => l.kind === "sp");

  async function onSubmit(values: BorrowDetailsForm) {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }
    try {
      await create.mutateAsync(
        toCreateBorrowingInput(
          values,
          userId,
          equipmentLines.map((l) => l.id),
          supportingLines.map((l) => ({ supporting_equipment_id: l.id, quantity: quantities[l.id] ?? 1 })),
        ),
      );
      toast.success("Peminjaman berhasil dicatat", { description: `${lines.length} item dipinjam. Jangan lupa kembalikan tepat waktu.` });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      if (e instanceof ServiceError && e.code === "VALIDATION" && e.fieldErrors) {
        for (const [key, message] of Object.entries(e.fieldErrors)) {
          if (key in form.getValues()) form.setError(key as keyof BorrowDetailsForm, { message });
        }
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : "Peminjaman gagal disimpan");
      }
    }
  }

  const pending = create.isPending;
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !pending && onOpenChange(o)}
      title="Form Peminjaman"
      description={`${lines.length} item akan dipinjam atas nama Anda.`}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-12 flex-1 sm:h-10" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" form="borrow-sheet-form" className="h-12 flex-[2] text-base sm:h-10 sm:text-sm" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Pinjam sekarang
          </Button>
        </div>
      }
    >
      <form id="borrow-sheet-form" onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5 pb-2">
        <ul className="divide-y rounded-lg border" aria-label="Item yang dipinjam">
          {lines.map((l) => (
            <li key={`${l.kind}-${l.id}`} className="flex items-center gap-3 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                {l.kind === "eq" ? <Microscope className="size-5" /> : <Package className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{l.code}</p>
              </div>
              {l.kind === "sp" && (
                <QuantityStepper
                  label={`jumlah ${l.name}`} value={quantities[l.id] ?? 1} min={1} max={l.max ?? 1} unit={l.unit}
                  onChange={(v) => setQuantities((q) => ({ ...q, [l.id]: v }))}
                />
              )}
            </li>
          ))}
        </ul>
        <BorrowDetailsFields form={form} idPrefix="borrow" />
      </form>
    </BottomSheet>
  );
}
