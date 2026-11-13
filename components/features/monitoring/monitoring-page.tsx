"use client";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Pause, Pencil, Play, Plus, Power, Thermometer, Droplets } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { DataTable } from "@/components/features/common/data-table";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { MetaBadge } from "@/components/features/common/status-badge";
import { PageHeader } from "@/components/features/common/page-header";
import { useCan } from "@/components/features/equipment/use-can";
import { useLatestReadings, useLiveSimulation, useReadings, useRooms, useSensors, useSoftDeleteSensor } from "@/hooks";
import { formatDecimal, timeAgo } from "@/lib/format";
import { READING_STATUS_META, SENSOR_STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Sensor, SensorType } from "@/types/erd";
import { ReadingsChart } from "./readings-chart";
import { SensorFormSheet } from "./sensor-form-sheet";

const RANGES = [
  { id: "24h", label: "24 jam", ms: 24 * 3_600_000 },
  { id: "7d", label: "7 hari", ms: 7 * 24 * 3_600_000 },
  { id: "30d", label: "30 hari", ms: 30 * 24 * 3_600_000 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const TYPES: { id: SensorType; label: string; icon: typeof Thermometer }[] = [
  { id: "temperature", label: "Suhu", icon: Thermometer },
  { id: "humidity", label: "Kelembapan", icon: Droplets },
];

export function MonitoringPage() {
  const can = useCan("monitoring");
  const canCreate = can("create");
  const canUpdate = can("update");

  const [roomId, setRoomId] = useState("");
  const [sensorId, setSensorId] = useState("");
  const [range, setRange] = useState<RangeId>("24h");
  const [live, setLive] = useState(true);
  const [form, setForm] = useState<{ open: boolean; sensor: Sensor | null }>({ open: false, sensor: null });
  const [toDisable, setToDisable] = useState<Sensor | null>(null);

  const rooms = useRooms();
  const sensorsQ = useSensors();
  const latest = useLatestReadings();
  const disable = useSoftDeleteSensor();
  const lastTick = useLiveSimulation(live);

  const effectiveRoom = roomId || rooms.data?.[0]?.room_id || "";
  const rangeMs = RANGES.find((r) => r.id === range)!.ms;
  // Jendela waktu dihitung ulang tiap simulasi masuk / pergantian rentang agar query key stabil.
  const toMs = useMemo(() => Date.now(), [range, lastTick, effectiveRoom]); // eslint-disable-line react-hooks/exhaustive-deps
  const fromMs = toMs - rangeMs;
  const readings = useReadings({ room_id: effectiveRoom || undefined, from: new Date(fromMs).toISOString() });

  const roomSensors = (sensorsQ.data ?? []).filter((s) => s.room_id === effectiveRoom);
  const shown = roomSensors.filter((s) => !sensorId || s.sensor_id === sensorId);
  const latestOf = (id: string) => latest.data?.find((l) => l.sensor.sensor_id === id);
  const roomName = (id: string) => rooms.data?.find((r) => r.room_id === id)?.room_name ?? "—";

  const columns = useMemo<ColumnDef<Sensor>[]>(() => [
    { accessorKey: "sensor_code", header: "Sensor", cell: ({ row }) => <div><p className="font-mono text-xs font-medium">{row.original.sensor_code}</p><p className="text-xs text-muted-foreground">{row.original.sensor_location}</p></div> },
    { id: "room", header: "Ruangan", accessorFn: (s) => roomName(s.room_id) },
    { id: "type", header: "Jenis", accessorFn: (s) => s.sensor_type, cell: ({ row }) => row.original.sensor_type === "temperature" ? "Suhu" : "Kelembapan" },
    {
      id: "latest", header: "Terkini", enableSorting: false,
      cell: ({ row }) => {
        const l = latestOf(row.original.sensor_id);
        if (!l?.latest) return <span className="text-muted-foreground">Belum ada data</span>;
        const bad = l.reading_status && l.reading_status !== "normal";
        return (
          <div>
            <p className={cn("font-semibold tabular-nums", bad && "text-destructive")}>{formatDecimal(l.latest.value)} {row.original.unit}</p>
            <p className="text-xs text-muted-foreground">{l.reading_status && READING_STATUS_META[l.reading_status].label} · {timeAgo(l.latest.measurement_time)}</p>
          </div>
        );
      },
    },
    { id: "threshold", header: "Batas normal", enableSorting: false, cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.min_threshold}–{row.original.max_threshold} {row.original.unit}</span> },
    { id: "status", header: "Status", accessorFn: (s) => s.sensor_status, cell: ({ row }) => <MetaBadge meta={SENSOR_STATUS_META[row.original.sensor_status]} /> },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => canUpdate ? (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setForm({ open: true, sensor: row.original })}><Pencil /> Edit</Button>
          {row.original.sensor_status !== "inactive" && (
            <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label={`Nonaktifkan ${row.original.sensor_code}`} onClick={() => setToDisable(row.original)}><Power /></Button>
          )}
        </div>
      ) : null,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [latest.data, rooms.data, canUpdate]);

  const chartLoading = rooms.isLoading || sensorsQ.isLoading || readings.isLoading;
  const chartError = rooms.error ?? sensorsQ.error ?? readings.error;

  return (
    <>
      <PageHeader
        title="Monitoring" description="Suhu dan kelembapan ruangan dari sensor, lengkap dengan batas normal."
        actions={
          <>
            <Button variant="outline" aria-pressed={live} onClick={() => setLive((v) => !v)}>
              {live ? <Pause /> : <Play />} Live {live ? "aktif" : "jeda"}
            </Button>
            {canCreate && <Button className="h-11 sm:h-10" onClick={() => setForm({ open: true, sensor: null })}><Plus /> Tambah Sensor</Button>}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Ruangan" value={effectiveRoom} onChange={(e) => { setRoomId(e.target.value); setSensorId(""); }} disabled={rooms.isLoading}>
          {(rooms.data ?? []).map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code} — {r.room_name}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Sensor" value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
          <option value="">Semua sensor</option>
          {roomSensors.map((s) => <option key={s.sensor_id} value={s.sensor_id}>{s.sensor_code}</option>)}
        </NativeSelect>
        <div role="group" aria-label="Rentang waktu" className="inline-flex rounded-lg border bg-muted/40 p-1">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}
              className={cn("min-h-8 rounded-md px-3 text-sm font-medium", range === r.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto" role="status">
          <Activity className={cn("size-3.5", live && "text-green-600")} aria-hidden="true" />
          {live ? `Simulasi data setiap 30 detik${lastTick ? ` · terakhir ${timeAgo(lastTick.toISOString())}` : ""}` : "Simulasi dijeda"}
        </p>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        {TYPES.map((t) => {
          const list = shown.filter((s) => s.sensor_type === t.id);
          return (
            <Card key={t.id} className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><t.icon className="size-4 text-primary" aria-hidden="true" />{t.label}</h2>
              {chartLoading ? <Skeleton className="h-72 w-full" aria-busy="true" />
                : chartError ? <ErrorState onRetry={() => { readings.refetch(); sensorsQ.refetch(); rooms.refetch(); }} className="py-8" />
                : list.length === 0 ? <EmptyState icon={t.icon} title={`Tidak ada sensor ${t.label.toLowerCase()}`} description="Tambahkan sensor atau ubah filter sensor." className="py-12" />
                : <ReadingsChart sensors={list} readings={readings.data ?? []} fromMs={fromMs} toMs={toMs} />}
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Daftar sensor</h2>
      <DataTable
        columns={columns} data={sensorsQ.data ?? []} getRowId={(s) => s.sensor_id}
        isLoading={sensorsQ.isLoading || latest.isLoading} error={sensorsQ.error} onRetry={() => sensorsQ.refetch()}
        searchPlaceholder="Cari kode atau lokasi sensor…"
        filters={[
          { columnId: "type", label: "Jenis", options: TYPES.map((t) => ({ value: t.id, label: t.label })) },
          { columnId: "status", label: "Status", options: Object.entries(SENSOR_STATUS_META).map(([value, m]) => ({ value, label: m.label })) },
        ]}
        emptyTitle="Belum ada sensor" emptyDescription={canCreate ? "Tambahkan sensor untuk mulai memantau ruangan." : undefined}
        emptyAction={canCreate ? <Button onClick={() => setForm({ open: true, sensor: null })}><Plus /> Tambah Sensor</Button> : undefined}
      />

      {(canCreate || canUpdate) && (
        <SensorFormSheet open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} sensor={form.sensor} roomId={effectiveRoom} />
      )}
      <ConfirmDialog
        open={!!toDisable} onOpenChange={(o) => !o && setToDisable(null)} variant="destructive" confirmLabel="Nonaktifkan"
        title={`Nonaktifkan ${toDisable?.sensor_code}?`}
        description="Sensor berhenti dipantau, tetapi riwayat pembacaan tetap tersimpan. Anda bisa mengaktifkannya lagi lewat Edit."
        onConfirm={async () => {
          try { await disable.mutateAsync(toDisable!.sensor_id); toast.success("Sensor dinonaktifkan"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menonaktifkan sensor"); }
        }}
      />
    </>
  );
}
