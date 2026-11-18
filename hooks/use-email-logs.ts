"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emailService, type EmailLogListParams } from "@/lib/services";
import type { EmailSettingsPatch } from "@/types/email";
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

/** Pratinjau pengingat kalibrasi; hanya diambil saat dialog terbuka dan selalu data segar. */
export const useReminderPreview = (enabled: boolean) =>
  useQuery({ queryKey: [...queryKeys.emailLogs.all, "reminder-preview"], queryFn: () => emailService.previewReminders(), enabled, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false, retry: false });

export const useSendReminders = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => emailService.sendReminders(userIds),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all }),
  });
};

/** Pengaturan email (admin). Dipakai halaman Pengaturan Email. */
export const useEmailSettings = () =>
  useQuery({ queryKey: queryKeys.emailSettings.all, queryFn: () => emailService.getSettings(), refetchOnWindowFocus: false });

export const useUpdateEmailSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: EmailSettingsPatch) => emailService.updateSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.emailSettings.all, data);
      // Mode (auto/manual) dan status email nyata ikut tampil di pratinjau pengingat.
      qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all });
    },
  });
};

export const useResetEmailSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emailService.resetSettings(),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.emailSettings.all, data);
      qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all });
    },
  });
};

export const useTestSmtp = () => useMutation({ mutationFn: () => emailService.testSmtp() });
