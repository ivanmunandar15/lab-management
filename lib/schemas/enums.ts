import { z } from "zod";

export const roleSchema = z.enum(["QA", "admin", "technician", "SPV"]);
export const equipmentStatusSchema = z.enum(["available", "borrowed", "damaged", "maintenance", "calibration"]);
export const conditionSchema = z.enum(["good", "minor_damage", "major_damage"]);
export const supportingStatusSchema = z.enum(["available", "borrowed", "damaged"]);
export const borrowingStatusSchema = z.enum(["borrowed", "returned"]);
export const calibrationResultSchema = z.enum(["passed", "failed"]);
export const maintenanceTypeSchema = z.enum(["routine", "repair"]);
export const maintenanceStatusSchema = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);
export const sensorTypeSchema = z.enum(["temperature", "humidity"]);
export const sensorStatusSchema = z.enum(["active", "inactive", "damaged"]);
export const documentTypeSchema = z.enum(["manual", "certificate", "procedure", "photo", "other"]);
export const notificationTypeSchema = z.enum(["borrowing", "calibration", "maintenance", "monitoring", "system"]);

/** Nilai turunan (tidak disimpan di database). */
export const calibrationStateSchema = z.enum(["safe", "due_soon", "overdue", "not_required"]);
export const readingStatusSchema = z.enum(["normal", "low", "high"]);
export const qrEntityTypeSchema = z.enum(["eq", "sp"]);
