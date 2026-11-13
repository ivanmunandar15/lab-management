"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardPlus, History, Table2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/common/page-header";
import { DataTable } from "@/components/features/common/data-table";
import { MetaBadge } from "@/components/features/common/status-badge";
import { StatCard } from "@/components/features/common/stat-card";
import { CalibrationDate } from "@/components/features/equipment/calibration-date";
import { useCan } from "@/components/features/equipment/use-can";
import { useCalibrations, useEquipmentList } from "@/hooks";
import { getCalibrationState } from "@/lib/domain";
import { CALIBRATION_RESULT_META, CALIBRATION_STATE_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Calibration, CalibrationState, Equipment } from "@/types/erd";
import { CalibrationCalendar } from "./calibration-calendar";
import { CalibrationFormSheet } from "./calibration-form-sheet";
import { CalibrationHistorySheet } from "./calibration-history-sheet";

interface Row {
  equipment: Equipment;
  state: CalibrationState;
  latest: Calibration | null;
}

type View = "table" | "calendar";
const VIEWS: { id: View; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Tabel", icon: Table2 },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
];

export function CalibrationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const can = useCan("calibration");
  const canCreate = can("create");

  const [view, setView] = useState<View>("table");
  const [formOpen, setFormOpen] = useState(params.get("action") === "create");
  const [formEquipment, setFormEquipment] = useState<string | undefined>();
  const [historyId, setHistoryId] = useState<string | null>(null);

  const equipment = useEquipmentList();
  const calibrations = useCalibrations();
  const isLoading = equipment.isLoading || calibrations.isLoading;
  const error = equipment.error ?? calibrations.error;
  const retry = () => { equipment.refetch(); calibrations.refetch(); };

  const rows = useMemo<Row[]>(() => {
    const latest = new Map<string, Calibration>();
    for (const c of calibrations.data ?? []) if (!latest.has(c.equipment_id)) latest.set(c.equipment_id, c); // list sudah urut terbaru
    // Alat tanpa program kalibrasi (tanpa jadwal) tidak masuk daftar jadwal.
    return (equipment.data ?? [])
      .map((e) => ({ equipment: e, state: getCalibrationState(e.next_calibration_date), latest: latest.get(e.equipment_id) ?? null }))
      .filter((r) => r.state !== "not_required");
  }, [equipment.data, calibrations.data]);

  const count = (s: CalibrationState) => rows.filter((r) => r.state === s).length;

  function openForm(equipmentId?: string) {
    setFormEquipment(equipmentId);
    setFormOpen(true);
  }
  function setForm(open: boolean) {
    setFormOpen(open);
    if (!open && params.get("action")) router.replace(pathname);
  }

  const columns = useMemo<ColumnDef<Row>[]>(() => [
    {
      id: "equipment", header: "Alat", accessorFn: (r) => `${r.equipment.equipment_name} ${r.equipment.inventory_code}`,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="max-w-56 truncate font-medium">{row.original.equipment.equipment_name}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.original.equipment.inventory_code}</p>
        </div>
      ),
    },
    {
      id: "next", header: "Kalibrasi berikutnya", accessorFn: (r) => r.equipment.next_calibration_date ?? "",
      sortingFn: (a, b) => (a.original.equipment.next_calibration_date ?? "").localeCompare(b.original.equipment.next_calibration_date ?? ""),
      cell: ({ row }) => <CalibrationDate date={row.original.equipment.next_calibration_date} />,
    },
    {
      id: "state", header: "Status", accessorFn: (r) => r.state,
      cell: ({ row }) => <MetaBadge meta={CALIBRATION_STATE_META[row.original.state]} />,
    },
    {
      id: "provider", header: "Penyedia", accessorFn: (r) => r.latest?.calibration_provider ?? "",
      cell: ({ row }) => <span className="block max-w-48 truncate">{row.original.latest?.calibration_provider ?? "—"}</span>,
    },
    {
      id: "certificate", header: "Sertifikat", accessorFn: (r) => r.latest?.certificate_number ?? "",
      cell: ({ row }) => {
        const c = row.original.latest;
        return c ? (
          <div>
            <p className="font-mono text-xs">{c.certificate_number}</p>
            <p className="text-xs text-muted-foreground">{format(parseISO(c.calibration_date), "d MMM yyyy", { locale: idLocale })}</p>
          </div>
        ) : "—";
      },
    },
    {
      id: "result", header: "Hasil", accessorFn: (r) => r.latest?.calibration_result ?? "none",
      cell: ({ row }) => row.original.latest ? <MetaBadge meta={CALIBRATION_RESULT_META[row.original.latest.calibration_result]} /> : <span className="text-muted-foreground">Belum ada</span>,
    },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => setHistoryId(row.original.equipment.equipment_id)}><History /> Riwayat</Button>
          {canCreate && <Button size="sm" onClick={() => openForm(row.original.equipment.equipment_id)}><ClipboardPlus /> Catat</Button>}
        </div>
      ),
    },
  ], [canCreate]);

  return (
    <>
      <PageHeader
        title="Kalibrasi" description="Pantau jadwal kalibrasi, catat hasil, dan unduh sertifikat."
        actions={canCreate ? <Button className="h-11 sm:h-10" onClick={() => openForm()}><ClipboardPlus /> Catat Kalibrasi</Button> : undefined}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard title="Aman" value={count("safe")} icon={CheckCircle2} tone="green" hint="Lebih dari 30 hari lagi" isLoading={isLoading} />
        <StatCard title="Mendekati jatuh tempo" value={count("due_soon")} icon={Timer} tone="yellow" hint="30 hari atau kurang" isLoading={isLoading} />
        <StatCard title="Terlambat" value={count("overdue")} icon={AlertTriangle} tone="red" hint="Termasuk yang belum pernah dikalibrasi" isLoading={isLoading} />
      </div>

      <div role="tablist" aria-label="Tampilan kalibrasi" className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1">
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
          columns={columns} data={rows} getRowId={(r) => r.equipment.equipment_id}
          isLoading={isLoading} error={error} onRetry={retry}
          searchPlaceholder="Cari alat, kode, penyedia, sertifikat…"
          filters={[
            { columnId: "state", label: "Status", options: (Object.keys(CALIBRATION_STATE_META) as CalibrationState[]).filter((s) => s !== "not_required").map((s) => ({ value: s, label: CALIBRATION_STATE_META[s].label })) },
            { columnId: "result", label: "Hasil", options: [{ value: "passed", label: "Lulus" }, { value: "failed", label: "Gagal" }, { value: "none", label: "Belum ada" }] },
          ]}
          onRowClick={(r) => setHistoryId(r.equipment.equipment_id)}
          emptyTitle="Belum ada alat" emptyDescription="Tambahkan alat di menu Equipment untuk mulai memantau kalibrasi."
        />
      ) : (
        <CalibrationCalendar
          equipment={equipment.data ?? []} isLoading={isLoading} error={error} onRetry={retry}
          canCreate={canCreate} onRecord={openForm} onHistory={setHistoryId}
        />
      )}

      <CalibrationHistorySheet equipmentId={historyId} onClose={() => setHistoryId(null)} />
      {canCreate && <CalibrationFormSheet open={formOpen} onOpenChange={setForm} equipmentId={formEquipment} />}
    </>
  );
}
