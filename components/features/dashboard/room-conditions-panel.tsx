"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Droplets, Thermometer, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoomConditions } from "@/hooks/use-dashboard";
import { formatDecimal, timeAgo } from "@/lib/format";
import { READING_STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { RoomCondition, RoomReading } from "@/lib/services";
import { DashboardPanel } from "./panel";

function Metric({ reading, kind }: { reading: RoomReading | null; kind: "temperature" | "humidity" }) {
  const Icon = kind === "temperature" ? Thermometer : Droplets;
  const label = kind === "temperature" ? "Suhu" : "Kelembapan";

  if (!reading) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium"><Icon className="size-3.5" aria-hidden="true" />{label}</p>
        <p className="mt-1">Belum ada sensor</p>
      </div>
    );
  }
  const inactive = reading.sensor_status !== "active";
  const bad = reading.status === "low" || reading.status === "high";
  const StatusIcon = reading.status === "high" ? ArrowUp : reading.status === "low" ? ArrowDown : null;

  return (
    <div className={cn("rounded-md border p-3", bad && "border-destructive/60 bg-destructive/10", inactive && "bg-muted/40")}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />{label}
      </p>
      {inactive ? (
        <>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <WifiOff className="size-4" aria-hidden="true" />
            Sensor {reading.sensor_status === "damaged" ? "rusak" : "nonaktif"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {reading.measured_at ? `Data terakhir ${timeAgo(reading.measured_at)}` : "Belum ada data"}
          </p>
        </>
      ) : (
        <>
          <p className={cn("mt-1 text-xl font-semibold tabular-nums", bad && "text-destructive")}>
            {reading.value !== null ? formatDecimal(reading.value) : "–"}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{reading.unit}</span>
          </p>
          <p className={cn("mt-0.5 flex items-center gap-1 text-xs", bad ? "font-medium text-destructive" : "text-muted-foreground")}>
            {StatusIcon && <StatusIcon className="size-3" aria-hidden="true" />}
            {reading.status ? READING_STATUS_META[reading.status].label : "Belum ada data"} · batas {reading.min}–{reading.max} {reading.unit}
          </p>
        </>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: RoomCondition }) {
  return (
    <li className={cn("rounded-lg border p-3", room.out_of_range && "border-destructive/60")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{room.room_name}</p>
          <p className="text-xs text-muted-foreground">{room.room_code}</p>
        </div>
        {room.out_of_range && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3" aria-hidden="true" /> Di luar batas
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric reading={room.temperature} kind="temperature" />
        <Metric reading={room.humidity} kind="humidity" />
      </div>
    </li>
  );
}

export function RoomConditionsPanel({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useRoomConditions();
  const outCount = data?.filter((r) => r.out_of_range).length ?? 0;

  return (
    <DashboardPanel
      className={className}
      title="Kondisi ruangan"
      description={
        data ? (
          outCount > 0
            ? <span className="font-medium text-destructive">{outCount} ruangan di luar batas normal</span>
            : "Semua ruangan dalam batas normal."
        ) : "Suhu dan kelembapan terkini per ruangan."
      }
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/monitoring">Monitoring <ArrowRight /></Link>
        </Button>
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={data?.length === 0}
      empty={{ icon: Thermometer, title: "Belum ada ruangan", description: "Tambahkan ruangan dan sensor untuk memantau kondisinya." }}
      skeletonRows={4}
      skeletonClassName="h-28"
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {data?.map((room) => <RoomCard key={room.room_id} room={room} />)}
      </ul>
    </DashboardPanel>
  );
}
