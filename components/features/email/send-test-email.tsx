"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSendTestEmail } from "@/hooks";
import { copyText } from "@/lib/email-status";
import type { EmailTestResult } from "@/types/email";

type Outcome = { kind: "result"; result: EmailTestResult } | { kind: "error"; message: string };

/** Tombol "Kirim email uji" + dialog hasil. Hasil SMTP dikembalikan sinkron oleh backend. */
export function SendTestEmailButton() {
  const send = useSendTestEmail();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function run() {
    try {
      setOutcome({ kind: "result", result: await send.mutateAsync() });
    } catch (e) {
      setOutcome({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function copy() {
    if (!outcome) return;
    const text = outcome.kind === "result" ? JSON.stringify(outcome.result, null, 2) : outcome.message;
    if (await copyText(text)) toast.success("Hasil disalin");
    else toast.error("Gagal menyalin", { description: "Browser memblokir clipboard (butuh HTTPS). Salin teks secara manual." });
  }

  return (
    <>
      <Button onClick={run} disabled={send.isPending}>
        {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} {send.isPending ? "Mengirim…" : "Kirim email uji"}
      </Button>
      <Dialog open={!!outcome} onOpenChange={(o) => !o && setOutcome(null)}>
        <DialogContent>
          {outcome && <Result outcome={outcome} onCopy={copy} onClose={() => setOutcome(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Result({ outcome, onCopy, onClose }: { outcome: Outcome; onCopy: () => void; onClose: () => void }) {
  let icon = <CheckCircle2 className="size-5 text-green-600" aria-hidden="true" />;
  let title = "Email uji terkirim";
  let body: React.ReactNode = null;
  let raw: string | null = null;

  if (outcome.kind === "error") {
    icon = <XCircle className="size-5 text-destructive" aria-hidden="true" />;
    title = "Permintaan gagal";
    body = <p>Backend tidak memberi hasil pengiriman. Pesan: <span className="break-words font-medium">{outcome.message}</span></p>;
    raw = outcome.message;
  } else {
    const r = outcome.result;
    if (r.status === "failed") {
      icon = <XCircle className="size-5 text-destructive" aria-hidden="true" />;
      title = "Pengiriman gagal";
      body = <p>Email uji ke <strong className="break-all">{r.to}</strong> gagal dikirim. Periksa pengaturan SMTP di backend (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM).</p>;
      raw = r.error_message;
    } else if (r.status === "missing") {
      icon = <AlertTriangle className="size-5 text-yellow-600" aria-hidden="true" />;
      title = "Catatan email tidak ditemukan";
      body = <p>Backend tidak menemukan baris log untuk email uji ini. Muat ulang daftar log dan cek log server.</p>;
    } else if (!r.email_enabled) {
      icon = <AlertTriangle className="size-5 text-yellow-600" aria-hidden="true" />;
      title = "Email TIDAK dikirim (mode uji)";
      body = <p>Backend berjalan dengan <code>EMAIL_ENABLED=false</code>, sehingga tidak ada email yang keluar ke <strong className="break-all">{r.to}</strong>; isinya hanya dicatat di log server. Setel <code>EMAIL_ENABLED=true</code> dan isi pengaturan SMTP untuk pengiriman nyata.</p>;
    } else {
      body = <p>Email uji dikirim ke <strong className="break-all">{r.to}</strong>. Periksa kotak masuk (dan folder spam).</p>;
    }
    if (r.to.toLowerCase().endsWith(".local")) {
      body = <>{body}<p className="mt-2 text-muted-foreground">Alamat <span className="break-all">{r.to}</span> bukan alamat email nyata. Ubah email akun admin di menu Users agar email uji bisa diterima.</p></>;
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">{icon}{title}</DialogTitle>
        <DialogDescription className="sr-only">Hasil pengiriman email uji</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 text-sm">{body}</div>
      {raw && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 font-mono text-xs">{raw}</pre>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCopy}><Copy /> Salin hasil</Button>
        <Button onClick={onClose}>Tutup</Button>
      </div>
    </>
  );
}
