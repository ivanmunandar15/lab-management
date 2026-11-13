# Laboratory Management System: Tahap 1–9

Tahap 1: setup, auth, layout. Tahap 2: data layer. Tahap 3: halaman Dashboard (`/dashboard`).

## Menjalankan (frontend :3001 + backend :3000)
```bash
# Backend (folder lab-equipment-api): lihat README-nya (PostgreSQL, .env, migrasi), lalu
npm run db:seed && npm run dev            # http://localhost:3000

# Frontend (folder ini)
npm install
cp .env.example .env.local                # isi AUTH_SECRET: openssl rand -base64 32
npm run typecheck
npm run dev                               # http://localhost:3001 (port sudah diset di script)
```
Akun seed backend: `admin@lab.local`, 4 teknisi dan 2 SPV (email di README backend), password awal `Password123!`. Tidak ada akun QA.
Agar `CORS_ORIGIN`/`APP_URL`/`FRONTEND_URL` backend cocok, pakai port 3001 untuk frontend.

## Peta data layer
- `types/erd.ts` + `lib/schemas/enums.ts`: enum Zod -> tipe (sumber tunggal, dari Tahap 1) + tipe view Tahap 2
- `lib/schemas/erd.ts`: skema Zod semua tabel + skema create/update (`qr_token` tidak bisa diedit, `.strict()`)
- `lib/domain.ts`: generateQrToken, buildQrUrl, parseQrContent, getCalibrationState, isBorrowingOverdue,
  getRemainingUsefulLife, deriveSupportingStatus, getReadingStatus
- `lib/services/`: `errors.ts` (`ServiceError`), `*-service.ts` per entitas (pemanggil API), `index.ts` barrel
- `hooks/`: TanStack Query per entitas + `query-keys.ts`

Data berasal dari backend (lihat bagian "Terhubung ke backend" di bawah); tidak ada mock di memori lagi.

## Dashboard (Tahap 3)
- `app/(app)/dashboard/page.tsx` menyusun panel sesuai `lib/rbac.ts`; panel di `components/features/dashboard/`
- Agregasi di `lib/services/dashboard-service.ts`, satu hook per panel di `hooks/use-dashboard.ts`
- Kontrak URL untuk halaman berikutnya: `/equipment?status=<status>` (filter dari kartu), `/equipment?action=create`, `/borrowing?action=create`


## Tahap 4 — Modul Equipment

Rute: `/equipment`, `/equipment/new`, `/equipment/[id]`, `/equipment/[id]/edit`, `/scan/eq/[token]`.

- QR berisi URL `${NEXT_PUBLIC_APP_URL}/scan/eq/${qr_token}` (tanpa status). Isi `NEXT_PUBLIC_APP_URL` di `.env.local` agar QR memakai domain produksi.
- Komponen QR: `components/features/qr/qr-code-view.tsx` (`<QrCodeView token type size />`), helper `downloadQrPng()` di `lib/qr.ts`.
- Ekspor (CSV BOM / ZIP QR / PDF label) di `lib/export/equipment-export.ts`; import CSV di `lib/import/equipment-import.ts`.
- Hapus = soft delete (`is_active=false`); QR alat nonaktif menampilkan “Alat sudah dinonaktifkan”.
- Tipe QR diubah menjadi `"eq" | "sup"` agar URL sesuai spesifikasi (`/scan/eq/...`).


## Tahap 5 — Modul Supporting Equipment

Rute: `/supporting-equipment`, `/new`, `/[id]`, `/[id]/edit`, `/scan/sp/[token]`.

- QR mewakili JENIS item: `${NEXT_PUBLIC_APP_URL}/scan/sp/${qr_token}`. Tipe QR kini `"eq" | "sp"`.
- Stok: progress bar, merah + teks peringatan jika habis atau < 20% (`lib/stock.ts`). Status diturunkan dari `available_quantity`.
- Ekspor: `lib/export/supporting-export.ts`; import: `lib/import/supporting-import.ts`.
- Komponen bersama: `CsvImportDialog`, `ExportMenu` (generik), `QrCard`/`QrSuccessDialog` (prop `type`), `DataTable` (`hiddenColumns`).


## Tahap 6 — Scan & Peminjaman (inti, mobile-first)

Rute: `/scan`, `/scan/eq/[token]`, `/scan/sp/[token]`, `/borrowing` (`?action=create` membuka wizard).

- **Scanner** (`components/features/scan/`): kamera penuh, bingkai pemindai, senter (otomatis nonaktif jika perangkat tidak mendukung), ganti kamera, input kode manual sebagai cadangan, mode keranjang “Scan beberapa” → tombol *Lanjut* membuat satu transaksi `BORROWING` berisi banyak alat + item pendukung. Resolusi QR/kode ada di `lib/scan-resolver.ts`.
- **Kamera butuh HTTPS** (atau `localhost`). Uji di HP lewat tunnel HTTPS atau deploy; di HTTP biasa halaman otomatis menampilkan input manual. Decoder iOS/Safari memuat WASM dari CDN saat pertama kali.
- **Hasil scan**: data selalu diambil ulang (`staleTime: 0`, `gcTime: 0`). Belum login → middleware mengarahkan ke login lalu kembali ke URL yang sama (`callbackUrl`).
- **Form** (`components/features/borrowing/`): `BorrowSheet` (pinjam), `ReturnBorrowingSheet` (kembalikan, selalu lewat dialog konfirmasi), `ReportIssueSheet` (lapor ke teknisi), `NewBorrowingWizard` (4 langkah + tambah item lewat scan), `BorrowingDetailSheet`. Di HP tampil sebagai bottom sheet, di desktop sebagai dialog (`components/ui/bottom-sheet.tsx`).
- **Aturan yang saya pilih** (isi `[ISI]` di prompt tidak diisi, ubah di satu tempat):
  - Kalibrasi terlambat → **memblokir peminjaman** (UI dan service). Ubah dengan `CALIBRATION_OVERDUE_BLOCKS_BORROWING` di `lib/constants.ts` (`false` = hanya banner peringatan).
  - Pengembalian → hanya **peminjam, admin, atau SPV** (`canReturnBorrowing` di `lib/borrowing-rules.ts`, dicek juga di `borrowingsService.returnBorrowing`).
- **Pengembalian rusak**: `has_damage` + `major_damage` → status alat `damaged` + notifikasi ke semua SPV dan technician aktif; selain itu kembali `available`. `borrowing_status` menjadi `returned` hanya jika semua alat dan semua unit pendukung sudah kembali.
- **Perubahan di lapisan service**: `notifyRoles` dan `FORBIDDEN` di `store.ts`; `getByInventoryCode` / `getByItemCode`; `reportsService`; `returnBorrowingSchema` menolak kondisi tidak baik tanpa `has_damage`.
- **Perbaikan Tahap 1–5**: `setServiceActor` sebelumnya tidak pernah dipanggil sehingga activity log selalu mencatat admin. Sekarang `AppShell` mengaturnya dari sesi login.
- Tidak ada dependensi baru.

## Tahap 7 — Kalibrasi & Maintenance

Rute: `/calibration`, `/maintenance` (`?action=create` membuka form).

- Kalibrasi: ringkasan (aman / ≤30 hari / terlambat), tampilan Tabel dan Kalender bulanan, form catat kalibrasi (`components/features/calibration/`), riwayat per alat + unduh sertifikat (`lib/certificate.ts`; mock: file diunggah jadi data URL, data seed dibuatkan PDF ringkasan).
- `calibrationsService.create(input, { failedStatus })`: passed memperbarui `next_calibration_date` alat (ERD #5) dan mengembalikan status `calibration` -> `available`; failed mengubah status alat menjadi `calibration` atau `damaged`. Semua perubahan status alat tercatat di activity log.
- Maintenance: tabel (filter tipe & status) dan Kanban, ubah status lewat tombol dengan konfirmasi (`scheduled -> in_progress -> completed`, atau `cancelled`). `in_progress` -> alat `maintenance`; `completed` -> alat `available` dan `completion_date` terisi otomatis.
- Hak akses mengikuti `lib/rbac.ts` (QA hanya melihat; tombol tambah/ubah disembunyikan).

## Tahap 8 — Rooms, Monitoring, Documents, Notifications

Rute: `/rooms`, `/rooms/[id]`, `/monitoring`, `/documents`, `/notifications`.

- Rooms: kartu ruangan (kapasitas terpakai = jumlah alat aktif, sensor, suhu/kelembapan terkini), detail (alat, sensor, grafik 24 jam/7 hari), CRUD (hapus ditolak bila masih ada alat/sensor).
- Monitoring: grafik per ruangan/sensor (24 jam/7/30 hari), garis batas min/maks, titik merah di luar batas (`components/features/monitoring/readings-chart.tsx`), CRUD sensor (hapus = status nonaktif). Simulasi realtime: `useLiveSimulation` memanggil `monitoringService.simulateTick()` tiap 30 detik selama halaman terbuka; tombol Live untuk jeda.
- Documents: pustaka lintas alat, upload drag and drop (maks 10 MB), pratinjau PDF/gambar, unduh. Data seed tidak punya file asli, jadi pratinjau/unduh membuat PDF/gambar contoh (`lib/documents.ts`).
- Notifications: filter tipe + belum dibaca, tandai dibaca / semua dibaca, klik membuka entitas terkait (`lib/notification-link.ts`). Generator mock (admin/SPV): `lib/services/notification-generator.ts` — kalibrasi H-30/terlambat, peminjaman terlambat, sensor di luar batas, alat rusak; tanpa duplikat dalam 24 jam.
- Perubahan: `Notification.link_url` (opsional, non-ERD) untuk tautan alat/ruangan; di `lib/rbac.ts` SPV kini punya akses penuh ke `monitoring` (agar bisa CRUD sensor).


## Tahap 9 — Users & Activity Log

Rute: `/users` (admin), `/activity-log` (admin, SPV, QA: baca saja).

- Users: tambah/edit (`components/features/users/user-form-sheet.tsx`), aktif/nonaktif dengan dialog konfirmasi, nonaktifkan massal. Admin tidak bisa mengubah peran atau menonaktifkan akunnya sendiri; admin aktif terakhir dilindungi di service. Email dicek unik. Kata sandi awal minimal 8 karakter (mock: tidak disimpan, hash dilakukan di server pada integrasi Auth sungguhan).
- Activity Log: filter pengguna, entitas, aksi, rentang tanggal + pencarian teks; klik baris membuka detail dengan tabel perubahan data sebelum/sesudah; ekspor CSV (BOM) sesuai hasil filter (`lib/export/activity-export.ts`). Log append-only, tidak ada aksi ubah/hapus.
- Tidak ada dependensi baru. Semua halaman memakai skeleton, empty state, error state dari `DataTable`.
- Semua modul pada daftar menu kini selesai. `ModulePlaceholder` tidak lagi dipakai.


## Tahap 6b — Ekspor Log Book Penggunaan Peralatan

Meniru template FM/L-ACT.06.4/08. Tombol **Log Book** ada di detail alat (satu alat → PDF) dan di tabel alat (banyak alat → ZIP berisi PDF per alat).

- Konfigurasi dokumen (nomor dokumen, nama lab/perusahaan, judul, baris per halaman, logo): `lib/config/document-template.ts`.
- Logo: taruh `public/brand/company-logo.png`. Tanpa logo, PDF tetap dibuat.
- Generator: `lib/export/logbook-export.ts` (PDF `jspdf`, CSV `papaparse`, ZIP `jszip`). Dialog: `components/features/equipment/logbook-export-dialog.tsx`.
- 27 baris per halaman (sesuai template); baris kosong tetap dicetak, footer "Hal x dari N".
- Sumber data: peminjaman yang memuat alat tsb, difilter berdasarkan tanggal mulai peminjaman. Belum dikembalikan → "Belum kembali".
- Opsi "form kosong" mencetak 1 halaman kosong untuk cadangan isi manual. CSV memuat tambahan tujuan, lokasi pakai, catatan kerusakan.
- Tanpa dependensi baru. Excel (.xlsx) belum ada; butuh `exceljs`.


## Inventaris nyata (`data/source/inventaris.csv`) → backend

CSV tetap menjadi sumber (jangan dihapus). Pemindahan ke backend memakai `scripts/migrate-inventory.mjs`
(menggantikan `generate-inventory.py` dan `data/mock`):

```bash
npm run migrate:inventory -- --csv-only                      # hanya hasilkan data/generated/equipment-import.csv + laporan masalah data
MIGRATE_EMAIL=admin@lab.local MIGRATE_PASSWORD='Password123!' npm run migrate:inventory            # dry run ke backend
MIGRATE_EMAIL=admin@lab.local MIGRATE_PASSWORD='Password123!' npm run migrate:inventory -- --commit # simpan (buat 13 ruangan + impor 689 alat)
```
- **Kode inventaris** dipakai persis seperti di CSV (`INV L-ACT 10-01`). Ini butuh backend yang menerima spasi tunggal pada
  kode (`CODE_REGEX`); backend lama menolak semua kode CSV.
- Ruangan 13 buah (8 dari daftar lab + 5 dari kolom "Posisi Alat"); kapasitas = jumlah alat + ~15%. Dibuat **tanpa
  penanggung jawab** (opsional di backend); tampil "—" sampai diisi lewat halaman Ruangan.
- Field yang tidak ada di CSV dibiarkan kosong (`null` di backend): `purchase_date`, `purchase_price`, `useful_life_years`. Kondisi memakai default backend (baik). Alat tanpa tanggal kalibrasi dianggap tidak perlu kalibrasi.
- Aman dijalankan ulang (kode yang sudah ada dilewati). Tidak membuat riwayat kalibrasi; hanya `next_calibration_date`.

## Terhubung ke backend (Express)

Data tidak lagi memakai mock di memori; semua `lib/services/*` memanggil backend lewat `lib/api/client.ts`.

```
Browser ──fetch──▶ /api/proxy/*  (Next.js, server)  ──Bearer──▶  ${API_URL}/compat/*  (Express)
          cookie sesi NextAuth     token ada di JWT terenkripsi
```

- **Login**: `auth.ts` memanggil `POST ${API_URL}/auth/login` (header `X-Client: bff`). Access & refresh token disimpan di JWT
  NextAuth yang terenkripsi (cookie httpOnly) dan **tidak pernah** dikirim ke browser (`/api/auth/session` hanya berisi id, nama, email, role).
- **Proxy** `app/api/proxy/[...path]/route.ts`: menambahkan `Authorization`, me-refresh access token yang hampir habis
  (satu refresh bersama untuk request paralel; refresh token dirotasi backend), lalu menulis ulang cookie sesi.
  Refresh gagal / tidak ada sesi → 401 JSON → klien `signOut`.
- **Error**: backend mengembalikan `{ error: { code, message, fieldErrors } }` → dilempar sebagai `ServiceError` (kontrak sama seperti mock).
- **File** (dokumen/sertifikat): `file_url` berupa `/api/v1/compat/...`, dibuka lewat `/api/proxy/...` (`lib/api/urls.ts`).

Jalankan: backend di `:3000` (`npm run db:seed`), lalu `cp .env.example .env.local` (isi `AUTH_SECRET`) dan `npm run dev -- -p 3001`.
Akun seed backend: lihat README backend (admin, 4 teknisi, 2 SPV), password awal `Password123!`.
Kontrak endpoint lengkap: `COMPAT_API.md`.

Catatan: `useLiveSimulation` kini hanya memuat ulang data berkala (15 dtk); `calibrationsService.update` dihapus karena
riwayat kalibrasi tidak dapat diubah di backend. Pratinjau PDF diambil lewat proxy sebagai `blob:` karena backend
mengirim `Content-Security-Policy: sandbox` yang membuat Chrome menolak PDF di `<iframe>`.
