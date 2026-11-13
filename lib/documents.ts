import { isBackendFileUrl, toProxyUrl } from "@/lib/api/urls";
import type { Document, DocumentType } from "@/types/erd";

export const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  manual: "Manual", certificate: "Sertifikat", procedure: "Prosedur", photo: "Foto", other: "Lainnya",
};
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const formatFileSize = (n: number) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const isPdf = (d: Pick<Document, "file_type">) => d.file_type === "application/pdf";
export const isImage = (d: Pick<Document, "file_type">) => d.file_type.startsWith("image/");
export const canPreview = (d: Pick<Document, "file_type">) => isPdf(d) || isImage(d);

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File gagal dibaca"));
    reader.readAsDataURL(file);
  });
}

/**
 * URL yang bisa dibuka/diunduh. File di backend (`/api/v1/compat/...`) dibuka lewat proxy Next.js dengan cookie sesi;
 * `inline=true` agar PDF/gambar tampil di pratinjau (unduhan tetap memaksa download lewat atribut `download`).
 */
export async function resolveDocumentUrl(doc: Document): Promise<string> {
  const u = doc.file_url;
  if (isBackendFileUrl(u)) return toProxyUrl(u, { inline: canPreview(doc) });
  return u;
}

/**
 * URL untuk pratinjau. Backend mengirim `Content-Security-Policy: sandbox` pada file; Chrome tidak mau merender PDF
 * di <iframe> dengan header itu. Karena itu PDF dari backend diambil lewat proxy lalu ditampilkan sebagai `blob:` URL
 * (pemanggil wajib `URL.revokeObjectURL` saat selesai). Gambar tetap memakai URL proxy langsung.
 */
export async function loadPreviewUrl(doc: Document): Promise<string> {
  const url = await resolveDocumentUrl(doc);
  if (!isBackendFileUrl(doc.file_url) || !isPdf(doc)) return url;
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(`Pratinjau gagal (${res.status})`);
  return URL.createObjectURL(await res.blob());
}

export async function downloadDocument(doc: Document) {
  const url = await resolveDocumentUrl(doc);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
