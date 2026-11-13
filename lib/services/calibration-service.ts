import { enc, get, post } from "@/lib/api/client";
import type { CreateCalibrationInput } from "@/lib/schemas";
import type { Calibration, CalibrationResult, EquipmentStatus } from "@/types/erd";

export interface CreateCalibrationOptions {
  /** Status alat bila hasil "failed". Default: calibration. */
  failedStatus?: Extract<EquipmentStatus, "calibration" | "damaged">;
}

export interface CalibrationListParams {
  search?: string;
  equipment_id?: string;
  technician_id?: string;
  result?: CalibrationResult;
}

/** Riwayat kalibrasi tidak dapat diubah/dihapus di backend, jadi tidak ada `update`. */
export const calibrationsService = {
  list: (params: CalibrationListParams = {}) => get<Calibration[]>("calibrations", { ...params }),
  getById: (id: string) => get<Calibration>(`calibrations/${enc(id)}`),
  getLatestPassed: (equipmentId: string) => get<Calibration | null>("calibrations/latest-passed", { equipment_id: equipmentId }),
  /** `certificate_file_url` = data URL (atau ""). Teknisi dicatat dari pengguna yang login. */
  create: (input: CreateCalibrationInput, options: CreateCalibrationOptions = {}) =>
    post<Calibration>("calibrations", { ...input, ...(options.failedStatus ? { failed_status: options.failedStatus } : {}) }),
};
