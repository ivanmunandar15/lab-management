import { enc, get, patch, post } from "@/lib/api/client";
import type { CreateMaintenanceInput, UpdateMaintenanceInput } from "@/lib/schemas";
import type { Maintenance, MaintenanceStatus, MaintenanceType } from "@/types/erd";

export interface MaintenanceListParams {
  search?: string;
  equipment_id?: string;
  technician_id?: string;
  status?: MaintenanceStatus;
  type?: MaintenanceType;
}

export const maintenanceService = {
  list: (params: MaintenanceListParams = {}) => get<Maintenance[]>("maintenance", { ...params }),
  getById: (id: string) => get<Maintenance>(`maintenance/${enc(id)}`),
  create: (input: CreateMaintenanceInput) => post<Maintenance>("maintenance", input),
  update: (id: string, input: UpdateMaintenanceInput) => patch<Maintenance>(`maintenance/${enc(id)}`, input),
};
