"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrSuccessDialog } from "@/components/features/equipment/qr-success-dialog";
import { createSupportingEquipmentSchema, type CreateSupportingEquipmentInput } from "@/lib/schemas";
import { supportingEquipmentService } from "@/lib/services";
import { CONDITION_META } from "@/lib/status";
import { useCreateSupportingEquipment, useUpdateSupportingEquipment } from "@/hooks";
import type { Condition, SupportingEquipment } from "@/types/erd";

const EMPTY: CreateSupportingEquipmentInput = {
  item_code: "", item_name: "", item_type: "", brand: "", model: "", unit: "pcs", total_quantity: 1,
  condition: "good", description: "", specifications: "",
};

/** Skema .strict(): hanya kirim field yang dikenal (bukan qr_token, available_quantity, dst). */
const toFormValues = (s: SupportingEquipment): CreateSupportingEquipmentInput =>
  Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k as keyof SupportingEquipment]])) as unknown as CreateSupportingEquipmentInput;

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const textareaCls = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground";

export function SupportingForm({ item }: { item?: SupportingEquipment }) {
  const router = useRouter();
  const editing = !!item;
  const create = useCreateSupportingEquipment();
  const update = useUpdateSupportingEquipment();
  const [created, setCreated] = useState<SupportingEquipment | null>(null);
  const borrowed = item ? item.total_quantity - item.available_quantity : 0;

  const form = useForm<CreateSupportingEquipmentInput>({
    resolver: zodResolver(createSupportingEquipmentSchema),
    defaultValues: item ? toFormValues(item) : EMPTY,
  });
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = form;
  useEffect(() => { if (item) reset(toFormValues(item)); }, [item, reset]);

  async function onSubmit(values: CreateSupportingEquipmentInput) {
    try {
      if (await supportingEquipmentService.isItemCodeTaken(values.item_code, item?.supporting_equipment_id)) {
        setError("item_code", { message: "Kode item sudah digunakan" });
        return;
      }
      if (editing) {
        if (values.total_quantity < borrowed) {
          setError("total_quantity", { message: `Tidak boleh kurang dari jumlah yang sedang dipinjam (${borrowed})` });
          return;
        }
        await update.mutateAsync({ id: item.supporting_equipment_id, data: values });
        toast.success("Perubahan disimpan");
        router.push(`/supporting-equipment/${item.supporting_equipment_id}`);
      } else {
        setCreated(await create.mutateAsync(values)); // available_quantity awal = total_quantity (diatur service)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan item");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Identitas item</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode item" htmlFor="item_code" error={errors.item_code?.message}><Input id="item_code" aria-invalid={!!errors.item_code} {...register("item_code")} /></Field>
            <Field label="Nama item" htmlFor="item_name" error={errors.item_name?.message}><Input id="item_name" aria-invalid={!!errors.item_name} {...register("item_name")} /></Field>
            <Field label="Jenis item" htmlFor="item_type" error={errors.item_type?.message}><Input id="item_type" aria-invalid={!!errors.item_type} {...register("item_type")} /></Field>
            <Field label="Kondisi" htmlFor="condition" error={errors.condition?.message} hint="Kondisi rusak berat membuat status item menjadi Rusak.">
              <NativeSelect id="condition" className="w-full" {...register("condition")}>
                {(Object.keys(CONDITION_META) as Condition[]).map((c) => <option key={c} value={c}>{CONDITION_META[c].label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Merek" htmlFor="brand" error={errors.brand?.message}><Input id="brand" aria-invalid={!!errors.brand} {...register("brand")} /></Field>
            <Field label="Model (opsional)" htmlFor="model" error={errors.model?.message}><Input id="model" {...register("model")} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stok</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Satuan" htmlFor="unit" error={errors.unit?.message}><Input id="unit" placeholder="pcs, set, botol…" aria-invalid={!!errors.unit} {...register("unit")} /></Field>
            <Field label="Jumlah total" htmlFor="total_quantity" error={errors.total_quantity?.message}
              hint={editing ? `Sedang dipinjam: ${borrowed}. Jumlah tersedia ikut menyesuaikan.` : "Jumlah tersedia awal otomatis sama dengan jumlah total."}>
              <Input id="total_quantity" type="number" min={1} step={1} aria-invalid={!!errors.total_quantity}
                {...register("total_quantity", { setValueAs: (v: string) => (v === "" || v == null ? NaN : Number(v)) })} />
            </Field>
            {editing && (
              <Field label="Jumlah tersedia" htmlFor="available_quantity" hint="Dihitung otomatis dari peminjaman; tidak bisa diedit.">
                <Input id="available_quantity" readOnly value={item.available_quantity} className="bg-muted" />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Keterangan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Deskripsi" htmlFor="description" error={errors.description?.message}><textarea id="description" rows={3} className={textareaCls} {...register("description")} /></Field>
            <Field label="Spesifikasi" htmlFor="specifications" error={errors.specifications?.message}><textarea id="specifications" rows={3} className={textareaCls} {...register("specifications")} /></Field>
            {editing && (
              <Field label="QR token" htmlFor="qr_token" hint="QR mewakili jenis item ini. Dibuat otomatis satu kali dan tidak dapat diubah.">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="qr_token" readOnly value={item.qr_token} className="bg-muted pl-9 font-mono" />
                </div>
              </Field>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(editing ? `/supporting-equipment/${item.supporting_equipment_id}` : "/supporting-equipment")}>Batal</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />}{editing ? "Simpan perubahan" : "Simpan item"}</Button>
        </div>
      </form>

      <QrSuccessDialog
        type="sp" noun="item"
        equipment={created && { qr_token: created.qr_token, inventory_code: created.item_code, equipment_name: created.item_name }}
        onClose={() => router.push("/supporting-equipment")}
        onViewDetail={() => created && router.push(`/supporting-equipment/${created.supporting_equipment_id}`)}
        onAddAnother={() => { setCreated(null); reset(EMPTY); }}
      />
    </>
  );
}
