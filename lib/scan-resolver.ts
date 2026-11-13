import { isValidQrToken, parseQrContent } from "@/lib/domain";
import { equipmentService, ServiceError, supportingEquipmentService } from "@/lib/services";
import type { Equipment, QrEntityType, SupportingEquipment } from "@/types/erd";

export type ScanResolution =
  | { ok: true; kind: "eq"; item: Equipment }
  | { ok: true; kind: "sp"; item: SupportingEquipment }
  | { ok: false; reason: "unrecognized" | "not_found"; message: string };

const isNotFound = (e: unknown) => e instanceof ServiceError && e.code === "NOT_FOUND";

async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

const NOT_FOUND: ScanResolution = {
  ok: false,
  reason: "not_found",
  message: "QR tidak dikenali. Alat atau item ini tidak terdaftar di sistem.",
};

async function resolveToken(type: QrEntityType, token: string): Promise<ScanResolution> {
  if (type === "eq") {
    const item = await orNull(() => equipmentService.getByQrToken(token));
    return item ? { ok: true, kind: "eq", item } : NOT_FOUND;
  }
  const item = await orNull(() => supportingEquipmentService.getByQrToken(token));
  return item ? { ok: true, kind: "sp", item } : NOT_FOUND;
}

/** Hasil baca kamera -> alat / item pendukung terbaru dari data layer. */
export async function resolveQrText(text: string): Promise<ScanResolution> {
  const parsed = parseQrContent(text);
  if (!parsed) {
    return { ok: false, reason: "unrecognized", message: "QR ini bukan QR alat laboratorium. Arahkan kamera ke QR pada alat." };
  }
  return resolveToken(parsed.type, parsed.token);
}

/** Input manual: kode inventaris / kode item, URL QR, atau token mentah. */
export async function resolveManualInput(input: string): Promise<ScanResolution> {
  const value = input.trim();
  if (!value) return { ok: false, reason: "unrecognized", message: "Masukkan kode inventaris terlebih dahulu." };

  const parsed = parseQrContent(value);
  if (parsed) return resolveToken(parsed.type, parsed.token);

  const eq = await orNull(() => equipmentService.getByInventoryCode(value));
  if (eq) return { ok: true, kind: "eq", item: eq };
  const sp = await orNull(() => supportingEquipmentService.getByItemCode(value));
  if (sp) return { ok: true, kind: "sp", item: sp };

  if (isValidQrToken(value)) {
    const byEq = await resolveToken("eq", value);
    if (byEq.ok) return byEq;
    const bySp = await resolveToken("sp", value);
    if (bySp.ok) return bySp;
  }
  return { ok: false, reason: "not_found", message: `Kode "${value}" tidak ditemukan. Periksa kembali kode inventaris pada label alat.` };
}

export const scanPath = (r: Extract<ScanResolution, { ok: true }>) => `/scan/${r.kind}/${r.item.qr_token}`;
