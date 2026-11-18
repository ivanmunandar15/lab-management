"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { responsibilityService } from "@/lib/services";
import type { CreateResponsibilityInput } from "@/types/responsibility";
import { queryKeys } from "./query-keys";

export const useResponsibilities = () =>
  useQuery({ queryKey: queryKeys.responsibilities.list(), queryFn: () => responsibilityService.list() });

function useRuleMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Penerima email berubah: muat ulang aturan/cakupan dan pratinjau pengingat.
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.responsibilities.all }), qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all })]),
  });
}

export const useCreateResponsibility = () => useRuleMutation((input: CreateResponsibilityInput) => responsibilityService.create(input));
export const useDeleteResponsibility = () => useRuleMutation((id: string) => responsibilityService.remove(id));
