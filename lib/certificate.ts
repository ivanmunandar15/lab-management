import { isBackendFileUrl, toProxyUrl } from "@/lib/api/urls";
import type { Calibration, Equipment } from "@/types/erd";

export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_ACCEPT = "application/pdf,image/png,image/jpeg";

/** File dibaca jadi data URL untuk dikirim di JSON; backend memverifikasi isi file lalu menyimpannya. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File gagal dibaca"));
    reader.readAsDataURL(file);
  });
}

export const hasCertificate = (c: Pick<Calibration, "certificate_file_url" | "calibration_result">) =>
  c.certificate_file_url !== "";

function save(href: string, fileName: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Unduh file sertifikat asli. `certificate_file_url` dari backend berupa path API (dibuka lewat proxy sesi);
 * tidak ada lagi PDF tiruan. Parameter `equipment` dipertahankan agar signature lama tetap cocok.
 */
export async function downloadCertificate(c: Calibration, _equipment?: Pick<Equipment, "equipment_name" | "inventory_code">) {
  const safeNumber = c.certificate_number.replace(/[^\w.-]+/g, "_");
  const url = c.certificate_file_url;
  if (isBackendFileUrl(url)) return save(toProxyUrl(url), `sertifikat-${safeNumber}`);
  if (url.startsWith("data:") || url.startsWith("http")) return save(url, `sertifikat-${safeNumber}`);
  throw new Error("Sertifikat belum diunggah");
}
