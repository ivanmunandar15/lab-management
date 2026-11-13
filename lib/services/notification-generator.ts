import { post } from "@/lib/api/client";

export type NotificationGeneratorKind = "calibration" | "overdue" | "temperature" | "damaged";

export const GENERATOR_LABEL: Record<NotificationGeneratorKind, string> = {
  calibration: "Kalibrasi H-30",
  overdue: "Peminjaman terlambat",
  temperature: "Suhu/kelembapan di luar batas",
  damaged: "Alat dilaporkan rusak",
};

export const notificationGenerator = {
  /** Buat notifikasi dari kondisi data saat ini (admin/SPV). Tidak duplikat pada hari yang sama. Mengembalikan jumlah baru. */
  run: (kinds: NotificationGeneratorKind[]) => post<number>("notifications/generate", { kinds }),
};
