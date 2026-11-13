import { del, enc, get, patch, post } from "@/lib/api/client";
import type { CreateSupportingEquipmentInput, UpdateSupportingEquipmentInput } from "@/lib/schemas";
import type { Condition, SupportingEquipment, SupportingStatus } from "@/types/erd";

export interface SupportingListParams {
  search?: string;
  status?: SupportingStatus;
  condition?: Condition;
  includeInactive?: boolean;
}

export const supportingEquipmentService = {
  list: (params: SupportingListParams = {}) => get<SupportingEquipment[]>("supporting-equipment", { ...params }),
  getById: (id: string) => get<SupportingEquipment>(`supporting-equipment/${enc(id)}`),
  getByQrToken: (token: string) => get<SupportingEquipment>(`supporting-equipment/by-qr/${enc(token)}`),
  getByItemCode: (code: string) => get<SupportingEquipment>(`supporting-equipment/by-code/${enc(code)}`),
  create: (input: CreateSupportingEquipmentInput) => post<SupportingEquipment>("supporting-equipment", input),
  isItemCodeTaken: (code: string, exceptId?: string) => get<boolean>("supporting-equipment/code-taken", { code, exceptId }),
  bulkCreate: (inputs: CreateSupportingEquipmentInput[]) => post<SupportingEquipment[]>("supporting-equipment/bulk", inputs),
  update: (id: string, input: UpdateSupportingEquipmentInput) => patch<SupportingEquipment>(`supporting-equipment/${enc(id)}`, input),
  softDelete: (id: string) => del<SupportingEquipment>(`supporting-equipment/${enc(id)}`),
  restore: (id: string) => post<SupportingEquipment>(`supporting-equipment/${enc(id)}/restore`),
};
