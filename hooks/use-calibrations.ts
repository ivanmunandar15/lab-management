"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCalibrationInput } from "@/lib/schemas";
import { calibrationsService, type CalibrationListParams, type CreateCalibrationOptions } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useCalibrations = (params?: CalibrationListParams) =>
  useQuery({ queryKey: queryKeys.calibrations.list(params), queryFn: () => calibrationsService.list(params), placeholderData: keepPreviousData });

export const useCalibration = (id?: string) =>
  useQuery({ queryKey: queryKeys.calibrations.detail(id ?? ""), queryFn: () => calibrationsService.getById(id!), enabled: !!id });

export const useLatestPassedCalibration = (equipmentId?: string) =>
  useQuery({
    queryKey: queryKeys.calibrations.latestPassed(equipmentId ?? ""),
    queryFn: () => calibrationsService.getLatestPassed(equipmentId!),
    enabled: !!equipmentId,
  });

/** Kalibrasi memperbarui next_calibration_date (dan mungkin status) alat, jadi equipment ikut disegarkan. */
function useCalibrationMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [queryKeys.calibrations.all, queryKeys.equipment.all, queryKeys.dashboard.all, queryKeys.activityLogs.all]) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export const useCreateCalibration = () =>
  useCalibrationMutation(({ data, options }: { data: CreateCalibrationInput; options?: CreateCalibrationOptions }) =>
    calibrationsService.create(data, options));
