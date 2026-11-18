"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { useMonthlyTrends } from "@/hooks/use-dashboard";
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from "./chart-theme";
import { DashboardPanel } from "./panel";

export function BorrowingTrendChart() {
  const { data, isLoading, isError, refetch } = useMonthlyTrends(6);
  const total = data?.reduce((s, p) => s + p.borrowings, 0) ?? 0;

  return (
    <DashboardPanel
      title="Tren penggunaan"
      description={data ? `${total} penggunaan dalam 6 bulan terakhir.` : "Jumlah penggunaan per bulan."}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={total === 0}
      empty={{ icon: TrendingUp, title: "Belum ada penggunaan", description: "Tren muncul setelah ada penggunaan dalam 6 bulan terakhir." }}
      skeletonRows={1}
      skeletonClassName="h-56"
    >
      {data && (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} accessibilityLayer>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(_, p) => p?.[0]?.payload?.full_label ?? ""} formatter={(v: number) => [`${v} penggunaan`, "Jumlah"]} />
                <Line type="monotone" dataKey="borrowings" name="Penggunaan" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">{data.map((p) => `${p.full_label}: ${p.borrowings} penggunaan`).join(". ")}</p>
        </>
      )}
    </DashboardPanel>
  );
}
