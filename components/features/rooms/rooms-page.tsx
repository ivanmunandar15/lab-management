"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { DoorOpen, Gauge, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { PageHeader } from "@/components/features/common/page-header";
import { useCan } from "@/components/features/equipment/use-can";
import { useDeleteRoom, useEquipmentList, useLatestReadings, useRooms, useSensors, useUsers } from "@/hooks";
import type { Room } from "@/types/erd";
import { RoomFormSheet } from "./room-form-sheet";
import { CapacityBar, LatestReading } from "./room-parts";

export function RoomsPage() {
  const can = useCan("room");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ open: boolean; room: Room | null }>({ open: false, room: null });
  const [toDelete, setToDelete] = useState<Room | null>(null);

  const rooms = useRooms();
  const equipment = useEquipmentList();
  const sensors = useSensors();
  const latest = useLatestReadings();
  const users = useUsers({ includeInactive: true });
  const remove = useDeleteRoom();

  const isLoading = rooms.isLoading || equipment.isLoading || sensors.isLoading;
  const error = rooms.error ?? equipment.error ?? sensors.error;
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rooms.data ?? []).filter((r) => !q || `${r.room_code} ${r.room_name}`.toLowerCase().includes(q));
  }, [rooms.data, search]);

  return (
    <>
      <PageHeader
        title="Ruangan" description="Ruangan laboratorium, kapasitas alat, dan kondisi lingkungan terkini."
        actions={can("create") ? <Button className="h-11 sm:h-10" onClick={() => setForm({ open: true, room: null })}><Plus /> Tambah Ruangan</Button> : undefined}
      />
      <div className="relative mb-4 sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input aria-label="Cari ruangan" placeholder="Cari kode atau nama ruangan…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? <Card><ErrorState onRetry={() => { rooms.refetch(); equipment.refetch(); sensors.refetch(); }} /></Card>
        : isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-60" />)}</div>
        : list.length === 0 ? (
          <Card><EmptyState icon={DoorOpen} title={search ? "Ruangan tidak ditemukan" : "Belum ada ruangan"}
            description={search ? "Ubah kata kunci pencarian." : "Tambahkan ruangan untuk mengelompokkan alat dan sensor."}
            action={!search && can("create") ? <Button onClick={() => setForm({ open: true, room: null })}><Plus /> Tambah Ruangan</Button> : undefined} /></Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((r) => {
              const used = (equipment.data ?? []).filter((e) => e.room_id === r.room_id).length;
              const roomSensors = (sensors.data ?? []).filter((s) => s.room_id === r.room_id);
              const roomLatest = (latest.data ?? []).filter((l) => l.sensor.room_id === r.room_id);
              return (
                <li key={r.room_id}>
                  <Card className="flex h-full flex-col gap-4 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{r.room_code}</p>
                        <h2 className="truncate text-base font-semibold">
                          <Link href={`/rooms/${r.room_id}`} className="rounded hover:underline">{r.room_name}</Link>
                        </h2>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><User className="size-3.5" aria-hidden="true" />{users.data?.find((u) => u.user_id === r.person_in_charge)?.name ?? "—"}</p>
                      </div>
                      {can("update") && (
                        <div className="flex shrink-0">
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.room_name}`} onClick={() => setForm({ open: true, room: r })}><Pencil /></Button>
                          {can("delete") && <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Hapus ${r.room_name}`} onClick={() => setToDelete(r)}><Trash2 /></Button>}
                        </div>
                      )}
                    </div>
                    <CapacityBar used={used} capacity={r.equipment_capacity} />
                    <div className="grid grid-cols-2 gap-2">
                      <LatestReading type="temperature" items={roomLatest} />
                      <LatestReading type="humidity" items={roomLatest} />
                    </div>
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Gauge className="size-3.5" aria-hidden="true" />{roomSensors.length} sensor</span>
                      <Button asChild size="sm" variant="outline"><Link href={`/rooms/${r.room_id}`}>Detail</Link></Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

      {(can("create") || can("update")) && <RoomFormSheet open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} room={form.room} />}
      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} variant="destructive" confirmLabel="Hapus"
        title={`Hapus ${toDelete?.room_name}?`}
        description="Ruangan dihapus permanen. Ruangan yang masih memiliki alat atau sensor tidak dapat dihapus."
        onConfirm={async () => {
          try { await remove.mutateAsync(toDelete!.room_id); toast.success("Ruangan dihapus"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menghapus ruangan"); }
        }}
      />
    </>
  );
}
