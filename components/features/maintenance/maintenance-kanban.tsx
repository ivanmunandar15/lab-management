"use client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/features/common/error-state";
import { MetaBadge } from "@/components/features/common/status-badge";
import { formatRupiah } from "@/lib/format";
import { MAINTENANCE_STATUS_META, MAINTENANCE_TYPE_LABEL, toneDotClass } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Maintenance, MaintenanceStatus } from "@/types/erd";
import { MaintenanceActionButtons } from "./maintenance-shared";

const COLUMNS: MaintenanceStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];

interface Props {
  rows: Maintenance[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  equipmentName: (id: string) => string;
  userName: (id: string) => string;
  canUpdate: boolean;
  onChangeStatus: (m: Maintenance, next: MaintenanceStatus) => void;
  onEdit: (m: Maintenance) => void;
}

export function MaintenanceKanban({ rows, isLoading, error, onRetry, equipmentName, userName, canUpdate, onChangeStatus, onEdit }: Props) {
  if (error) return <Card><ErrorState onRetry={onRetry} /></Card>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy={isLoading || undefined}>
      {COLUMNS.map((status) => {
        const meta = MAINTENANCE_STATUS_META[status];
        const items = rows.filter((m) => m.status === status);
        return (
          <section key={status} aria-label={meta.label} className="flex min-h-40 flex-col rounded-lg border bg-muted/30">
            <header className="flex items-center gap-2 border-b px-3 py-2.5">
              <span className={cn("size-2.5 rounded-full", toneDotClass(meta.tone))} aria-hidden="true" />
              <h2 className="text-sm font-semibold">{meta.label}</h2>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{isLoading ? "…" : items.length}</span>
            </header>
            <ul className="flex-1 space-y-2 p-2">
              {isLoading ? [0, 1].map((i) => <li key={i}><Skeleton className="h-28 w-full" /></li>)
                : items.length === 0 ? <li className="px-2 py-6 text-center text-sm text-muted-foreground">Tidak ada maintenance</li>
                : items.map((m) => (
                  <li key={m.maintenance_id}>
                    <Card className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-sm font-medium">{equipmentName(m.equipment_id)}</p>
                        <MetaBadge meta={{ label: MAINTENANCE_TYPE_LABEL[m.maintenance_type], tone: m.maintenance_type === "repair" ? "red" : "slate" }} />
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(m.maintenance_date), "d MMM yyyy, HH:mm", { locale: idLocale })} • {userName(m.technician_id)}
                        {m.cost > 0 && <> • {formatRupiah(m.cost)}</>}
                      </p>
                      <MaintenanceActionButtons status={m.status} canUpdate={canUpdate} onChange={(n) => onChangeStatus(m, n)} onEdit={() => onEdit(m)} />
                    </Card>
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
