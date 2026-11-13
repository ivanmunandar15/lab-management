import type { z } from "zod";
import type * as e from "@/lib/schemas/enums";

export type Role = z.infer<typeof e.roleSchema>;
export type EquipmentStatus = z.infer<typeof e.equipmentStatusSchema>;
export type Condition = z.infer<typeof e.conditionSchema>;
export type SupportingStatus = z.infer<typeof e.supportingStatusSchema>;
export type BorrowingStatus = z.infer<typeof e.borrowingStatusSchema>;
export type CalibrationResult = z.infer<typeof e.calibrationResultSchema>;
export type MaintenanceType = z.infer<typeof e.maintenanceTypeSchema>;
export type MaintenanceStatus = z.infer<typeof e.maintenanceStatusSchema>;
export type SensorType = z.infer<typeof e.sensorTypeSchema>;
export type SensorStatus = z.infer<typeof e.sensorStatusSchema>;
export type DocumentType = z.infer<typeof e.documentTypeSchema>;
export type NotificationType = z.infer<typeof e.notificationTypeSchema>;
export type CalibrationState = z.infer<typeof e.calibrationStateSchema>;
export type ReadingStatus = z.infer<typeof e.readingStatusSchema>;
export type QrEntityType = z.infer<typeof e.qrEntityTypeSchema>;

/** Semua tanggal berupa string ISO 8601. */
export type ISODate = string;

export interface User {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}
export type PublicUser = Omit<User, "password_hash">;

export interface Room {
  room_id: string;
  room_code: string;
  room_name: string;
  equipment_capacity: number;
  person_in_charge: string; // fk USER
  description: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Equipment {
  equipment_id: string;
  inventory_code: string;
  equipment_name: string;
  equipment_type: string;
  brand: string;
  model: string;
  room_id: string;
  status: EquipmentStatus;
  /** null = belum dinilai. Field opsional di bawah: null = tidak diketahui / tidak berlaku. */
  condition: Condition | null;
  purchase_date: ISODate | null;
  purchase_price: number | null;
  useful_life_years: number | null;
  specifications: string | null;
  next_calibration_date: ISODate | null; // otomatis dari kalibrasi passed terbaru; null = tidak perlu kalibrasi
  qr_token: string; // unique, nanoid(12), dibuat sekali, TIDAK PERNAH diedit
  is_active: boolean; // soft delete
  created_at: ISODate;
  updated_at: ISODate;
}

export interface SupportingEquipment {
  supporting_equipment_id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  brand: string;
  model: string;
  unit: string;
  total_quantity: number;
  available_quantity: number;
  condition: Condition;
  status: SupportingStatus; // diturunkan dari available_quantity (0 = borrowed)
  description: string;
  specifications: string;
  qr_token: string;
  is_active: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Borrowing {
  borrowing_id: string;
  user_id: string;
  borrowing_time: ISODate;
  expected_return_time: ISODate;
  actual_return_time: ISODate | null;
  purpose: string;
  usage_location: string;
  borrowing_status: BorrowingStatus; // "overdue" TIDAK disimpan, lihat lib/domain.ts
  notes: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface BorrowingDetail {
  detail_id: string;
  borrowing_id: string;
  equipment_id: string;
  initial_condition: string;
  final_condition: string | null;
  has_damage: boolean;
  damage_notes: string | null;
}

export interface SupportingBorrowingDetail {
  supporting_detail_id: string;
  borrowing_id: string;
  supporting_equipment_id: string;
  quantity_borrowed: number;
  quantity_returned: number;
  initial_condition: string;
  final_condition: string | null;
  has_damage: boolean;
  damage_notes: string | null;
}

export interface Calibration {
  calibration_id: string;
  equipment_id: string;
  technician_id: string;
  calibration_date: ISODate;
  next_calibration_date: ISODate;
  calibration_provider: string;
  certificate_number: string;
  certificate_file_url: string;
  calibration_result: CalibrationResult;
  cost: number;
  notes: string;
  created_at: ISODate;
}

export interface Maintenance {
  maintenance_id: string;
  equipment_id: string;
  technician_id: string;
  maintenance_type: MaintenanceType;
  maintenance_date: ISODate;
  completion_date: ISODate | null;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  replaced_spare_parts: string;
  notes: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Sensor {
  sensor_id: string;
  room_id: string;
  sensor_code: string;
  sensor_type: SensorType;
  unit: string;
  sensor_location: string;
  sensor_status: SensorStatus;
  min_threshold: number; // batas normal bawah
  max_threshold: number; // batas normal atas
  created_at: ISODate;
  updated_at: ISODate;
}

export interface RoomMonitoring {
  monitoring_id: string;
  sensor_id: string;
  value: number;
  measurement_time: ISODate;
  received_at: ISODate;
}

export interface Document {
  document_id: string;
  equipment_id: string;
  uploaded_by: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: ISODate;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  borrowing_id: string | null;
  calibration_id: string | null;
  maintenance_id: string | null;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: ISODate;
  read_at: ISODate | null;
  /** Tambahan non-ERD (opsional): tautan entitas terkait yang tidak punya FK di tabel ini (mis. alat, ruangan). */
  link_url?: string | null;
}

export interface ActivityLog {
  log_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string;
  created_at: ISODate;
}

/* ---------- Tipe turunan / view (Tahap 2) ---------- */

export interface BorrowingWithDetails extends Borrowing {
  equipment_details: BorrowingDetail[];
  supporting_details: SupportingBorrowingDetail[];
  is_overdue: boolean;
  display_status: BorrowingStatus | "overdue";
}

export interface RemainingUsefulLife {
  end_of_life_date: ISODate;
  remaining_months: number;
  years: number;
  months: number;
  /** 100 = baru dibeli, 0 = habis masa manfaat. */
  percent_remaining: number;
  is_expired: boolean;
}

export interface SensorWithLatest {
  sensor: Sensor;
  latest: RoomMonitoring | null;
  reading_status: ReadingStatus | null;
}
