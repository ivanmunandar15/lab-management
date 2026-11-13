"use client";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { endOfDay, format, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/features/common/data-table";
import { PageHeader } from "@/components/features/common/page-header";
import { useActivityLogs, useUsers } from "@/hooks";
import { describeActivity, ENTITY_LABEL } from "@/lib/activity-text";
import { exportActivityCsv } from "@/lib/export/activity-export";
import { LogDetailSheet } from "./log-detail-sheet";
import type { ActivityLog } from "@/types/erd";

const ENTITY_OPTIONS = { ...ENTITY_LABEL, session: "sesi" };
const ACTION_LABEL: Record<string, string> = {
  create: "Tambah", update: "Ubah", soft_delete: "Nonaktifkan", restore: "Aktifkan kembali",
  delete: "Hapus", return: "Kembalikan", report: "Lapor masalah", login: "Masuk",
};

export function ActivityLogPage() {
  const [userId, setUserId] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<ActivityLog | null>(null);
  const [filtered, setFiltered] = useState<ActivityLog[]>([]);

  const users = useUsers({ includeInactive: true });
  const allLogs = useActivityLogs();
  const logs = useActivityLogs({
    user_id: userId || undefined,
    entity_type: entity || undefined,
    action: action || undefined,
    from: from ? startOfDay(new Date(from)).toISOString() : undefined,
    to: to ? endOfDay(new Date(to)).toISOString() : undefined,
  });

  const nameOf = useMemo(() => {
    const m = new Map((users.data ?? []).map((u) => [u.user_id, u.name]));
    return (id: string) => m.get(id) ?? id;
  }, [users.data]);
  const actions = useMemo(() => Array.from(new Set((allLogs.data ?? []).map((l) => l.action))).sort(), [allLogs.data]);

  const columns = useMemo<ColumnDef<ActivityLog>[]>(() => [
    {
      accessorKey: "created_at", header: "Waktu",
      cell: ({ getValue }) => <span className="whitespace-nowrap">{format(new Date(getValue<string>()), "d MMM yyyy, HH:mm", { locale: idLocale })}</span>,
    },
    { id: "user", header: "Pengguna", accessorFn: (l) => nameOf(l.user_id), cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
    { id: "activity", header: "Aktivitas", accessorFn: (l) => describeActivity(l.action, l.entity_type) },
    { accessorKey: "entity_id", header: "ID Entitas", cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: "ip_address", header: "IP", cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
  ], [nameOf]);

  const hasFilter = !!(userId || entity || action || from || to);
  const reset = () => { setUserId(""); setEntity(""); setAction(""); setFrom(""); setTo(""); };
  const sel = "h-10 w-full text-sm";

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="Jejak perubahan data oleh pengguna. Log bersifat baca-saja dan tidak dapat diubah atau dihapus."
        actions={
          <Button variant="outline" disabled={filtered.length === 0} onClick={() => exportActivityCsv(filtered, nameOf)}>
            <Download /> Ekspor CSV ({filtered.length})
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5"><Label htmlFor="log-user">Pengguna</Label>
          <NativeSelect id="log-user" className={sel} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Semua</option>
            {(users.data ?? []).map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
          </NativeSelect></div>
        <div className="space-y-1.5"><Label htmlFor="log-entity">Entitas</Label>
          <NativeSelect id="log-entity" className={sel} value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">Semua</option>
            {Object.entries(ENTITY_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </NativeSelect></div>
        <div className="space-y-1.5"><Label htmlFor="log-action">Aksi</Label>
          <NativeSelect id="log-action" className={sel} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Semua</option>
            {actions.map((a) => <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>)}
          </NativeSelect></div>
        <div className="space-y-1.5"><Label htmlFor="log-from">Dari tanggal</Label>
          <Input id="log-from" type="date" className={sel} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="log-to">Sampai tanggal</Label>
          <Input id="log-to" type="date" className={sel} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end"><Button variant="ghost" className="h-10 w-full" disabled={!hasFilter} onClick={reset}>Reset filter</Button></div>
      </div>
      <DataTable
        columns={columns}
        data={logs.data ?? []}
        getRowId={(l) => l.log_id}
        isLoading={logs.isLoading}
        error={logs.error}
        onRetry={() => logs.refetch()}
        onRowClick={setSelected}
        onFilteredChange={setFiltered}
        searchPlaceholder="Cari pengguna, aktivitas, atau ID…"
        emptyTitle={hasFilter ? "Tidak ada aktivitas yang cocok" : "Belum ada aktivitas"}
        emptyDescription={hasFilter ? "Coba ubah atau reset filter." : "Aktivitas pengguna akan tercatat di sini."}
      />
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Klik baris untuk melihat perubahan data sebelum dan sesudah.</p>
      <LogDetailSheet log={selected} userName={selected ? nameOf(selected.user_id) : ""} onClose={() => setSelected(null)} />
    </>
  );
}
