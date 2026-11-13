"use client";
import { useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ClipboardPlus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { CalibrationDate } from "@/components/features/equipment/calibration-date";
import { getCalibrationState } from "@/lib/domain";
import { CALIBRATION_STATE_META, toneDotClass } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { CalibrationState, Equipment } from "@/types/erd";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const key = (d: Date) => format(d, "yyyy-MM-dd");

interface Props {
  equipment: Equipment[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  canCreate: boolean;
  onRecord: (equipmentId: string) => void;
  onHistory: (equipmentId: string) => void;
}

/** Kalender bulanan: titik berwarna di tanggal jatuh tempo (hijau aman, kuning segera, merah terlambat). */
export function CalibrationCalendar({ equipment, isLoading, error, onRetry, canCreate, onRecord, onHistory }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, Equipment[]>();
    for (const e of equipment) {
      if (!e.next_calibration_date) continue;
      map.set(e.next_calibration_date, [...(map.get(e.next_calibration_date) ?? []), e]);
    }
    return map;
  }, [equipment]);

  const days = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const monthItems = useMemo(
    () => equipment
      .filter((e) => e.next_calibration_date && isSameMonth(parseISO(e.next_calibration_date), month))
      .sort((a, b) => a.next_calibration_date!.localeCompare(b.next_calibration_date!)),
    [equipment, month],
  );
  const listed = selected ? byDay.get(key(selected)) ?? [] : monthItems;
  const monthLabel = format(month, "MMMM yyyy", { locale: idLocale });

  if (error) return <Card><ErrorState onRetry={onRetry} /></Card>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold capitalize" aria-live="polite">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(null); }}>Hari ini</Button>
            <Button variant="outline" size="icon" className="size-9" aria-label="Bulan sebelumnya" onClick={() => { setMonth(addMonths(month, -1)); setSelected(null); }}><ChevronLeft /></Button>
            <Button variant="outline" size="icon" className="size-9" aria-label="Bulan berikutnya" onClick={() => { setMonth(addMonths(month, 1)); setSelected(null); }}><ChevronRight /></Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-80 w-full" aria-busy="true" />
        ) : (
          <>
            <div className="grid grid-cols-7 border-b pb-1 text-center text-xs font-medium text-muted-foreground" aria-hidden="true">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const items = byDay.get(key(day)) ?? [];
                const inMonth = isSameMonth(day, month);
                const isSel = !!selected && isSameDay(day, selected);
                const states = [...new Set(items.map((e) => getCalibrationState(e.next_calibration_date)))] as CalibrationState[];
                return (
                  <button
                    key={key(day)} type="button" disabled={items.length === 0}
                    aria-pressed={isSel}
                    aria-label={`${format(day, "d MMMM yyyy", { locale: idLocale })}${items.length ? `, ${items.length} alat jatuh tempo` : ""}`}
                    onClick={() => setSelected(isSel ? null : day)}
                    className={cn(
                      "flex min-h-14 flex-col items-center gap-1 rounded-md border border-transparent p-1 text-sm sm:min-h-16",
                      !inMonth && "text-muted-foreground/50",
                      items.length > 0 ? "cursor-pointer hover:bg-accent" : "cursor-default",
                      isSel && "border-primary bg-primary/10",
                    )}
                  >
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs", isSameDay(day, today) && "bg-primary font-semibold text-primary-foreground")}>
                      {format(day, "d")}
                    </span>
                    <span className="flex items-center gap-0.5" aria-hidden="true">
                      {states.map((s) => <span key={s} className={cn("size-2 rounded-full", toneDotClass(CALIBRATION_STATE_META[s].tone))} />)}
                      {items.length > 1 && <span className="ml-0.5 text-[10px] tabular-nums text-muted-foreground">{items.length}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground" aria-label="Keterangan warna">
              {(Object.keys(CALIBRATION_STATE_META) as CalibrationState[]).filter((s) => s !== "not_required").map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", toneDotClass(CALIBRATION_STATE_META[s].tone))} aria-hidden="true" />
                  {CALIBRATION_STATE_META[s].label}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            {selected ? format(selected, "d MMMM yyyy", { locale: idLocale }) : `Jatuh tempo ${monthLabel}`}
          </h2>
          {selected && <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Semua bulan ini</Button>}
        </div>
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : listed.length === 0 ? (
          <EmptyState title="Tidak ada jatuh tempo" description="Tidak ada alat yang jatuh tempo kalibrasi pada periode ini." className="py-8" />
        ) : (
          <ul className="space-y-2">
            {listed.map((e) => (
              <li key={e.equipment_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.equipment_name}</p>
                  <p className="mb-1 font-mono text-xs text-muted-foreground">{e.inventory_code}</p>
                  <CalibrationDate date={e.next_calibration_date} />
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="size-9" aria-label={`Riwayat kalibrasi ${e.equipment_name}`} onClick={() => onHistory(e.equipment_id)}><History /></Button>
                  {canCreate && <Button size="sm" onClick={() => onRecord(e.equipment_id)}><ClipboardPlus /> Catat</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
