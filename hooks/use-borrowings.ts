"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateBorrowingInput, ReturnBorrowingInput, UpdateBorrowingInput } from "@/lib/schemas";
import { borrowingsService, type BorrowingListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useBorrowings = (params?: BorrowingListParams, options?: { enabled?: boolean; staleTime?: number }) =>
  useQuery({
    queryKey: queryKeys.borrowings.list(params),
    queryFn: () => borrowingsService.list(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
  });

export const useBorrowing = (id?: string) =>
  useQuery({ queryKey: queryKeys.borrowings.detail(id ?? ""), queryFn: () => borrowingsService.getById(id!), enabled: !!id });

/** Peminjaman mengubah status alat & stok alat pendukung, sehingga ikut menyegarkan keduanya. */
function useBorrowingMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [queryKeys.borrowings.all, queryKeys.equipment.all, queryKeys.supportingEquipment.all, queryKeys.dashboard.all, queryKeys.activityLogs.all, queryKeys.notifications.all]) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useCreateBorrowing = () => useBorrowingMutation((data: CreateBorrowingInput) => borrowingsService.create(data));
export const useUpdateBorrowing = () =>
  useBorrowingMutation(({ id, data }: { id: string; data: UpdateBorrowingInput }) => borrowingsService.update(id, data));
export const useReturnBorrowing = () =>
  useBorrowingMutation(({ id, data }: { id: string; data: ReturnBorrowingInput }) => borrowingsService.returnBorrowing(id, data));
