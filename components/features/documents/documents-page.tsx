"use client";
import { useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Download, Eye, FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { DataTable } from "@/components/features/common/data-table";
import { PageHeader } from "@/components/features/common/page-header";
import { useCan } from "@/components/features/equipment/use-can";
import { useCreateDocument, useDeleteDocument, useDocuments, useEquipmentList, useUsers } from "@/hooks";
import { DOCUMENT_MAX_BYTES, DOC_TYPE_LABEL, canPreview, downloadDocument, fileToDataUrl, formatFileSize, isImage } from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { Document, DocumentType } from "@/types/erd";
import { DocumentPreview } from "./document-preview";

export function DocumentsPage() {
  const can = useCan("document");
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [equipmentId, setEquipmentId] = useState("");
  const [type, setType] = useState<DocumentType>("manual");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [toDelete, setToDelete] = useState<Document | null>(null);

  const docs = useDocuments();
  const equipment = useEquipmentList({ includeInactive: true });
  const users = useUsers({ includeInactive: true });
  const create = useCreateDocument();
  const remove = useDeleteDocument();

  const eqName = (id: string) => equipment.data?.find((e) => e.equipment_id === id)?.equipment_name ?? "—";
  const userName = (id: string) => users.data?.find((u) => u.user_id === id)?.name ?? "—";

  async function upload(files: FileList | File[]) {
    const userId = session?.user?.id;
    if (!userId) return void toast.error("Sesi login tidak ditemukan. Silakan login ulang.");
    if (!equipmentId) return void toast.error("Pilih alat tujuan dokumen terlebih dahulu");
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      if (file.size > DOCUMENT_MAX_BYTES) { toast.error(`${file.name}: ukuran maksimal 10 MB`); continue; }
      try {
        await create.mutateAsync({
          equipment_id: equipmentId, uploaded_by: userId, document_type: type, file_name: file.name,
          file_url: await fileToDataUrl(file), // backend memverifikasi isi file lalu menyimpannya
          file_type: file.type || "application/octet-stream", file_size: file.size,
        });
        ok++;
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error ? e.message : "gagal diunggah"}`);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) toast.success(`${ok} dokumen diunggah`);
  }

  const columns = useMemo<ColumnDef<Document>[]>(() => [
    {
      id: "file", header: "Dokumen", accessorFn: (d) => `${d.file_name} ${eqName(d.equipment_id)}`,
      cell: ({ row }) => {
        const d = row.original;
        const Icon = isImage(d) ? ImageIcon : FileText;
        return (
          <div className="flex items-center gap-3">
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0"><p className="max-w-64 truncate font-medium">{d.file_name}</p><p className="text-xs text-muted-foreground">{formatFileSize(d.file_size)}</p></div>
          </div>
        );
      },
    },
    { id: "equipment", header: "Alat", accessorFn: (d) => eqName(d.equipment_id), cell: ({ row }) => <span className="block max-w-48 truncate">{eqName(row.original.equipment_id)}</span> },
    { id: "type", header: "Jenis", accessorFn: (d) => d.document_type, cell: ({ row }) => DOC_TYPE_LABEL[row.original.document_type] },
    { id: "uploader", header: "Pengunggah", accessorFn: (d) => userName(d.uploaded_by) },
    { accessorKey: "uploaded_at", header: "Tanggal", cell: ({ row }) => <span className="whitespace-nowrap">{format(new Date(row.original.uploaded_at), "d MMM yyyy", { locale: idLocale })}</span> },
    {
      id: "actions", header: () => <span className="sr-only">Aksi</span>, enableSorting: false,
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Pratinjau ${d.file_name}`} onClick={() => setPreview(d)}><Eye /></Button>
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Unduh ${d.file_name}`} onClick={() => downloadDocument(d).catch(() => toast.error("Gagal mengunduh"))}><Download /></Button>
            {can("delete") && <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label={`Hapus ${d.file_name}`} onClick={() => setToDelete(d)}><Trash2 /></Button>}
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [equipment.data, users.data]);

  return (
    <>
      <PageHeader title="Dokumen" description="Pustaka manual, sertifikat, prosedur, dan foto seluruh alat." />

      {can("create") && (
        <section aria-label="Unggah dokumen" className="mb-4 space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <NativeSelect aria-label="Alat tujuan" className="min-w-56 flex-1 sm:flex-none" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
              <option value="">Pilih alat tujuan…</option>
              {(equipment.data ?? []).filter((e) => e.is_active).map((e) => <option key={e.equipment_id} value={e.equipment_id}>{e.inventory_code} — {e.equipment_name}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Jenis dokumen" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              {(Object.keys(DOC_TYPE_LABEL) as DocumentType[]).map((t) => <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>)}
            </NativeSelect>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
            className={cn("flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors", dragging ? "border-primary bg-primary/10" : "border-border")}
          >
            {uploading ? <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" /> : <UploadCloud className="size-7 text-muted-foreground" aria-hidden="true" />}
            <p className="text-sm font-medium">{uploading ? "Mengunggah…" : "Tarik dan lepas file di sini"}</p>
            <p className="text-xs text-muted-foreground">PDF, gambar, atau dokumen lain. Maksimal 10 MB per file.</p>
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>Pilih file</Button>
            <input ref={fileRef} type="file" multiple className="sr-only" aria-label="Pilih file dokumen" onChange={(e) => e.target.files && upload(e.target.files)} />
          </div>
        </section>
      )}

      <DataTable
        columns={columns} data={docs.data ?? []} getRowId={(d) => d.document_id}
        isLoading={docs.isLoading} error={docs.error} onRetry={() => docs.refetch()}
        searchPlaceholder="Cari nama file atau alat…"
        filters={[{ columnId: "type", label: "Jenis", options: (Object.keys(DOC_TYPE_LABEL) as DocumentType[]).map((t) => ({ value: t, label: DOC_TYPE_LABEL[t] })) }]}
        onRowClick={(d) => setPreview(d)}
        emptyTitle="Belum ada dokumen" emptyDescription={can("create") ? "Unggah manual, sertifikat, atau foto alat lewat area di atas." : undefined}
      />

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog
        open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} variant="destructive" confirmLabel="Hapus"
        title={`Hapus "${toDelete?.file_name}"?`} description="Dokumen dihapus permanen dan tidak bisa dikembalikan."
        onConfirm={async () => {
          try { await remove.mutateAsync(toDelete!.document_id); toast.success("Dokumen dihapus"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menghapus dokumen"); }
        }}
      />
    </>
  );
}
