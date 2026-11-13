"use client";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/features/borrowing/field";
import { useCreateMaintenance, useEquipmentList, useUpdateMaintenance, useUsers } from "@/hooks";
import { maintenanceFormSchema, type MaintenanceFormValues } from "@/lib/schemas";
import { ServiceError } from "@/lib/services";
import { MAINTENANCE_STATUS_META, MAINTENANCE_TYPE_LABEL } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Maintenance, MaintenanceStatus } from "@/types/erd";
import { NEXT_STATUSES } from "./maintenance-shared";

const INPUT_FMT = "yyyy-MM-dd'T'HH:mm";
const fieldClass = "h-11 text-base sm:h-10 sm:text-sm";

const toValues = (m?: Maintenance): MaintenanceFormValues => ({
  equipment_id: m?.equipment_id ?? "", technician_id: m?.technician_id ?? "",
  maintenance_type: m?.maintenance_type ?? "routine", status: m?.status ?? "scheduled",
  maintenance_date: format(m ? new Date(m.maintenance_date) : new Date(), INPUT_FMT),
  description: m?.description ?? "", cost: m?.cost ?? 0,
  replaced_spare_parts: m?.replaced_spare_parts ?? "", notes: m?.notes ?? "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jika ada: mode edit. */
  maintenance?: Maintenance | null;
}

export function MaintenanceFormSheet({ open, onOpenChange, maintenance }: Props) {
  const equipment = useEquipmentList();
  const users = useUsers();
  const create = useCreateMaintenance();
  const update = useUpdateMaintenance();
  const form = useForm<MaintenanceFormValues>({ resolver: zodResolver(maintenanceFormSchema), defaultValues: toValues() });
  const { register, reset, handleSubmit, setError, formState: { errors } } = form;
  const isEdit = !!maintenance;
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) reset(toValues(maintenance ?? undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, maintenance?.maintenance_id]);

  const technicians = (users.data ?? []).filter((u) => u.role === "technician" || u.role === "SPV");
  const statusOptions: MaintenanceStatus[] = isEdit ? [maintenance!.status, ...NEXT_STATUSES[maintenance!.status]] : ["scheduled", "in_progress"];
  const locked = isEdit && NEXT_STATUSES[maintenance!.status].length === 0;

  async function onSubmit(v: MaintenanceFormValues) {
    const data = {
      ...v,
      description: v.description.trim(),
      maintenance_date: new Date(v.maintenance_date).toISOString(),
      completion_date: maintenance?.completion_date ?? null, // diisi otomatis saat status selesai
    };
    try {
      if (maintenance) await update.mutateAsync({ id: maintenance.maintenance_id, data });
      else await create.mutateAsync(data);
      toast.success(isEdit ? "Maintenance diperbarui" : "Maintenance dijadwalkan");
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "VALIDATION" && e.fieldErrors) {
        for (const [key, message] of Object.entries(e.fieldErrors)) {
          if (key in form.getValues()) setError(key as keyof MaintenanceFormValues, { message });
        }
      }
      toast.error(e instanceof Error ? e.message : "Maintenance gagal disimpan");
    }
  }

  return (
    <BottomSheet
      open={open} onOpenChange={(o) => !pending && onOpenChange(o)} size="lg"
      title={isEdit ? "Edit Maintenance" : "Jadwalkan Maintenance"}
      description="Status “Berlangsung” mengubah status alat menjadi Perawatan; “Selesai” mengembalikannya menjadi Tersedia."
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1 sm:h-10" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" form="maintenance-form" className="h-11 flex-[2] sm:h-10" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} {isEdit ? "Simpan perubahan" : "Simpan"}
          </Button>
        </div>
      }
    >
      <form id="maintenance-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pb-2">
        <Field label="Alat" htmlFor="mnt-equipment" error={errors.equipment_id?.message}>
          <NativeSelect id="mnt-equipment" className={cn("w-full", fieldClass)} aria-invalid={!!errors.equipment_id} disabled={isEdit || equipment.isLoading} {...register("equipment_id")}>
            <option value="">{equipment.isLoading ? "Memuat alat…" : "Pilih alat"}</option>
            {(equipment.data ?? []).map((e) => <option key={e.equipment_id} value={e.equipment_id}>{e.inventory_code} — {e.equipment_name}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teknisi" htmlFor="mnt-tech" error={errors.technician_id?.message}>
            <NativeSelect id="mnt-tech" className={cn("w-full", fieldClass)} aria-invalid={!!errors.technician_id} disabled={users.isLoading} {...register("technician_id")}>
              <option value="">{users.isLoading ? "Memuat…" : "Pilih teknisi"}</option>
              {technicians.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Tipe" htmlFor="mnt-type">
            <NativeSelect id="mnt-type" className={cn("w-full", fieldClass)} {...register("maintenance_type")}>
              {Object.entries(MAINTENANCE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal & waktu" htmlFor="mnt-date" error={errors.maintenance_date?.message}>
            <Input id="mnt-date" type="datetime-local" className={fieldClass} aria-invalid={!!errors.maintenance_date} {...register("maintenance_date")} />
          </Field>
          <Field label="Status" htmlFor="mnt-status" hint={locked ? "Status akhir tidak dapat diubah." : undefined}>
            <NativeSelect id="mnt-status" className={cn("w-full", fieldClass)} disabled={locked} {...register("status")}>
              {statusOptions.map((s) => <option key={s} value={s}>{MAINTENANCE_STATUS_META[s].label}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Deskripsi" htmlFor="mnt-desc" error={errors.description?.message}>
          <Textarea id="mnt-desc" rows={3} aria-invalid={!!errors.description} {...register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Biaya (Rp)" htmlFor="mnt-cost" error={errors.cost?.message}>
            <Input id="mnt-cost" type="number" inputMode="numeric" min={0} step={1000} className={fieldClass} aria-invalid={!!errors.cost} {...register("cost", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })} />
          </Field>
          <Field label="Suku cadang diganti" htmlFor="mnt-parts" error={errors.replaced_spare_parts?.message}>
            <Input id="mnt-parts" className={fieldClass} autoComplete="off" aria-invalid={!!errors.replaced_spare_parts} {...register("replaced_spare_parts")} />
          </Field>
        </div>
        <Field label="Catatan (opsional)" htmlFor="mnt-notes" error={errors.notes?.message}>
          <Textarea id="mnt-notes" rows={2} aria-invalid={!!errors.notes} {...register("notes")} />
        </Field>
      </form>
    </BottomSheet>
  );
}
