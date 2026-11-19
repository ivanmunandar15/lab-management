/**
 * Konfigurasi dokumen resmi (log book penggunaan peralatan).
 * Ubah di sini saja bila nomor dokumen, nama perusahaan, atau logo berubah.
 */
export const LOGBOOK_TEMPLATE = {
  documentNumber: "FM/L-ACT.06.4/08",
  /** Nomor dokumen khusus log book alat pendukung. null = pakai documentNumber di atas. */
  supportingDocumentNumber: null as string | null,
  labName: "LABORATORIUM PENGUJIAN",
  companyName: "PT. ANINDYA CERTIFICATION AND TESTING",
  title: "LOG BOOK PENGGUNAAN PERALATAN",
  /** Jumlah baris data per halaman, sama dengan template asli. */
  rowsPerPage: 27,
  /**
   * Logo opsional. Taruh file PNG di `public/brand/company-logo.png`.
   * Jika berkas tidak ada, PDF tetap dibuat tanpa logo.
   */
  logoUrl: "/brand/company-logo.png" as string | null,
} as const;
