"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSupportingEquipmentInput, UpdateSupportingEquipmentInput } from "@/lib/schemas";
import { supportingEquipmentService, type SupportingListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useSupportingEquipmentList = (params?: SupportingListParams) =>
  useQuery({
    queryKey: queryKeys.supportingEquipment.list(params),
    queryFn: () => supportingEquipmentService.list(params),
    placeholderData: keepPreviousData,
  });

export const useSupportingEquipment = (id?: string) =>
  useQuery({ queryKey: queryKeys.supportingEquipment.detail(id ?? ""), queryFn: () => supportingEquipmentService.getById(id!), enabled: !!id });

/** Untuk halaman scan: /scan/sp/[token]. */
export const useSupportingEquipmentByQrToken = (token?: string) =>
  useQuery({
    queryKey: queryKeys.supportingEquipment.qr(token ?? ""),
    queryFn: () => supportingEquipmentService.getByQrToken(token!),
    enabled: !!token,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

function useSupportingMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.supportingEquipment.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
}

export const useCreateSupportingEquipment = () =>
  useSupportingMutation((data: CreateSupportingEquipmentInput) => supportingEquipmentService.create(data));
export const useBulkCreateSupportingEquipment = () =>
  useSupportingMutation((rows: CreateSupportingEquipmentInput[]) => supportingEquipmentService.bulkCreate(rows));
export const useUpdateSupportingEquipment = () =>
  useSupportingMutation(({ id, data }: { id: string; data: UpdateSupportingEquipmentInput }) => supportingEquipmentService.update(id, data));
export const useSoftDeleteSupportingEquipment = () => useSupportingMutation((id: string) => supportingEquipmentService.softDelete(id));
export const useRestoreSupportingEquipment = () => useSupportingMutation((id: string) => supportingEquipmentService.restore(id));
