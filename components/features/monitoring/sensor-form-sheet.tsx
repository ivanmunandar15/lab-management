"use client";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/features/borrowing/field";
import { useCreateSensor, useRooms, useUpdateSensor } from "@/hooks";
import { sensorStatusSchema, sensorTypeSchema } from "@/lib/schemas";
import { ServiceError } from "@/lib/services";
import { SENSOR_STATUS_META } from "@/lib/status";
import type { Sensor, SensorType } from "@/types/erd";

const num = (label: string) => z.number({ invalid_type_error: `${label} harus berupa angka` });
const schema = z.object({
  room_id: z.string().min(1, "Pilih ruangan"),
  sensor_code: z.string().trim().min(1, "Kode sensor wajib diisi").max(50),
  sensor_type: sensorTypeSchema,
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(20),
  sensor_location: z.string().trim().min(1, "Lokasi wajib diisi").max(150),
  sensor_status: sensorStatusSchema,
  min_threshold: num("Batas minimum"),
  max_threshold: num("Batas maksimum"),
}).refine((d) => d.min_threshold < d.max_threshold, { message: "Harus lebih kecil dari batas maksimum", path: ["min_threshold"] });
type Values = z.infer<typeof schema>;

const DEFAULTS: Record<SensorType, { unit: string; min: number; max: number }> = {
  temperature: { unit: "°C", min: 18, max: 25 },
  humidity: { unit: "%RH", min: 40, max: 60 },
};
const toValues = (s?: Sensor | null, roomId?: string): Values => s ? {
  room_id: s.room_id, sensor_code: s.sensor_code, sensor_type: s.sensor_type, unit: s.unit, sensor_location: s.sensor_location,
  sensor_status: s.sensor_status, min_threshold: s.min_threshold, max_threshold: s.max_threshold,
} : { room_id: roomId ?? "", sensor_code: "", sensor_type: "temperature", unit: "°C", sensor_location: "", sensor_status: "active", min_threshold: 18, max_threshold: 25 };

const fieldClass = "h-11 w-full text-base sm:h-10 sm:text-sm";

export function SensorFormSheet({ open, onOpenChange, sensor, roomId }: {
  open: boolean; onOpenChange: (o: boolean) => void; sensor?: Sensor | null; roomId?: string;
}) {
  const rooms = useRooms();
  const create = useCreateSensor();
  const update = useUpdateSensor();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues() });
  const { register, reset, setValue, handleSubmit, setError, formState: { errors } } = form;
  const isEdit = !!sensor;
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) reset(toValues(sensor, roomId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sensor?.sensor_id, roomId]);

  async function onSubmit(v: Values) {
    try {
      if (sensor) await update.mutateAsync({ id: sensor.sensor_id, data: v });
      else await create.mutateAsync(v);
      toast.success(isEdit ? "Sensor diperbarui" : "Sensor ditambahkan");
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "VALIDATION" && e.fieldErrors) {
        for (const [k, message] of Object.entries(e.fieldErrors)) if (k in form.getValues()) setError(k as keyof Values, { message });
      }
      toast.error(e instanceof Error ? e.message : "Sensor gagal disimpan");
    }
  }

  return (
    <BottomSheet
      open={open} onOpenChange={(o) => !pending && onOpenChange(o)} title={isEdit ? "Edit Sensor" : "Tambah Sensor"}
      description="Batas min/maks menentukan nilai normal. Pembacaan di luar batas ditandai merah."
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1 sm:h-10" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" form="sensor-form" className="h-11 flex-[2] sm:h-10" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Simpan</Button>
        </div>
      }
    >
      <form id="sensor-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pb-2">
        <Field label="Ruangan" htmlFor="sen-room" error={errors.room_id?.message}>
          <NativeSelect id="sen-room" className={fieldClass} aria-invalid={!!errors.room_id} {...register("room_id")}>
            <option value="">Pilih ruangan</option>
            {(rooms.data ?? []).map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code} — {r.room_name}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode sensor" htmlFor="sen-code" error={errors.sensor_code?.message}>
            <Input id="sen-code" className={fieldClass} placeholder="TEMP-KIM-02" autoComplete="off" aria-invalid={!!errors.sensor_code} {...register("sensor_code")} />
          </Field>
          <Field label="Jenis" htmlFor="sen-type">
            <NativeSelect id="sen-type" className={fieldClass}
              {...register("sensor_type", { onChange: (e) => {
                if (isEdit) return;
                const d = DEFAULTS[e.target.value as SensorType];
                setValue("unit", d.unit); setValue("min_threshold", d.min); setValue("max_threshold", d.max);
              } })}>
              <option value="temperature">Suhu</option>
              <option value="humidity">Kelembapan</option>
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lokasi sensor" htmlFor="sen-loc" error={errors.sensor_location?.message}>
            <Input id="sen-loc" className={fieldClass} autoComplete="off" aria-invalid={!!errors.sensor_location} {...register("sensor_location")} />
          </Field>
          <Field label="Status" htmlFor="sen-status">
            <NativeSelect id="sen-status" className={fieldClass} {...register("sensor_status")}>
              {Object.entries(SENSOR_STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Satuan" htmlFor="sen-unit" error={errors.unit?.message}>
            <Input id="sen-unit" className={fieldClass} aria-invalid={!!errors.unit} {...register("unit")} />
          </Field>
          <Field label="Batas minimum" htmlFor="sen-min" error={errors.min_threshold?.message}>
            <Input id="sen-min" type="number" step="0.1" inputMode="decimal" className={fieldClass} aria-invalid={!!errors.min_threshold} {...register("min_threshold", { valueAsNumber: true })} />
          </Field>
          <Field label="Batas maksimum" htmlFor="sen-max" error={errors.max_threshold?.message}>
            <Input id="sen-max" type="number" step="0.1" inputMode="decimal" className={fieldClass} aria-invalid={!!errors.max_threshold} {...register("max_threshold", { valueAsNumber: true })} />
          </Field>
        </div>
      </form>
    </BottomSheet>
  );
}
