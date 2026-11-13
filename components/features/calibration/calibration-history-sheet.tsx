"use client";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { MetaBadge } from "@/components/features/common/status-badge";
import { useCalibrations, useEquipment } from "@/hooks";
import { downloadCertificate, hasCertificate } from "@/lib/certificate";
import { formatRupiah } from "@/lib/format";
import { CALIBRATION_RESULT_META } from "@/lib/status";

const d = (v: string) => format(parseISO(v), "d MMM yyyy", { locale: idLocale });

/** Riwayat kalibrasi satu alat + unduh sertifikat. */
export function CalibrationHistorySheet({ equipmentId, onClose }: { equipmentId: string | null; onClose: () => void }) {
  const equipment = useEquipment(equipmentId ?? undefined);
  const list = useCalibrations(equipmentId ? { equipment_id: equipmentId } : undefined);
  const rows = equipmentId ? list.data ?? [] : [];

  return (
    <BottomSheet
      open={!!equipmentId} onOpenChange={(o) => !o && onClose()} size="lg"
      title="Riwayat Kalibrasi" description={equipment.data ? `${equipment.data.equipment_name} • ${equipment.data.inventory_code}` : "Memuat alat…"}
    >
      <div className="pb-4">
        {list.isLoading ? (
          <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada kalibrasi" description="Catatan kalibrasi alat ini akan tampil di sini." />
        ) : (
          <ol className="space-y-3">
            {rows.map((c) => (
              <li key={c.calibration_id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{d(c.calibration_date)}</p>
                  <MetaBadge meta={CALIBRATION_RESULT_META[c.calibration_result]} />
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Berikutnya</dt><dd>{d(c.next_calibration_date)}</dd>
                  <dt className="text-muted-foreground">Penyedia</dt><dd>{c.calibration_provider}</dd>
                  <dt className="text-muted-foreground">Sertifikat</dt><dd className="font-mono text-xs">{c.certificate_number}</dd>
                  <dt className="text-muted-foreground">Biaya</dt><dd>{formatRupiah(c.cost)}</dd>
                  {c.notes && (<><dt className="text-muted-foreground">Catatan</dt><dd>{c.notes}</dd></>)}
                </dl>
                {hasCertificate(c) ? (
                  <Button
                    variant="outline" size="sm" className="mt-3"
                    onClick={() => downloadCertificate(c, equipment.data).catch(() => toast.error("Sertifikat gagal diunduh"))}
                  >
                    <Download /> Unduh sertifikat
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Tidak ada file sertifikat.</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </BottomSheet>
  );
}
