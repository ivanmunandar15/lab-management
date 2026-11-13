import Papa from "papaparse";
import { format } from "date-fns";
import { triggerDownload } from "@/lib/qr";
import type { ActivityLog } from "@/types/erd";

/** CSV dengan BOM agar terbaca benar di Excel. */
export function exportActivityCsv(logs: ActivityLog[], userName: (id: string) => string) {
  const rows = logs.map((l) => ({
    log_id: l.log_id,
    waktu: format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
    pengguna: userName(l.user_id),
    aksi: l.action,
    entitas: l.entity_type,
    entity_id: l.entity_id,
    ip_address: l.ip_address,
    data_lama: l.old_data ? JSON.stringify(l.old_data) : "",
    data_baru: l.new_data ? JSON.stringify(l.new_data) : "",
  }));
  const csv = "\uFEFF" + Papa.unparse(rows);
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `activity-log-${format(new Date(), "yyyyMMdd-HHmm")}.csv`);
}
