import { enc, get } from "@/lib/api/client";
import type { ActivityLog } from "@/types/erd";

export interface ActivityLogListParams {
  search?: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  /** ISO datetime, inklusif. */
  from?: string;
  to?: string;
}

/** Log bersifat append-only: dibuat otomatis oleh backend, tidak bisa diubah/dihapus dari UI. */
export const activityLogsService = {
  list: (params: ActivityLogListParams = {}) => get<ActivityLog[]>("activity-logs", { ...params }),
  getById: (id: string) => get<ActivityLog>(`activity-logs/${enc(id)}`),
};
