"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsService, type ReportEquipmentIssueInput } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useReportEquipmentIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReportEquipmentIssueInput) => reportsService.reportEquipmentIssue(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
};
