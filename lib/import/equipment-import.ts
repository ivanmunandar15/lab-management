import Papa from "papaparse";
import { isValid, parseISO } from "date-fns";
import { createEquipmentSchema, type CreateEquipmentInput } from "@/lib/schemas";
import { triggerDownload } from "@/lib/qr";
import type { Condition, EquipmentStatus, Room } from "@/types/erd";

/** Kolom yang boleh tidak ada di file. */
const OPTIONAL_HEADERS: readonly string[] = ["condition", "purchase_date", "purchase_price", "useful_life_years", "specifications", "next_calibration_date"];

export const IMPORT_HEADERS = [
  "inventory_code", "equipment_name", "equipment_type", "brand", "model", "room_code", "status", "condition",
  "purchase_date", "purchase_price", "useful_life_years", "specifications", "next_calibration_date",
] as const;

const SAMPLE = [
  "INV-0001", "Timbangan Analitik", "Timbangan", "Mettler", "XS205", "LAB-01", "available", "good",
  "2024-01-15", "45000000", "10", "Kapasitas 220 g; resolusi 0,1 mg", "2026-12-31",
];

export interface ImportRow {
  line: number; // nomor baris di file (header = 1)
  raw: Record<string, string>;
  data?: CreateEquipmentInput;
  errors: string[];
}

export function downloadImportTemplate() {
  const csv = "\uFEFF" + Papa.unparse({ fields: [...IMPORT_HEADERS], data: [SAMPLE] }, { newline: "\r\n" });
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "template-import-alat.csv");
}

const STATUSES: EquipmentStatus[] = ["available", "borrowed", "damaged", "maintenance", "calibration"];
const CONDITIONS: Condition[] = ["good", "minor_damage", "major_damage"];

/** Parse + validasi per baris. room_code dipetakan ke room_id. Kode ganda (di sistem/di file) ditandai. */
export function parseImportCsv(text: string, rooms: Room[], existingCodes: Set<string>): { rows: ImportRow[]; fileError?: string } {
  const res = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase(),
  });
  // Kolom opsional boleh tidak ada / kosong (= null): kondisi kosong dianggap baik.
  const missing = IMPORT_HEADERS.filter((h) => !res.meta.fields?.includes(h) && !OPTIONAL_HEADERS.includes(h));
  if (missing.length) return { rows: [], fileError: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Gunakan template.` };
  if (res.data.length === 0) return { rows: [], fileError: "File tidak berisi data." };

  const roomByCode = new Map(rooms.map((r) => [r.room_code.toLowerCase(), r.room_id]));
  const seen = new Map<string, number>();
  const rows: ImportRow[] = res.data.map((raw, i) => {
    const get = (k: string) => (raw[k] ?? "").trim();
    const errors: string[] = [];
    const roomId = roomByCode.get(get("room_code").toLowerCase());
    if (!roomId) errors.push(`Kode ruangan "${get("room_code")}" tidak ditemukan`);
    const status = (get("status") || "available").toLowerCase() as EquipmentStatus;
    const condition = (get("condition") || "good").toLowerCase() as Condition;
    if (!STATUSES.includes(status)) errors.push(`Status tidak valid: "${get("status")}" (${STATUSES.join("/")})`);
    if (!CONDITIONS.includes(condition)) errors.push(`Kondisi tidak valid: "${get("condition")}" (${CONDITIONS.join("/")})`);
    const price = get("purchase_price").replace(/[^\d.]/g, "");
    const life = get("useful_life_years");
    const next = get("next_calibration_date");
    if (next && !isValid(parseISO(next))) errors.push("next_calibration_date harus yyyy-MM-dd");

    const code = get("inventory_code");
    const key = code.toLowerCase();
    if (code && existingCodes.has(key)) errors.push("Kode inventaris sudah ada di sistem");
    if (code && seen.has(key)) errors.push(`Kode inventaris ganda dengan baris ${seen.get(key)}`);
    if (code && !seen.has(key)) seen.set(key, i + 2);

    const candidate = {
      inventory_code: code, equipment_name: get("equipment_name"), equipment_type: get("equipment_type"),
      brand: get("brand"), model: get("model"), room_id: roomId ?? "", status, condition,
      purchase_date: get("purchase_date") || null, purchase_price: price === "" ? null : Number(price),
      useful_life_years: life === "" ? null : Number(life), specifications: get("specifications") || null,
      next_calibration_date: next || null,
    };
    const parsed = createEquipmentSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "room_id" && !roomId) continue;
        const msg = Number.isNaN((candidate as Record<string, unknown>)[String(issue.path[0])]) ? "wajib berupa angka" : issue.message;
        errors.push(`${String(issue.path[0])}: ${msg}`);
      }
    }
    return { line: i + 2, raw, data: errors.length === 0 && parsed.success ? parsed.data : undefined, errors };
  });
  return { rows };
}
