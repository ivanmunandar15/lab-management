"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowLeft, FileText, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { ConditionBadge, StatusBadge } from "@/components/features/common/status-badge";
import { LogbookExportDialog } from "@/components/features/equipment/logbook-export-dialog";
import { QrCard } from "@/components/features/equipment/qr-card";
import { useCan } from "@/components/features/equipment/use-can";
import { useBorrowings, useRestoreSupportingEquipment, useSoftDeleteSupportingEquipment, useSupportingEquipment, useUsers } from "@/hooks";
import { qrUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { StockBar } from "./stock-bar";
import type { BorrowingWithDetails, SupportingEquipment } from "@/types/erd";

const TABS = [
  { id: "info", label: "Info & Spesifikasi" },
  { id: "current", label: "Sedang Digunakan" },
  { id: "history", label: "Riwayat Penggunaan" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const dt = (iso: string) => format(new Date(iso), "d MMM yyyy HH:mm", { locale: idLocale });
const Th = ({ children }: { children: React.ReactNode }) => <th className="whitespace-nowrap p-3 text-left text-xs font-medium text-muted-foreground">{children}</th>;

function useItemBorrowings(itemId: string) {
  const q = useBorrowings({ supporting_equipment_id: itemId });
  const { data: users = [] } = useUsers({ includeInactive: true });
  const name = (id: string) => users.find((u) => u.user_id === id)?.name ?? "—";
  const rows = (q.data ?? []).map((b) => {
    const line = b.supporting_details.find((d) => d.supporting_equipment_id === itemId)!;
    return { b, line, outstanding: b.borrowing_status === "borrowed" ? Math.max(0, line.quantity_borrowed - line.quantity_returned) : 0 };
  });
  return { q, rows, name };
}

function InfoTab({ s }: { s: SupportingEquipment }) {
  const rows: [string, React.ReactNode][] = [
    ["Kode item", <span key="c" className="font-mono">{s.item_code}</span>],
    ["Jenis", s.item_type || "—"],
    ["Merek / Model", `${s.brand} ${s.model}`.trim() || "—"],
    ["Satuan", s.unit || "—"],
    ["Kondisi", <ConditionBadge key="k" condition={s.condition} />],
    ["Dibuat", format(new Date(s.created_at), "d MMMM yyyy", { locale: idLocale })],
  ];
  const borrowed = s.total_quantity - s.available_quantity;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Informasi item</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 text-sm font-medium">{v}</dd></div>)}
          </dl>
          <div className="mt-6"><h3 className="text-xs text-muted-foreground">Deskripsi</h3><p className="mt-1 whitespace-pre-wrap text-sm">{s.description || "—"}</p></div>
          <div className="mt-4"><h3 className="text-xs text-muted-foreground">Spesifikasi</h3><p className="mt-1 whitespace-pre-wrap text-sm">{s.specifications || "—"}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Stok</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <StockBar available={s.available_quantity} total={s.total_quantity} unit={s.unit} />
          <dl className="grid grid-cols-3 gap-2 pt-2 text-center">
            {[["Total", s.total_quantity], ["Tersedia", s.available_quantity], ["Digunakan", borrowed]].map(([k, v]) => (
              <div key={k} className="rounded-md bg-muted p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function CurrentTab({ s }: { s: SupportingEquipment }) {
  const { q, rows, name } = useItemBorrowings(s.supporting_equipment_id);
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  if (q.error) return <ErrorState onRetry={() => q.refetch()} />;
  const current = rows.filter((r) => r.outstanding > 0);
  const total = current.reduce((n, r) => n + r.outstanding, 0);
  if (current.length === 0) return <EmptyState title="Tidak ada yang sedang digunakan" description="Semua unit item ini sedang berada di lab." />;
  return (
    <div className="space-y-3">
      <p className="text-sm"><strong className="tabular-nums">{total} {s.unit}</strong> sedang digunakan oleh {current.length} pengguna.</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><Th>Pengguna</Th><Th>Jumlah</Th><Th>Digunakan</Th><Th>Batas kembali</Th><Th>Status</Th></tr></thead>
          <tbody>
            {current.map(({ b, outstanding }) => (
              <tr key={b.borrowing_id} className="border-t">
                <td className="p-3 font-medium">{name(b.user_id)}</td>
                <td className="p-3 tabular-nums">{outstanding} {s.unit}</td>
                <td className="p-3">{dt(b.borrowing_time)}</td>
                <td className="p-3">{dt(b.expected_return_time)}</td>
                <td className="p-3"><StatusBadge status={b.display_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTab({ s }: { s: SupportingEquipment }) {
  const { q, rows, name } = useItemBorrowings(s.supporting_equipment_id);
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  if (q.error) return <ErrorState onRetry={() => q.refetch()} />;
  if (rows.length === 0) return <EmptyState title="Belum pernah digunakan" description="Riwayat penggunaan item ini akan tampil di sini." />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50"><tr><Th>Pengguna</Th><Th>Digunakan</Th><Th>Dikembalikan</Th><Th>Jumlah</Th><Th>Tujuan</Th><Th>Status</Th></tr></thead>
        <tbody>
          {rows.map(({ b, line }) => (
            <tr key={b.borrowing_id} className="border-t align-top">
              <td className="p-3 font-medium">{name(b.user_id)}</td>
              <td className="p-3">{dt(b.borrowing_time)}</td>
              <td className="p-3">{b.actual_return_time ? dt(b.actual_return_time) : "—"}</td>
              <td className="p-3 tabular-nums">{line.quantity_returned}/{line.quantity_borrowed} {s.unit}{line.has_damage && <span className="ml-1 text-xs text-red-700 dark:text-red-400">(ada kerusakan)</span>}</td>
              <td className="p-3">{b.purpose}</td>
              <td className="p-3"><StatusBadge status={(b as BorrowingWithDetails).display_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SupportingDetail({ id }: { id: string }) {
  const router = useRouter();
  const can = useCan("supporting_equipment");
  const { data: s, isLoading, error, refetch } = useSupportingEquipment(id);
  const softDelete = useSoftDeleteSupportingEquipment();
  const restore = useRestoreSupportingEquipment();
  const [tab, setTab] = useState<TabId>("info");
  const [confirm, setConfirm] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !s) return <ErrorState onRetry={() => refetch()} />;
  const qrItem = { qr_token: s.qr_token, inventory_code: s.item_code, equipment_name: s.item_name };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/supporting-equipment"><ArrowLeft /> Kembali ke daftar</Link></Button>
      {!s.is_active && <p role="status" className="rounded-md border border-slate-300 bg-slate-100 p-3 text-sm text-slate-800 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200">Item ini sudah dinonaktifkan dan disembunyikan dari daftar.</p>}

      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div><h1 className="text-2xl font-semibold tracking-tight">{s.item_name}</h1><p className="mt-1 font-mono text-sm text-muted-foreground">{s.item_code}</p></div>
            <StatusBadge status={s.status} />
            <StockBar available={s.available_quantity} total={s.total_quantity} unit={s.unit} className="max-w-xs" />
            <p className="break-all text-xs text-muted-foreground">QR jenis item: {qrUrl("sp", s.qr_token)}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setLogbookOpen(true)}><FileText /> Log Book</Button>
              {can("update") && <Button asChild variant="outline" size="sm"><Link href={`/supporting-equipment/${s.supporting_equipment_id}/edit`}><Pencil /> Edit</Link></Button>}
              {can("delete") && (s.is_active
                ? <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirm(true)}><Trash2 /> Nonaktifkan</Button>
                : <Button variant="outline" size="sm" onClick={() => restore.mutate(s.supporting_equipment_id, { onSuccess: () => toast.success("Item diaktifkan kembali") })}><RotateCcw /> Aktifkan kembali</Button>)}
            </div>
          </div>
          <QrCard equipment={qrItem} type="sp" />
        </CardContent>
      </Card>

      <div role="tablist" aria-label="Detail item" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}
            onKeyDown={(ev) => {
              const i = TABS.findIndex((x) => x.id === tab);
              if (ev.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
              if (ev.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
            }}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "info" && <InfoTab s={s} />}
        {tab === "current" && <CurrentTab s={s} />}
        {tab === "history" && <HistoryTab s={s} />}
      </div>

      <LogbookExportDialog open={logbookOpen} onOpenChange={setLogbookOpen} supporting={[s]} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} variant="destructive"
        title={`Nonaktifkan "${s.item_name}"?`}
        description="Item disembunyikan dari daftar dan QR-nya akan menampilkan “item sudah dinonaktifkan”. Data tidak dihapus permanen."
        confirmLabel="Nonaktifkan"
        onConfirm={async () => {
          try { await softDelete.mutateAsync(s.supporting_equipment_id); toast.success("Item dinonaktifkan"); router.push("/supporting-equipment"); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan item"); }
        }} />
    </div>
  );
}
