"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Wallet } from "lucide-react";
import { useMonthlyTrends } from "@/hooks/use-dashboard";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { CHART_COLOR } from "@/lib/status";
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from "./chart-theme";
import { DashboardPanel } from "./panel";

export function CostChart() {
  const { data, isLoading, isError, refetch } = useMonthlyTrends(6);
  const total = data?.reduce((s, p) => s + p.calibration_cost + p.maintenance_cost, 0) ?? 0;

  return (
    <DashboardPanel
      title="Biaya perawatan dan kalibrasi"
      description={data ? `Total 6 bulan: ${formatRupiah(total)}` : "Biaya per bulan."}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={total === 0}
      empty={{ icon: Wallet, title: "Belum ada biaya tercatat", description: "Biaya dari kalibrasi dan maintenance selesai/berjalan akan tampil di sini." }}
      skeletonRows={1}
      skeletonClassName="h-56"
    >
      {data && (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} tickFormatter={formatRupiahCompact} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(_, p) => p?.[0]?.payload?.full_label ?? ""} formatter={(v: number, n: string) => [formatRupiah(v), n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="calibration_cost" name="Kalibrasi" stackId="cost" fill={CHART_COLOR.calibration} />
                <Bar dataKey="maintenance_cost" name="Perawatan" stackId="cost" fill={CHART_COLOR.maintenance} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            {data.map((p) => `${p.full_label}: kalibrasi ${formatRupiah(p.calibration_cost)}, perawatan ${formatRupiah(p.maintenance_cost)}`).join(". ")}
          </p>
        </>
      )}
    </DashboardPanel>
  );
}
