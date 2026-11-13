"use client";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Microscope, Package } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { useEquipmentList, useReturnBorrowing, useSupportingEquipmentList } from "@/hooks";
import { CONDITION_LABEL } from "@/lib/borrowing-rules";
import { returnFormSchema, type ReturnForm } from "@/lib/schemas/borrow-forms";
import { ServiceError } from "@/lib/services";
import { CONDITION_META, toneClass } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { BorrowingWithDetails, Condition } from "@/types/erd";
import { Field } from "./field";
import { QuantityStepper } from "./quantity-stepper";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowing: BorrowingWithDetails | undefined;
  /** Kembalikan hanya satu baris (mis. dari halaman scan). Kosong = semua yang belum kembali. */
  only?: { kind: "eq" | "sp"; detail_id: string };
  onSuccess?: () => void;
}

const CONDITIONS: Condition[] = ["good", "minor_damage", "major_damage"];

function buildLines(b: BorrowingWithDetails, only: Props["only"]): ReturnForm["lines"] {
  const eq = b.equipment_details
    .filter((d) => d.final_condition === null && (!only || (only.kind === "eq" && only.detail_id === d.detail_id)))
    .map((d) => ({
      kind: "eq" as const, detail_id: d.detail_id, ref_id: d.equipment_id, quantity: 1, max_quantity: 1,
      final_condition: "good" as Condition, has_damage: false, damage_notes: "",
    }));
  const sp = b.supporting_details
    .filter((d) => d.quantity_returned < d.quantity_borrowed && (!only || (only.kind === "sp" && only.detail_id === d.supporting_detail_id)))
    .map((d) => ({
      kind: "sp" as const, detail_id: d.supporting_detail_id, ref_id: d.supporting_equipment_id,
      quantity: d.quantity_borrowed - d.quantity_returned, max_quantity: d.quantity_borrowed - d.quantity_returned,
      final_condition: "good" as Condition, has_damage: false, damage_notes: "",
    }));
  return [...eq, ...sp];
}

/** Form kembalikan: kondisi akhir, centang kerusakan, catatan (wajib jika rusak). Selalu lewat dialog konfirmasi. */
export function ReturnBorrowingSheet({ open, onOpenChange, borrowing, only, onSuccess }: Props) {
  const ret = useReturnBorrowing();
  const { data: equipment = [] } = useEquipmentList({ includeInactive: true });
  const { data: supporting = [] } = useSupportingEquipmentList({ includeInactive: true });
  const [pending, setPending] = useState<ReturnForm | null>(null);

  const form = useForm<ReturnForm>({ resolver: zodResolver(returnFormSchema), defaultValues: { lines: [], notes: "" } });
  const { fields } = useFieldArray({ control: form.control, name: "lines" });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open && borrowing) form.reset({ lines: buildLines(borrowing, only), notes: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, borrowing?.borrowing_id, only?.detail_id]);

  const info = useMemo(() => {
    const eqMap = new Map(equipment.map((e) => [e.equipment_id, e]));
    const spMap = new Map(supporting.map((s) => [s.supporting_equipment_id, s]));
    return (kind: "eq" | "sp", refId: string) => {
      if (kind === "eq") {
        const e = eqMap.get(refId);
        return { name: e?.equipment_name ?? "Alat", code: e?.inventory_code ?? "", unit: "" };
      }
      const s = spMap.get(refId);
      return { name: s?.item_name ?? "Item pendukung", code: s?.item_code ?? "", unit: s?.unit ?? "" };
    };
  }, [equipment, supporting]);

  async function perform(values: ReturnForm) {
    if (!borrowing) return;
    try {
      const result = await ret.mutateAsync({
        id: borrowing.borrowing_id,
        data: {
          notes: values.notes || undefined,
          equipment: values.lines.filter((l) => l.kind === "eq").map((l) => ({
            detail_id: l.detail_id, final_condition: CONDITION_LABEL[l.final_condition], has_damage: l.has_damage,
            damage_notes: l.has_damage ? l.damage_notes : undefined, new_condition: l.final_condition,
          })),
          supporting: values.lines.filter((l) => l.kind === "sp" && l.quantity > 0).map((l) => ({
            supporting_detail_id: l.detail_id, quantity_returned_now: l.quantity, final_condition: CONDITION_LABEL[l.final_condition],
            has_damage: l.has_damage, damage_notes: l.has_damage ? l.damage_notes : undefined, new_condition: l.final_condition,
          })),
        },
      });
      const severe = values.lines.some((l) => l.has_damage && l.final_condition === "major_damage");
      if (severe) toast.warning("Pengembalian dicatat", { description: "Ada kerusakan berat. SPV dan teknisi sudah diberi notifikasi." });
      else toast.success("Pengembalian berhasil dicatat", { description: result.borrowing_status === "returned" ? "Seluruh item sudah kembali. Peminjaman selesai." : "Masih ada item yang belum dikembalikan." });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof ServiceError || e instanceof Error ? e.message : "Pengembalian gagal disimpan");
    }
  }

  const eqCount = pending?.lines.filter((l) => l.kind === "eq").length ?? 0;
  const spCount = pending?.lines.filter((l) => l.kind === "sp" && l.quantity > 0).length ?? 0;
  const severe = pending?.lines.some((l) => l.has_damage && l.final_condition === "major_damage") ?? false;

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={(o) => !ret.isPending && onOpenChange(o)}
        title="Form Pengembalian"
        description="Periksa kondisi akhir setiap item sebelum dikembalikan."
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-12 flex-1 sm:h-10" disabled={ret.isPending} onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" form="return-sheet-form" className="h-12 flex-[2] text-base sm:h-10 sm:text-sm" disabled={ret.isPending || fields.length === 0}>
              Kembalikan
            </Button>
          </div>
        }
      >
        <form id="return-sheet-form" noValidate onSubmit={form.handleSubmit((v) => setPending(v))} className="space-y-4 pb-2">
          {fields.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada item yang perlu dikembalikan.</p>}
          {fields.map((field, i) => {
            const meta = info(field.kind, field.ref_id);
            const cond = form.watch(`lines.${i}.final_condition`);
            const damaged = form.watch(`lines.${i}.has_damage`);
            const lineErr = errors.lines?.[i];
            return (
              <fieldset key={field.id} className="space-y-3 rounded-lg border p-3">
                <legend className="sr-only">{meta.name}</legend>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                    {field.kind === "eq" ? <Microscope className="size-5" /> : <Package className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{meta.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{meta.code}</p>
                  </div>
                </div>

                {field.kind === "sp" && (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Jumlah dikembalikan</p>
                      <p className="text-xs text-muted-foreground">Sisa dipinjam: {field.max_quantity} {meta.unit}</p>
                    </div>
                    <Controller control={form.control} name={`lines.${i}.quantity`} render={({ field: f }) => (
                      <QuantityStepper label={`jumlah ${meta.name} dikembalikan`} value={f.value} onChange={f.onChange} min={0} max={field.max_quantity} unit={meta.unit} />
                    )} />
                  </div>
                )}

                <div>
                  <p id={`cond-label-${i}`} className="mb-1.5 text-sm font-medium">Kondisi akhir</p>
                  <div role="radiogroup" aria-labelledby={`cond-label-${i}`} className="grid grid-cols-3 gap-2">
                    {CONDITIONS.map((c) => {
                      const selected = cond === c;
                      return (
                        <button
                          key={c} type="button" role="radio" aria-checked={selected}
                          onClick={() => {
                            form.setValue(`lines.${i}.final_condition`, c, { shouldValidate: true });
                            form.setValue(`lines.${i}.has_damage`, c !== "good", { shouldValidate: true });
                          }}
                          className={cn(
                            "min-h-12 rounded-lg border-2 px-2 text-center text-sm font-medium leading-tight transition-colors",
                            selected ? toneClass(CONDITION_META[c].tone) + " border-current" : "border-input bg-background hover:bg-accent",
                          )}
                        >
                          {CONDITION_META[c].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                    <input type="checkbox" className="size-5 rounded border-input accent-primary" {...form.register(`lines.${i}.has_damage`)} />
                    Ada kerusakan
                  </label>
                  {lineErr?.has_damage?.message && <p role="alert" className="text-xs font-medium text-destructive">{lineErr.has_damage.message}</p>}
                </div>

                {damaged && (
                  <Field label="Catatan kerusakan (wajib)" htmlFor={`damage-${i}`} error={lineErr?.damage_notes?.message}>
                    <Textarea id={`damage-${i}`} rows={3} placeholder="Jelaskan kerusakan yang terjadi" aria-invalid={!!lineErr?.damage_notes} {...form.register(`lines.${i}.damage_notes`)} />
                  </Field>
                )}
                {cond === "major_damage" && (
                  <p className="rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
                    Rusak berat: status berubah menjadi “Rusak” dan SPV serta teknisi akan diberi notifikasi.
                  </p>
                )}
                {lineErr?.quantity?.message && <p role="alert" className="text-xs font-medium text-destructive">{lineErr.quantity.message}</p>}
              </fieldset>
            );
          })}
          {errors.lines?.message && <p role="alert" className="text-sm font-medium text-destructive">{errors.lines.message}</p>}
          <Field label="Catatan pengembalian (opsional)" htmlFor="return-notes" error={errors.notes?.message}>
            <Textarea id="return-notes" rows={2} {...form.register("notes")} />
          </Field>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Kembalikan item ini?"
        description={
          <>
            {eqCount > 0 && `${eqCount} alat`}{eqCount > 0 && spCount > 0 && " dan "}{spCount > 0 && `${spCount} item pendukung`} akan dicatat sebagai dikembalikan.
            {severe && " Kerusakan berat akan menandai alat sebagai rusak dan memberi tahu SPV serta teknisi."}
          </>
        }
        confirmLabel="Ya, kembalikan"
        onConfirm={async () => { if (pending) await perform(pending); setPending(null); }}
      />
    </>
  );
}
