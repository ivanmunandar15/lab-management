import { del, enc, get, patch, post } from "@/lib/api/client";
import type { CreateRoomMonitoringInput, CreateSensorInput, UpdateSensorInput } from "@/lib/schemas";
import type { RoomMonitoring, Sensor, SensorStatus, SensorType, SensorWithLatest } from "@/types/erd";

export interface SensorListParams {
  room_id?: string;
  type?: SensorType;
  status?: SensorStatus;
}

export const sensorsService = {
  list: (params: SensorListParams = {}) => get<Sensor[]>("sensors", { ...params }),
  getById: (id: string) => get<Sensor>(`sensors/${enc(id)}`),
  create: (input: CreateSensorInput) => post<Sensor>("sensors", input),
  update: (id: string, input: UpdateSensorInput) => patch<Sensor>(`sensors/${enc(id)}`, input),
  /** Backend: sensor_status menjadi "inactive"; riwayat pembacaan tetap ada. */
  softDelete: (id: string) => del<Sensor>(`sensors/${enc(id)}`),
};

/* ---------- Pembacaan sensor (ROOM_MONITORING) ---------- */

export interface ReadingListParams {
  sensor_id?: string;
  room_id?: string;
  /** ISO datetime, inklusif. */
  from?: string;
  to?: string;
  /** Ambil N pembacaan terbaru (hasil tetap urut naik menurut waktu). */
  limit?: number;
}

/**
 * Tidak ada `simulateTick`: data real-time datang dari perangkat IoT (POST /api/v1/monitoring/readings
 * dengan X-Sensor-Key); UI cukup memuat ulang berkala (lihat useLiveSimulation).
 */
export const monitoringService = {
  list: (params: ReadingListParams = {}) => get<RoomMonitoring[]>("readings", { ...params }),
  getById: (id: string) => get<RoomMonitoring>(`readings/${enc(id)}`),
  getLatest: (params: { room_id?: string } = {}) => get<SensorWithLatest[]>("readings/latest", { ...params }),
  /** Input manual (admin/SPV). Sensor harus berstatus active. */
  ingest: (input: CreateRoomMonitoringInput) => post<RoomMonitoring>("readings", input),
};
