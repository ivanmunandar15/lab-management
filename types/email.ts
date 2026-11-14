/** Modul email (API utama backend, bukan bagian dari types/erd.ts). Bentuk persis kolom EMAIL_LOG yang dikembalikan GET /email-logs. */
export type EmailStatus = "queued" | "sent" | "failed";
export type EmailReminderType = "calibration_30d" | "calibration_7d" | "calibration_1d" | "calibration_overdue" | "borrowing_overdue" | "digest";

export interface EmailLog {
  email_log_id: string;
  user_id: string;
  equipment_id: string | null;
  /** Terisi untuk penanda per-alat (anak dari email digest). */
  parent_id: string | null;
  reminder_type: EmailReminderType;
  next_calibration_date: string | null;
  recipient_email: string;
  subject: string;
  status: EmailStatus;
  attempts: number;
  error_message: string | null;
  /** "dev-log" = EMAIL_ENABLED=false di backend: dicatat sebagai terkirim, padahal TIDAK dikirim. */
  provider_message_id: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface EmailLogPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Hasil POST /admin/email/test (dikirim sinkron ke alamat akun yang login). */
export interface EmailTestResult {
  email_log_id: string;
  to: string;
  status: "sent" | "failed" | "missing";
  error_message: string | null;
  email_enabled: boolean;
}
