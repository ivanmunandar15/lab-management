"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emailService, type EmailLogListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useEmailLogs = (params?: EmailLogListParams) =>
  useQuery({ queryKey: queryKeys.emailLogs.list(params), queryFn: () => emailService.list(params), placeholderData: keepPreviousData });

export const useRetryEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailService.retry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all }),
  });
};

export const useSendTestEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emailService.sendTest(),
    // Hasil (berhasil atau gagal) tercatat di EMAIL_LOG: muat ulang daftar.
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all }),
  });
};
