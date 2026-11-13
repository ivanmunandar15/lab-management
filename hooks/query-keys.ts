const entityKeys = <N extends string>(name: N) => ({
  all: [name] as const,
  lists: () => [name, "list"] as const,
  list: (params?: unknown) => [name, "list", params ?? {}] as const,
  detail: (id: string) => [name, "detail", id] as const,
});

export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    statusCounts: ["dashboard", "status-counts"] as const,
    calibrationAlerts: ["dashboard", "calibration-alerts"] as const,
    borrowings: ["dashboard", "borrowings"] as const,
    trends: (months: number) => ["dashboard", "trends", months] as const,
    rooms: ["dashboard", "rooms"] as const,
  },
  users: entityKeys("users"),
  rooms: entityKeys("rooms"),
  equipment: { ...entityKeys("equipment"), qr: (token: string) => ["equipment", "qr", token] as const },
  supportingEquipment: { ...entityKeys("supporting-equipment"), qr: (token: string) => ["supporting-equipment", "qr", token] as const },
  borrowings: entityKeys("borrowings"),
  calibrations: { ...entityKeys("calibrations"), latestPassed: (equipmentId: string) => ["calibrations", "latest-passed", equipmentId] as const },
  maintenance: entityKeys("maintenance"),
  sensors: entityKeys("sensors"),
  monitoring: { ...entityKeys("monitoring"), latest: (params?: unknown) => ["monitoring", "latest", params ?? {}] as const },
  documents: entityKeys("documents"),
  notifications: {
    ...entityKeys("notifications"),
    unreadCount: (userId: string) => ["notifications", "unread-count", userId] as const,
  },
  activityLogs: entityKeys("activity-logs"),
};
