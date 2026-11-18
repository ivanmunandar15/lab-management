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

/* ───────── Pengingat kalibrasi manual (pratinjau + pengiriman terpilih) ───────── */
export type ReminderStage = "calibration_30d" | "calibration_7d" | "calibration_1d" | "calibration_overdue";

export interface ReminderItem {
  equipment_id: string;
  equipment_name: string;
  inventory_code: string;
  room_name: string;
  /** YYYY-MM-DD */
  due_date: string;
  /** Negatif = sudah terlambat. */
  days_left: number;
  stage: ReminderStage;
}

/** Satu email (digest) yang AKAN dikirim ke satu penerima. */
export interface ReminderEmailPreview {
  to: string;
  user_id: string;
  name: string;
  /** Role penerima (admin/SPV/technician/QA); null jika backend lama. */
  role: string | null;
  subject: string;
  item_count: number;
  items: ReminderItem[];
}

/** Alat yang jatuh pada tahap pengingat tetapi TIDAK punya penerima: tidak dikirim ke siapa pun. */
export interface ReminderUnassignedItem extends ReminderItem {
  /** no_rule = tidak ada aturan/PIC yang cocok; no_eligible_recipient = penanggung jawab ada, tetapi nonaktif/mematikan email. */
  reason: "no_rule" | "no_eligible_recipient";
}

export interface ReminderPreview {
  emails: ReminderEmailPreview[];
  unassigned: ReminderUnassignedItem[];
  /** auto = job harian juga mengirim otomatis; manual = hanya lewat pengiriman terpilih. */
  mode: "auto" | "manual";
  /** false = backend dalam mode uji: email dicatat terkirim tetapi tidak benar-benar dikirim. */
  email_enabled: boolean;
  /** Waktu pratinjau diambil (sisi klien). */
  fetched_at: string;
}

export interface ReminderSendResult {
  recipients: number;
  queued: number;
  skipped: number;
  failed: number;
  requested: number;
  /** Dipilih tetapi sudah tidak terencana saat dikirim (mis. sudah dikirim, atau jatuh tempo berubah). */
  not_planned: number;
  /** Jumlah alat jatuh tempo tanpa penerima (tidak dikirim ke siapa pun). */
  unassigned?: number;
  email_enabled: boolean;
}
