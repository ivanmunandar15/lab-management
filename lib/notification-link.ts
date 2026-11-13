import type { Notification } from "@/types/erd";

/** Tujuan saat notifikasi diklik: tautan eksplisit -> FK entitas -> halaman sesuai tipe. */
export function getNotificationHref(n: Notification): string {
  if (n.link_url) return n.link_url;
  if (n.borrowing_id) return "/borrowing";
  if (n.calibration_id) return "/calibration";
  if (n.maintenance_id) return "/maintenance";
  switch (n.notification_type) {
    case "borrowing": return "/borrowing";
    case "calibration": return "/calibration";
    case "maintenance": return "/maintenance";
    case "monitoring": return "/monitoring";
    default: return "/notifications";
  }
}
