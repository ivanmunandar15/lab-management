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
import { ExportMenu } from "@/components/features/equipment/export-menu";
import { LogbookExportDialog } from "@/components/features/equipment/logbook-export-dialog";
import { useCan } from "@/components/features/equipment/use-can";
import { useRestoreSupportingEquipment, useSoftDeleteSupportingEquipment, useSupportingEquipmentList } from "@/hooks";
import { exportSupportingCsv, exportSupportingLabelPdf, exportSupportingQrZip } from "@/lib/export/supporting-export";
import { getStockLevel, STOCK_LEVEL_LABEL, type StockLevel } from "@/lib/stock";
import { CONDITION_META } from "@/lib/status";
import { StockBar } from "./stock-bar";
import { SupportingImportDialog } from "./supporting-import-dialog";
import type { Condition, SupportingEquipment, SupportingStatus } from "@/types/erd";

const STATUS_OPTIONS: { value: SupportingStatus; label: string }[] = [
  { value: "available", label: "Tersedia" }, { value: "borrowed", label: "Digunakan" }, { value: "damaged", label: "Rusak" },
];

export function SupportingTable() {
  const router = useRouter();
  const can = useCan("supporting_equipment");
  const [showInactive, setShowInactive] = useState(false);
  const { data = [], isLoading, error, refetch } = useSupportingEquipmentList({ includeInactive: showInactive });
  const softDelete = useSoftDeleteSupportingEquipment();
  const restore = useRestoreSupportingEquipment();
  const [filtered, setFiltered] = useState<SupportingEquipment[]>([]);
  const [selected, setSelected] = useState<SupportingEquipment[]>([]);
  const [toDelete, setToDelete] = useState<SupportingEquipment | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);
  const types = useMemo(() => [...new Set(data.map((s) => s.item_type).filter(Boolean))].sort(), [data]);

  const columns = useMemo<ColumnDef<SupportingEquipment>[]>(() => [
    { accessorKey: "item_code", header: "Kode", cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    {
      accessorKey: "item_name", header: "Nama",
      cell: ({ row }) => (
        <div className="min-w-40">
          <Link href={`/supporting-equipment/${row.original.supporting_equipment_id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline focus-visible:underline">{row.original.item_name}</Link>
          {!row.original.is_active && <span className="ml-2 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300">Nonaktif</span>}
        </div>
      ),
    },
    { accessorKey: "item_type", header: "Jenis", cell: ({ getValue }) => getValue<string>() || "—" },
    {
      id: "brand_model", header: "Merek / Model", accessorFn: (s) => `${s.brand} ${s.model}`.trim(),
      cell: ({ row }) => (row.original.brand || row.original.model)
        ? <span className="whitespace-nowrap">{row.original.brand} <span className="text-muted-foreground">{row.original.model}</span></span>
        : "—",
    },
    {
      id: "stock", header: "Stok", accessorFn: (s) => s.available_quantity / Math.max(1, s.total_quantity),
      cell: ({ row }) => <StockBar available={row.original.available_quantity} total={row.original.total_quantity} unit={row.original.unit} />,
    },
    // kolom tersembunyi untuk filter level stok
    { id: "stock_level", header: "Level stok", accessorFn: (s) => getStockLevel(s.available_quantity, s.total_quantity), enableSorting: false },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue<SupportingStatus>()} /> },
    { accessorKey: "condition", header: "Kondisi", cell: ({ getValue }) => <ConditionBadge condition={getValue<Condition>()} /> },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div onClick={(ev) => ev.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Aksi untuk ${s.item_name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push(`/supporting-equipment/${s.supporting_equipment_id}`)}><Eye /> Lihat detail</DropdownMenuItem>
                {can("update") && <DropdownMenuItem onSelect={() => router.push(`/supporting-equipment/${s.supporting_equipment_id}/edit`)}><Pencil /> Edit</DropdownMenuItem>}
                {can("delete") && <DropdownMenuSeparator />}
                {can("delete") && (s.is_active
                  ? <DropdownMenuItem onSelect={() => setToDelete(s)} className="text-destructive"><Trash2 /> Nonaktifkan</DropdownMenuItem>
                  : <DropdownMenuItem onSelect={() => restore.mutate(s.supporting_equipment_id, { onSuccess: () => toast.success("Item diaktifkan kembali") })}><RotateCcw /> Aktifkan kembali</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [router, can]);

  const exportItems = selected.length > 0 ? selected : filtered;

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(s) => s.supporting_equipment_id}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        enableRowSelection
        hiddenColumns={["stock_level"]}
        onRowClick={(s) => router.push(`/supporting-equipment/${s.supporting_equipment_id}`)}
        onFilteredChange={setFiltered}
        onSelectionChange={setSelected}
        searchPlaceholder="Cari nama atau kode item…"
        filters={[
          { columnId: "status", label: "Status", options: STATUS_OPTIONS },
          { columnId: "condition", label: "Kondisi", options: (Object.keys(CONDITION_META) as Condition[]).map((c) => ({ value: c, label: CONDITION_META[c].label })) },
          { columnId: "item_type", label: "Jenis", options: types.map((t) => ({ value: t, label: t })) },
          { columnId: "stock_level", label: "Stok", options: (["out", "low", "ok"] as StockLevel[]).map((l) => ({ value: l, label: STOCK_LEVEL_LABEL[l] })) },
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
              noun="item" count={exportItems.length} selectedCount={selected.length}
              actions={{
                csv: () => exportSupportingCsv(exportItems),
                zip: (p) => exportSupportingQrZip(exportItems, p),
                pdf: (size, p) => exportSupportingLabelPdf(exportItems, size, p),
              }}
            />
            <Button variant="outline" disabled={exportItems.length === 0} onClick={() => setLogbookOpen(true)}><FileText /> Log Book</Button>
            {can("create") && <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp /> Import CSV</Button>}
            {can("create") && <Button asChild><Link href="/supporting-equipment/new"><Plus /> Tambah Item</Link></Button>}
          </>
        }
        emptyTitle="Belum ada alat pendukung"
        emptyDescription="Tambahkan item pertama atau impor dari CSV. Satu QR mewakili satu jenis item, bukan unit fisik."
        emptyAction={can("create") ? <Button asChild><Link href="/supporting-equipment/new"><QrCode /> Tambah item pertama</Link></Button> : undefined}
      />
      <SupportingImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <LogbookExportDialog open={logbookOpen} onOpenChange={setLogbookOpen} supporting={exportItems} />
      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} variant="destructive"
        title={`Nonaktifkan "${toDelete?.item_name}"?`}
        description="Item disembunyikan dari daftar dan QR-nya akan menampilkan “item sudah dinonaktifkan”. Data tidak dihapus permanen dan bisa diaktifkan kembali."
        confirmLabel="Nonaktifkan"
        onConfirm={async () => {
          try { await softDelete.mutateAsync(toDelete!.supporting_equipment_id); toast.success("Item dinonaktifkan"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menonaktifkan item"); }
        }}
      />
    </>
  );
}
