import QRCode from "qrcode";
import { buildQrUrl } from "@/lib/domain";
import type { QrEntityType } from "@/types/erd";

/** Level koreksi error M: cukup tahan lecet pada label, tetap padat. */
const QR_OPTS = { errorCorrectionLevel: "M" as const, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } };

/** Isi QR = URL saja. TIDAK memuat status alat. */
export const qrUrl = (type: QrEntityType, token: string) => buildQrUrl(type, token);

/** Render QR ke data URL PNG dari token. Tidak disimpan di database. */
export const qrDataUrl = (type: QrEntityType, token: string, size = 512) =>
  QRCode.toDataURL(qrUrl(type, token), { ...QR_OPTS, width: size });

export const qrToCanvas = (canvas: HTMLCanvasElement, type: QrEntityType, token: string, size: number) =>
  QRCode.toCanvas(canvas, qrUrl(type, token), { ...QR_OPTS, width: size });

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Unduh QR sebagai PNG. `filename` tanpa ekstensi. */
export async function downloadQrPng(type: QrEntityType, token: string, filename: string, size = 768) {
  const blob = await dataUrlToBlob(await qrDataUrl(type, token, size));
  triggerDownload(blob, `${filename}.png`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Cetak satu label (QR + nama + kode) lewat jendela cetak browser. */
export async function printQrLabel(type: QrEntityType, token: string, name: string, code: string) {
  const img = await qrDataUrl(type, token, 600);
  const w = window.open("", "_blank", "width=420,height=560");
  if (!w) throw new Error("Pop-up diblokir. Izinkan pop-up untuk mencetak label.");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(code)}</title>
<style>@page{margin:8mm}body{font-family:system-ui,sans-serif;margin:0;display:flex;justify-content:center}
.l{display:flex;gap:12px;align-items:center;border:1px dashed #999;padding:10px;margin-top:12px}
img{width:140px;height:140px}.n{font-weight:700;font-size:16px;max-width:200px}.c{font-family:monospace;font-size:14px;margin-top:6px}</style></head>
<body><div class="l"><img src="${img}" alt="QR"/><div><div class="n">${esc(name)}</div><div class="c">${esc(code)}</div></div></div>
<script>window.onload=()=>{window.print();}</script></body></html>`);
  w.document.close();
}
