"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "@/lib/schemas";
import { equipmentService, type EquipmentListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useEquipmentList = (params?: EquipmentListParams) =>
  useQuery({ queryKey: queryKeys.equipment.list(params), queryFn: () => equipmentService.list(params), placeholderData: keepPreviousData });

export const useEquipment = (id?: string) =>
  useQuery({ queryKey: queryKeys.equipment.detail(id ?? ""), queryFn: () => equipmentService.getById(id!), enabled: !!id });

/** Untuk halaman scan: /scan/eq/[token]. */
export const useEquipmentByQrToken = (token?: string) =>
  useQuery({ queryKey: queryKeys.equipment.qr(token ?? ""), queryFn: () => equipmentService.getByQrToken(token!), enabled: !!token, retry: false, staleTime: 0, gcTime: 0, refetchOnMount: "always" });

function useEquipmentMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.equipment.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
}

export const useCreateEquipment = () => useEquipmentMutation((data: CreateEquipmentInput) => equipmentService.create(data));
export const useBulkCreateEquipment = () => useEquipmentMutation((rows: CreateEquipmentInput[]) => equipmentService.bulkCreate(rows));
export const useUpdateEquipment = () =>
  useEquipmentMutation(({ id, data }: { id: string; data: UpdateEquipmentInput }) => equipmentService.update(id, data));
export const useSoftDeleteEquipment = () => useEquipmentMutation((id: string) => equipmentService.softDelete(id));
export const useRestoreEquipment = () => useEquipmentMutation((id: string) => equipmentService.restore(id));
