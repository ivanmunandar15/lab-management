"use client";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { StatusBadge } from "@/components/features/common/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBorrowings, useCalibrations, useCreateDocument, useDeleteDocument, useDocuments, useMaintenanceList, useUsers } from "@/hooks";
import { formatRupiah } from "@/lib/format";
import { isBackendFileUrl, toProxyUrl } from "@/lib/api/urls";
import { canPreview, fileToDataUrl } from "@/lib/documents";
import { useCan } from "./use-can";
import type { Document, DocumentType } from "@/types/erd";

const d = (iso: string, withTime = false) => format(new Date(iso), withTime ? "d MMM yyyy HH:mm" : "d MMM yyyy", { locale: idLocale });

function Section<T>({ query, empty, children }: {
  query: { data?: T[]; isLoading: boolean; error: unknown; refetch: () => void };
  empty: { title: string; description: string };
  children: (rows: T[]) => React.ReactNode;
}) {
  if (query.isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (query.error) return <ErrorState onRetry={() => query.refetch()} />;
  if (!query.data || query.data.length === 0) return <EmptyState title={empty.title} description={empty.description} />;
  return <div className="overflow-x-auto rounded-lg border">{children(query.data)}</div>;
}

const Th = ({ children }: { children: React.ReactNode }) => <th className="whitespace-nowrap p-3 text-left text-xs font-medium text-muted-foreground">{children}</th>;
const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => <td className={`p-3 align-top ${className ?? ""}`}>{children}</td>;

export function BorrowingTab({ equipmentId }: { equipmentId: string }) {
  const q = useBorrowings({ equipment_id: equipmentId });
  const { data: users = [] } = useUsers({ includeInactive: true });
  const name = (id: string) => users.find((u) => u.user_id === id)?.name ?? "—";
  return (
    <Section query={q} empty={{ title: "Belum pernah dipinjam", description: "Riwayat peminjaman alat ini akan tampil di sini." }}>
      {(rows) => (
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><Th>Peminjam</Th><Th>Dipinjam</Th><Th>Batas kembali</Th><Th>Dikembalikan</Th><Th>Tujuan</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.borrowing_id} className="border-t">
                <Td className="font-medium">{name(b.user_id)}</Td>
                <Td>{d(b.borrowing_time, true)}</Td>
                <Td>{d(b.expected_return_time, true)}</Td>
                <Td>{b.actual_return_time ? d(b.actual_return_time, true) : "—"}</Td>
                <Td>{b.purpose}</Td>
                <Td><StatusBadge status={b.display_status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

export function CalibrationTab({ equipmentId }: { equipmentId: string }) {
  const q = useCalibrations({ equipment_id: equipmentId });
  return (
    <Section query={{ ...q, data: q.data && [...q.data].sort((a, b) => b.calibration_date.localeCompare(a.calibration_date)) }} empty={{ title: "Belum ada kalibrasi", description: "Catatan kalibrasi alat ini akan tampil di sini." }}>
      {(rows) => (
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><Th>Tanggal</Th><Th>Berikutnya</Th><Th>Penyedia</Th><Th>No. sertifikat</Th><Th>Hasil</Th><Th>Biaya</Th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.calibration_id} className="border-t">
                <Td>{d(c.calibration_date)}</Td>
                <Td>{d(c.next_calibration_date)}</Td>
                <Td>{c.calibration_provider}</Td>
                <Td className="font-mono text-xs">{c.certificate_number}</Td>
                <Td>
                  <span className={c.calibration_result === "passed" ? "font-medium text-green-700 dark:text-green-400" : "font-medium text-red-700 dark:text-red-400"}>
                    {c.calibration_result === "passed" ? "Lulus" : "Gagal"}
                  </span>
                </Td>
                <Td>{formatRupiah(c.cost)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

const MAINT_STATUS = { scheduled: "Dijadwalkan", in_progress: "Berjalan", completed: "Selesai", cancelled: "Dibatalkan" } as const;
const MAINT_TYPE = { routine: "Rutin", repair: "Perbaikan" } as const;

export function MaintenanceTab({ equipmentId }: { equipmentId: string }) {
  const q = useMaintenanceList({ equipment_id: equipmentId });
  return (
    <Section query={q} empty={{ title: "Belum ada maintenance", description: "Riwayat perawatan dan perbaikan alat ini akan tampil di sini." }}>
      {(rows) => (
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><Th>Tanggal</Th><Th>Jenis</Th><Th>Deskripsi</Th><Th>Selesai</Th><Th>Biaya</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.maintenance_id} className="border-t">
                <Td>{d(m.maintenance_date)}</Td>
                <Td>{MAINT_TYPE[m.maintenance_type]}</Td>
                <Td>{m.description}</Td>
                <Td>{m.completion_date ? d(m.completion_date) : "—"}</Td>
                <Td>{formatRupiah(m.cost)}</Td>
                <Td>{MAINT_STATUS[m.status]}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

const DOC_TYPE: Record<DocumentType, string> = { manual: "Manual", certificate: "Sertifikat", procedure: "Prosedur", photo: "Foto", other: "Lainnya" };
const MAX_FILE = 10 * 1024 * 1024;
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function DocumentsTab({ equipmentId }: { equipmentId: string }) {
  const q = useDocuments({ equipment_id: equipmentId });
  const create = useCreateDocument();
  const remove = useDeleteDocument();
  const can = useCan("document");
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocumentType>("manual");
  const [toDelete, setToDelete] = useState<Document | null>(null);

  async function onFile(file?: File) {
    if (!file || !session?.user) return;
    if (file.size > MAX_FILE) { toast.error("Ukuran file maksimal 10 MB"); return; }
    try {
      await create.mutateAsync({
        equipment_id: equipmentId, uploaded_by: session.user.id, document_type: type,
        file_name: file.name, file_url: await fileToDataUrl(file), // backend memverifikasi isi file lalu menyimpannya
        file_type: file.type || "application/octet-stream", file_size: file.size,
      });
      toast.success("Dokumen diunggah");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah dokumen");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {can("create") && (
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect aria-label="Jenis dokumen" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
            {(Object.keys(DOC_TYPE) as DocumentType[]).map((t) => <option key={t} value={t}>{DOC_TYPE[t]}</option>)}
          </NativeSelect>
          <Button onClick={() => fileRef.current?.click()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Unggah dokumen
          </Button>
          <input ref={fileRef} type="file" className="sr-only" aria-label="Pilih berkas dokumen" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      )}
      <Section query={q} empty={{ title: "Belum ada dokumen", description: "Unggah manual, sertifikat, prosedur, atau foto alat ini." }}>
        {(rows) => (
          <ul className="divide-y">
            {rows.map((doc) => (
              <li key={doc.document_id} className="flex items-center gap-3 p-3">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <a href={isBackendFileUrl(doc.file_url) ? toProxyUrl(doc.file_url, { inline: canPreview(doc) }) : doc.file_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:underline">{doc.file_name}</a>
                  <p className="text-xs text-muted-foreground">{DOC_TYPE[doc.document_type]} · {fmtSize(doc.file_size)} · {d(doc.uploaded_at)}</p>
                </div>
                {can("delete") && (
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Hapus ${doc.file_name}`} onClick={() => setToDelete(doc)}><Trash2 /></Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} variant="destructive"
        title={`Hapus "${toDelete?.file_name}"?`} description="Dokumen dihapus permanen dan tidak bisa dikembalikan." confirmLabel="Hapus"
        onConfirm={async () => {
          try { await remove.mutateAsync(toDelete!.document_id); toast.success("Dokumen dihapus"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menghapus dokumen"); }
        }}
      />
    </div>
  );
}
