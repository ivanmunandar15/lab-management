"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { activityLogsService, type ActivityLogListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useActivityLogs = (params?: ActivityLogListParams) =>
  useQuery({ queryKey: queryKeys.activityLogs.list(params), queryFn: () => activityLogsService.list(params), placeholderData: keepPreviousData });

export const useActivityLog = (id?: string) =>
  useQuery({ queryKey: queryKeys.activityLogs.detail(id ?? ""), queryFn: () => activityLogsService.getById(id!), enabled: !!id });
