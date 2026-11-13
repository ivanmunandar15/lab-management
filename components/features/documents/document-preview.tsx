"use client";
import { useEffect, useState } from "react";
import { Download, FileQuestion, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { canPreview, downloadDocument, formatFileSize, isImage, loadPreviewUrl } from "@/lib/documents";
import type { Document } from "@/types/erd";

export function DocumentPreview({ doc, onClose }: { doc: Document | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrl(null); setFailed(false);
    if (!doc || !canPreview(doc)) return;
    let alive = true;
    let created: string | null = null;
    loadPreviewUrl(doc)
      .then((u) => {
        if (u.startsWith("blob:")) created = u;
        if (alive) setUrl(u);
        else if (created) URL.revokeObjectURL(created);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [doc]);

  return (
    <BottomSheet
      open={!!doc} onOpenChange={(o) => !o && onClose()} size="lg" title={doc?.file_name ?? "Pratinjau"}
      description={doc ? `${formatFileSize(doc.file_size)} · ${doc.file_type}` : undefined}
      footer={doc && (
        <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => downloadDocument(doc).catch(() => toast.error("Gagal mengunduh"))}><Download /> Unduh</Button>
      )}
    >
      <div className="flex min-h-72 items-center justify-center pb-3">
        {!doc ? null : !canPreview(doc) || failed ? (
          <div className="text-center text-sm text-muted-foreground">
            <FileQuestion className="mx-auto mb-2 size-10" aria-hidden="true" />
            Pratinjau tidak tersedia untuk jenis file ini. Silakan unduh.
          </div>
        ) : !url ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Memuat pratinjau" />
        ) : isImage(doc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={doc.file_name} className="max-h-[60dvh] max-w-full rounded-md object-contain" />
        ) : (
          <iframe src={url} title={`Pratinjau ${doc.file_name}`} className="h-[60dvh] w-full rounded-md border" />
        )}
      </div>
    </BottomSheet>
  );
}
