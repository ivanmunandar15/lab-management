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
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/features/borrowing/field";
import { useCreateRoom, useUpdateRoom, useUsers } from "@/hooks";
import { ServiceError } from "@/lib/services";
import type { Room } from "@/types/erd";

const schema = z.object({
  room_code: z.string().trim().min(1, "Kode ruangan wajib diisi").max(30),
  room_name: z.string().trim().min(1, "Nama ruangan wajib diisi").max(100),
  equipment_capacity: z.number({ invalid_type_error: "Kapasitas harus berupa angka" }).int("Harus bilangan bulat").min(1, "Minimal 1"),
  person_in_charge: z.string().min(1, "Pilih penanggung jawab"),
  description: z.string().max(5000),
});
type Values = z.infer<typeof schema>;
const toValues = (r?: Room | null): Values => ({
  room_code: r?.room_code ?? "", room_name: r?.room_name ?? "", equipment_capacity: r?.equipment_capacity ?? 10,
  person_in_charge: r?.person_in_charge ?? "", description: r?.description ?? "",
});
const fieldClass = "h-11 w-full text-base sm:h-10 sm:text-sm";

export function RoomFormSheet({ open, onOpenChange, room }: { open: boolean; onOpenChange: (o: boolean) => void; room?: Room | null }) {
  const users = useUsers();
  const create = useCreateRoom();
  const update = useUpdateRoom();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues() });
  const { register, reset, handleSubmit, setError, formState: { errors } } = form;
  const isEdit = !!room;
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) reset(toValues(room));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room?.room_id]);

  async function onSubmit(v: Values) {
    try {
      if (room) await update.mutateAsync({ id: room.room_id, data: v });
      else await create.mutateAsync(v);
      toast.success(isEdit ? "Ruangan diperbarui" : "Ruangan ditambahkan");
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "VALIDATION" && e.fieldErrors) {
        for (const [k, message] of Object.entries(e.fieldErrors)) if (k in form.getValues()) setError(k as keyof Values, { message });
      } else if (e instanceof ServiceError && e.code === "CONFLICT") setError("room_code", { message: e.message });
      toast.error(e instanceof Error ? e.message : "Ruangan gagal disimpan");
    }
  }

  return (
    <BottomSheet
      open={open} onOpenChange={(o) => !pending && onOpenChange(o)} title={isEdit ? "Edit Ruangan" : "Tambah Ruangan"}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1 sm:h-10" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" form="room-form" className="h-11 flex-[2] sm:h-10" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Simpan</Button>
        </div>
      }
    >
      <form id="room-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pb-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode ruangan" htmlFor="room-code" error={errors.room_code?.message}>
            <Input id="room-code" className={fieldClass} placeholder="R-KIM" autoComplete="off" aria-invalid={!!errors.room_code} {...register("room_code")} />
          </Field>
          <Field label="Kapasitas alat" htmlFor="room-cap" error={errors.equipment_capacity?.message}>
            <Input id="room-cap" type="number" min={1} inputMode="numeric" className={fieldClass} aria-invalid={!!errors.equipment_capacity} {...register("equipment_capacity", { valueAsNumber: true })} />
          </Field>
        </div>
        <Field label="Nama ruangan" htmlFor="room-name" error={errors.room_name?.message}>
          <Input id="room-name" className={fieldClass} autoComplete="off" aria-invalid={!!errors.room_name} {...register("room_name")} />
        </Field>
        <Field label="Penanggung jawab" htmlFor="room-pic" error={errors.person_in_charge?.message}>
          <NativeSelect id="room-pic" className={fieldClass} aria-invalid={!!errors.person_in_charge} {...register("person_in_charge")}>
            <option value="">Pilih penanggung jawab</option>
            {(users.data ?? []).map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Deskripsi (opsional)" htmlFor="room-desc" error={errors.description?.message}>
          <Textarea id="room-desc" rows={3} {...register("description")} />
        </Field>
      </form>
    </BottomSheet>
  );
}
