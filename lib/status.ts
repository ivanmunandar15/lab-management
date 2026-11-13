import type { CalibrationResult, CalibrationState, Condition, EquipmentStatus, MaintenanceStatus, MaintenanceType, NotificationType, ReadingStatus, SensorStatus } from "@/types/erd";

const tone = {
  green: "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30",
  blue: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  yellow: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  purple: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  slate: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30",
} as const;

const dot = {
  green: "bg-green-600 dark:bg-green-400",
  blue: "bg-blue-600 dark:bg-blue-400",
  red: "bg-red-600 dark:bg-red-400",
  yellow: "bg-yellow-600 dark:bg-yellow-400",
  purple: "bg-purple-600 dark:bg-purple-400",
  slate: "bg-slate-500 dark:bg-slate-400",
} as const;

export type ToneKey = keyof typeof tone;
export const toneClass = (t: ToneKey) => tone[t];
export const toneDotClass = (t: ToneKey) => dot[t];

export interface BadgeMeta { label: string; tone: ToneKey }

/** Warna status konsisten di seluruh aplikasi. */
export const EQUIPMENT_STATUS_META: Record<EquipmentStatus, BadgeMeta> = {
  available: { label: "Tersedia", tone: "green" },
  borrowed: { label: "Dipinjam", tone: "blue" },
  damaged: { label: "Rusak", tone: "red" },
  maintenance: { label: "Perawatan", tone: "yellow" },
  calibration: { label: "Kalibrasi", tone: "purple" },
};

export type AnyStatus = EquipmentStatus | "returned" | "overdue";
export const STATUS_META: Record<AnyStatus, BadgeMeta> = {
  ...EQUIPMENT_STATUS_META,
  returned: { label: "Dikembalikan", tone: "slate" },
  overdue: { label: "Terlambat", tone: "red" },
};

export const CONDITION_META: Record<Condition, BadgeMeta> = {
  good: { label: "Baik", tone: "green" },
  minor_damage: { label: "Rusak ringan", tone: "yellow" },
  major_damage: { label: "Rusak berat", tone: "red" },
};

/** Warna grafik (hex) selaras dengan warna status di atas. Dipakai Recharts. */
export const CHART_COLOR: Record<EquipmentStatus, string> = {
  available: "#16a34a",
  borrowed: "#2563eb",
  damaged: "#dc2626",
  maintenance: "#ca8a04",
  calibration: "#9333ea",
};

/** Status jadwal kalibrasi (turunan dari next_calibration_date). */
export const CALIBRATION_STATE_META: Record<CalibrationState, BadgeMeta> = {
  safe: { label: "Aman", tone: "green" },
  due_soon: { label: "Segera jatuh tempo", tone: "yellow" },
  overdue: { label: "Terlambat", tone: "red" },
  not_required: { label: "Tanpa kalibrasi", tone: "slate" },
};

/** Pembacaan sensor terhadap batas normal. */
export const READING_STATUS_META: Record<ReadingStatus, BadgeMeta> = {
  normal: { label: "Normal", tone: "green" },
  low: { label: "Di bawah batas", tone: "red" },
  high: { label: "Di atas batas", tone: "red" },
};

/** Hasil kalibrasi. */
export const CALIBRATION_RESULT_META: Record<CalibrationResult, BadgeMeta> = {
  passed: { label: "Lulus", tone: "green" },
  failed: { label: "Gagal", tone: "red" },
};

/** Status maintenance (alat in_progress otomatis berstatus "maintenance" kuning). */
export const MAINTENANCE_STATUS_META: Record<MaintenanceStatus, BadgeMeta> = {
  scheduled: { label: "Dijadwalkan", tone: "blue" },
  in_progress: { label: "Berlangsung", tone: "yellow" },
  completed: { label: "Selesai", tone: "green" },
  cancelled: { label: "Dibatalkan", tone: "slate" },
};

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  routine: "Rutin",
  repair: "Perbaikan",
};

export const SENSOR_STATUS_META: Record<SensorStatus, BadgeMeta> = {
  active: { label: "Aktif", tone: "green" },
  inactive: { label: "Nonaktif", tone: "slate" },
  damaged: { label: "Rusak", tone: "red" },
};

export const NOTIFICATION_TYPE_META: Record<NotificationType, BadgeMeta> = {
  borrowing: { label: "Peminjaman", tone: "blue" },
  calibration: { label: "Kalibrasi", tone: "purple" },
  maintenance: { label: "Perawatan", tone: "yellow" },
  monitoring: { label: "Monitoring", tone: "red" },
  system: { label: "Sistem", tone: "slate" },
};
