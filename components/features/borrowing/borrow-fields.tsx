"use client";
import { addDays, addHours, format } from "date-fns";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_BORROW_DAYS } from "@/lib/constants";
import { useRooms } from "@/hooks";
import type { BorrowDetailsForm } from "@/lib/schemas/borrow-forms";
import type { CreateBorrowingInput } from "@/lib/schemas";
import { Field } from "./field";

const INPUT_FMT = "yyyy-MM-dd'T'HH:mm";
const fieldClass = "h-12 text-base sm:h-10 sm:text-sm";

export const defaultBorrowDetails = (): BorrowDetailsForm => ({
  purpose: "",
  usage_location: "",
  expected_return_time: format(addDays(new Date(), DEFAULT_BORROW_DAYS), INPUT_FMT),
  notes: "",
});

export function toCreateBorrowingInput(
  values: BorrowDetailsForm,
  userId: string,
  equipmentIds: string[],
  supportingItems: { supporting_equipment_id: string; quantity: number }[],
): CreateBorrowingInput {
  return {
    user_id: userId,
    borrowing_time: new Date().toISOString(),
    expected_return_time: new Date(values.expected_return_time).toISOString(),
    purpose: values.purpose,
    usage_location: values.usage_location,
    notes: values.notes || undefined,
    equipment_ids: equipmentIds,
    supporting_items: supportingItems,
  };
}

/** Field tujuan, lokasi, perkiraan kembali (default +1 hari), catatan. */
export function BorrowDetailsFields({ form, idPrefix }: { form: UseFormReturn<BorrowDetailsForm>; idPrefix: string }) {
  const { register, setValue, formState: { errors } } = form;
  // Saran lokasi = daftar ruangan; pengguna tetap bebas mengetik lokasi lain.
  const { data: rooms = [] } = useRooms();
  const listId = `${idPrefix}-location-list`;
  const quick = [
    { label: "+4 jam", at: () => addHours(new Date(), 4) },
    { label: "Besok", at: () => addDays(new Date(), 1) },
    { label: "+3 hari", at: () => addDays(new Date(), 3) },
  ];
  return (
    <div className="space-y-4">
      <Field label="Tujuan penggunaan" htmlFor={`${idPrefix}-purpose`} error={errors.purpose?.message}>
        <Input id={`${idPrefix}-purpose`} className={fieldClass} placeholder="Mis. Uji stabilitas sampel batch 12" autoComplete="off" aria-invalid={!!errors.purpose} {...register("purpose")} />
      </Field>
      <Field label="Lokasi penggunaan" htmlFor={`${idPrefix}-location`} error={errors.usage_location?.message} hint="Pilih dari daftar ruangan, atau ketik lokasi lain.">
        <Input id={`${idPrefix}-location`} className={fieldClass} list={listId} placeholder="Pilih ruangan atau ketik lokasi" autoComplete="off" aria-invalid={!!errors.usage_location} {...register("usage_location")} />
        <datalist id={listId}>
          {rooms.map((r) => <option key={r.room_id} value={r.room_name}>{r.room_code}</option>)}
        </datalist>
      </Field>
      <Field label="Perkiraan waktu kembali" htmlFor={`${idPrefix}-return`} error={errors.expected_return_time?.message}>
        <Input id={`${idPrefix}-return`} type="datetime-local" className={fieldClass} aria-invalid={!!errors.expected_return_time} {...register("expected_return_time")} />
        <div className="flex flex-wrap gap-2 pt-1">
          {quick.map((q) => (
            <Button key={q.label} type="button" variant="outline" size="sm" className="h-9" onClick={() => setValue("expected_return_time", format(q.at(), INPUT_FMT), { shouldValidate: true })}>
              {q.label}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Catatan (opsional)" htmlFor={`${idPrefix}-notes`} error={errors.notes?.message}>
        <Textarea id={`${idPrefix}-notes`} rows={2} aria-invalid={!!errors.notes} {...register("notes")} />
      </Field>
    </div>
  );
}
