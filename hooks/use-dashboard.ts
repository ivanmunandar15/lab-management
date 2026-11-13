"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getActiveBorrowings, getCalibrationAlerts, getEquipmentStatusCounts, getMonthlyTrends,
  getRecentActivity, getRoomConditions,
} from "@/lib/services";
import { queryKeys } from "./query-keys";

/** Satu hook per panel agar tiap panel punya state loading/error sendiri. */
export const useEquipmentStatusCounts = () =>
  useQuery({ queryKey: queryKeys.dashboard.statusCounts, queryFn: getEquipmentStatusCounts });

export const useCalibrationAlerts = () =>
  useQuery({ queryKey: queryKeys.dashboard.calibrationAlerts, queryFn: getCalibrationAlerts });

export const useActiveBorrowings = () =>
  useQuery({ queryKey: queryKeys.dashboard.borrowings, queryFn: getActiveBorrowings });

export const useMonthlyTrends = (months = 6) =>
  useQuery({ queryKey: queryKeys.dashboard.trends(months), queryFn: () => getMonthlyTrends(months) });

export const useRoomConditions = () =>
  useQuery({ queryKey: queryKeys.dashboard.rooms, queryFn: getRoomConditions, refetchInterval: 60_000 });

/** Memakai prefix key activity-logs agar tersegarkan oleh semua mutasi (semua mutasi mencatat log). */
export const useRecentActivity = (limit = 10) =>
  useQuery({ queryKey: queryKeys.activityLogs.list({ recent: limit }), queryFn: () => getRecentActivity(limit) });
