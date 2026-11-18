/** Aturan penanggung jawab alat (penerima email pengingat kalibrasi). API utama backend: /responsibilities. */
export interface ResponsibilityRule {
  responsibility_id: string;
  user_id: string;
  /** Awalan kode inventaris, mis. "INV L-ACT 10". null = tidak dipakai sebagai kriteria. */
  code_prefix: string | null;
  room_id: string | null;
  created_at: string;
  user: { user_id: string; name: string; email: string; role: string; is_active: boolean; email_notifications: boolean };
  room: { room_id: string; room_code: string; room_name: string } | null;
  /** Jumlah alat aktif yang cocok dengan aturan ini. */
  equipment_count: number;
}

/** Dari alat yang punya jadwal kalibrasi: berapa yang punya penerima email (aturan atau PIC ruangan). */
export interface ResponsibilityCoverage {
  scheduled_equipment: number;
  assigned: number;
  unassigned: number;
  unassigned_sample: string[];
}

export interface ResponsibilityOverview {
  rules: ResponsibilityRule[];
  coverage: ResponsibilityCoverage;
}

export interface CreateResponsibilityInput {
  user_id: string;
  code_prefix?: string | null;
  room_id?: string | null;
}
