"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Columns3, Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { DataTable } from "@/components/features/common/data-table";
import { MetaBadge } from "@/components/features/common/status-badge";
import { PageHeader } from "@/components/features/common/page-header";
import { useCan } from "@/components/features/equipment/use-can";
import { useEquipmentList, useMaintenanceList, useUpdateMaintenance, useUsers } from "@/hooks";
import { formatRupiah } from "@/lib/format";
import { MAINTENANCE_STATUS_META, MAINTENANCE_TYPE_LABEL } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Maintenance, MaintenanceStatus } from "@/types/erd";
import { MaintenanceFormSheet } from "./maintenance-form-sheet";
import { MaintenanceKanban } from "./maintenance-kanban";
import { ACTION_LABEL, MaintenanceActionButtons } from "./maintenance-shared";

type View = "table" | "kanban";
const VIEWS: { id: View; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Tabel", icon: Table2 },
  { id: "kanban", label: "Kanban", icon: Columns3 },
];

const CONFIRM_TEXT: Record<MaintenanceStatus, string> = {
  scheduled: "",
  in_progress: "Status alat akan berubah menjadi Perawatan dan alat tidak dapat digunakan selama maintenance berlangsung.",
  completed: "Tanggal selesai dicatat sekarang dan status alat dikembalikan menjadi Tersedia.",
  cancelled: "Maintenance dibatalkan. Jika sedang berlangsung, alat dikembalikan menjadi Tersedia. Status akhir ini tidak dapat diubah lagi.",
};

export function MaintenancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const can = useCan("maintenance");
  const canCreate = can("create");
  const canUpdate = can("update");

  const [view, setView] = useState<View>("table");
  const [formOpen, setFormOpen] = useState(params.get("action") === "create");
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [pendingChange, setPendingChange] = useState<{ m: Maintenance; next: MaintenanceStatus } | null>(null);

  const list = useMaintenanceList();
  const equipment = useEquipmentList({ includeInactive: true });
  const users = useUsers({ includeInactive: true });
  const update = useUpdateMaintenance();

  const rows = list.data ?? [];
  const equipmentName = (id: string) => equipment.data?.find((e) => e.equipment_id === id)?.equipment_name ?? "—";
  const userName = (id: string) => users.data?.find((u) => u.user_id === id)?.name ?? "—";

  function openForm(m: Maintenance | null) {
    setEditing(m);
    setFormOpen(true);
  }
  function setForm(open: boolean) {
    setFormOpen(open);
    if (!open && params.get("action")) router.replace(pathname);
  }

  async function confirmChange() {
    if (!pendingChange) return;
    const { m, next } = pendingChange;
    try {
      await update.mutateAsync({ id: m.maintenance_id, data: { status: next } });
      toast.success(`Maintenance ${MAINTENANCE_STATUS_META[next].label.toLowerCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status gagal diubah");
    }
  }

  const columns = useMemo<ColumnDef<Maintenance>[]>(() => [
    {
      id: "equipment", header: "Alat", accessorFn: (m) => `${equipmentName(m.equipment_id)} ${m.description}`,
      cell: ({ row }) => (
        <div>
          <p className="max-w-56 truncate font-medium">{equipmentName(row.original.equipment_id)}</p>
          <p className="max-w-56 truncate text-xs text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    { id: "type", header: "Tipe", accessorFn: (m) => m.maintenance_type, cell: ({ row }) => MAINTENANCE_TYPE_LABEL[row.original.maintenance_type] },
    { accessorKey: "maintenance_date", header: "Tanggal", cell: ({ row }) => <span className="whitespace-nowrap">{format(new Date(row.original.maintenance_date), "d MMM yyyy, HH:mm", { locale: idLocale })}</span> },
    { id: "technician", header: "Teknisi", accessorFn: (m) => userName(m.technician_id) },
    { accessorKey: "cost", header: "Biaya", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatRupiah(row.original.cost)}</span> },
    { id: "status", header: "Status", accessorFn: (m) => m.status, cell: ({ row }) => <MetaBadge meta={MAINTENANCE_STATUS_META[row.original.status]} /> },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => (
        <MaintenanceActionButtons status={row.original.status} canUpdate={canUpdate}
          onChange={(next) => setPendingChange({ m: row.original, next })} onEdit={() => openForm(row.original)} />
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [equipment.data, users.data, canUpdate]);

  const isLoading = list.isLoading;
  const pendingMeta = pendingChange && ACTION_LABEL[pendingChange.next];

  return (
    <>
      <PageHeader
        title="Maintenance" description="Jadwal, progres, dan riwayat perawatan alat laboratorium."
        actions={canCreate ? <Button className="h-11 sm:h-10" onClick={() => openForm(null)}><Plus /> Jadwalkan Maintenance</Button> : undefined}
      />

      <div role="tablist" aria-label="Tampilan maintenance" className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id} role="tab" type="button" aria-selected={view === v.id} onClick={() => setView(v.id)}
            className={cn("flex min-h-9 items-center gap-2 rounded-md px-4 text-sm font-medium", view === v.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <v.icon className="size-4" aria-hidden="true" /> {v.label}
          </button>
        ))}
      </div>

      {view === "table" ? (
        <DataTable
          columns={columns} data={rows} getRowId={(m) => m.maintenance_id}
          isLoading={isLoading} error={list.error} onRetry={() => list.refetch()}
          searchPlaceholder="Cari alat atau deskripsi…"
          filters={[
            { columnId: "type", label: "Tipe", options: Object.entries(MAINTENANCE_TYPE_LABEL).map(([value, label]) => ({ value, label })) },
            { columnId: "status", label: "Status", options: (Object.keys(MAINTENANCE_STATUS_META) as MaintenanceStatus[]).map((s) => ({ value: s, label: MAINTENANCE_STATUS_META[s].label })) },
          ]}
          onRowClick={canUpdate ? (m) => openForm(m) : undefined}
          emptyTitle="Belum ada maintenance"
          emptyDescription={canCreate ? "Jadwalkan perawatan rutin atau perbaikan alat." : "Riwayat perawatan alat akan tampil di sini."}
          emptyAction={canCreate ? <Button onClick={() => openForm(null)}><Plus /> Jadwalkan Maintenance</Button> : undefined}
        />
      ) : (
        <MaintenanceKanban
          rows={rows} isLoading={isLoading} error={list.error} onRetry={() => list.refetch()}
          equipmentName={equipmentName} userName={userName} canUpdate={canUpdate}
          onChangeStatus={(m, next) => setPendingChange({ m, next })} onEdit={openForm}
        />
      )}

      {(canCreate || canUpdate) && <MaintenanceFormSheet open={formOpen} onOpenChange={setForm} maintenance={editing} />}

      <ConfirmDialog
        open={!!pendingChange} onOpenChange={(o) => !o && setPendingChange(null)}
        title={pendingChange ? `${pendingMeta?.label} maintenance ${equipmentName(pendingChange.m.equipment_id)}?` : ""}
        description={pendingChange ? CONFIRM_TEXT[pendingChange.next] : ""}
        variant={pendingChange?.next === "cancelled" ? "destructive" : "default"}
        confirmLabel={`Ya, ${pendingMeta?.label.toLowerCase() ?? "lanjutkan"}`}
        onConfirm={confirmChange}
      />
    </>
  );
}
