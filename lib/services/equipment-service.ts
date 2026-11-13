import { del, enc, get, patch, post } from "@/lib/api/client";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "@/lib/schemas";
import type { CalibrationState, Condition, Equipment, EquipmentStatus } from "@/types/erd";

export interface EquipmentListParams {
  search?: string;
  status?: EquipmentStatus | EquipmentStatus[];
  condition?: Condition;
  room_id?: string;
  calibration_state?: CalibrationState;
  /** Default false: data nonaktif (soft delete) disembunyikan. */
  includeInactive?: boolean;
}

export const equipmentService = {
  list: (params: EquipmentListParams = {}) => get<Equipment[]>("equipment", { ...params }),
  getById: (id: string) => get<Equipment>(`equipment/${enc(id)}`),
  getByQrToken: (token: string) => get<Equipment>(`equipment/by-qr/${enc(token)}`),
  getByInventoryCode: (code: string) => get<Equipment>(`equipment/by-code/${enc(code)}`),
  create: (input: CreateEquipmentInput) => post<Equipment>("equipment", input),
  isInventoryCodeTaken: (code: string, exceptId?: string) => get<boolean>("equipment/code-taken", { code, exceptId }),
  /** Atomik: semua baris berhasil atau tidak ada yang tersimpan. */
  bulkCreate: (inputs: CreateEquipmentInput[]) => post<Equipment[]>("equipment/bulk", inputs),
  update: (id: string, input: UpdateEquipmentInput) => patch<Equipment>(`equipment/${enc(id)}`, input),
  softDelete: (id: string) => del<Equipment>(`equipment/${enc(id)}`),
  restore: (id: string) => post<Equipment>(`equipment/${enc(id)}/restore`),
};
