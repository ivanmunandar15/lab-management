import Papa from "papaparse";
import { format } from "date-fns";
import { LOGBOOK_TEMPLATE as T } from "@/lib/config/document-template";
import { stamp, tick, uniqueNames, type ProgressFn } from "@/lib/export/equipment-export";
import { triggerDownload } from "@/lib/qr";
import type { BorrowingWithDetails, Equipment, PublicUser } from "@/types/erd";

export interface LogbookRow {
  borrowing_id: string;
  user_name: string;
  usage_date: string; // dd/MM/yyyy
  start_time: string; // HH:mm
  end_time: string; // HH:mm, "(d/M)" bila beda hari, kosong bila belum kembali
  returned: boolean;
  initial_condition: string;
  final_condition: string;
  purpose: string;
  usage_location: string;
  damage_notes: string;
}

export interface LogbookRange { from: string; to: string } // yyyy-MM-dd, inklusif
export interface LogbookMeta { equipment: Equipment; roomName: string }

const day = (d: Date) => format(d, "yyyy-MM-dd");

/** Baris log book untuk satu alat, urut dari yang paling lama. */
export function buildLogbookRows(
  equipmentId: string,
  borrowings: BorrowingWithDetails[],
  users: Pick<PublicUser, "user_id" | "name">[],
  range?: LogbookRange,
): LogbookRow[] {
  const userName = new Map(users.map((u) => [u.user_id, u.name]));
  const rows: LogbookRow[] = [];
  const ordered = [...borrowings].sort((a, b) => a.borrowing_time.localeCompare(b.borrowing_time));
  for (const b of ordered) {
    const detail = b.equipment_details.find((d) => d.equipment_id === equipmentId);
    if (!detail) continue;
    const start = new Date(b.borrowing_time);
    const d = day(start);
    if (range && (d < range.from || d > range.to)) continue;
    const end = b.actual_return_time ? new Date(b.actual_return_time) : null;
    const sameDay = end ? day(end) === d : true;
    rows.push({
      borrowing_id: b.borrowing_id,
      user_name: userName.get(b.user_id) ?? "—",
      usage_date: format(start, "dd/MM/yyyy"),
      start_time: format(start, "HH:mm"),
      end_time: end ? `${format(end, "HH:mm")}${sameDay ? "" : ` (${format(end, "d/M")})`}` : "",
      returned: !!end,
      initial_condition: detail.initial_condition,
      final_condition: detail.final_condition ?? "",
      purpose: b.purpose,
      usage_location: b.usage_location,
      damage_notes: detail.has_damage ? (detail.damage_notes ?? "Rusak") : "",
    });
  }
  return rows;
}

/* ---------------- PDF ---------------- */

// Geometri dalam mm, diukur dari template FM/L-ACT.06.4/08 (A4 portrait).
const X0 = 19.5;
const COLS = [
  { key: "no", w: 6.6, align: "center" },
  { key: "user_name", w: 37.4, align: "left" },
  { key: "usage_date", w: 31.2, align: "center" },
  { key: "start_time", w: 29.2, align: "center" },
  { key: "end_time", w: 29.2, align: "center" },
  { key: "initial_condition", w: 23.2, align: "center" },
  { key: "final_condition", w: 19.9, align: "center" },
] as const;
const TABLE_W = COLS.reduce((s, c) => s + c.w, 0);
const TABLE_Y = 62.8;
const HEAD_H = 4.6; // dua tingkat header
const ROW_H = 6.7;

type Doc = import("jspdf").jsPDF;

async function loadLogo(): Promise<string | null> {
  if (!T.logoUrl) return null;
  try {
    const res = await fetch(T.logoUrl);
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fit(doc: Doc, text: string, width: number) {
  if (doc.getTextWidth(text) <= width) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > width) t = t.slice(0, -1);
  return `${t}…`;
}

function drawPage(doc: Doc, logo: string | null, meta: LogbookMeta, rows: LogbookRow[], startNo: number, page: number, pages: number) {
  doc.setTextColor(0).setDrawColor(0).setLineWidth(0.2);
  if (logo) doc.addImage(logo, "PNG", 25, 15, 22, 19, undefined, "FAST");

  doc.setFont("helvetica", "normal").setFontSize(11).text(T.labName, 53, 18);
  doc.setFont("helvetica", "bold").setFontSize(12).text(T.companyName, 53, 23.4);
  doc.setFontSize(11).text(T.title, 53, 32.4);

  const e = meta.equipment;
  const info: [string, string][] = [
    ["Nama Alat / Instrument", e.equipment_name],
    ["Nomor Alat / Instrument", e.inventory_code],
    ["Lokasi", meta.roomName],
  ];
  info.forEach(([k, v], i) => {
    const y = 43.8 + i * 4.7;
    doc.setFont("helvetica", "bold").setFontSize(7).text(k, 20, y);
    doc.text(`: ${v}`, 52.4, y);
  });

  // Header tabel
  const y0 = TABLE_Y;
  const xs = COLS.reduce<number[]>((a, c) => [...a, a[a.length - 1] + c.w], [X0]);
  doc.rect(X0, y0, TABLE_W, HEAD_H * 2);
  [1, 2, 3, 5].forEach((i) => doc.line(xs[i], y0, xs[i], y0 + HEAD_H * 2)); // pemisah utama
  doc.line(xs[3], y0 + HEAD_H, xs[7], y0 + HEAD_H); // garis di bawah grup
  doc.line(xs[4], y0 + HEAD_H, xs[4], y0 + HEAD_H * 2);
  doc.line(xs[6], y0 + HEAD_H, xs[6], y0 + HEAD_H * 2);
  doc.setFont("helvetica", "bold").setFontSize(7);
  const cx = (i: number, j = i + 1) => (xs[i] + xs[j]) / 2;
  doc.text("No", cx(0), y0 + HEAD_H + 1.6, { align: "center", baseline: "middle" });
  doc.text("Nama Pengguna", cx(1), y0 + HEAD_H + 1.6, { align: "center", baseline: "middle" });
  doc.text("Tanggal Penggunaan", cx(2), y0 + HEAD_H + 1.6, { align: "center", baseline: "middle" });
  doc.text("Waktu Penggunaan", cx(3, 5), y0 + HEAD_H / 2, { align: "center", baseline: "middle" });
  doc.text("Kondisi", cx(5, 7), y0 + HEAD_H / 2, { align: "center", baseline: "middle" });
  [["Mulai", 3], ["Selesai", 4], ["Mulai", 5], ["Selesai", 6]].forEach(([t, i]) =>
    doc.text(t as string, cx(i as number), y0 + HEAD_H * 1.5, { align: "center", baseline: "middle" }),
  );

  // Baris data (selalu penuh sampai rowsPerPage)
  const top = y0 + HEAD_H * 2;
  for (let r = 0; r < T.rowsPerPage; r++) {
    const y = top + r * ROW_H;
    doc.rect(X0, y, TABLE_W, ROW_H);
    xs.slice(1, -1).forEach((x) => doc.line(x, y, x, y + ROW_H));
    const row = rows[r];
    if (!row) continue;
    doc.setFont("helvetica", "normal").setFontSize(7);
    const my = y + ROW_H / 2;
    const cell = (i: number, text: string, italic = false) => {
      if (italic) doc.setFont("helvetica", "italic").setFontSize(6.5);
      const t = fit(doc, text, COLS[i].w - 2);
      if (COLS[i].align === "left") doc.text(t, xs[i] + 1.2, my, { baseline: "middle" });
      else doc.text(t, cx(i), my, { align: "center", baseline: "middle" });
      if (italic) doc.setFont("helvetica", "normal").setFontSize(7);
    };
    cell(0, String(startNo + r));
    cell(1, row.user_name);
    cell(2, row.usage_date);
    cell(3, row.start_time);
    if (row.returned) cell(4, row.end_time);
    else cell(4, "Belum kembali", true);
    cell(5, row.initial_condition);
    cell(6, row.final_condition);
  }

  doc.setFont("helvetica", "normal").setFontSize(6);
  doc.text(T.documentNumber, 20, 266);
  doc.text(`Hal ${page} dari ${pages}`, 197, 266, { align: "right" });
}

/** Buat PDF log book satu alat. `blank` = form kosong (1 halaman, tanpa data). */
export async function createLogbookPdf(meta: LogbookMeta, rows: LogbookRow[], opts: { blank?: boolean } = {}): Promise<Doc> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = await loadLogo();
  const data = opts.blank ? [] : rows;
  const pages = Math.max(1, Math.ceil(data.length / T.rowsPerPage));
  for (let p = 0; p < pages; p++) {
    if (p > 0) doc.addPage();
    drawPage(doc, logo, meta, data.slice(p * T.rowsPerPage, (p + 1) * T.rowsPerPage), p * T.rowsPerPage + 1, p + 1, pages);
  }
  return doc;
}

const fileBase = (e: Equipment) => e.inventory_code.replace(/[\\/:*?"<>|\s]+/g, "_");

export async function exportLogbookPdf(meta: LogbookMeta, rows: LogbookRow[], opts: { blank?: boolean } = {}) {
  const doc = await createLogbookPdf(meta, rows, opts);
  doc.save(`logbook-${fileBase(meta.equipment)}-${opts.blank ? "kosong" : stamp()}.pdf`);
}

/** Beberapa alat -> satu ZIP berisi PDF per alat. */
export async function exportLogbookZip(items: { meta: LogbookMeta; rows: LogbookRow[] }[], opts: { blank?: boolean } = {}, onProgress?: ProgressFn) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const names = uniqueNames(items.map((i) => i.meta.equipment));
  for (let i = 0; i < items.length; i++) {
    const doc = await createLogbookPdf(items[i].meta, items[i].rows, opts);
    zip.file(`logbook-${names[i]}.pdf`, doc.output("arraybuffer"));
    onProgress?.(i + 1, items.length, "Membuat PDF log book");
    await tick();
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (m) => onProgress?.(Math.round(m.percent), 100, "Mengompres ZIP"));
  triggerDownload(blob, `logbook-${opts.blank ? "kosong-" : ""}${stamp()}.zip`);
}

/* ---------------- CSV ---------------- */

export function buildLogbookCsv(items: { meta: LogbookMeta; rows: LogbookRow[] }[]): string {
  const out = items.flatMap(({ meta, rows }) =>
    rows.map((r, i) => ({
      inventory_code: meta.equipment.inventory_code,
      equipment_name: meta.equipment.equipment_name,
      room_name: meta.roomName,
      no: i + 1,
      user_name: r.user_name,
      usage_date: r.usage_date,
      start_time: r.start_time,
      end_time: r.end_time,
      initial_condition: r.initial_condition,
      final_condition: r.final_condition,
      purpose: r.purpose,
      usage_location: r.usage_location,
      damage_notes: r.damage_notes,
    })),
  );
  return "\uFEFF" + Papa.unparse(out, { newline: "\r\n" });
}

export function exportLogbookCsv(items: { meta: LogbookMeta; rows: LogbookRow[] }[]) {
  triggerDownload(new Blob([buildLogbookCsv(items)], { type: "text/csv;charset=utf-8" }), `logbook-${stamp()}.csv`);
}
