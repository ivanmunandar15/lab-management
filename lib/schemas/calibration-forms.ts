import { z } from "zod";
import { calibrationResultSchema, maintenanceStatusSchema, maintenanceTypeSchema } from "./enums";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi");
const cost = z.number({ invalid_type_error: "Biaya harus berupa angka" }).nonnegative("Biaya tidak boleh negatif");

/** Nilai form catat kalibrasi (tanggal yyyy-MM-dd dari input type=date). */
export const calibrationFormSchema = z
  .object({
    equipment_id: z.string().min(1, "Pilih alat"),
    calibration_date: isoDate,
    next_calibration_date: isoDate,
    calibration_provider: z.string().trim().min(1, "Penyedia kalibrasi wajib diisi").max(150),
    certificate_number: z.string().trim().min(1, "Nomor sertifikat wajib diisi").max(100),
    calibration_result: calibrationResultSchema,
    failed_status: z.enum(["calibration", "damaged"]),
    cost,
    notes: z.string().max(5000, "Maksimal 5000 karakter"),
  })
  .refine((d) => d.next_calibration_date > d.calibration_date, {
    message: "Harus setelah tanggal kalibrasi", path: ["next_calibration_date"],
  });
export type CalibrationFormValues = z.infer<typeof calibrationFormSchema>;

/** Nilai form maintenance (waktu dari input datetime-local). */
export const maintenanceFormSchema = z.object({
  equipment_id: z.string().min(1, "Pilih alat"),
  technician_id: z.string().min(1, "Pilih teknisi"),
  maintenance_type: maintenanceTypeSchema,
  status: maintenanceStatusSchema,
  maintenance_date: z.string().min(1, "Tanggal wajib diisi"),
  description: z.string().trim().min(1, "Deskripsi wajib diisi").max(2000, "Maksimal 2000 karakter"),
  cost,
  replaced_spare_parts: z.string().max(1000, "Maksimal 1000 karakter"),
  notes: z.string().max(5000, "Maksimal 5000 karakter"),
});
export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;
