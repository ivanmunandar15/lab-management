import { enc, get, post } from "@/lib/api/client";
import type { CreateNotificationInput } from "@/lib/schemas";
import type { Notification, NotificationType } from "@/types/erd";

export interface NotificationListParams {
  user_id?: string;
  type?: NotificationType;
  unreadOnly?: boolean;
}

/** Backend hanya mengembalikan notifikasi milik pengguna yang login; `user_id` lain ditolak (FORBIDDEN). */
export const notificationsService = {
  list: (params: NotificationListParams = {}) => get<Notification[]>("notifications", { ...params }),
  getById: (id: string) => get<Notification>(`notifications/${enc(id)}`),
  getUnreadCount: (userId: string) => get<number>("notifications/unread-count", { user_id: userId }),
  /** Admin saja. */
  create: (input: CreateNotificationInput) => post<Notification>("notifications", input),
  markAsRead: (id: string) => post<Notification>(`notifications/${enc(id)}/read`),
  /** Mengembalikan jumlah yang ditandai dibaca. */
  markAllAsRead: (_userId: string) => post<number>("notifications/read-all"),
};
