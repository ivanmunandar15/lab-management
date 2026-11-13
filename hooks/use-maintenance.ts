"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMaintenanceInput, UpdateMaintenanceInput } from "@/lib/schemas";
import { maintenanceService, type MaintenanceListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useMaintenanceList = (params?: MaintenanceListParams) =>
  useQuery({ queryKey: queryKeys.maintenance.list(params), queryFn: () => maintenanceService.list(params), placeholderData: keepPreviousData });

export const useMaintenance = (id?: string) =>
  useQuery({ queryKey: queryKeys.maintenance.detail(id ?? ""), queryFn: () => maintenanceService.getById(id!), enabled: !!id });

/** Maintenance in_progress/selesai mengubah status alat, jadi equipment ikut disegarkan. */
function useMaintenanceMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [queryKeys.maintenance.all, queryKeys.equipment.all, queryKeys.dashboard.all, queryKeys.activityLogs.all]) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useCreateMaintenance = () => useMaintenanceMutation((data: CreateMaintenanceInput) => maintenanceService.create(data));
export const useUpdateMaintenance = () =>
  useMaintenanceMutation(({ id, data }: { id: string; data: UpdateMaintenanceInput }) => maintenanceService.update(id, data));
