"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/features/common/error-state";
import { ConditionBadge, StatusBadge } from "@/components/features/common/status-badge";
import { BorrowSheet } from "@/components/features/borrowing/borrow-sheet";
import { ReturnBorrowingSheet } from "@/components/features/borrowing/return-sheet";
import { Banner, InactiveNotice, InfoRow, ScanBackLink, ScanSkeleton, UnknownQr } from "@/components/features/scan/scan-parts";
import { useBorrowings, useSupportingEquipmentByQrToken } from "@/hooks";
import { useNow } from "@/hooks/use-now";
import { getSupportingBorrowBlock } from "@/lib/borrowing-rules";
import { formatRemaining } from "@/lib/format";
import { ServiceError } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { BorrowingWithDetails } from "@/types/erd";
import { StockBar } from "./stock-bar";

const dt = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: idLocale });
const BIG = "h-auto min-h-14 w-full whitespace-normal py-3 text-base font-semibold";

/** Tujuan QR: /scan/sp/[token]. QR mewakili jenis item; stok dibaca dari data layer saat ini. */
export function SupportingScanResult({ token }: { token: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const now = useNow(30_000);
  const q = useSupportingEquipmentByQrToken(token);
  const s = q.data;
  const loans = useBorrowings(s && userId ? { user_id: userId, supporting_equipment_id: s.supporting_equipment_id } : undefined, { enabled: !!s && !!userId, staleTime: 0 });

  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returning, setReturning] = useState<{ borrowing: BorrowingWithDetails; detailId: string } | null>(null);

  if (q.isLoading) return <ScanSkeleton />;
  if (q.error instanceof ServiceError && q.error.code === "NOT_FOUND") return <UnknownQr />;
  if (q.error || !s) return <ErrorState onRetry={() => q.refetch()} />;

  if (!s.is_active) {
    return (
      <InactiveNotice
        title="Item sudah dinonaktifkan"
        description={`${s.item_name} (${s.item_code}) tidak lagi digunakan dan tidak dapat dipinjam.`}
        href={`/supporting-equipment/${s.supporting_equipment_id}`} linkLabel="Lihat riwayat item"
      />
    );
  }

  const block = getSupportingBorrowBlock(s);
  // Pinjaman aktif milik user untuk item ini (masih ada sisa yang belum dikembalikan).
  const myLoans = (loans.data ?? [])
    .filter((b) => b.borrowing_status === "borrowed")
    .flatMap((b) => b.supporting_details
      .filter((d) => d.supporting_equipment_id === s.supporting_equipment_id && d.quantity_returned < d.quantity_borrowed)
      .map((d) => ({ b, d, remaining: d.quantity_borrowed - d.quantity_returned })));

  return (
    <div className="mx-auto w-full max-w-md">
      <ScanBackLink />
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true"><Package className="size-8" /></span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight">{s.item_name}</h1>
              <p className="font-mono text-sm text-muted-foreground">{s.item_code}</p>
              <p className="mt-1 text-sm text-muted-foreground">{[s.item_type, s.brand].filter(Boolean).join(" • ")}</p>
            </div>
          </div>

          <StatusBadge status={s.status} className="px-4 py-1.5 text-base" />

          <div className="rounded-lg border p-3">
            <p className="mb-1 text-sm font-medium">Stok tersedia</p>
            <StockBar available={s.available_quantity} total={s.total_quantity} unit={s.unit} />
          </div>
          <dl className="divide-y rounded-lg border px-3"><InfoRow label="Kondisi"><ConditionBadge condition={s.condition} /></InfoRow></dl>

          {s.status === "damaged" && <Banner tone="danger" title="Item rusak">Item ini tidak dapat dipinjam sampai kondisinya diperbaiki.</Banner>}

          <Button className={BIG} disabled={!!block} onClick={() => setBorrowOpen(true)}>
            {block ? `Tidak dapat dipinjam: ${block}` : "Pinjam"}
          </Button>

          {myLoans.length > 0 && (
            <section aria-label="Pinjaman aktif Anda" className="space-y-2">
              <h2 className="text-sm font-semibold">Pinjaman aktif Anda</h2>
              <ul className="space-y-2">
                {myLoans.map(({ b, d, remaining }) => {
                  const r = formatRemaining(b.expected_return_time, now);
                  return (
                    <li key={d.supporting_detail_id} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <p className="font-semibold">{remaining} {s.unit} belum dikembalikan</p>
                          <p className="text-xs text-muted-foreground">Dipinjam {dt(b.borrowing_time)}</p>
                        </div>
                        <p className={cn("text-right text-xs font-semibold", r.overdue && "text-red-700 dark:text-red-400")}>{r.label}</p>
                      </div>
                      <Button variant="outline" className="h-12 w-full text-base" onClick={() => setReturning({ borrowing: b, detailId: d.supporting_detail_id })}>Kembalikan</Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <Button asChild variant="outline" className="h-12 w-full text-base"><Link href={`/supporting-equipment/${s.supporting_equipment_id}`}><History /> Lihat detail item</Link></Button>
        </CardContent>
      </Card>

      <BorrowSheet
        open={borrowOpen} onOpenChange={setBorrowOpen}
        lines={[{ kind: "sp", id: s.supporting_equipment_id, name: s.item_name, code: s.item_code, quantity: 1, max: s.available_quantity, unit: s.unit }]}
      />
      <ReturnBorrowingSheet
        open={!!returning} onOpenChange={(o) => !o && setReturning(null)}
        borrowing={returning?.borrowing} only={returning ? { kind: "sp", detail_id: returning.detailId } : undefined}
      />
    </div>
  );
}
