import { CALIBRATION_OVERDUE_BLOCKS_BORROWING } from "@/lib/constants";
import { getCalibrationState } from "@/lib/domain";
import { EQUIPMENT_STATUS_META } from "@/lib/status";
import type { Borrowing, Equipment, Role, SupportingEquipment } from "@/types/erd";

export const CONDITION_LABEL = { good: "Baik", minor_damage: "Rusak ringan", major_damage: "Rusak berat" } as const;

/** Kalibrasi terlambat atau belum pernah dikalibrasi. */
export const isCalibrationOverdue = (e: Pick<Equipment, "next_calibration_date">) =>
  getCalibrationState(e.next_calibration_date) === "overdue";

/** Alasan alat tidak boleh digunakan, atau null jika boleh. Dipakai UI dan service. */
export function getEquipmentBorrowBlock(e: Equipment): string | null {
  if (!e.is_active) return "Alat sudah dinonaktifkan";
  if (e.status !== "available") return `Alat tidak tersedia (${EQUIPMENT_STATUS_META[e.status].label})`;
  if (e.condition === "major_damage") return "Alat rusak berat";
  if (CALIBRATION_OVERDUE_BLOCKS_BORROWING && isCalibrationOverdue(e)) return "Kalibrasi alat terlambat";
  return null;
}

export function getSupportingBorrowBlock(s: SupportingEquipment): string | null {
  if (!s.is_active) return "Item sudah dinonaktifkan";
  if (s.condition === "major_damage") return "Item rusak berat";
  if (s.available_quantity <= 0) return "Stok habis";
  return null;
}

/** Aturan pengembalian: hanya pengguna, admin, atau SPV. */
export function canReturnBorrowing(user: { id: string; role: Role } | undefined, b: Pick<Borrowing, "user_id">): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "SPV" || user.id === b.user_id;
}
