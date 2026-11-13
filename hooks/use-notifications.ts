"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationGenerator, notificationsService, type NotificationGeneratorKind, type NotificationListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useNotifications = (params?: NotificationListParams) =>
  useQuery({ queryKey: queryKeys.notifications.list(params), queryFn: () => notificationsService.list(params), placeholderData: keepPreviousData });

export const useUnreadNotificationCount = (userId?: string) =>
  useQuery({
    queryKey: queryKeys.notifications.unreadCount(userId ?? ""),
    queryFn: () => notificationsService.getUnreadCount(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

function useNotificationMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }) });
}

export const useMarkNotificationRead = () => useNotificationMutation((id: string) => notificationsService.markAsRead(id));
export const useMarkAllNotificationsRead = () => useNotificationMutation((userId: string) => notificationsService.markAllAsRead(userId));

export const useGenerateNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kinds: NotificationGeneratorKind[]) => notificationGenerator.run(kinds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
};
