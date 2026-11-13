import Papa from "papaparse";
import { format } from "date-fns";
import { qrDataUrl, qrUrl, dataUrlToBlob, triggerDownload } from "@/lib/qr";
import type { Equipment, QrEntityType } from "@/types/erd";

export type LabelSize = "a4-3x8" | "sticker-50x30";
export type ProgressFn = (done: number, total: number, phase: string) => void;

export const LABEL_SIZE_META: Record<LabelSize, string> = {
  "a4-3x8": "A4 grid 3×8 (24 label/halaman)",
  "sticker-50x30": "Stiker 50×30 mm (1 label/halaman)",
};

export const stamp = () => format(new Date(), "yyyyMMdd-HHmm");
/** Beri napas ke UI agar progress bar sempat dirender. */
export const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_");

/** Nama file unik di dalam ZIP (kode inventaris tidak unik secara case-insensitive di sistem file). */
export function uniqueNames(items: { inventory_code: string }[]) {
  const used = new Map<string, number>();
  return items.map((e) => {
    const base = safeName(e.inventory_code);
    const key = base.toLowerCase();
    const n = used.get(key) ?? 0;
    used.set(key, n + 1);
    return n === 0 ? base : `${base}_${n + 1}`;
  });
}

export function buildEquipmentCsv(items: Equipment[], roomName: (id: string) => string): string {
  const rows = items.map((e) => ({
    equipment_id: e.equipment_id,
    inventory_code: e.inventory_code,
    equipment_name: e.equipment_name,
    equipment_type: e.equipment_type,
    brand: e.brand,
    model: e.model,
    room_id: e.room_id,
    room_name: roomName(e.room_id),
    status: e.status,
    condition: e.condition ?? "",
    purchase_date: e.purchase_date ?? "",
    purchase_price: e.purchase_price ?? "",
    useful_life_years: e.useful_life_years ?? "",
    specifications: e.specifications ?? "",
    next_calibration_date: e.next_calibration_date ?? "",
    is_active: e.is_active,
    created_at: e.created_at,
    updated_at: e.updated_at,
    qr_token: e.qr_token,
    qr_url: qrUrl("eq", e.qr_token),
  }));
  // BOM agar Excel membaca UTF-8 dengan benar.
  return "\uFEFF" + Papa.unparse(rows, { newline: "\r\n" });
}

const csvBlob = (csv: string) => new Blob([csv], { type: "text/csv;charset=utf-8" });

export async function exportCsv(items: Equipment[], roomName: (id: string) => string) {
  triggerDownload(csvBlob(buildEquipmentCsv(items, roomName)), `equipment-${stamp()}.csv`);
}

export async function exportQrZip(items: Equipment[], roomName: (id: string) => string, onProgress?: ProgressFn) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("equipment.csv", buildEquipmentCsv(items, roomName));
  const folder = zip.folder("qr")!;
  const names = uniqueNames(items);
  for (let i = 0; i < items.length; i++) {
    const png = await dataUrlToBlob(await qrDataUrl("eq", items[i].qr_token, 600));
    folder.file(`${names[i]}.png`, png);
    onProgress?.(i + 1, items.length, "Membuat QR");
    if (i % 5 === 0) await tick();
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (m) =>
    onProgress?.(Math.round(m.percent), 100, "Mengompres ZIP"),
  );
  triggerDownload(blob, `equipment-qr-${stamp()}.zip`);
}

export interface LabelItem { name: string; code: string; qr_token: string }

export const exportLabelPdf = (items: Equipment[], size: LabelSize, onProgress?: ProgressFn) =>
  exportLabels(items.map((e) => ({ name: e.equipment_name, code: e.inventory_code, qr_token: e.qr_token })), "eq", size, onProgress, "label");

/** Generator label PDF generik (alat & alat pendukung). */
export async function exportLabels(items: LabelItem[], qrType: QrEntityType, size: LabelSize, onProgress?: ProgressFn, prefix = "label") {
  const { jsPDF } = await import("jspdf");
  const sticker = size === "sticker-50x30";
  const doc = new jsPDF({ unit: "mm", format: sticker ? [50, 30] : "a4", orientation: sticker ? "landscape" : "portrait" });

  const cols = 3, rows = 8;
  const cellW = 210 / cols, cellH = 297 / rows;

  for (let i = 0; i < items.length; i++) {
    const e = items[i];
    let x = 0, y = 0, w = 50, h = 30;
    if (sticker) {
      if (i > 0) doc.addPage([50, 30], "landscape");
    } else {
      const perPage = cols * rows;
      if (i > 0 && i % perPage === 0) doc.addPage();
      const idx = i % perPage;
      w = cellW; h = cellH;
      x = (idx % cols) * cellW;
      y = Math.floor(idx / cols) * cellH;
      doc.setDrawColor(200).setLineWidth(0.1).rect(x, y, w, h); // garis potong tipis
    }
    const pad = sticker ? 2 : 3;
    const qrSize = Math.min(h - pad * 2, sticker ? 22 : 28);
    const img = await qrDataUrl(qrType, e.qr_token, 400);
    doc.addImage(img, "PNG", x + pad, y + (h - qrSize) / 2, qrSize, qrSize);

    const tx = x + pad + qrSize + 2;
    const tw = w - (tx - x) - pad;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold").setFontSize(sticker ? 7 : 8);
    const nameLines = (doc.splitTextToSize(e.name, tw) as string[]).slice(0, sticker ? 3 : 4);
    const lineH = sticker ? 3 : 3.6;
    const blockH = nameLines.length * lineH + (sticker ? 4 : 5);
    let ty = y + (h - blockH) / 2 + lineH * 0.8;
    doc.text(nameLines, tx, ty);
    ty += nameLines.length * lineH + 1;
    doc.setFont("courier", "bold").setFontSize(sticker ? 6.5 : 7.5);
    doc.text((doc.splitTextToSize(e.code, tw) as string[]).slice(0, 1), tx, ty);

    onProgress?.(i + 1, items.length, "Membuat label");
    if (i % 5 === 0) await tick();
  }
  doc.save(`${prefix}-${sticker ? "50x30" : "a4"}-${stamp()}.pdf`);
}
