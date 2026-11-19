import Papa from "papaparse";
import { createSupportingEquipmentSchema, type CreateSupportingEquipmentInput } from "@/lib/schemas";
import { triggerDownload } from "@/lib/qr";
import type { CsvImportRow } from "@/components/features/common/csv-import-dialog";
import type { Condition } from "@/types/erd";

export const SUPPORTING_IMPORT_HEADERS = [
  "item_code", "item_name", "item_type", "brand", "model", "unit", "total_quantity", "condition", "description", "specifications",
] as const;
// Wajib hanya item_code & item_name; kolom lain opsional (total_quantity kosong = 1, unit kosong = pcs).
const OPTIONAL = ["item_type", "brand", "model", "unit", "total_quantity", "condition", "description", "specifications"];
const SAMPLE = ["SP-0001", "Beaker Glass 250 mL", "Glassware", "Pyrex", "250", "pcs", "20", "good", "Gelas kimia", "Borosilikat"];
const CONDITIONS: Condition[] = ["good", "minor_damage", "major_damage"];

export function downloadSupportingTemplate() {
  const csv = "\uFEFF" + Papa.unparse({ fields: [...SUPPORTING_IMPORT_HEADERS], data: [SAMPLE] }, { newline: "\r\n" });
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "template-import-alat-pendukung.csv");
}

/** available_quantity otomatis = total_quantity saat disimpan (diatur service). */
export function parseSupportingCsv(text: string, existingCodes: Set<string>): { rows: CsvImportRow<CreateSupportingEquipmentInput>[]; fileError?: string } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase(),
  });
  const missing = SUPPORTING_IMPORT_HEADERS.filter((h) => !OPTIONAL.includes(h) && !res.meta.fields?.includes(h));
  if (missing.length) return { rows: [], fileError: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Gunakan template.` };
  if (res.data.length === 0) return { rows: [], fileError: "File tidak berisi data." };

  const seen = new Map<string, number>();
  const rows = res.data.map((raw, i) => {
    const get = (k: string) => (raw[k] ?? "").trim();
    const errors: string[] = [];
    const condition = (get("condition") || "good").toLowerCase() as Condition;
    if (!CONDITIONS.includes(condition)) errors.push(`Kondisi tidak valid: "${get("condition")}" (${CONDITIONS.join("/")})`);
    const code = get("item_code");
    const key = code.toLowerCase();
    if (code && existingCodes.has(key)) errors.push("Kode item sudah ada di sistem");
    if (code && seen.has(key)) errors.push(`Kode item ganda dengan baris ${seen.get(key)}`);
    if (code && !seen.has(key)) seen.set(key, i + 2);
    const qty = get("total_quantity");
    const candidate = {
      item_code: code, item_name: get("item_name"), item_type: get("item_type"), brand: get("brand"), model: get("model"),
      unit: get("unit"), total_quantity: qty === "" ? 1 : Number(qty), condition,
      description: get("description"), specifications: get("specifications"),
    };
    const parsed = createSupportingEquipmentSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]);
        errors.push(`${k}: ${Number.isNaN((candidate as Record<string, unknown>)[k]) ? "wajib berupa angka" : issue.message}`);
      }
    }
    return { line: i + 2, raw, data: errors.length === 0 && parsed.success ? parsed.data : undefined, errors };
  });
  return { rows };
}
