"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { useEquipmentStatusCounts } from "@/hooks/use-dashboard";
import { CHART_COLOR, EQUIPMENT_STATUS_META } from "@/lib/status";
import type { EquipmentStatus } from "@/types/erd";
import { TOOLTIP_STYLE } from "./chart-theme";
import { DashboardPanel } from "./panel";

const STATUSES = Object.keys(EQUIPMENT_STATUS_META) as EquipmentStatus[];

export function StatusDonutChart() {
  const { data, isLoading, isError, refetch } = useEquipmentStatusCounts();
  const slices = data ? STATUSES.map((s) => ({ status: s, name: EQUIPMENT_STATUS_META[s].label, value: data[s] })) : [];

  return (
    <DashboardPanel
      title="Distribusi status alat"
      description="Semua alat aktif menurut status saat ini."
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={data?.total === 0}
      empty={{ icon: PieIcon, title: "Belum ada alat", description: "Grafik muncul setelah alat ditambahkan." }}
      skeletonRows={1}
      skeletonClassName="h-56"
    >
      {data && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer>
                <Pie data={slices.filter((s) => s.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="hsl(var(--card))">
                  {slices.filter((s) => s.value > 0).map((s) => <Cell key={s.status} fill={CHART_COLOR[s.status]} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v} alat`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">{data.total}</span>
              <span className="text-xs text-muted-foreground">alat aktif</span>
            </div>
          </div>
          {/* Legenda teks = alternatif aksesibel untuk grafik */}
          <ul className="w-full space-y-1.5 text-sm">
            {slices.map((s) => (
              <li key={s.status} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: CHART_COLOR[s.status] }} />
                  {s.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">{s.value}</span> · {Math.round((s.value / data.total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardPanel>
  );
}
