import { apiMain, enc, qs } from "@/lib/api/client";
import type { EmailLog, EmailLogPageMeta, EmailReminderType, EmailStatus, EmailTestResult } from "@/types/email";

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
  /** Kirim email uji ke alamat akun admin yang sedang login. Sinkron: hasil SMTP langsung dikembalikan. */
  sendTest: async () => (await apiMain<EmailTestResult>("admin/email/test", { method: "POST", body: {} })).data,
};
