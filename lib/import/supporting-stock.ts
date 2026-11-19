import Papa from "papaparse";
import { triggerDownload } from "@/lib/qr";
import { stamp } from "@/lib/export/equipment-export";
import type { SupportingEquipment } from "@/types/erd";

export const MAX_STOCK_QTY = 1_000_000;

export interface StockRow {
  line: number; // nomor baris di file (baris 1 = header)
  code: string;
  qty: number | null;
  item?: SupportingEquipment;
  /** Jumlah sudah sama dengan yang di sistem: tidak perlu diubah. */
  unchanged: boolean;
  error?: string;
}

/** Daftar item saat ini (kode, nama, satuan, jumlah total) untuk diisi di Excel lalu diunggah ulang. */
export function downloadStockSheet(items: SupportingEquipment[]) {
  const data = items.map((s) => ({ item_code: s.item_code, item_name: s.item_name, unit: s.unit, total_quantity: s.total_quantity }));
  const csv = "\uFEFF" + Papa.unparse({ fields: ["item_code", "item_name", "unit", "total_quantity"], data }, { newline: "\r\n" });
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `stok-alat-pendukung-${stamp()}.csv`);
}

/**
 * Baca CSV pembaruan stok. Hanya kolom `item_code` dan `total_quantity` yang dipakai; kolom lain diabaikan,
 * jadi file hasil ekspor/unduhan daftar item bisa langsung diedit dan diunggah. Item dicari berdasarkan kode (tanpa membedakan huruf besar/kecil).
 */
export function parseStockCsv(text: string, items: SupportingEquipment[]): { rows: StockRow[]; fileError?: string } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase(),
  });
  const missing = ["item_code", "total_quantity"].filter((h) => !res.meta.fields?.includes(h));
  if (missing.length) return { rows: [], fileError: `Kolom tidak ditemukan: ${missing.join(", ")}. Unduh daftar item untuk contoh format.` };
  if (res.data.length === 0) return { rows: [], fileError: "File tidak berisi data." };

  const byCode = new Map(items.map((s) => [s.item_code.toLowerCase(), s]));
  const seen = new Map<string, number>();
  const rows = res.data.map((raw, i): StockRow => {
    const line = i + 2;
    const code = (raw.item_code ?? "").trim();
    const qtyText = (raw.total_quantity ?? "").trim();
    const base = { line, code, qty: null as number | null, unchanged: false };
    if (!code) return { ...base, error: "Kode item kosong" };
    const key = code.toLowerCase();
    const item = byCode.get(key);
    if (!item) return { ...base, error: "Kode item tidak ditemukan di sistem" };
    if (seen.has(key)) return { ...base, item, error: `Kode ganda dengan baris ${seen.get(key)}` };
    seen.set(key, line);
    if (qtyText === "") return { ...base, item, error: "Jumlah total kosong" };
    const qty = Number(qtyText);
    if (!Number.isInteger(qty) || qty < 0 || qty > MAX_STOCK_QTY) return { ...base, item, error: `Jumlah total harus bilangan bulat 0–${MAX_STOCK_QTY.toLocaleString("id-ID")}` };
    return { ...base, item, qty, unchanged: qty === item.total_quantity };
  });
  return { rows };
}
