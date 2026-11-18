"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/features/common/page-header";
import { DataTable } from "@/components/features/common/data-table";
import { StatusBadge } from "@/components/features/common/status-badge";
import { useBorrowings, useEquipmentList, useSupportingEquipmentList, useUsers } from "@/hooks";
import { useNow } from "@/hooks/use-now";
import { can } from "@/lib/rbac";
import { formatRemaining } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BorrowingWithDetails } from "@/types/erd";
import { BorrowingDetailSheet } from "./borrowing-detail-sheet";
import { NewBorrowingWizard } from "./new-borrowing-wizard";

type TabId = "active" | "overdue" | "done" | "all";
const TABS: { id: TabId; label: string; match: (b: BorrowingWithDetails) => boolean; empty: string }[] = [
  { id: "active", label: "Aktif", match: (b) => b.borrowing_status === "borrowed", empty: "Tidak ada penggunaan aktif" },
  { id: "overdue", label: "Terlambat", match: (b) => b.display_status === "overdue", empty: "Tidak ada penggunaan terlambat" },
  { id: "done", label: "Selesai", match: (b) => b.borrowing_status === "returned", empty: "Belum ada penggunaan selesai" },
  { id: "all", label: "Semua", match: () => true, empty: "Belum ada penggunaan" },
];
const dt = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: idLocale });

export function BorrowingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: session } = useSession();
  const canCreate = can(session?.user?.role, "borrowing", "create");
  const now = useNow();

  const [tab, setTab] = useState<TabId>("active");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(params.get("action") === "create");

  const list = useBorrowings();
  const users = useUsers({ includeInactive: true });
  useEquipmentList({ includeInactive: true });
  useSupportingEquipmentList({ includeInactive: true });

  const rows = list.data ?? [];
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, rows.filter(t.match).length])) as Record<TabId, number>, [rows]);
  const current = TABS.find((t) => t.id === tab)!;
  const data = useMemo(() => rows.filter(current.match), [rows, current]);
  const nameOf = (id: string) => users.data?.find((u) => u.user_id === id)?.name ?? "—";

  const columns = useMemo<ColumnDef<BorrowingWithDetails>[]>(() => [
    { id: "borrower", header: "Pengguna", accessorFn: (b) => nameOf(b.user_id), cell: ({ row }) => <span className="font-medium">{nameOf(row.original.user_id)}</span> },
    {
      id: "items", header: "Item", enableSorting: false,
      accessorFn: (b) => `${b.purpose} ${b.usage_location}`,
      cell: ({ row }) => {
        const b = row.original;
        const parts = [b.equipment_details.length > 0 && `${b.equipment_details.length} alat`, b.supporting_details.length > 0 && `${b.supporting_details.length} item pendukung`].filter(Boolean);
        return <div><p className="max-w-56 truncate">{b.purpose}</p><p className="text-xs text-muted-foreground">{parts.join(" • ")} • {b.usage_location}</p></div>;
      },
    },
    { accessorKey: "borrowing_time", header: "Digunakan", cell: ({ row }) => <span className="whitespace-nowrap">{dt(row.original.borrowing_time)}</span> },
    {
      accessorKey: "expected_return_time", header: "Batas kembali",
      cell: ({ row }) => {
        const b = row.original;
        const r = b.borrowing_status === "borrowed" ? formatRemaining(b.expected_return_time, now) : null;
        return (
          <div className={cn("whitespace-nowrap", r?.overdue && "text-red-700 dark:text-red-400")}>
            {dt(b.expected_return_time)}
            {r && <p className="text-xs font-semibold">{r.label}</p>}
          </div>
        );
      },
    },
    { id: "status", header: "Status", accessorFn: (b) => b.display_status, cell: ({ row }) => <StatusBadge status={row.original.display_status} /> },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailId(row.original.borrowing_id); }}>Detail</Button>,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [users.data, now]);

  function setWizard(open: boolean) {
    setWizardOpen(open);
    if (!open && params.get("action")) router.replace(pathname);
  }

  return (
    <>
      <PageHeader
        title="Penggunaan" description="Catat penggunaan dan pengembalian alat laboratorium."
        actions={canCreate ? <Button className="h-11 sm:h-10" onClick={() => setWizard(true)}><ClipboardPlus /> Penggunaan Baru</Button> : undefined}
      />

      <div role="tablist" aria-label="Filter penggunaan" className="mb-4 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="borrowing-panel" type="button"
            onClick={() => setTab(t.id)}
            className={cn("-mb-px flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", t.id === "overdue" && counts.overdue > 0 ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" : "bg-muted text-muted-foreground")}>
              {list.isLoading ? "…" : counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id="borrowing-panel" aria-labelledby={`tab-${tab}`}>
        <DataTable
          key={tab}
          columns={columns} data={data} getRowId={(b) => b.borrowing_id}
          isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()}
          searchPlaceholder="Cari pengguna, tujuan, lokasi…"
          onRowClick={(b) => setDetailId(b.borrowing_id)}
          emptyTitle={current.empty}
          emptyDescription={canCreate && tab !== "done" ? "Mulai dengan menekan “Penggunaan Baru” atau scan QR pada alat." : undefined}
          emptyAction={canCreate && tab !== "done" ? <Button onClick={() => setWizard(true)}><ClipboardPlus /> Penggunaan Baru</Button> : undefined}
        />
      </div>

      <BorrowingDetailSheet borrowingId={detailId} onClose={() => setDetailId(null)} />
      {canCreate && <NewBorrowingWizard open={wizardOpen} onOpenChange={setWizard} />}
    </>
  );
}
