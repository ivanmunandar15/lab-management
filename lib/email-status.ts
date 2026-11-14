import type { BadgeMeta } from "@/lib/status";
import type { EmailLog, EmailReminderType, EmailStatus } from "@/types/email";

export const REMINDER_LABEL: Record<EmailReminderType, string> = {
  calibration_30d: "Kalibrasi H-30",
  calibration_7d: "Kalibrasi H-7",
  calibration_1d: "Kalibrasi H-1",
  calibration_overdue: "Kalibrasi terlambat",
  borrowing_overdue: "Peminjaman terlambat",
  digest: "Ringkasan / email uji",
};

export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = { queued: "Antre", sent: "Terkirim", failed: "Gagal" };

/** Nilai `provider_message_id` yang dicatat backend saat EMAIL_ENABLED=false. */
export const DEV_LOG_MESSAGE_ID = "dev-log";

/** Dicatat `sent`, tetapi sebenarnya tidak ada email yang keluar (backend dalam mode uji). */
export const isNotActuallySent = (l: Pick<EmailLog, "status" | "provider_message_id">) => l.status === "sent" && l.provider_message_id === DEV_LOG_MESSAGE_ID;

export function emailStatusMeta(l: Pick<EmailLog, "status" | "provider_message_id">): BadgeMeta {
  if (isNotActuallySent(l)) return { label: "Tidak dikirim (mode uji)", tone: "slate" };
  if (l.status === "sent") return { label: EMAIL_STATUS_LABEL.sent, tone: "green" };
  if (l.status === "failed") return { label: EMAIL_STATUS_LABEL.failed, tone: "red" };
  return { label: EMAIL_STATUS_LABEL.queued, tone: "yellow" };
}

/** Salin teks ke clipboard. false jika browser memblokir (mis. halaman bukan HTTPS). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
