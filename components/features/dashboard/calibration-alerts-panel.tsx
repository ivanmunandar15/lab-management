"use client";

import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { AlertTriangle, ArrowRight, CalendarClock, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaBadge } from "@/components/features/common/status-badge";
import { useCalibrationAlerts } from "@/hooks/use-dashboard";
import { CALIBRATION_STATE_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { CalibrationAlert } from "@/lib/services";
import { DashboardPanel } from "./panel";

const MAX_ROWS = 6;

function dueText(a: CalibrationAlert) {
  if (a.days_until === null || !a.next_calibration_date) return "Belum pernah dikalibrasi";
  const date = format(new Date(a.next_calibration_date), "d MMM yyyy", { locale: idLocale });
  if (a.days_until < 0) return `Terlambat ${Math.abs(a.days_until)} hari (${date})`;
  if (a.days_until === 0) return `Jatuh tempo hari ini (${date})`;
  return `${a.days_until} hari lagi (${date})`;
}

export function CalibrationAlertsPanel() {
  const { data, isLoading, isError, refetch } = useCalibrationAlerts();
  const shown = data?.items.slice(0, MAX_ROWS) ?? [];
  const rest = (data?.items.length ?? 0) - shown.length;

  return (
    <DashboardPanel
      title="Peringatan kalibrasi"
      description={
        data ? (
          <>
            <span className="font-medium text-destructive">{data.overdue_count} terlambat</span>
            {" · "}
            {data.due_soon_count} jatuh tempo ≤ 30 hari
          </>
        ) : "Alat yang terlambat atau jatuh tempo ≤ 30 hari."
      }
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/calibration">Buka kalibrasi <ArrowRight /></Link>
        </Button>
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={data?.items.length === 0}
      empty={{ icon: Gauge, title: "Semua kalibrasi aman", description: "Tidak ada alat yang terlambat atau jatuh tempo dalam 30 hari." }}
      skeletonRows={5}
    >
      <ul className="space-y-2">
        {shown.map((a) => {
          const overdue = a.state === "overdue";
          return (
            <li
              key={a.equipment_id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border border-l-4 px-3 py-2",
                overdue ? "border-l-destructive bg-destructive/5" : "border-l-yellow-500",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.equipment_name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.inventory_code} · {a.room_name}</p>
                <p className={cn("mt-0.5 flex items-center gap-1 text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {overdue ? <AlertTriangle className="size-3" aria-hidden="true" /> : <CalendarClock className="size-3" aria-hidden="true" />}
                  {dueText(a)}
                </p>
              </div>
              <MetaBadge meta={CALIBRATION_STATE_META[a.state]} className="shrink-0" />
            </li>
          );
        })}
      </ul>
      {rest > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">+{rest} alat lainnya di halaman kalibrasi</p>}
    </DashboardPanel>
  );
}
