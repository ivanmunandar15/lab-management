"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowLeft, FileText, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { ErrorState } from "@/components/features/common/error-state";
import { ConditionBadge, StatusBadge } from "@/components/features/common/status-badge";
import { useEquipment, useRestoreEquipment, useRoom, useSoftDeleteEquipment } from "@/hooks";
import { getRemainingUsefulLife } from "@/lib/domain";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { qrUrl } from "@/lib/qr";
import { CalibrationDate } from "./calibration-date";
import { LogbookExportDialog } from "./logbook-export-dialog";
import { BorrowingTab, CalibrationTab, DocumentsTab, MaintenanceTab } from "./equipment-tabs";
import { QrCard } from "./qr-card";
import { useCan } from "./use-can";
import type { Equipment } from "@/types/erd";

const TABS = [
  { id: "info", label: "Info & Spesifikasi" },
  { id: "borrowing", label: "Riwayat Peminjaman" },
  { id: "calibration", label: "Kalibrasi" },
  { id: "maintenance", label: "Maintenance" },
  { id: "documents", label: "Dokumen" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const fmtDate = (s: string | null) => (s ? format(parseISO(s), "d MMMM yyyy", { locale: idLocale }) : "—");

function InfoGrid({ e }: { e: Equipment }) {
  const { data: room } = useRoom(e.room_id);
  const life = getRemainingUsefulLife(e);
  const age = e.purchase_date ? Math.max(0, Math.floor((Date.now() - parseISO(e.purchase_date).getTime()) / (365.25 * 86_400_000) * 10) / 10) : null;
  const rows: [string, React.ReactNode][] = [
    ["Kode inventaris", <span key="c" className="font-mono">{e.inventory_code}</span>],
    ["Jenis", e.equipment_type],
    ["Merek / Model", `${e.brand} ${e.model}`],
    ["Ruangan", room ? `${room.room_code} — ${room.room_name}` : "—"],
    ["Kondisi", <ConditionBadge key="k" condition={e.condition} />],
    ["Tanggal pembelian", fmtDate(e.purchase_date)],
    ["Harga beli", e.purchase_price == null ? "—" : formatRupiah(e.purchase_price)],
    ["Kalibrasi berikutnya", <CalibrationDate key="cal" date={e.next_calibration_date} />],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Informasi alat</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 text-sm font-medium">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-6">
            <h3 className="text-xs text-muted-foreground">Spesifikasi</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{e.specifications || "Belum ada spesifikasi."}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Umur pakai</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Umur saat ini</p>
            <p className="text-lg font-semibold">{age == null ? "—" : `${age} tahun`}</p>
          </div>
          {life ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Sisa masa pakai (dari {e.useful_life_years} tahun)</p>
                <p className={cn("text-lg font-semibold", life.is_expired && "text-destructive")}>
                  {life.is_expired ? "Masa pakai habis" : `${life.years} th ${life.months} bln`}
                </p>
                <p className="text-xs text-muted-foreground">Berakhir {fmtDate(life.end_of_life_date)}</p>
              </div>
              <div>
                <div role="progressbar" aria-label="Sisa masa pakai" aria-valuenow={life.percent_remaining} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full", life.percent_remaining > 30 ? "bg-green-600" : life.percent_remaining > 10 ? "bg-yellow-500" : "bg-red-600")} style={{ width: `${life.percent_remaining}%` }} />
                </div>
                <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{life.percent_remaining}% tersisa</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sisa masa pakai tidak dapat dihitung: tanggal pembelian atau masa manfaat belum diisi.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function EquipmentDetail({ id }: { id: string }) {
  const router = useRouter();
  const can = useCan("equipment");
  const { data: e, isLoading, error, refetch } = useEquipment(id);
  const softDelete = useSoftDeleteEquipment();
  const restore = useRestoreEquipment();
  const [tab, setTab] = useState<TabId>("info");
  const [confirm, setConfirm] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !e) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/equipment"><ArrowLeft /> Kembali ke daftar</Link></Button>

      {!e.is_active && (
        <p role="status" className="rounded-md border border-slate-300 bg-slate-100 p-3 text-sm text-slate-800 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200">
          Alat ini sudah dinonaktifkan dan disembunyikan dari daftar.
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{e.equipment_name}</h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{e.inventory_code}</p>
            </div>
            <StatusBadge status={e.status} />
            <p className="break-all text-xs text-muted-foreground">{qrUrl("eq", e.qr_token)}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setLogbookOpen(true)}><FileText /> Log Book</Button>
              {can("update") && <Button asChild variant="outline" size="sm"><Link href={`/equipment/${e.equipment_id}/edit`}><Pencil /> Edit</Link></Button>}
              {can("delete") && (e.is_active
                ? <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirm(true)}><Trash2 /> Nonaktifkan</Button>
                : <Button variant="outline" size="sm" onClick={() => restore.mutate(e.equipment_id, { onSuccess: () => toast.success("Alat diaktifkan kembali") })}><RotateCcw /> Aktifkan kembali</Button>)}
            </div>
          </div>
          <QrCard equipment={e} />
        </CardContent>
      </Card>

      <div role="tablist" aria-label="Detail alat" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}
            onKeyDown={(ev) => {
              const i = TABS.findIndex((x) => x.id === tab);
              if (ev.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
              if (ev.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
            }}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "info" && <InfoGrid e={e} />}
        {tab === "borrowing" && <BorrowingTab equipmentId={e.equipment_id} />}
        {tab === "calibration" && <CalibrationTab equipmentId={e.equipment_id} />}
        {tab === "maintenance" && <MaintenanceTab equipmentId={e.equipment_id} />}
        {tab === "documents" && <DocumentsTab equipmentId={e.equipment_id} />}
      </div>

      <ConfirmDialog
        open={confirm} onOpenChange={setConfirm} variant="destructive"
        title={`Nonaktifkan "${e.equipment_name}"?`}
        description="Alat disembunyikan dari daftar dan QR-nya akan menampilkan “alat sudah dinonaktifkan”. Data tidak dihapus permanen."
        confirmLabel="Nonaktifkan"
        onConfirm={async () => {
          try { await softDelete.mutateAsync(e.equipment_id); toast.success("Alat dinonaktifkan"); router.push("/equipment"); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan alat"); }
        }}
      />
      <LogbookExportDialog open={logbookOpen} onOpenChange={setLogbookOpen} equipment={[e]} />
    </div>
  );
}
