import Papa from "papaparse";
import { qrDataUrl, qrUrl, dataUrlToBlob, triggerDownload } from "@/lib/qr";
import { exportLabels, stamp, tick, type LabelSize, type ProgressFn } from "./equipment-export";
import type { SupportingEquipment } from "@/types/erd";

export function buildSupportingCsv(items: SupportingEquipment[]): string {
  const rows = items.map((s) => ({
    supporting_equipment_id: s.supporting_equipment_id,
    item_code: s.item_code,
    item_name: s.item_name,
    item_type: s.item_type,
    brand: s.brand,
    model: s.model,
    unit: s.unit,
    total_quantity: s.total_quantity,
    available_quantity: s.available_quantity,
    condition: s.condition,
    status: s.status,
    description: s.description,
    specifications: s.specifications,
    is_active: s.is_active,
    created_at: s.created_at,
    updated_at: s.updated_at,
    qr_token: s.qr_token,
    qr_url: qrUrl("sp", s.qr_token),
  }));
  return "\uFEFF" + Papa.unparse(rows, { newline: "\r\n" }); // BOM untuk Excel
}

export async function exportSupportingCsv(items: SupportingEquipment[]) {
  triggerDownload(new Blob([buildSupportingCsv(items)], { type: "text/csv;charset=utf-8" }), `supporting-equipment-${stamp()}.csv`);
}

export async function exportSupportingQrZip(items: SupportingEquipment[], onProgress?: ProgressFn) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("supporting-equipment.csv", buildSupportingCsv(items));
  const folder = zip.folder("qr")!;
  const used = new Map<string, number>();
  for (let i = 0; i < items.length; i++) {
    const base = items[i].item_code.replace(/[\\/:*?"<>|]/g, "_");
    const n = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), n + 1);
    folder.file(`${n === 0 ? base : `${base}_${n + 1}`}.png`, await dataUrlToBlob(await qrDataUrl("sp", items[i].qr_token, 600)));
    onProgress?.(i + 1, items.length, "Membuat QR");
    if (i % 5 === 0) await tick();
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (m) => onProgress?.(Math.round(m.percent), 100, "Mengompres ZIP"));
  triggerDownload(blob, `supporting-qr-${stamp()}.zip`);
}

export const exportSupportingLabelPdf = (items: SupportingEquipment[], size: LabelSize, onProgress?: ProgressFn) =>
  exportLabels(items.map((s) => ({ name: s.item_name, code: s.item_code, qr_token: s.qr_token })), "sp", size, onProgress, "label-item");
