"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/features/common/status-badge";
import { useActiveBorrowings } from "@/hooks/use-dashboard";
import { useNow } from "@/hooks/use-now";
import { formatRemaining } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardPanel } from "./panel";

const MAX_ROWS = 6;

export function BorrowingsPanel({ currentUserId }: { currentUserId: string }) {
  const { data, isLoading, isError, refetch } = useActiveBorrowings();
  const now = useNow();
  const shown = data?.items.slice(0, MAX_ROWS) ?? [];
  const rest = (data?.items.length ?? 0) - shown.length;

  return (
    <DashboardPanel
      title="Peminjaman aktif"
      description={
        data ? (
          <>
            {data.active_count} aktif ·{" "}
            <span className={cn(data.overdue_count > 0 && "font-medium text-destructive")}>{data.overdue_count} terlambat</span>
          </>
        ) : "Peminjaman yang belum dikembalikan."
      }
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/borrowing">Buka peminjaman <ArrowRight /></Link>
        </Button>
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={data?.items.length === 0}
      empty={{ icon: ClipboardList, title: "Tidak ada peminjaman aktif", description: "Semua alat sudah dikembalikan." }}
      skeletonRows={5}
    >
      <ul className="space-y-2">
        {shown.map((b) => {
          const r = formatRemaining(b.expected_return_time, now);
          const first = b.equipment_names[0] ?? `${b.supporting_count} alat pendukung`;
          const more = b.equipment_names.length - 1;
          return (
            <li
              key={b.borrowing_id}
              className={cn("rounded-md border border-l-4 px-3 py-2", b.is_overdue ? "border-l-destructive bg-destructive/5" : "border-l-blue-500")}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">
                  {first}
                  {more > 0 && <span className="font-normal text-muted-foreground"> +{more} alat</span>}
                </p>
                <StatusBadge status={b.is_overdue ? "overdue" : "borrowed"} className="shrink-0" />
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1">
                  <User className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{b.user_name}{b.user_id === currentUserId && " (Anda)"}</span>
                  <MapPin className="ml-2 size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{b.usage_location}</span>
                </span>
                <span className={cn("font-medium", r.overdue ? "text-destructive" : r.urgent ? "text-yellow-700 dark:text-yellow-400" : "text-foreground")}>
                  {r.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {rest > 0 && <p className="mt-3 text-center text-xs text-muted-foreground">+{rest} peminjaman lainnya</p>}
    </DashboardPanel>
  );
}
