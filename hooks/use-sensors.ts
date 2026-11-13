"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRoomMonitoringInput, CreateSensorInput, UpdateSensorInput } from "@/lib/schemas";
import { monitoringService, sensorsService, type ReadingListParams, type SensorListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useSensors = (params?: SensorListParams) =>
  useQuery({ queryKey: queryKeys.sensors.list(params), queryFn: () => sensorsService.list(params), placeholderData: keepPreviousData });

export const useSensor = (id?: string) =>
  useQuery({ queryKey: queryKeys.sensors.detail(id ?? ""), queryFn: () => sensorsService.getById(id!), enabled: !!id });

/** Riwayat pembacaan (mis. 30 hari untuk grafik). Atur `limit`/`from`/`to` agar ringan. */
export const useReadings = (params?: ReadingListParams) =>
  useQuery({ queryKey: queryKeys.monitoring.list(params), queryFn: () => monitoringService.list(params), placeholderData: keepPreviousData });

/** Pembacaan terakhir tiap sensor; refetch berkala (15 dtk) agar data dari perangkat IoT tampil otomatis. */
export const useLatestReadings = (params?: { room_id?: string }) =>
  useQuery({
    queryKey: queryKeys.monitoring.latest(params),
    queryFn: () => monitoringService.getLatest(params),
    refetchInterval: 15_000,
  });

function useSensorMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sensors.all });
      qc.invalidateQueries({ queryKey: queryKeys.monitoring.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
}

export const useCreateSensor = () => useSensorMutation((data: CreateSensorInput) => sensorsService.create(data));
export const useUpdateSensor = () => useSensorMutation(({ id, data }: { id: string; data: UpdateSensorInput }) => sensorsService.update(id, data));
export const useSoftDeleteSensor = () => useSensorMutation((id: string) => sensorsService.softDelete(id));
export const useIngestReading = () => useSensorMutation((data: CreateRoomMonitoringInput) => monitoringService.ingest(data));

/**
 * "Live": memuat ulang data monitoring & dashboard tiap `intervalMs` (default 15 dtk). Data baru datang dari
 * perangkat IoT (POST /api/v1/monitoring/readings dengan X-Sensor-Key); tidak ada simulasi di sisi klien.
 */
export function useLiveSimulation(enabled: boolean, intervalMs = 15_000) {
  const qc = useQueryClient();
  const [lastTick, setLastTick] = useState<Date | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      setLastTick(new Date());
      qc.invalidateQueries({ queryKey: queryKeys.monitoring.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    }, intervalMs);
    return () => clearInterval(t);
  }, [enabled, intervalMs, qc]);
  return lastTick;
}
