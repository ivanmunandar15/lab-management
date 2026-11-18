"use client";
import { Copy, Loader2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MetaBadge } from "@/components/features/common/status-badge";
import { copyText, emailStatusMeta, isNotActuallySent, REMINDER_LABEL } from "@/lib/email-status";
import type { EmailLog } from "@/types/email";

const fmt = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy, HH:mm:ss", { locale: idLocale }) : "—");

interface Props {
  log: EmailLog | null;
  onClose: () => void;
  onRetry: (log: EmailLog) => void;
  retrying: boolean;
}

export function EmailLogDetailDialog({ log, onClose, onRetry, retrying }: Props) {
  async function copy() {
    if (!log) return;
    if (await copyText(JSON.stringify(log, null, 2))) toast.success("Detail disalin");
    else toast.error("Gagal menyalin", { description: "Browser memblokir clipboard (butuh HTTPS). Blok dan salin teks secara manual." });
  }
  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {log && (
          <>
            <DialogHeader>
              <DialogTitle>Detail email</DialogTitle>
              <DialogDescription className="break-words">{log.subject}</DialogDescription>
            </DialogHeader>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Status</dt>
              <dd><MetaBadge meta={emailStatusMeta(log)} /></dd>
              <dt className="text-muted-foreground">Penerima</dt><dd className="break-all">{log.recipient_email}</dd>
              <dt className="text-muted-foreground">Jenis</dt><dd>{REMINDER_LABEL[log.reminder_type]}</dd>
              <dt className="text-muted-foreground">Percobaan</dt><dd>{log.attempts}</dd>
              <dt className="text-muted-foreground">Dibuat</dt><dd>{fmt(log.created_at)}</dd>
              <dt className="text-muted-foreground">Terkirim</dt><dd>{fmt(log.sent_at)}</dd>
              <dt className="text-muted-foreground">ID log</dt><dd className="break-all font-mono text-xs">{log.email_log_id}</dd>
              <dt className="text-muted-foreground">ID pesan provider</dt><dd className="break-all font-mono text-xs">{log.provider_message_id ?? "—"}</dd>
              {log.equipment_id && (<><dt className="text-muted-foreground">ID alat</dt><dd className="break-all font-mono text-xs">{log.equipment_id}</dd></>)}
            </dl>
            {isNotActuallySent(log) && (
              <p role="note" className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200">
                Pengiriman email sedang dalam mode uji: email ini dicatat sebagai terkirim, tetapi <strong>tidak benar-benar dikirim</strong>. Aktifkan di menu Pengaturan Email.
              </p>
            )}
            {log.error_message && (
              <div>
                <p className="mb-1 text-sm font-medium text-destructive">Pesan error</p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 font-mono text-xs">{log.error_message}</pre>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={copy}><Copy /> Salin detail</Button>
              {log.status === "failed" && (
                <Button onClick={() => onRetry(log)} disabled={retrying}>
                  {retrying ? <Loader2 className="animate-spin" /> : <RotateCcw />} Kirim ulang
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
