"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CheckCircle2, Microscope, Package } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/features/common/error-state";
import { ConditionBadge, StatusBadge } from "@/components/features/common/status-badge";
import { InfoRow } from "@/components/features/scan/scan-parts";
import { useBorrowing, useEquipmentList, useSupportingEquipmentList, useUsers } from "@/hooks";
import { canReturnBorrowing } from "@/lib/borrowing-rules";
import { formatRemaining } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Condition } from "@/types/erd";
import { ReturnBorrowingSheet } from "./return-sheet";

const dt = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: idLocale });
const LABEL_TO_CONDITION: Record<string, Condition> = { Baik: "good", "Rusak ringan": "minor_damage", "Rusak berat": "major_damage" };

/** Detail penggunaan: semua alat dan item pendukung + aksi pengembalian (sesuai aturan akses). */
export function BorrowingDetailSheet({ borrowingId, onClose }: { borrowingId: string | null; onClose: () => void }) {
  const { data: session } = useSession();
  const user = session?.user ? { id: session.user.id, role: session.user.role } : undefined;
  const q = useBorrowing(borrowingId ?? undefined);
  const users = useUsers({ includeInactive: true });
  const equipment = useEquipmentList({ includeInactive: true });
  const supporting = useSupportingEquipmentList({ includeInactive: true });
  const [ret, setRet] = useState<{ only?: { kind: "eq" | "sp"; detail_id: string } } | null>(null);

  const b = q.data;
  const outstandingEq = b?.equipment_details.filter((d) => d.final_condition === null) ?? [];
  const outstandingSp = b?.supporting_details.filter((d) => d.quantity_returned < d.quantity_borrowed) ?? [];
  const outstanding = outstandingEq.length + outstandingSp.length;
  const mayReturn = !!b && canReturnBorrowing(user, b);
  const remaining = b && b.borrowing_status === "borrowed" ? formatRemaining(b.expected_return_time) : null;

  return (
    <>
      <BottomSheet
        open={!!borrowingId} onOpenChange={(o) => !o && onClose()} size="lg"
        title="Detail Penggunaan" description={b ? `Digunakan oleh ${users.data?.find((u) => u.user_id === b.user_id)?.name ?? "—"}` : "Memuat data…"}
        footer={b && b.borrowing_status === "borrowed" ? (
          mayReturn ? (
            <Button className="h-12 w-full text-base sm:h-10 sm:text-sm" disabled={outstanding === 0} onClick={() => setRet({})}>Kembalikan semua ({outstanding})</Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Hanya pengguna, admin, atau SPV yang dapat menyelesaikan pengembalian.</p>
          )
        ) : undefined}
      >
        {q.isLoading && <div className="space-y-3 py-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {q.error && <ErrorState onRetry={() => q.refetch()} />}
        {b && (
          <div className="space-y-4 pb-2">
            <dl className="divide-y rounded-lg border px-3">
              <InfoRow label="Status"><StatusBadge status={b.display_status} /></InfoRow>
              <InfoRow label="Tujuan">{b.purpose}</InfoRow>
              <InfoRow label="Lokasi">{b.usage_location}</InfoRow>
              <InfoRow label="Mulai digunakan">{dt(b.borrowing_time)}</InfoRow>
              <InfoRow label="Batas kembali">
                <span className={cn(remaining?.overdue && "text-red-700 dark:text-red-400")}>
                  {dt(b.expected_return_time)}
                  {remaining && <span className="block text-xs font-semibold">{remaining.label}</span>}
                </span>
              </InfoRow>
              {b.actual_return_time && <InfoRow label="Dikembalikan">{dt(b.actual_return_time)}</InfoRow>}
              {b.notes && <InfoRow label="Catatan">{b.notes}</InfoRow>}
            </dl>

            <section aria-label="Daftar item" className="space-y-2">
              <h3 className="text-sm font-semibold">Item ({b.equipment_details.length + b.supporting_details.length})</h3>
              <ul className="divide-y rounded-lg border">
                {b.equipment_details.map((d) => {
                  const e = equipment.data?.find((x) => x.equipment_id === d.equipment_id);
                  const back = d.final_condition !== null;
                  const cond = d.final_condition ? LABEL_TO_CONDITION[d.final_condition] : undefined;
                  return (
                    <li key={d.detail_id} className="flex items-center gap-3 p-3">
                      <Microscope className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e?.equipment_name ?? "Alat"}</p>
                        <p className="text-xs text-muted-foreground"><span className="font-mono">{e?.inventory_code}</span> • Awal: {d.initial_condition}</p>
                        {d.has_damage && d.damage_notes && <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">Rusak: {d.damage_notes}</p>}
                      </div>
                      {back ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 className="size-4" aria-hidden="true" />{cond ? <ConditionBadge condition={cond} /> : "Kembali"}
                        </span>
                      ) : mayReturn && b.borrowing_status === "borrowed" ? (
                        <Button size="sm" variant="outline" className="h-9" onClick={() => setRet({ only: { kind: "eq", detail_id: d.detail_id } })}>Kembalikan</Button>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">Belum kembali</span>
                      )}
                    </li>
                  );
                })}
                {b.supporting_details.map((d) => {
                  const s = supporting.data?.find((x) => x.supporting_equipment_id === d.supporting_equipment_id);
                  const left = d.quantity_borrowed - d.quantity_returned;
                  return (
                    <li key={d.supporting_detail_id} className="flex items-center gap-3 p-3">
                      <Package className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s?.item_name ?? "Item pendukung"}</p>
                        <p className="text-xs text-muted-foreground"><span className="font-mono">{s?.item_code}</span> • Kembali {d.quantity_returned}/{d.quantity_borrowed} {s?.unit}</p>
                        {d.has_damage && d.damage_notes && <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">Rusak: {d.damage_notes}</p>}
                      </div>
                      {left === 0 ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400"><CheckCircle2 className="size-4" aria-hidden="true" />Kembali</span>
                      ) : mayReturn && b.borrowing_status === "borrowed" ? (
                        <Button size="sm" variant="outline" className="h-9" onClick={() => setRet({ only: { kind: "sp", detail_id: d.supporting_detail_id } })}>Kembalikan</Button>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">Sisa {left}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </BottomSheet>
      <ReturnBorrowingSheet open={!!ret} onOpenChange={(o) => !o && setRet(null)} borrowing={b} only={ret?.only} />
    </>
  );
}
