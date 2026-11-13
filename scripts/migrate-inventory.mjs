#!/usr/bin/env node
/**
 * Pindahkan data/source/inventaris.csv ke backend (ruangan + alat), tanpa mengubah backend.
 *
 *   # 1) Hanya hasilkan CSV impor (tanpa menyentuh backend) dan laporkan masalah data:
 *   node scripts/migrate-inventory.mjs --csv-only
 *
 *   # 2) Dry run ke backend (default aman: tidak ada yang disimpan; ruangan yang kurang TIDAK dibuat):
 *   MIGRATE_EMAIL=admin@lab.local MIGRATE_PASSWORD='Password123!' node scripts/migrate-inventory.mjs
 *
 *   # 3) Simpan sungguhan (membuat ruangan yang belum ada, lalu mengimpor alat):
 *   MIGRATE_EMAIL=... MIGRATE_PASSWORD=... node scripts/migrate-inventory.mjs --commit
 *
 * CATATAN: untuk development pakai `npm run db:seed` di backend (data nyata + akun personil). Skrip ini untuk mengisi backend
 * yang SUDAH berjalan (mis. produksi, tempat seed ditolak) dan baru memetakan alat utama; pemetaan kolom Datang/kalibrasi
 * dan alat pendukung (supporting.csv) ada di backend/prisma/seed-data.ts dan belum diport ke sini.
 *
 * Env: API_URL (default http://localhost:3000/api/v1), MIGRATE_EMAIL, MIGRATE_PASSWORD (role admin/SPV).
 * Aman dijalankan ulang: kode inventaris yang sudah ada di backend dilewati.
 *
 * KONTRAK: butuh backend yang menerima kode inventaris berspasi (`CODE_REGEX` di equipment.schema.ts) dan
 * `person_in_charge` opsional pada POST /compat/rooms. Kode inventaris dipakai persis seperti di CSV
 * ("INV L-ACT 10-01"), hanya spasi berulang yang dirapikan. Ruangan dibuat tanpa penanggung jawab
 * (isi lewat halaman Ruangan).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "data/source/inventaris.csv");
const OUT = resolve(ROOT, "data/generated/equipment-import.csv");
const args = new Set(process.argv.slice(2));
const COMMIT = args.has("--commit");
const CSV_ONLY = args.has("--csv-only");
const API_URL = (process.env.API_URL ?? "http://localhost:3000/api/v1").replace(/\/$/, "");

/** "Posisi Alat" di CSV -> ruangan. Ruangan 9-13 tidak ada di daftar lab resmi tetapi dipakai CSV. */
const ROOMS = [
  ["R-HAA", "Home App & Auvi Room", "Home App & Auvi Laboratory", "Pengujian peralatan rumah tangga dan audio/video."],
  ["R-LUM", "Luminer Room", "Luminer Laboratory", "Pengujian luminer dan perlengkapan pencahayaan."],
  ["R-CMB", "Combustion Room", "Combus Laboratory", "Pengujian ketahanan nyala api dan pembakaran."],
  ["R-ELC", "Elcon Room", "Elcon Laboratory", "Pengujian kelistrikan dan konstruksi."],
  ["R-DRK", "Dark Room", "Dark Laboratory", "Pengukuran fotometri dan radiasi optik."],
  ["R-IPX", "IPX Room", "IPX Laboratory", "Pengujian ketahanan terhadap air (IPX)."],
  ["R-DST", "Dust Room", "Dust Laboratory", "Pengujian ketahanan terhadap debu (IP5X/IP6X)."],
  ["R-SPH", "Sphere Room", "Sphere Laboratory", "Pengukuran fluks cahaya dengan integrating sphere."],
  ["R-TRS", "Temperature Rise", "Temperature Rise Laboratory", "Pengujian kenaikan suhu."],
  ["R-VIB", "Vibration Room", "Vibration Laboratory", "Pengujian getaran."],
  ["R-AUD", "Audio Room", "Audio Laboratory", "Pengujian audio."],
  ["R-DUR", "Durability Room", "Durability Laboratory", "Pengujian daya tahan."],
  ["R-THM", "Temperature & Humidity Room", "Temperature & Humidity Laboratory", "Pengujian suhu dan kelembapan."],
];
const ROOM_BY_POSITION = new Map(ROOMS.map(([code, pos]) => [pos, code]));

/* ---------- CSV ---------- */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const csvCell = (v) => (/[",\r\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const toCsv = (cols, rows) => [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c] ?? "")).join(","))].join("\r\n") + "\r\n";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const blank = (s) => ["", "-"].includes(clean(s));
function isoDate(s, problems, code) {
  const v = clean(s);
  if (blank(v)) return "";
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (!m) { problems.push(`${code}: format tanggal tidak dikenal '${v}' (diabaikan)`); return ""; }
  const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) { problems.push(`${code}: tanggal tidak valid '${v}' (diabaikan)`); return ""; }
  return iso;
}
const brandOf = (s) => (/^(angui|agui)\b/i.test(clean(s)) ? "Angui Testing Co., Ltd." : clean(s) || "-");
/** Sama dengan CODE_REGEX backend (equipment.schema.ts). */
const BACKEND_CODE = /^[A-Za-z0-9](?:[A-Za-z0-9._\-/]| (?=[A-Za-z0-9._\-/]))*$/;

/* ---------- transform ---------- */
function transform() {
  const [header, ...data] = parseCsv(readFileSync(SRC, "utf8"));
  const problems = [];
  const items = [];
  for (const raw of data) {
    const r = [...raw, ...Array(Math.max(0, header.length - raw.length)).fill("")];
    const oldCode = clean(r[0]);
    if (!oldCode.startsWith("INV")) continue; // sub-header / baris kosong
    const room = ROOM_BY_POSITION.get(clean(r[7]));
    if (!room) { problems.push(`${oldCode}: posisi alat tidak dikenal '${clean(r[7])}' (dilewati)`); continue; }
    const code = oldCode; // sudah dirapikan oleh clean() (spasi berulang -> satu)
    if (!BACKEND_CODE.test(code) || code.length > 50) { problems.push(`${oldCode}: kode tidak lolos aturan backend (dilewati)`); continue; }
    const name = clean(r[1]);
    if (name.length < 2 || name.length > 150) { problems.push(`${oldCode}: nama alat kosong/terlalu panjang (dilewati)`); continue; }
    const last = isoDate(r[9], problems, oldCode);
    const next = isoDate(r[10], problems, oldCode);
    if (next && !last) problems.push(`${oldCode}: ada jadwal berikutnya tanpa kalibrasi terakhir`);
    if (last && next && next <= last) problems.push(`${oldCode}: kalibrasi berikutnya <= terakhir`);
    const serial = blank(r[5]) ? "" : clean(r[5]);
    const note = clean(r[22]);
    items.push({
      inventory_code: code,
      equipment_name: name,
      equipment_type: clean(r[2]) || "Utama", // "Utama" | "Sub Bagian"
      brand: brandOf(r[6]),
      model: blank(r[4]) ? "-" : clean(r[4]),
      room_code: room,
      status: "available",
      condition: "good",
      purchase_date: "",
      purchase_price: "",
      useful_life_years: "", // tidak ada di CSV: dibiarkan kosong (null) agar tidak mengarang data
      specifications: [serial && `S/N: ${serial}`, note && `Catatan: ${note}`].filter(Boolean).join("; "),
      next_calibration_date: next,
    });
  }
  const seen = new Map();
  for (const it of items) {
    const k = it.inventory_code.toLowerCase();
    if (seen.has(k)) problems.push(`kode ganda setelah normalisasi: ${it.inventory_code}`);
    seen.set(k, true);
  }
  return { items, problems };
}

const COLUMNS = ["inventory_code", "equipment_name", "equipment_type", "brand", "model", "room_code", "status", "condition", "purchase_date", "purchase_price", "useful_life_years", "specifications", "next_calibration_date"];

/* ---------- backend ---------- */
async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}), "X-Client": "bff" },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* bukan JSON */ }
  return { ok: res.ok, status: res.status, json, text };
}
const fail = (msg, extra) => { console.error(`GAGAL: ${msg}`); if (extra) console.error(typeof extra === "string" ? extra : JSON.stringify(extra, null, 2)); process.exit(1); };

async function main() {
  const { items, problems } = transform();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, "\uFEFF" + toCsv(COLUMNS, items), "utf8");
  const perRoom = Object.fromEntries(ROOMS.map(([c]) => [c, items.filter((i) => i.room_code === c).length]));
  console.log(`${items.length} alat -> ${OUT.replace(ROOT + "/", "")}`);
  console.log("per ruangan:", perRoom);
  console.log("dengan jadwal kalibrasi:", items.filter((i) => i.next_calibration_date).length, "| tanpa:", items.filter((i) => !i.next_calibration_date).length);
  for (const p of problems) console.log("PERHATIAN:", p);
  if (problems.some((p) => /dilewati|ganda/.test(p))) console.log("(baris yang 'dilewati' tidak ikut diimpor)");
  if (CSV_ONLY) return;

  const email = process.env.MIGRATE_EMAIL, password = process.env.MIGRATE_PASSWORD;
  if (!email || !password) fail("Set MIGRATE_EMAIL dan MIGRATE_PASSWORD (akun admin/SPV), atau pakai --csv-only.");
  const login = await call("POST", "/auth/login", { body: { email, password } });
  if (!login.ok) fail(`login (${login.status})`, login.text);
  const token = login.json.data.access_token;

  // 1) Ruangan
  const roomsRes = await call("GET", "/compat/rooms", { token });
  if (!roomsRes.ok) fail(`baca ruangan (${roomsRes.status})`, roomsRes.text);
  const existingRooms = new Set(roomsRes.json.map((r) => r.room_code));
  const missing = ROOMS.filter(([code]) => !existingRooms.has(code) && perRoom[code] > 0);
  console.log(`\nRuangan: ${existingRooms.size} sudah ada, ${missing.length} perlu dibuat${missing.length ? ` (${missing.map((m) => m[0]).join(", ")})` : ""}`);
  if (missing.length && !COMMIT) console.log("Dry run: ruangan TIDAK dibuat, sehingga validasi baris ruangan tsb akan melaporkan 'Ruangan ... tidak ditemukan'. Jalankan dengan --commit.");
  if (COMMIT) {
    for (const [code, , name, description] of missing) {
      const n = perRoom[code];
      const cap = Math.max(10, Math.ceil((n * 1.15) / 10) * 10); // jumlah alat + cadangan ~15%, kelipatan 10
      const r = await call("POST", "/compat/rooms", { token, body: { room_code: code, room_name: name, equipment_capacity: cap, person_in_charge: "", description } });
      if (!r.ok) fail(`buat ruangan ${code} (${r.status})`, r.text);
      console.log(`  + ${code} kapasitas ${cap} (tanpa penanggung jawab)`);
    }
  }

  // 2) Lewati kode yang sudah ada di backend (aman dijalankan ulang)
  const eqRes = await call("GET", "/compat/equipment?includeInactive=true", { token });
  if (!eqRes.ok) fail(`baca alat (${eqRes.status})`, eqRes.text);
  const have = new Set(eqRes.json.map((e) => e.inventory_code.toLowerCase()));
  const todo = items.filter((i) => !have.has(i.inventory_code.toLowerCase()));
  console.log(`\nAlat: ${items.length - todo.length} sudah ada di backend (dilewati), ${todo.length} akan diimpor`);
  if (!todo.length) return console.log("Tidak ada yang perlu diimpor.");

  // 3) Impor (endpoint API utama; maks 1000 baris/2 MB per permintaan; all_or_nothing)
  const form = new FormData();
  form.set("file", new Blob([toCsv(COLUMNS, todo)], { type: "text/csv" }), "inventaris.csv");
  form.set("dry_run", COMMIT ? "false" : "true");
  form.set("all_or_nothing", "true");
  const imp = await call("POST", "/equipment/import", { token, form });
  if (!imp.ok) fail(`impor (${imp.status})`, imp.json?.error ?? imp.text);
  const d = imp.json.data;
  const { created, ...summary } = d;
  console.log(COMMIT ? "\nImpor selesai:" : "\nDry run selesai (tidak ada data disimpan):", JSON.stringify(summary, null, 2));
  if (COMMIT && created) console.log(`${created.length} alat dibuat. Contoh QR: ${created[0]?.qr_url}`);
  if (!COMMIT) console.log("\nJika hasil sesuai, jalankan lagi dengan --commit.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
