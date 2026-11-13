"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, FileText, FileUp, MoreHorizontal, Pencil, Plus, QrCode, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { DataTable } from "@/components/features/common/data-table";
import { ConditionBadge, StatusBadge } from "@/components/features/common/status-badge";
import { useEquipmentList, useRestoreEquipment, useRooms, useSoftDeleteEquipment } from "@/hooks";
import { CONDITION_META, EQUIPMENT_STATUS_META } from "@/lib/status";
import { exportCsv, exportLabelPdf, exportQrZip } from "@/lib/export/equipment-export";
import { CalibrationDate } from "./calibration-date";
import { ExportMenu } from "./export-menu";
import { ImportDialog } from "./import-dialog";
import { LogbookExportDialog } from "./logbook-export-dialog";
import { useCan } from "./use-can";
import type { Condition, Equipment, EquipmentStatus } from "@/types/erd";

export function EquipmentTable() {
  const router = useRouter();
  const can = useCan("equipment");
  const [showInactive, setShowInactive] = useState(false);
  const { data = [], isLoading, error, refetch } = useEquipmentList({ includeInactive: showInactive });
  const { data: rooms = [] } = useRooms();
  const softDelete = useSoftDeleteEquipment();
  const restore = useRestoreEquipment();
  const [filtered, setFiltered] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<Equipment[]>([]);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.room_id, r])), [rooms]);
  const roomName = (id: string) => roomMap.get(id)?.room_name ?? "—";
  const types = useMemo(() => [...new Set(data.map((e) => e.equipment_type))].sort(), [data]);

  const columns = useMemo<ColumnDef<Equipment>[]>(() => [
    { accessorKey: "inventory_code", header: "Kode", cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    {
      accessorKey: "equipment_name", header: "Nama",
      cell: ({ row }) => (
        <div className="min-w-40">
          <Link href={`/equipment/${row.original.equipment_id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline focus-visible:underline">
            {row.original.equipment_name}
          </Link>
          {!row.original.is_active && <span className="ml-2 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300">Nonaktif</span>}
        </div>
      ),
    },
    { accessorKey: "equipment_type", header: "Tipe" },
    {
      id: "brand_model", header: "Merek / Model", accessorFn: (e) => `${e.brand} ${e.model}`,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.brand} <span className="text-muted-foreground">{row.original.model}</span></span>,
    },
    { id: "room_id", header: "Ruangan", accessorFn: (e) => e.room_id, cell: ({ row }) => roomName(row.original.room_id) },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue<EquipmentStatus>()} /> },
    { accessorKey: "condition", header: "Kondisi", cell: ({ getValue }) => <ConditionBadge condition={getValue<Condition | null>()} /> },
    {
      accessorKey: "next_calibration_date", header: "Kalibrasi berikutnya",
      sortingFn: (a, b) => (a.original.next_calibration_date ?? "").localeCompare(b.original.next_calibration_date ?? ""),
      cell: ({ getValue }) => <CalibrationDate date={getValue<string | null>()} />,
    },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div onClick={(ev) => ev.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi untuk ${e.equipment_name}`}><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push(`/equipment/${e.equipment_id}`)}><Eye /> Lihat detail</DropdownMenuItem>
                {can("update") && <DropdownMenuItem onSelect={() => router.push(`/equipment/${e.equipment_id}/edit`)}><Pencil /> Edit</DropdownMenuItem>}
                {can("delete") && <DropdownMenuSeparator />}
                {can("delete") && (e.is_active
                  ? <DropdownMenuItem onSelect={() => setToDelete(e)} className="text-destructive"><Trash2 /> Nonaktifkan</DropdownMenuItem>
                  : <DropdownMenuItem onSelect={() => restore.mutate(e.equipment_id, { onSuccess: () => toast.success("Alat diaktifkan kembali") })}><RotateCcw /> Aktifkan kembali</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [roomMap, router, can]);

  const exportItems = selected.length > 0 ? selected : filtered;

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(e) => e.equipment_id}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        enableRowSelection
        onRowClick={(e) => router.push(`/equipment/${e.equipment_id}`)}
        onFilteredChange={setFiltered}
        onSelectionChange={setSelected}
        searchPlaceholder="Cari nama atau kode inventaris…"
        filters={[
          { columnId: "status", label: "Status", options: (Object.keys(EQUIPMENT_STATUS_META) as EquipmentStatus[]).map((s) => ({ value: s, label: EQUIPMENT_STATUS_META[s].label })) },
          { columnId: "condition", label: "Kondisi", options: (Object.keys(CONDITION_META) as Condition[]).map((c) => ({ value: c, label: CONDITION_META[c].label })) },
          { columnId: "room_id", label: "Ruangan", options: rooms.map((r) => ({ value: r.room_id, label: r.room_name })) },
          { columnId: "equipment_type", label: "Tipe", options: types.map((t) => ({ value: t, label: t })) },
        ]}
        toolbarActions={
          <>
            {can("delete") && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="size-4 accent-primary" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                Tampilkan nonaktif
              </label>
            )}
            <ExportMenu
              count={exportItems.length} selectedCount={selected.length}
              actions={{
                csv: () => exportCsv(exportItems, roomName),
                zip: (p) => exportQrZip(exportItems, roomName, p),
                pdf: (size, p) => exportLabelPdf(exportItems, size, p),
              }}
            />
            <Button variant="outline" disabled={exportItems.length === 0} onClick={() => setLogbookOpen(true)}><FileText /> Log Book</Button>
            {can("create") && <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp /> Import CSV</Button>}
            {can("create") && <Button asChild><Link href="/equipment/new"><Plus /> Tambah Alat</Link></Button>}
          </>
        }
        emptyTitle="Belum ada alat"
        emptyDescription="Tambahkan alat pertama atau impor dari CSV. QR dibuat otomatis untuk setiap alat."
        emptyAction={can("create") ? <Button asChild><Link href="/equipment/new"><QrCode /> Tambah alat pertama</Link></Button> : undefined}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <LogbookExportDialog open={logbookOpen} onOpenChange={setLogbookOpen} equipment={exportItems} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        variant="destructive"
        title={`Nonaktifkan "${toDelete?.equipment_name}"?`}
        description="Alat disembunyikan dari daftar dan QR-nya akan menampilkan “alat sudah dinonaktifkan”. Data tidak dihapus permanen dan bisa diaktifkan kembali."
        confirmLabel="Nonaktifkan"
        onConfirm={async () => {
          try {
            await softDelete.mutateAsync(toDelete!.equipment_id);
            toast.success("Alat dinonaktifkan");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal menonaktifkan alat");
          }
        }}
      />
    </>
  );
}
