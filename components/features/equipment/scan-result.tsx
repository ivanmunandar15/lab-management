"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BookOpen, DoorOpen, FileX, History, Microscope, Wrench, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/features/common/error-state";
import { ConditionBadge, StatusBadge } from "@/components/features/common/status-badge";
import { BorrowSheet } from "@/components/features/borrowing/borrow-sheet";
import { ReportIssueSheet } from "@/components/features/borrowing/report-issue-sheet";
import { ReturnBorrowingSheet } from "@/components/features/borrowing/return-sheet";
import { Banner, InactiveNotice, InfoRow, ScanBackLink, ScanSkeleton, UnknownQr } from "@/components/features/scan/scan-parts";
import { useBorrowings, useDocuments, useEquipmentByQrToken, useRooms, useUsers } from "@/hooks";
import { useNow } from "@/hooks/use-now";
import { canReturnBorrowing, getEquipmentBorrowBlock, isCalibrationOverdue } from "@/lib/borrowing-rules";
import { CALIBRATION_OVERDUE_BLOCKS_BORROWING } from "@/lib/constants";
import { formatRemaining } from "@/lib/format";
import { ServiceError } from "@/lib/services";
import { cn } from "@/lib/utils";
import { CalibrationDate } from "./calibration-date";
import { isBackendFileUrl, toProxyUrl } from "@/lib/api/urls";
import { canPreview } from "@/lib/documents";

const dt = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: idLocale });
const BIG = "h-auto min-h-14 w-full whitespace-normal py-3 text-base font-semibold";

/** Halaman tujuan QR: /scan/eq/[token]. Data selalu diambil ulang dari data layer (tanpa cache lama). */
export function EquipmentScanResult({ token }: { token: string }) {
  const { data: session } = useSession();
  const user = session?.user ? { id: session.user.id, role: session.user.role } : undefined;
  const now = useNow(30_000);
  const q = useEquipmentByQrToken(token);
  const e = q.data;
  const rooms = useRooms();
  const users = useUsers({ includeInactive: true });
  const borrowings = useBorrowings(e ? { equipment_id: e.equipment_id } : undefined, { enabled: !!e, staleTime: 0 });
  const docs = useDocuments(e ? { equipment_id: e.equipment_id } : undefined);

  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (q.isLoading) return <ScanSkeleton />;
  if (q.error instanceof ServiceError && q.error.code === "NOT_FOUND") return <UnknownQr />;
  if (q.error || !e) return <ErrorState onRetry={() => q.refetch()} />;

  if (!e.is_active) {
    return (
      <InactiveNotice
        title="Alat sudah dinonaktifkan"
        description={`${e.equipment_name} (${e.inventory_code}) tidak lagi digunakan dan tidak dapat dipinjam.`}
        href={`/equipment/${e.equipment_id}`} linkLabel="Lihat riwayat alat"
      />
    );
  }

  const room = rooms.data?.find((r) => r.room_id === e.room_id);
  const manual = docs.data?.find((d) => d.document_type === "manual");
  const calOverdue = isCalibrationOverdue(e);
  const block = e.status === "available" ? getEquipmentBorrowBlock(e) : null;

  // Peminjaman aktif untuk alat ini (detail belum dikembalikan).
  const active = borrowings.data?.find((b) => b.borrowing_status === "borrowed" && b.equipment_details.some((d) => d.equipment_id === e.equipment_id && d.final_condition === null));
  const detail = active?.equipment_details.find((d) => d.equipment_id === e.equipment_id && d.final_condition === null);
  const borrower = active ? users.data?.find((u) => u.user_id === active.user_id)?.name ?? "Pengguna" : null;
  const remaining = active ? formatRemaining(active.expected_return_time, now) : null;
  const mayReturn = !!active && canReturnBorrowing(user, active);

  return (
    <div className="mx-auto w-full max-w-md">
      <ScanBackLink />
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true"><Microscope className="size-8" /></span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight">{e.equipment_name}</h1>
              <p className="font-mono text-sm text-muted-foreground">{e.inventory_code}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><DoorOpen className="size-4" aria-hidden="true" />{room?.room_name ?? "Ruangan —"}</p>
            </div>
          </div>

          <StatusBadge status={e.status} className="px-4 py-1.5 text-base" />

          <dl className="divide-y rounded-lg border px-3">
            <InfoRow label="Kondisi"><ConditionBadge condition={e.condition} /></InfoRow>
            <InfoRow label="Kalibrasi berikutnya"><CalibrationDate date={e.next_calibration_date} /></InfoRow>
          </dl>

          {calOverdue && (
            <Banner tone={CALIBRATION_OVERDUE_BLOCKS_BORROWING ? "danger" : "warning"} title="Kalibrasi alat terlambat">
              {CALIBRATION_OVERDUE_BLOCKS_BORROWING
                ? "Alat ini tidak dapat dipinjam sampai dikalibrasi ulang. Hubungi teknisi atau SPV."
                : "Alat masih bisa dipinjam, tetapi hasil ukur perlu diperlakukan hati-hati sampai dikalibrasi ulang."}
            </Banner>
          )}

          {/* ===== Aksi utama menurut status ===== */}
          {e.status === "available" && (
            <Button className={BIG} disabled={!!block} onClick={() => setBorrowOpen(true)}>
              {block ? `Tidak dapat dipinjam: ${block}` : "Pinjam"}
            </Button>
          )}

          {e.status === "borrowed" && (
            <div className="space-y-3">
              {active ? (
                <dl className="divide-y rounded-lg border px-3">
                  <InfoRow label="Peminjam">{borrower}</InfoRow>
                  <InfoRow label="Waktu pinjam">{dt(active.borrowing_time)}</InfoRow>
                  <InfoRow label="Batas kembali">
                    <span className={cn(remaining?.overdue && "text-red-700 dark:text-red-400")}>
                      {dt(active.expected_return_time)}
                      <span className="block text-xs font-semibold">{remaining?.label}</span>
                    </span>
                  </InfoRow>
                </dl>
              ) : (
                borrowings.isLoading ? <p className="text-sm text-muted-foreground">Memuat data peminjam…</p> : <Banner tone="warning" title="Data peminjaman tidak ditemukan" />
              )}
              <Button className={BIG} disabled={!mayReturn || !detail} onClick={() => setReturnOpen(true)}>Kembalikan</Button>
              {active && !mayReturn && <p className="text-center text-xs text-muted-foreground">Hanya peminjam, admin, atau SPV yang dapat mengembalikan alat ini.</p>}
            </div>
          )}

          {e.status === "damaged" && (
            <div className="space-y-3">
              <Banner tone="danger" title="Alat rusak">Alat tidak dapat dipinjam sampai diperbaiki oleh teknisi.</Banner>
              <Button className={BIG} disabled>Tidak dapat dipinjam</Button>
              <Button variant="outline" className="h-12 w-full text-base" onClick={() => setReportOpen(true)}><Wrench /> Lapor ke Teknisi</Button>
            </div>
          )}

          {e.status === "maintenance" && <Button className={BIG} disabled>Sedang dalam perawatan</Button>}
          {e.status === "calibration" && <Button className={BIG} disabled>Sedang dikalibrasi</Button>}

          {/* ===== Aksi sekunder ===== */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button asChild variant="outline" className="h-auto flex-col gap-1 py-3 text-xs"><Link href={`/equipment/${e.equipment_id}`}><History className="!size-5" />Riwayat</Link></Button>
            {manual ? (
              <Button asChild variant="outline" className="h-auto flex-col gap-1 py-3 text-xs"><a href={isBackendFileUrl(manual.file_url) ? toProxyUrl(manual.file_url, { inline: canPreview(manual) }) : manual.file_url} target="_blank" rel="noopener noreferrer"><BookOpen className="!size-5" />Manual</a></Button>
            ) : (
              <Button variant="outline" disabled className="h-auto flex-col gap-1 py-3 text-xs" title="Belum ada manual"><FileX className="!size-5" />Manual</Button>
            )}
            <Button variant="outline" className="h-auto flex-col gap-1 py-3 text-xs" onClick={() => setReportOpen(true)}><Flag className="!size-5" />Lapor rusak</Button>
          </div>
        </CardContent>
      </Card>

      <BorrowSheet open={borrowOpen} onOpenChange={setBorrowOpen} lines={[{ kind: "eq", id: e.equipment_id, name: e.equipment_name, code: e.inventory_code }]} />
      <ReturnBorrowingSheet open={returnOpen} onOpenChange={setReturnOpen} borrowing={active} only={detail ? { kind: "eq", detail_id: detail.detail_id } : undefined} />
      <ReportIssueSheet
        open={reportOpen} onOpenChange={setReportOpen}
        equipment={{ equipment_id: e.equipment_id, name: e.equipment_name, code: e.inventory_code }}
        title={e.status === "damaged" ? "Lapor ke Teknisi" : "Lapor Kerusakan"}
      />
    </div>
  );
}
