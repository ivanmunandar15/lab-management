import { get } from "@/lib/api/client";
import type { CalibrationState, EquipmentStatus, ReadingStatus, SensorStatus, SensorType } from "@/types/erd";

/* ---------- 1. Jumlah alat per status ---------- */
export type EquipmentStatusCounts = { total: number } & Record<EquipmentStatus, number>;
export const getEquipmentStatusCounts = () => get<EquipmentStatusCounts>("dashboard/equipment-status");

/* ---------- 2. Peringatan kalibrasi ---------- */
export interface CalibrationAlert {
  equipment_id: string;
  equipment_name: string;
  inventory_code: string;
  room_name: string;
  next_calibration_date: string | null;
  /** Negatif = terlambat. null = belum pernah dikalibrasi. */
  days_until: number | null;
  state: Exclude<CalibrationState, "safe" | "not_required">;
}
export interface CalibrationAlerts {
  items: CalibrationAlert[];
  overdue_count: number;
  due_soon_count: number;
}
/** Alat aktif yang terlambat atau jatuh tempo <= 30 hari. Paling mendesak di atas. */
export const getCalibrationAlerts = () => get<CalibrationAlerts>("dashboard/calibration-alerts");

/* ---------- 3. Peminjaman aktif ---------- */
export interface ActiveBorrowingItem {
  borrowing_id: string;
  user_id: string;
  user_name: string;
  equipment_names: string[];
  supporting_count: number;
  purpose: string;
  usage_location: string;
  expected_return_time: string;
  is_overdue: boolean;
}
export interface ActiveBorrowings {
  items: ActiveBorrowingItem[];
  active_count: number;
  overdue_count: number;
}
/** Peminjaman berstatus borrowed. Yang terlambat di atas, lalu urut batas kembali terdekat. */
export const getActiveBorrowings = () => get<ActiveBorrowings>("dashboard/active-borrowings");

/* ---------- 4. Tren bulanan ---------- */
export interface MonthlyTrendPoint {
  month: string; // yyyy-MM
  label: string; // "Okt"
  full_label: string; // "Oktober 2026"
  borrowings: number;
  calibration_cost: number;
  maintenance_cost: number;
}
export const getMonthlyTrends = (months = 6) => get<MonthlyTrendPoint[]>("dashboard/monthly-trends", { months });

/* ---------- 5. Kondisi ruangan ---------- */
export interface RoomReading {
  sensor_id: string;
  sensor_code: string;
  sensor_type: SensorType;
  unit: string;
  value: number | null;
  measured_at: string | null;
  min: number;
  max: number;
  sensor_status: SensorStatus;
  /** null jika sensor tidak aktif (nilai tidak dinilai) atau belum ada data. */
  status: ReadingStatus | null;
}
export interface RoomCondition {
  room_id: string;
  room_code: string;
  room_name: string;
  temperature: RoomReading | null;
  humidity: RoomReading | null;
  out_of_range: boolean;
}
/** Pembacaan terakhir suhu & kelembapan per ruangan. Ruangan di luar batas ditampilkan lebih dulu. */
export const getRoomConditions = () => get<RoomCondition[]>("dashboard/room-conditions");

/* ---------- 6. Aktivitas terbaru ---------- */
export interface RecentActivityItem {
  log_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  target_label: string;
  created_at: string;
}
/** Role tanpa hak baca activity log menerima daftar kosong. */
export const getRecentActivity = (limit = 10) => get<RecentActivityItem[]>("dashboard/recent-activity", { limit });
