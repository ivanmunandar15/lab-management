"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Thermometer, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { MetaBadge, StatusBadge } from "@/components/features/common/status-badge";
import { PageHeader } from "@/components/features/common/page-header";
import { useCan } from "@/components/features/equipment/use-can";
import { ReadingsChart } from "@/components/features/monitoring/readings-chart";
import { SensorFormSheet } from "@/components/features/monitoring/sensor-form-sheet";
import { useEquipmentList, useLatestReadings, useReadings, useRoom, useSensors, useUsers } from "@/hooks";
import { formatDecimal, timeAgo } from "@/lib/format";
import { READING_STATUS_META, SENSOR_STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Sensor } from "@/types/erd";
import { RoomFormSheet } from "./room-form-sheet";
import { CapacityBar } from "./room-parts";

const RANGES = [{ id: "24h", label: "24 jam", ms: 24 * 3_600_000 }, { id: "7d", label: "7 hari", ms: 7 * 24 * 3_600_000 }] as const;

export function RoomDetail({ id }: { id: string }) {
  const can = useCan("room");
  const canSensor = useCan("monitoring");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("24h");
  const [editOpen, setEditOpen] = useState(false);
  const [sensorForm, setSensorForm] = useState<{ open: boolean; sensor: Sensor | null }>({ open: false, sensor: null });
  const [anchor] = useState(() => Date.now());
  const rangeMs = RANGES.find((r) => r.id === range)!.ms;
  const fromMs = anchor - rangeMs;

  const room = useRoom(id);
  const equipment = useEquipmentList({ room_id: id });
  const sensors = useSensors({ room_id: id });
  const latest = useLatestReadings({ room_id: id });
  const readings = useReadings({ room_id: id, from: new Date(fromMs).toISOString() });
  const users = useUsers({ includeInactive: true });

  if (room.isLoading) return <div className="space-y-4" aria-busy="true"><Skeleton className="h-10 w-72" /><Skeleton className="h-32 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (room.error || !room.data) return <Card><ErrorState title="Ruangan tidak ditemukan" description="Ruangan mungkin sudah dihapus." onRetry={() => room.refetch()} /></Card>;
  const r = room.data;
  const eq = equipment.data ?? [];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2"><Link href="/rooms"><ArrowLeft /> Semua ruangan</Link></Button>
      <PageHeader
        title={r.room_name} description={`${r.room_code} · Penanggung jawab: ${users.data?.find((u) => u.user_id === r.person_in_charge)?.name ?? "—"}`}
        actions={can("update") ? <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit ruangan</Button> : undefined}
      />
      <Card className="mb-4 space-y-3 p-4">
        {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
        <CapacityBar used={eq.length} capacity={r.equipment_capacity} />
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Alat di ruangan ({eq.length})</h2>
          {equipment.isLoading ? <Skeleton className="h-32 w-full" /> : equipment.error ? <ErrorState onRetry={() => equipment.refetch()} className="py-6" />
            : eq.length === 0 ? <EmptyState title="Belum ada alat" description="Alat yang ditempatkan di ruangan ini akan tampil di sini." className="py-8" />
            : (
              <ul className="divide-y">
                {eq.map((e) => (
                  <li key={e.equipment_id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <Link href={`/equipment/${e.equipment_id}`} className="block truncate text-sm font-medium hover:underline">{e.equipment_name}</Link>
                      <p className="font-mono text-xs text-muted-foreground">{e.inventory_code}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Sensor ({sensors.data?.length ?? 0})</h2>
            {canSensor("create") && <Button size="sm" variant="outline" onClick={() => setSensorForm({ open: true, sensor: null })}><Plus /> Tambah</Button>}
          </div>
          {sensors.isLoading ? <Skeleton className="h-32 w-full" /> : sensors.error ? <ErrorState onRetry={() => sensors.refetch()} className="py-6" />
            : (sensors.data ?? []).length === 0 ? <EmptyState icon={Thermometer} title="Belum ada sensor" description="Tambahkan sensor suhu atau kelembapan." className="py-8" />
            : (
              <ul className="divide-y">
                {sensors.data!.map((s) => {
                  const l = latest.data?.find((x) => x.sensor.sensor_id === s.sensor_id);
                  const bad = l?.reading_status && l.reading_status !== "normal";
                  return (
                    <li key={s.sensor_id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {s.sensor_type === "temperature" ? <Thermometer className="size-3.5" aria-hidden="true" /> : <Droplets className="size-3.5" aria-hidden="true" />}
                          <span className="font-mono text-xs">{s.sensor_code}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{s.sensor_location} · batas {s.min_threshold}–{s.max_threshold} {s.unit}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-right">
                        <div>
                          {l?.latest && <p className={cn("text-sm font-semibold tabular-nums", bad && "text-destructive")}>{formatDecimal(l.latest.value)} {s.unit}</p>}
                          <p className="text-xs text-muted-foreground">{l?.latest ? (bad && l.reading_status ? READING_STATUS_META[l.reading_status].label : timeAgo(l.latest.measurement_time)) : "Belum ada data"}</p>
                        </div>
                        <MetaBadge meta={SENSOR_STATUS_META[s.sensor_status]} />
                        {canSensor("update") && <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${s.sensor_code}`} onClick={() => setSensorForm({ open: true, sensor: s })}><Pencil /></Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Grafik kondisi ruangan</h2>
          <div role="group" aria-label="Rentang waktu" className="inline-flex rounded-lg border bg-muted/40 p-1">
            {RANGES.map((x) => (
              <button key={x.id} type="button" aria-pressed={range === x.id} onClick={() => setRange(x.id)}
                className={cn("min-h-8 rounded-md px-3 text-sm font-medium", range === x.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{x.label}</button>
            ))}
          </div>
        </div>
        {readings.isLoading || sensors.isLoading ? <Skeleton className="h-64 w-full" aria-busy="true" />
          : readings.error ? <ErrorState onRetry={() => readings.refetch()} className="py-8" />
          : (["temperature", "humidity"] as const).map((t) => {
              const list = (sensors.data ?? []).filter((s) => s.sensor_type === t);
              return list.length === 0 ? null : (
                <div key={t} className="mb-4 last:mb-0">
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">{t === "temperature" ? "Suhu" : "Kelembapan"}</h3>
                  <ReadingsChart sensors={list} readings={readings.data ?? []} fromMs={fromMs} toMs={anchor} height={220} />
                </div>
              );
            })}
        {!readings.isLoading && (sensors.data ?? []).length === 0 && <EmptyState title="Belum ada data grafik" description="Tambahkan sensor untuk melihat grafik." className="py-8" />}
      </Card>

      {can("update") && <RoomFormSheet open={editOpen} onOpenChange={setEditOpen} room={r} />}
      {(canSensor("create") || canSensor("update")) && (
        <SensorFormSheet open={sensorForm.open} onOpenChange={(o) => setSensorForm((f) => ({ ...f, open: o }))} sensor={sensorForm.sensor} roomId={id} />
      )}
    </>
  );
}
