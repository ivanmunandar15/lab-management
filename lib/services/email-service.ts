import { apiMain, enc, qs } from "@/lib/api/client";
import type { EmailLog, EmailLogPageMeta, EmailReminderType, EmailSettingsPatch, EmailSettingsView, EmailStatus, EmailTestResult, ReminderEmailPreview, ReminderPreview, ReminderSendResult, ReminderUnassignedItem, SmtpTestResult } from "@/types/email";

export interface EmailLogListParams {
  page?: number;
  limit?: number;
  status?: EmailStatus;
  reminder_type?: EmailReminderType;
  /** Cari di alamat penerima atau subjek. */
  search?: string;
  /** YYYY-MM-DD */
  date_from?: string;
  /** YYYY-MM-DD (sampai akhir hari tersebut) */
  date_to?: string;
}

export interface EmailLogPage {
  items: EmailLog[];
  meta: EmailLogPageMeta;
}

export const emailService = {
  list: async (params: EmailLogListParams = {}): Promise<EmailLogPage> => {
    const limit = params.limit ?? 20;
    const { data, meta } = await apiMain<EmailLog[], EmailLogPageMeta>("email-logs" + qs({ ...params, limit, sort: "created_at", order: "desc" }));
    return { items: data, meta: meta ?? { page: 1, limit, total: data.length, totalPages: 1 } };
  },
  /** Antrekan ulang email gagal (diproses di belakang layar; muat ulang daftar sesudahnya). */
  retry: async (id: string) => (await apiMain<{ email_log_id: string; status: "queued" }>(`email-logs/${enc(id)}/retry`, { method: "POST", body: {} })).data,
  /** Pratinjau email pengingat kalibrasi yang AKAN dikirim (tanpa mengirim atau mencatat apa pun). */
  previewReminders: async (): Promise<ReminderPreview> => {
    const { data } = await apiMain<{ dry_run: true; emails: ReminderEmailPreview[]; unassigned?: ReminderUnassignedItem[]; mode: "auto" | "manual"; email_enabled: boolean }>(
      "admin/jobs/calibration-reminders/run?dry_run=true", { method: "POST", body: {} });
    return { emails: data.emails.map((e) => ({ ...e, role: e.role ?? null })), unassigned: data.unassigned ?? [], mode: data.mode, email_enabled: data.email_enabled, fetched_at: new Date().toISOString() };
  },
  /** Kirim (antrekan) email pengingat HANYA ke penerima terpilih. Status akhir ada di log email. */
  sendReminders: async (userIds: string[]) =>
    (await apiMain<ReminderSendResult>("admin/email/calibration-reminders/send", { method: "POST", body: { user_ids: userIds } })).data,
  /** Kirim email uji ke alamat akun admin yang sedang login. Sinkron: hasil SMTP langsung dikembalikan. */
  sendTest: async () => (await apiMain<EmailTestResult>("admin/email/test", { method: "POST", body: {} })).data,
  /** Pengaturan email saat ini (default .env + yang disimpan dari halaman Pengaturan Email). */
  getSettings: async () => (await apiMain<EmailSettingsView>("admin/settings/email")).data,
  /** Ubah sebagian pengaturan; berlaku langsung di server tanpa restart. */
  updateSettings: async (patch: EmailSettingsPatch) => (await apiMain<EmailSettingsView>("admin/settings/email", { method: "PATCH", body: patch })).data,
  /** Hapus pengaturan tersimpan: kembali memakai nilai dari .env backend. */
  resetSettings: async () => (await apiMain<EmailSettingsView>("admin/settings/email", { method: "DELETE" })).data,
  /** Tes koneksi + login ke server SMTP (tidak mengirim email). */
  testSmtp: async () => (await apiMain<SmtpTestResult>("admin/settings/email/test-connection", { method: "POST", body: {} })).data,
};
