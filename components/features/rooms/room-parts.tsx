import { Droplets, Thermometer } from "lucide-react";
import { formatDecimal } from "@/lib/format";
import { READING_STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { SensorType, SensorWithLatest } from "@/types/erd";

export function CapacityBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, capacity)) * 100));
  const over = used > capacity;
  const full = used === capacity;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Kapasitas alat</span>
        <span className={cn("font-medium tabular-nums", over && "text-destructive")}>{used} / {capacity}{over ? " (melebihi)" : full ? " (penuh)" : ""}</span>
      </div>
      <div role="progressbar" aria-label="Kapasitas terpakai" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={Math.min(used, capacity)} className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", over ? "bg-red-600" : pct >= 90 ? "bg-yellow-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Pembacaan terbaru satu jenis sensor di ruangan (pakai sensor aktif pertama). */
export function LatestReading({ type, items }: { type: SensorType; items: SensorWithLatest[] }) {
  const Icon = type === "temperature" ? Thermometer : Droplets;
  const label = type === "temperature" ? "Suhu" : "Kelembapan";
  const item = items.find((i) => i.sensor.sensor_type === type && i.sensor.sensor_status === "active" && i.latest)
    ?? items.find((i) => i.sensor.sensor_type === type);
  const bad = item?.reading_status && item.reading_status !== "normal";
  return (
    <div className={cn("rounded-md border p-2.5", bad && "border-destructive/60 bg-destructive/10")}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</p>
      {item?.latest ? (
        <>
          <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", bad && "text-destructive")}>
            {formatDecimal(item.latest.value)}<span className="ml-1 text-xs font-normal text-muted-foreground">{item.sensor.unit}</span>
          </p>
          <p className={cn("text-xs", bad ? "font-medium text-destructive" : "text-muted-foreground")}>
            {item.sensor.sensor_status !== "active" ? "Sensor tidak aktif" : item.reading_status ? READING_STATUS_META[item.reading_status].label : ""}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{item ? "Belum ada data" : "Belum ada sensor"}</p>
      )}
    </div>
  );
}
