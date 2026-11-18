"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { Field } from "@/components/features/borrowing/field";
import { useCalibrations, useCreateCalibration, useEquipmentList } from "@/hooks";
import { CERTIFICATE_ACCEPT, CERTIFICATE_MAX_BYTES, readFileAsDataUrl } from "@/lib/certificate";
import { calibrationFormSchema, type CalibrationFormValues } from "@/lib/schemas";
import { ServiceError } from "@/lib/services";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_DAYS = 365;
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const fieldClass = "h-11 text-base sm:h-10 sm:text-sm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Alat yang dipilih di awal (mis. dari baris tabel). */
  equipmentId?: string;
}

export function CalibrationFormSheet({ open, onOpenChange, equipmentId }: Props) {
  const { data: session } = useSession();
  const equipment = useEquipmentList();
  const calibrations = useCalibrations();
  const create = useCreateCalibration();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [nextTouched, setNextTouched] = useState(false);
  const [confirmValues, setConfirmValues] = useState<CalibrationFormValues | null>(null);

  const form = useForm<CalibrationFormValues>({
    resolver: zodResolver(calibrationFormSchema),
    defaultValues: blank(equipmentId),
  });
  const { register, watch, setValue, reset, handleSubmit, setError, formState: { errors } } = form;
  const [eqId, calDate, result] = watch(["equipment_id", "calibration_date", "calibration_result"]);

  useEffect(() => {
    if (!open) return;
    reset(blank(equipmentId));
    setFile(null); setFileError(undefined); setNextTouched(false); setConfirmValues(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipmentId]);

  /** Interval = selisih kalibrasi terakhir alat ini (tanggal -> berikutnya); default 365 hari. */
  const interval = useMemo(() => {
    const last = (calibrations.data ?? []).find((c) => c.equipment_id === eqId);
    if (!last) return DEFAULT_INTERVAL_DAYS;
    const days = differenceInCalendarDays(parseISO(last.next_calibration_date), parseISO(last.calibration_date));
    return days > 0 ? days : DEFAULT_INTERVAL_DAYS;
  }, [calibrations.data, eqId]);

  useEffect(() => {
    if (nextTouched || !calDate) return;
    const d = parseISO(calDate);
    if (!Number.isNaN(d.getTime())) setValue("next_calibration_date", ymd(addDays(d, interval)), { shouldValidate: !!errors.next_calibration_date });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calDate, interval, nextTouched]);

  function pickFile(f: File | undefined) {
    setFileError(undefined);
    if (!f) return setFile(null);
    if (!CERTIFICATE_ACCEPT.split(",").includes(f.type)) return setFileError("Format harus PDF, PNG, atau JPG");
    if (f.size > CERTIFICATE_MAX_BYTES) return setFileError("Ukuran file maksimal 5 MB");
    setFile(f);
  }

  async function save(values: CalibrationFormValues) {
    const technicianId = session?.user?.id;
    if (!technicianId) return void toast.error("Sesi login tidak ditemukan. Silakan login ulang.");
    try {
      const { failed_status, ...rest } = values;
      const certificate_file_url = file ? await readFileAsDataUrl(file) : "";
      await create.mutateAsync({
        data: { ...rest, notes: rest.notes.trim(), technician_id: technicianId, certificate_file_url },
        options: { failedStatus: failed_status },
      });
      toast.success("Kalibrasi tercatat", {
        description: values.calibration_result === "passed"
          ? "Jadwal kalibrasi berikutnya alat diperbarui."
          : `Hasil gagal: status alat diubah menjadi ${failed_status === "damaged" ? "Rusak" : "Kalibrasi"}.`,
      });
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "VALIDATION" && e.fieldErrors) {
        for (const [key, message] of Object.entries(e.fieldErrors)) {
          if (key in form.getValues()) setError(key as keyof CalibrationFormValues, { message });
        }
      }
      toast.error(e instanceof Error ? e.message : "Kalibrasi gagal disimpan");
    }
  }

  const onValid = (v: CalibrationFormValues) => (v.calibration_result === "failed" ? setConfirmValues(v) : save(v));
  const pending = create.isPending;
  const failedLabel = confirmValues?.failed_status === "damaged" ? "Rusak" : "Kalibrasi";

  return (
    <>
      <BottomSheet
        open={open} onOpenChange={(o) => !pending && onOpenChange(o)} size="lg"
        title="Catat Kalibrasi" description="Hasil lulus memperbarui jadwal kalibrasi alat. Hasil gagal mengubah status alat."
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1 sm:h-10" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" form="calibration-form" className="h-11 flex-[2] sm:h-10" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Simpan kalibrasi
            </Button>
          </div>
        }
      >
        <form id="calibration-form" onSubmit={handleSubmit(onValid)} noValidate className="space-y-4 pb-2">
          <Field label="Alat" htmlFor="cal-equipment" error={errors.equipment_id?.message}>
            <NativeSelect id="cal-equipment" className={cn("w-full", fieldClass)} aria-invalid={!!errors.equipment_id} disabled={equipment.isLoading} {...register("equipment_id")}>
              <option value="">{equipment.isLoading ? "Memuat alat…" : "Pilih alat"}</option>
              {(equipment.data ?? []).map((e) => <option key={e.equipment_id} value={e.equipment_id}>{e.inventory_code} — {e.equipment_name}</option>)}
            </NativeSelect>
          </Field>
          {equipment.isError && <p role="alert" className="text-xs font-medium text-destructive">Daftar alat gagal dimuat. Tutup lalu buka form lagi.</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal kalibrasi" htmlFor="cal-date" error={errors.calibration_date?.message}>
              <Input id="cal-date" type="date" className={fieldClass} max={ymd(new Date())} aria-invalid={!!errors.calibration_date} {...register("calibration_date")} />
            </Field>
            <Field label="Kalibrasi berikutnya" htmlFor="cal-next" error={errors.next_calibration_date?.message}
              hint={nextTouched ? "Diubah manual." : `Otomatis: tanggal + ${interval} hari. Bisa diubah.`}>
              <Input id="cal-next" type="date" className={fieldClass} aria-invalid={!!errors.next_calibration_date}
                {...register("next_calibration_date", { onChange: () => setNextTouched(true) })} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Penyedia kalibrasi" htmlFor="cal-provider" error={errors.calibration_provider?.message}>
              <Input id="cal-provider" className={fieldClass} autoComplete="off" aria-invalid={!!errors.calibration_provider} {...register("calibration_provider")} />
            </Field>
            <Field label="Nomor sertifikat" htmlFor="cal-cert" error={errors.certificate_number?.message}>
              <Input id="cal-cert" className={fieldClass} autoComplete="off" placeholder="CAL/2026/0001" aria-invalid={!!errors.certificate_number} {...register("certificate_number")} />
            </Field>
          </div>

          <Field label="File sertifikat (opsional)" htmlFor="cal-file" error={fileError} hint="PDF, PNG, atau JPG. Maksimal 5 MB.">
            <input ref={fileRef} id="cal-file" type="file" accept={CERTIFICATE_ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            {file ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Hapus file" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}><X /></Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="h-11 w-full justify-start sm:h-10" onClick={() => fileRef.current?.click()}><Upload /> Pilih file sertifikat</Button>
            )}
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Hasil kalibrasi</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["passed", "failed"] as const).map((r) => (
                <label key={r} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  result === r && (r === "passed" ? "border-green-500 bg-green-50 dark:bg-green-500/10" : "border-red-500 bg-red-50 dark:bg-red-500/10"))}>
                  <input type="radio" value={r} className="accent-primary" {...register("calibration_result")} />
                  {r === "passed" ? "Lulus" : "Gagal"}
                </label>
              ))}
            </div>
          </fieldset>

          {result === "failed" && (
            <Field label="Status alat setelah gagal" htmlFor="cal-failed-status" hint="Alat tidak dapat digunakan selama berstatus ini.">
              <NativeSelect id="cal-failed-status" className={cn("w-full", fieldClass)} {...register("failed_status")}>
                <option value="calibration">Kalibrasi (menunggu kalibrasi ulang)</option>
                <option value="damaged">Rusak</option>
              </NativeSelect>
            </Field>
          )}

          <Field label="Biaya (Rp)" htmlFor="cal-cost" error={errors.cost?.message}>
            <Input id="cal-cost" type="number" inputMode="numeric" min={0} step={1000} className={fieldClass} aria-invalid={!!errors.cost} {...register("cost", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })} />
          </Field>
          <Field label="Catatan (opsional)" htmlFor="cal-notes" error={errors.notes?.message}>
            <Textarea id="cal-notes" rows={2} aria-invalid={!!errors.notes} {...register("notes")} />
          </Field>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmValues} onOpenChange={(o) => !o && setConfirmValues(null)}
        title="Simpan hasil kalibrasi gagal?" variant="destructive" confirmLabel="Ya, simpan"
        description={`Status alat akan berubah menjadi “${failedLabel}” dan tidak dapat digunakan sampai ditangani. Tindakan ini tercatat di activity log.`}
        onConfirm={async () => { if (confirmValues) await save(confirmValues); }}
      />
    </>
  );
}

function blank(equipmentId?: string): CalibrationFormValues {
  const today = new Date();
  return {
    equipment_id: equipmentId ?? "", calibration_date: ymd(today), next_calibration_date: ymd(addDays(today, DEFAULT_INTERVAL_DAYS)),
    calibration_provider: "", certificate_number: "", calibration_result: "passed", failed_status: "calibration", cost: 0, notes: "",
  };
}
