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
import { createEquipmentSchema, type CreateEquipmentInput } from "@/lib/schemas";
import { ServiceError, equipmentService } from "@/lib/services";
import { EQUIPMENT_STATUS_META, CONDITION_META } from "@/lib/status";
import { useCreateEquipment, useUpdateEquipment, useRooms } from "@/hooks";
import { QrSuccessDialog } from "./qr-success-dialog";
import type { Condition, Equipment, EquipmentStatus } from "@/types/erd";

const EMPTY: CreateEquipmentInput = {
  inventory_code: "", equipment_name: "", equipment_type: "", brand: "", model: "", room_id: "",
  status: "available", condition: "good", purchase_date: null, purchase_price: null, useful_life_years: null,
  specifications: null, next_calibration_date: null,
};

/** Ambil hanya field yang ada di skema (skema .strict() menolak equipment_id, qr_token, dst). */
const toFormValues = (e: Equipment): CreateEquipmentInput =>
  Object.fromEntries(Object.keys(EMPTY).map((k) => [k, e[k as keyof Equipment]])) as unknown as CreateEquipmentInput;

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

export function EquipmentForm({ equipment }: { equipment?: Equipment }) {
  const router = useRouter();
  const editing = !!equipment;
  const { data: rooms = [] } = useRooms();
  const create = useCreateEquipment();
  const update = useUpdateEquipment();
  const [created, setCreated] = useState<Equipment | null>(null);

  const form = useForm<CreateEquipmentInput>({
    resolver: zodResolver(createEquipmentSchema),
    defaultValues: equipment ? toFormValues(equipment) : EMPTY,
  });
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = form;

  // Sinkronkan saat data edit selesai dimuat.
  useEffect(() => { if (equipment) reset(toFormValues(equipment)); }, [equipment, reset]);

  // Kolom opsional: kosong = null (tidak diketahui / tidak berlaku).
  const numberOpts = { setValueAs: (v: string) => (v === "" || v == null ? null : Number(v)) };
  const textOrNull = { setValueAs: (v: string) => (v === "" || v == null ? null : v) };

  async function onSubmit(values: CreateEquipmentInput) {
    try {
      const taken = await equipmentService.isInventoryCodeTaken(values.inventory_code, equipment?.equipment_id);
      if (taken) {
        setError("inventory_code", { message: "Kode inventaris sudah digunakan" });
        return;
      }
      const payload = { ...values, next_calibration_date: values.next_calibration_date || null };
      if (editing) {
        await update.mutateAsync({ id: equipment.equipment_id, data: payload });
        toast.success("Perubahan disimpan");
        router.push(`/equipment/${equipment.equipment_id}`);
      } else {
        setCreated(await create.mutateAsync(payload));
      }
    } catch (e) {
      if (e instanceof ServiceError && e.code === "VALIDATION" && e.fieldErrors) {
        const known = form.getValues();
        for (const [key, message] of Object.entries(e.fieldErrors)) {
          if (key in known) setError(key as keyof CreateEquipmentInput, { message });
        }
      }
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan alat");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Identitas alat</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode inventaris" htmlFor="inventory_code" error={errors.inventory_code?.message}>
              <Input id="inventory_code" aria-invalid={!!errors.inventory_code} {...register("inventory_code")} />
            </Field>
            <Field label="Nama alat" htmlFor="equipment_name" error={errors.equipment_name?.message}>
              <Input id="equipment_name" aria-invalid={!!errors.equipment_name} {...register("equipment_name")} />
            </Field>
            <Field label="Jenis alat" htmlFor="equipment_type" error={errors.equipment_type?.message} hint="Opsional.">
              <Input id="equipment_type" aria-invalid={!!errors.equipment_type} {...register("equipment_type")} />
            </Field>
            <Field label="Ruangan" htmlFor="room_id" error={errors.room_id?.message}>
              <NativeSelect id="room_id" className="w-full" aria-invalid={!!errors.room_id} {...register("room_id")}>
                <option value="">Pilih ruangan…</option>
                {rooms.map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code} — {r.room_name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Merek" htmlFor="brand" error={errors.brand?.message} hint="Opsional.">
              <Input id="brand" aria-invalid={!!errors.brand} {...register("brand")} />
            </Field>
            <Field label="Model" htmlFor="model" error={errors.model?.message} hint="Opsional.">
              <Input id="model" aria-invalid={!!errors.model} {...register("model")} />
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status?.message}>
              <NativeSelect id="status" className="w-full" {...register("status")}>
                {(Object.keys(EQUIPMENT_STATUS_META) as EquipmentStatus[]).map((s) => <option key={s} value={s}>{EQUIPMENT_STATUS_META[s].label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Kondisi" htmlFor="condition" error={errors.condition?.message}>
              <NativeSelect id="condition" className="w-full" {...register("condition", textOrNull)}>
                <option value="">Belum dinilai</option>
                {(Object.keys(CONDITION_META) as Condition[]).map((c) => <option key={c} value={c}>{CONDITION_META[c].label}</option>)}
              </NativeSelect>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pembelian & kalibrasi</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal pembelian" htmlFor="purchase_date" error={errors.purchase_date?.message} hint="Opsional.">
              <Input id="purchase_date" type="date" aria-invalid={!!errors.purchase_date} {...register("purchase_date", textOrNull)} />
            </Field>
            <Field label="Harga beli (Rp)" htmlFor="purchase_price" error={errors.purchase_price?.message} hint="Opsional.">
              <Input id="purchase_price" type="number" min={0} step="any" inputMode="decimal" aria-invalid={!!errors.purchase_price} {...register("purchase_price", numberOpts)} />
            </Field>
            <Field label="Masa manfaat (tahun)" htmlFor="useful_life_years" error={errors.useful_life_years?.message} hint="Opsional.">
              <Input id="useful_life_years" type="number" min={1} step={1} aria-invalid={!!errors.useful_life_years} {...register("useful_life_years", numberOpts)} />
            </Field>
            <Field label="Kalibrasi berikutnya" htmlFor="next_calibration_date" error={errors.next_calibration_date?.message}
              hint="Kosongkan jika alat tidak perlu kalibrasi. Diperbarui otomatis dari kalibrasi terbaru yang lulus.">
              <Input id="next_calibration_date" type="date" {...register("next_calibration_date", { setValueAs: (v) => v || null })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spesifikasi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Spesifikasi" htmlFor="specifications" error={errors.specifications?.message}>
              <textarea id="specifications" rows={4} {...register("specifications", textOrNull)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground" />
            </Field>
            {editing && (
              <Field label="QR token" htmlFor="qr_token" hint="Dibuat otomatis satu kali dan tidak dapat diubah.">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="qr_token" readOnly value={equipment.qr_token} className="bg-muted pl-9 font-mono" />
                </div>
              </Field>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(editing ? `/equipment/${equipment.equipment_id}` : "/equipment")}>Batal</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {editing ? "Simpan perubahan" : "Simpan alat"}
          </Button>
        </div>
      </form>

      <QrSuccessDialog
        equipment={created}
        onClose={() => router.push("/equipment")}
        onViewDetail={() => created && router.push(`/equipment/${created.equipment_id}`)}
        onAddAnother={() => { setCreated(null); reset(EMPTY); }}
      />
    </>
  );
}
