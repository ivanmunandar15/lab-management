import { z } from "zod";
import { QR_TOKEN_LENGTH } from "@/lib/constants";
import {
  borrowingStatusSchema, calibrationResultSchema, conditionSchema, documentTypeSchema, equipmentStatusSchema,
  maintenanceStatusSchema, maintenanceTypeSchema, notificationTypeSchema, roleSchema, sensorStatusSchema,
  sensorTypeSchema, supportingStatusSchema,
} from "./enums";
import type {
  ActivityLog, Borrowing, BorrowingDetail, Calibration, Document, Equipment, Maintenance,
  Notification, Room, RoomMonitoring, Sensor, SupportingBorrowingDetail, SupportingEquipment, User,
} from "@/types/erd";

/* ---------- Primitif ---------- */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus yyyy-MM-dd");
const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal dan waktu tidak valid");
const text = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`);
const longText = z.string().max(5000, "Maksimal 5000 karakter");
const id = z.string().min(1);
const nonNegative = (label: string) => z.number().nonnegative(`${label} tidak boleh negatif`);
const positiveInt = (label: string) => z.number().int(`${label} harus bilangan bulat`).min(1, `${label} minimal 1`);

const userRole = roleSchema;
const equipmentStatus = equipmentStatusSchema;
const equipmentCondition = conditionSchema;

/* ---------- USER ---------- */
export const userSchema = z.object({
  user_id: id,
  name: text("Nama", 100),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password_hash: z.string(),
  role: userRole,
  is_active: z.boolean(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<User>;

export const createUserSchema = z
  .object({
    name: text("Nama", 100),
    email: z.string().trim().toLowerCase().email("Email tidak valid"),
    password: z.string().min(8, "Kata sandi minimal 8 karakter"),
    role: userRole,
  })
  .strict();
export const updateUserSchema = z
  .object({
    name: text("Nama", 100),
    email: z.string().trim().toLowerCase().email("Email tidak valid"),
    role: userRole,
    is_active: z.boolean(),
  })
  .partial()
  .strict();

/* ---------- ROOM ---------- */
export const roomSchema = z.object({
  room_id: id,
  room_code: text("Kode ruangan", 30),
  room_name: text("Nama ruangan", 100),
  equipment_capacity: positiveInt("Kapasitas alat"),
  person_in_charge: text("Penanggung jawab", 50),
  description: longText,
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<Room>;

export const createRoomSchema = roomSchema.omit({ room_id: true, created_at: true, updated_at: true }).strict();
export const updateRoomSchema = createRoomSchema.partial();

/* ---------- EQUIPMENT ---------- */
export const equipmentSchema = z.object({
  equipment_id: id,
  inventory_code: text("Kode inventaris", 50),
  qr_token: z.string().length(QR_TOKEN_LENGTH),
  equipment_name: text("Nama alat", 150),
  equipment_type: text("Jenis alat", 100),
  brand: text("Merek", 100),
  model: text("Model", 100),
  room_id: text("Ruangan", 50),
  status: equipmentStatus,
  condition: equipmentCondition.nullable(),
  purchase_date: isoDate.nullable(),
  purchase_price: nonNegative("Harga beli").nullable(),
  useful_life_years: positiveInt("Masa manfaat").nullable(),
  specifications: longText.nullable(),
  next_calibration_date: isoDate.nullable(),
  is_active: z.boolean(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<Equipment>;

/** qr_token, is_active, dan id tidak bisa diisi dari form. */
export const createEquipmentSchema = equipmentSchema
  .omit({ equipment_id: true, qr_token: true, is_active: true, created_at: true, updated_at: true })
  .strict();
/** .strict(): mengirim qr_token akan ditolak. */
export const updateEquipmentSchema = createEquipmentSchema.partial();

/* ---------- SUPPORTING_EQUIPMENT ---------- */
export const supportingEquipmentSchema = z.object({
  supporting_equipment_id: id,
  item_code: text("Kode item", 50),
  qr_token: z.string().length(QR_TOKEN_LENGTH),
  item_name: text("Nama item", 150),
  item_type: text("Jenis item", 100),
  brand: text("Merek", 100),
  model: z.string().trim().max(100),
  unit: text("Satuan", 30),
  total_quantity: positiveInt("Jumlah total"),
  available_quantity: z.number().int("Jumlah tersedia harus bilangan bulat").min(0, "Jumlah tersedia tidak boleh negatif"),
  condition: equipmentCondition,
  status: supportingStatusSchema,
  description: longText,
  specifications: longText,
  is_active: z.boolean(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<SupportingEquipment>;

/** available_quantity = total_quantity saat dibuat; status diturunkan otomatis. */
export const createSupportingEquipmentSchema = supportingEquipmentSchema
  .omit({
    supporting_equipment_id: true, qr_token: true, available_quantity: true, status: true,
    is_active: true, created_at: true, updated_at: true,
  })
  .strict();
export const updateSupportingEquipmentSchema = createSupportingEquipmentSchema.partial();

/* ---------- BORROWING ---------- */
export const borrowingSchema = z.object({
  borrowing_id: id,
  user_id: id,
  borrowing_time: isoDateTime,
  expected_return_time: isoDateTime,
  actual_return_time: isoDateTime.nullable(),
  purpose: text("Tujuan peminjaman", 300),
  usage_location: text("Lokasi penggunaan", 150),
  borrowing_status: borrowingStatusSchema,
  notes: longText,
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<Borrowing>;

export const borrowingDetailSchema = z.object({
  detail_id: id,
  borrowing_id: id,
  equipment_id: id,
  initial_condition: z.string(),
  final_condition: z.string().nullable(),
  has_damage: z.boolean(),
  damage_notes: z.string().nullable(),
}) satisfies z.ZodType<BorrowingDetail>;

export const supportingBorrowingDetailSchema = z.object({
  supporting_detail_id: id,
  borrowing_id: id,
  supporting_equipment_id: id,
  quantity_borrowed: positiveInt("Jumlah dipinjam"),
  quantity_returned: z.number().int().min(0),
  initial_condition: z.string(),
  final_condition: z.string().nullable(),
  has_damage: z.boolean(),
  damage_notes: z.string().nullable(),
}) satisfies z.ZodType<SupportingBorrowingDetail>;

export const createBorrowingSchema = z
  .object({
    user_id: text("Peminjam", 50),
    borrowing_time: isoDateTime,
    expected_return_time: isoDateTime,
    purpose: text("Tujuan peminjaman", 300),
    usage_location: text("Lokasi penggunaan", 150),
    notes: longText.optional(),
    equipment_ids: z.array(id),
    supporting_items: z.array(
      z.object({ supporting_equipment_id: id, quantity: positiveInt("Jumlah") }),
    ),
  })
  .refine((d) => d.equipment_ids.length + d.supporting_items.length > 0, {
    message: "Pilih minimal satu alat atau alat pendukung",
    path: ["equipment_ids"],
  })
  .refine((d) => Date.parse(d.expected_return_time) > Date.parse(d.borrowing_time), {
    message: "Waktu pengembalian harus setelah waktu peminjaman",
    path: ["expected_return_time"],
  });

export const updateBorrowingSchema = z
  .object({
    expected_return_time: isoDateTime,
    purpose: text("Tujuan peminjaman", 300),
    usage_location: text("Lokasi penggunaan", 150),
    notes: longText,
  })
  .partial()
  .strict();

const returnLineBase = {
  final_condition: text("Kondisi akhir", 200),
  has_damage: z.boolean(),
  damage_notes: z.string().trim().max(1000).optional(),
  new_condition: equipmentCondition.optional(),
};
export const returnBorrowingSchema = z
  .object({
    actual_return_time: isoDateTime.optional(),
    notes: longText.optional(),
    equipment: z.array(z.object({ detail_id: id, ...returnLineBase })),
    supporting: z.array(
      z.object({
        supporting_detail_id: id,
        /** Jumlah yang dikembalikan SAAT INI (bukan kumulatif). */
        quantity_returned_now: z.number().int().min(0),
        ...returnLineBase,
      }),
    ),
  })
  .superRefine((d, ctx) => {
    const check = (
      lines: { has_damage: boolean; damage_notes?: string; new_condition?: "good" | "minor_damage" | "major_damage" }[],
      key: "equipment" | "supporting",
    ) =>
      lines.forEach((l, i) => {
        if (l.has_damage && !l.damage_notes) {
          ctx.addIssue({ code: "custom", message: "Catatan kerusakan wajib diisi", path: [key, i, "damage_notes"] });
        }
        if (!l.has_damage && l.new_condition && l.new_condition !== "good") {
          ctx.addIssue({ code: "custom", message: "Kondisi tidak baik harus ditandai sebagai kerusakan", path: [key, i, "has_damage"] });
        }
      });
    check(d.equipment, "equipment");
    check(d.supporting, "supporting");
  });

/* ---------- CALIBRATION ---------- */
export const calibrationSchema = z.object({
  calibration_id: id,
  equipment_id: id,
  technician_id: id,
  calibration_date: isoDate,
  next_calibration_date: isoDate,
  calibration_provider: text("Penyedia kalibrasi", 150),
  certificate_number: text("Nomor sertifikat", 100),
  certificate_file_url: z.string(),
  calibration_result: calibrationResultSchema,
  cost: nonNegative("Biaya"),
  notes: longText,
  created_at: isoDateTime,
}) satisfies z.ZodType<Calibration>;

const createCalibrationBase = calibrationSchema.omit({ calibration_id: true, created_at: true }).strict();
export const createCalibrationSchema = createCalibrationBase.refine(
  (d) => d.next_calibration_date > d.calibration_date,
  { message: "Tanggal kalibrasi berikutnya harus setelah tanggal kalibrasi", path: ["next_calibration_date"] },
);
export const updateCalibrationSchema = createCalibrationBase.partial();

/* ---------- MAINTENANCE ---------- */
export const maintenanceSchema = z.object({
  maintenance_id: id,
  equipment_id: id,
  technician_id: id,
  maintenance_type: maintenanceTypeSchema,
  maintenance_date: isoDateTime,
  completion_date: isoDateTime.nullable(),
  description: text("Deskripsi", 2000),
  cost: nonNegative("Biaya"),
  status: maintenanceStatusSchema,
  replaced_spare_parts: z.string().max(1000),
  notes: longText,
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<Maintenance>;

const createMaintenanceBase = maintenanceSchema
  .omit({ maintenance_id: true, created_at: true, updated_at: true })
  .strict();
export const createMaintenanceSchema = createMaintenanceBase.refine(
  (d) => !d.completion_date || Date.parse(d.completion_date) >= Date.parse(d.maintenance_date),
  { message: "Tanggal selesai tidak boleh sebelum tanggal maintenance", path: ["completion_date"] },
);
export const updateMaintenanceSchema = createMaintenanceBase.partial();

/* ---------- SENSOR & ROOM_MONITORING ---------- */
export const sensorSchema = z.object({
  sensor_id: id,
  room_id: id,
  sensor_code: text("Kode sensor", 50),
  sensor_type: sensorTypeSchema,
  unit: text("Satuan", 20),
  sensor_location: text("Lokasi sensor", 150),
  sensor_status: sensorStatusSchema,
  min_threshold: z.number(),
  max_threshold: z.number(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
}) satisfies z.ZodType<Sensor>;

const createSensorBase = sensorSchema.omit({ sensor_id: true, created_at: true, updated_at: true }).strict();
export const createSensorSchema = createSensorBase.refine((d) => d.min_threshold < d.max_threshold, {
  message: "Batas minimum harus lebih kecil dari batas maksimum",
  path: ["min_threshold"],
});
export const updateSensorSchema = createSensorBase.partial();

export const roomMonitoringSchema = z.object({
  monitoring_id: id,
  sensor_id: id,
  value: z.number(),
  measurement_time: isoDateTime,
  received_at: isoDateTime,
}) satisfies z.ZodType<RoomMonitoring>;

/** Ingest pembacaan baru dari sensor. */
export const createRoomMonitoringSchema = z
  .object({ sensor_id: id, value: z.number(), measurement_time: isoDateTime })
  .strict();

/* ---------- DOCUMENT ---------- */
export const documentSchema = z.object({
  document_id: id,
  equipment_id: id,
  uploaded_by: id,
  document_type: documentTypeSchema,
  file_name: text("Nama file", 255),
  file_url: z.string().min(1),
  file_type: z.string().min(1),
  file_size: nonNegative("Ukuran file"),
  uploaded_at: isoDateTime,
}) satisfies z.ZodType<Document>;
export const createDocumentSchema = documentSchema.omit({ document_id: true, uploaded_at: true }).strict();

/* ---------- NOTIFICATION & ACTIVITY_LOG ---------- */
export const notificationSchema = z.object({
  notification_id: id,
  user_id: id,
  borrowing_id: z.string().nullable(),
  calibration_id: z.string().nullable(),
  maintenance_id: z.string().nullable(),
  notification_type: notificationTypeSchema,
  title: text("Judul", 150),
  message: z.string().min(1),
  is_read: z.boolean(),
  created_at: isoDateTime,
  read_at: isoDateTime.nullable(),
}) satisfies z.ZodType<Notification>;
export const createNotificationSchema = notificationSchema
  .omit({ notification_id: true, is_read: true, created_at: true, read_at: true })
  .strict();

export const activityLogSchema = z.object({
  log_id: id,
  user_id: id,
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  old_data: z.record(z.string(), z.unknown()).nullable(),
  new_data: z.record(z.string(), z.unknown()).nullable(),
  ip_address: z.string(),
  created_at: isoDateTime,
}) satisfies z.ZodType<ActivityLog>;

/* ---------- Tipe input ---------- */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateSupportingEquipmentInput = z.infer<typeof createSupportingEquipmentSchema>;
export type UpdateSupportingEquipmentInput = z.infer<typeof updateSupportingEquipmentSchema>;
export type CreateBorrowingInput = z.infer<typeof createBorrowingSchema>;
export type UpdateBorrowingInput = z.infer<typeof updateBorrowingSchema>;
export type ReturnBorrowingInput = z.infer<typeof returnBorrowingSchema>;
export type CreateCalibrationInput = z.infer<typeof createCalibrationSchema>;
export type UpdateCalibrationInput = z.infer<typeof updateCalibrationSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type CreateSensorInput = z.infer<typeof createSensorSchema>;
export type UpdateSensorInput = z.infer<typeof updateSensorSchema>;
export type CreateRoomMonitoringInput = z.infer<typeof createRoomMonitoringSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
