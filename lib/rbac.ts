import type { Role } from "@/types/erd";

export type Resource =
  | "dashboard" | "scan" | "equipment" | "supporting_equipment" | "borrowing"
  | "calibration" | "maintenance" | "room" | "monitoring" | "document"
  | "notification" | "user" | "activity_log" | "email_log";
export type Action = "view" | "create" | "update" | "delete";

const ALL: Action[] = ["view", "create", "update", "delete"];
const VIEW: Action[] = ["view"];
const CRU: Action[] = ["view", "create", "update"];
const VIEW_UPDATE: Action[] = ["view", "update"];

/** Matriks akses default. Ubah di sini saja bila aturan role berubah. */
export const PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  admin: {
    dashboard: ALL, scan: ALL, equipment: ALL, supporting_equipment: ALL, borrowing: ALL,
    calibration: ALL, maintenance: ALL, room: ALL, monitoring: ALL, document: ALL,
    notification: ALL, user: ALL, activity_log: ALL, email_log: ALL,
  },
  SPV: {
    dashboard: VIEW, scan: VIEW, equipment: ALL, supporting_equipment: ALL, borrowing: ALL,
    calibration: ALL, maintenance: ALL, room: ALL, monitoring: ALL, document: ALL,
    notification: VIEW_UPDATE, activity_log: VIEW,
  },
  technician: {
    dashboard: VIEW, scan: VIEW, equipment: VIEW, supporting_equipment: VIEW, borrowing: CRU,
    calibration: CRU, maintenance: CRU, room: VIEW, monitoring: VIEW,
    document: ["view", "create"], notification: VIEW_UPDATE,
  },
  QA: {
    dashboard: VIEW, scan: VIEW, equipment: VIEW, supporting_equipment: VIEW, borrowing: CRU,
    calibration: VIEW, maintenance: VIEW, room: VIEW, monitoring: VIEW, document: VIEW,
    notification: VIEW_UPDATE, activity_log: VIEW,
  },
};

export function can(role: Role | undefined, resource: Resource, action: Action = "view") {
  if (!role) return false;
  return PERMISSIONS[role][resource]?.includes(action) ?? false;
}

/** Prefix URL -> resource. Dipakai middleware (edge-safe: tanpa import ikon). */
const ROUTE_RESOURCES: { prefix: string; resource: Resource }[] = [
  { prefix: "/dashboard", resource: "dashboard" },
  { prefix: "/scan", resource: "scan" },
  { prefix: "/equipment", resource: "equipment" },
  { prefix: "/supporting-equipment", resource: "supporting_equipment" },
  { prefix: "/borrowing", resource: "borrowing" },
  { prefix: "/calibration", resource: "calibration" },
  { prefix: "/maintenance", resource: "maintenance" },
  { prefix: "/rooms", resource: "room" },
  { prefix: "/monitoring", resource: "monitoring" },
  { prefix: "/documents", resource: "document" },
  { prefix: "/notifications", resource: "notification" },
  { prefix: "/users", resource: "user" },
  { prefix: "/activity-log", resource: "activity_log" },
  { prefix: "/email-logs", resource: "email_log" },
];

export function canAccessPath(role: Role | undefined, pathname: string) {
  const match = ROUTE_RESOURCES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return match ? can(role, match.resource, "view") : true;
}
