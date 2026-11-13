import { customAlphabet } from "nanoid";
import { addYears, differenceInCalendarDays, differenceInMonths, format, parseISO } from "date-fns";
import { CALIBRATION_DUE_SOON_DAYS, QR_TOKEN_LENGTH } from "@/lib/constants";
import type {
  Borrowing, CalibrationState, Condition, Equipment, QrEntityType, ReadingStatus,
  RemainingUsefulLife, Sensor, SupportingStatus,
} from "@/types/erd";

/* ---------- QR ---------- */
export const QR_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const qrAlphabet = customAlphabet(QR_ALPHABET, QR_TOKEN_LENGTH);

/** Token QR 12 karakter. Panggil SATU KALI saat data dibuat; jangan pernah diedit. */
export const generateQrToken = () => qrAlphabet();

export const isValidQrToken = (value: string) => new RegExp(`^[A-Za-z0-9]{${QR_TOKEN_LENGTH}}$`).test(value);

/** URL yang di-encode ke QR: `{base}/scan/{type}/{token}`. Base: argumen -> NEXT_PUBLIC_APP_URL -> window.location.origin. */
export function buildQrUrl(type: QrEntityType, token: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/scan/${type}/${token}`;
}

/** Membaca hasil scan kamera (URL penuh/path) -> { type, token } atau null. */
export function parseQrContent(content: string): { type: QrEntityType; token: string } | null {
  const m = content.trim().match(new RegExp(`/scan/(eq|sp)/([A-Za-z0-9]{${QR_TOKEN_LENGTH}})(?:[/?#].*)?$`));
  return m ? { type: m[1] as QrEntityType, token: m[2] } : null;
}

/* ---------- Peminjaman ---------- */

/** Status "overdue" tidak disimpan: dihitung dari waktu kembali yang diharapkan. */
export function isBorrowingOverdue(
  b: Pick<Borrowing, "borrowing_status" | "expected_return_time">,
  now: Date = new Date(),
) {
  return b.borrowing_status === "borrowed" && new Date(b.expected_return_time) < now;
}

export type BorrowingDisplayStatus = "borrowed" | "returned" | "overdue";
export function getBorrowingDisplayStatus(
  b: Pick<Borrowing, "borrowing_status" | "expected_return_time">,
  now: Date = new Date(),
): BorrowingDisplayStatus {
  return isBorrowingOverdue(b, now) ? "overdue" : b.borrowing_status;
}

/** Jumlah hari keterlambatan (0 jika tidak terlambat). */
export function getOverdueDays(b: Pick<Borrowing, "borrowing_status" | "expected_return_time">, now: Date = new Date()) {
  return isBorrowingOverdue(b, now) ? Math.max(1, differenceInCalendarDays(now, new Date(b.expected_return_time))) : 0;
}

/**
 * Status alat pendukung diturunkan dari stok tersedia (0 = borrowed).
 * Jika `condition` diberikan dan major_damage -> damaged.
 */
export function deriveSupportingStatus(availableQuantity: number, condition?: Condition): SupportingStatus {
  if (condition === "major_damage") return "damaged";
  return availableQuantity <= 0 ? "borrowed" : "available";
}

/* ---------- Kalibrasi ---------- */

/** Selisih hari kalender (negatif = sudah lewat). */
export function getDaysUntil(date: string | Date, today: Date = new Date()): number {
  return differenceInCalendarDays(typeof date === "string" ? parseISO(date) : date, today);
}

/**
 * safe: > 30 hari | due_soon: 0..30 hari | overdue: sudah lewat.
 * Alat yang belum pernah dikalibrasi (tanggal null) dianggap overdue.
 */
export function getCalibrationState(next: string | Date | null | undefined, today: Date = new Date()): CalibrationState {
  if (!next) return "not_required"; // tanpa program kalibrasi (mis. komputer, catu daya)
  const days = getDaysUntil(next, today);
  if (days < 0) return "overdue";
  return days <= CALIBRATION_DUE_SOON_DAYS ? "due_soon" : "safe";
}

/* ---------- Masa manfaat ---------- */

/** Sisa masa manfaat = purchase_date + useful_life_years - hari ini. null jika salah satunya tidak diketahui. */
export function getRemainingUsefulLife(
  e: Pick<Equipment, "purchase_date" | "useful_life_years">,
  today: Date = new Date(),
): RemainingUsefulLife | null {
  if (!e.purchase_date || e.useful_life_years == null) return null;
  const start = parseISO(e.purchase_date);
  const end = addYears(start, e.useful_life_years);
  const remainingDays = differenceInCalendarDays(end, today);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const is_expired = remainingDays <= 0;
  const remaining_months = is_expired ? 0 : differenceInMonths(end, today);
  return {
    end_of_life_date: format(end, "yyyy-MM-dd"),
    remaining_months,
    years: Math.floor(remaining_months / 12),
    months: remaining_months % 12,
    percent_remaining: Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100))),
    is_expired,
  };
}

/* ---------- Monitoring ---------- */
export function getReadingStatus(value: number, s: Pick<Sensor, "min_threshold" | "max_threshold">): ReadingStatus {
  return value < s.min_threshold ? "low" : value > s.max_threshold ? "high" : "normal";
}
