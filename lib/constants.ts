import type { Role } from "@/types/erd";

export const APP_NAME = "Laboratory Management System";
export const APP_SHORT_NAME = "LabMS";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  SPV: "Supervisor",
  technician: "Teknisi",
  QA: "QA",
};

export const QR_TOKEN_LENGTH = 12;
/** Batas "segera jatuh tempo" kalibrasi (hari). */
export const CALIBRATION_DUE_SOON_DAYS = 30;

/**
 * Perilaku saat kalibrasi alat terlambat (atau belum pernah dikalibrasi).
 * true  = penggunaan diblokir (UI dan service); false = hanya banner peringatan.
 */
export const CALIBRATION_OVERDUE_BLOCKS_BORROWING = true;
/** Default lama penggunaan pada form penggunaan (hari). */
export const DEFAULT_BORROW_DAYS = 1;
