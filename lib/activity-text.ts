const ACTION_VERB: Record<string, string> = {
  create: "menambahkan",
  update: "mengubah",
  soft_delete: "menonaktifkan",
  restore: "mengaktifkan kembali",
  delete: "menghapus",
  return: "mengembalikan",
  report: "melaporkan masalah pada",
};

export const ENTITY_LABEL: Record<string, string> = {
  equipment: "alat",
  supporting_equipment: "alat pendukung",
  borrowing: "penggunaan",
  calibration: "kalibrasi",
  maintenance: "maintenance",
  user: "pengguna",
  room: "ruangan",
  sensor: "sensor",
  document: "dokumen",
};

/** Bagian kalimat setelah nama pengguna, tanpa target. Mis. "menambahkan alat". */
export function describeActivity(action: string, entityType: string): string {
  if (action === "login") return "masuk ke sistem";
  const verb = ACTION_VERB[action] ?? action;
  return `${verb} ${ENTITY_LABEL[entityType] ?? entityType}`;
}
