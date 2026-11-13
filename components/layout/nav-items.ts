import {
  Bell, ClipboardCheck, ClipboardList, DoorOpen, FileText, History, LayoutDashboard,
  Microscope, Package, QrCode, Thermometer, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { can, type Resource } from "@/lib/rbac";
import type { Role } from "@/types/erd";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  resource: Resource;
}

// Label mengikuti nama menu pada spesifikasi. Ubah di sini bila ingin diterjemahkan.
export const MAIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, resource: "dashboard" },
  { label: "Equipment", href: "/equipment", icon: Microscope, resource: "equipment" },
  { label: "Supporting Equipment", href: "/supporting-equipment", icon: Package, resource: "supporting_equipment" },
  { label: "Borrowing", href: "/borrowing", icon: ClipboardList, resource: "borrowing" },
  { label: "Calibration", href: "/calibration", icon: ClipboardCheck, resource: "calibration" },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, resource: "maintenance" },
  { label: "Rooms", href: "/rooms", icon: DoorOpen, resource: "room" },
  { label: "Monitoring", href: "/monitoring", icon: Thermometer, resource: "monitoring" },
  { label: "Documents", href: "/documents", icon: FileText, resource: "document" },
  { label: "Notifications", href: "/notifications", icon: Bell, resource: "notification" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Users", href: "/users", icon: Users, resource: "user" },
  { label: "Activity Log", href: "/activity-log", icon: History, resource: "activity_log" },
];

export const SCAN_ITEM: NavItem = { label: "Scan QR", href: "/scan", icon: QrCode, resource: "scan" };

export function getNavForRole(role: Role) {
  const visible = (i: NavItem) => can(role, i.resource, "view");
  return { main: MAIN_NAV.filter(visible), admin: ADMIN_NAV.filter(visible) };
}

export const BREADCRUMB_LABELS: Record<string, string> = Object.fromEntries(
  [...MAIN_NAV, ...ADMIN_NAV, SCAN_ITEM].map((i) => [i.href.slice(1), i.label]),
);
// Segmen khusus
BREADCRUMB_LABELS["forbidden"] = "Akses ditolak";
