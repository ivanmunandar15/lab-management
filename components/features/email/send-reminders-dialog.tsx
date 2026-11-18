"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Copy, Info, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MetaBadge } from "@/components/features/common/status-badge";
import { useReminderPreview, useSendReminders } from "@/hooks";
import { copyText } from "@/lib/clipboard";
import { ROLE_LABEL } from "@/lib/constants";
import { REMINDER_LABEL } from "@/lib/email-status";
import type { BadgeMeta } from "@/lib/status";
import type { Role } from "@/types/erd";
import type { ReminderEmailPreview, ReminderItem, ReminderSendResult, ReminderStage, ReminderUnassignedItem } from "@/types/email";

const STAGE_ORDER: ReminderStage[] = ["calibration_overdue", "calibration_1d", "calibration_7d", "calibration_30d"];
const STAGE_TONE: Record<ReminderStage, BadgeMeta["tone"]> = { calibration_overdue: "red", calibration_1d: "yellow", calibration_7d: "blue", calibration_30d: "slate" };

const dueText = (days: number) => (days < 0 ? `terlambat ${-days} hari` : days === 0 ? "hari ini" : `${days} hari lagi`);

function Notice({ tone, icon, children }: { tone: "warn" | "info"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "warn"
    ? "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200"
    : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200";
  return <div role="note" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${cls}`}><span className="mt-0.5 shrink-0">{icon}</span><div>{children}</div></div>;
}

/** Tombol "Kirim email pengingat…" + dialog pilih penerima. Tidak ada yang terkirim tanpa dipilih dan dikonfirmasi. */
export function SendRemindersButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><MailCheck /> Kirim email pengingat…</Button>
      <SendRemindersDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SendRemindersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const send = useSendReminders();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ReminderSendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const preview = useReminderPreview(open && !result);
  const emails = useMemo(() => preview.data?.emails ?? [], [preview.data]);

  // Pratinjau dimuat ulang: buang pilihan untuk penerima yang sudah tidak ada.
  useEffect(() => {
    const ids = new Set(emails.map((e) => e.user_id));
    setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
    setConfirming(false);
  }, [emails]);

  function close() {
    if (send.isPending) return;
    setSelected(new Set()); setExpanded(new Set()); setConfirming(false); setResult(null); setSendError(null);
    onClose();
  }

  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n; };
  const chosen = emails.filter((e) => selected.has(e.user_id));
  const skippedCount = emails.length - chosen.length;

  async function doSend() {
    setSendError(null);
    try {
      setResult(await send.mutateAsync(chosen.map((e) => e.user_id)));
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Pengiriman gagal");
      setConfirming(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    if (await copyText(JSON.stringify(result, null, 2))) toast.success("Hasil disalin");
    else toast.error("Gagal menyalin", { description: "Browser memblokir clipboard (butuh HTTPS). Salin teks secara manual." });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MailCheck className="size-5" aria-hidden="true" /> Kirim email pengingat kalibrasi</DialogTitle>
          <DialogDescription>Pilih email mana yang dikirim. Tidak ada yang terkirim sebelum Anda memilih dan mengonfirmasi.</DialogDescription>
        </DialogHeader>

        {result ? (
          <ResultView result={result} onCopy={copyResult} onClose={close} />
        ) : preview.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Memuat pratinjau">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : preview.error ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">Pratinjau gagal dimuat: {preview.error instanceof Error ? preview.error.message : "kesalahan tidak diketahui"}</p>
            <Button variant="outline" onClick={() => preview.refetch()}><RefreshCw /> Coba lagi</Button>
          </div>
        ) : preview.data && (
          <>
            {!preview.data.email_enabled && (
              <Notice tone="warn" icon={<AlertTriangle className="size-4" aria-hidden="true" />}>
                Pengiriman email belum diaktifkan (mode uji): email dicatat sebagai terkirim, tetapi <strong>tidak benar-benar dikirim</strong>. Aktifkan di <Link href="/email-settings" className="underline">Pengaturan Email</Link>.
              </Notice>
            )}
            {preview.data.mode === "auto" ? (
              <Notice tone="warn" icon={<AlertTriangle className="size-4" aria-hidden="true" />}>
                Pengiriman <strong>otomatis harian masih aktif</strong> (mode Otomatis). Email yang tidak Anda pilih di sini
                tetap akan dikirim oleh jadwal harian. Agar hanya email pilihan Anda yang terkirim, ubah mode ke Manual di <Link href="/email-settings" className="underline">Pengaturan Email</Link>.
              </Notice>
            ) : (
              <Notice tone="info" icon={<Info className="size-4" aria-hidden="true" />}>
                Mode manual: hanya email yang Anda pilih yang dikirim. Yang tidak dipilih tidak dikirim, dan akan muncul lagi di pratinjau berikutnya.
              </Notice>
            )}

            {preview.data.unassigned.length > 0 && <UnassignedNotice items={preview.data.unassigned} />}

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Pratinjau pukul {format(new Date(preview.data.fetched_at), "HH:mm:ss", { locale: idLocale })}. Pengiriman menghitung ulang saat dikirim.</span>
              <Button size="sm" variant="ghost" onClick={() => preview.refetch()} disabled={preview.isFetching || send.isPending}>
                <RefreshCw className={preview.isFetching ? "animate-spin" : ""} /> Muat ulang
              </Button>
            </div>

            {emails.length === 0 ? (
              <p className="rounded-md border p-4 text-sm text-muted-foreground">
                Tidak ada email yang perlu dikirim sekarang: tidak ada alat yang tepat H-30/H-7/H-1 atau terlambat, email tahap itu sudah pernah dibuat,
                atau alat yang jatuh tempo belum punya penanggung jawab (lihat peringatan di atas dan menu Penanggung Jawab).
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium" aria-live="polite">{chosen.length} dipilih · {skippedCount} tidak dikirim</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelected(new Set(emails.map((e) => e.user_id)))} disabled={chosen.length === emails.length}>Pilih semua ({emails.length})</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={chosen.length === 0}>Kosongkan</Button>
                  </div>
                </div>

                <ul className="space-y-2">
                  {emails.map((e) => (
                    <RecipientRow key={e.user_id} email={e} checked={selected.has(e.user_id)} open={expanded.has(e.user_id)}
                      onCheck={() => setSelected((s) => toggle(s, e.user_id))} onExpand={() => setExpanded((s) => toggle(s, e.user_id))} disabled={send.isPending} />
                  ))}
                </ul>

                {sendError && <p role="alert" className="text-sm text-destructive">{sendError}</p>}

                {confirming ? (
                  <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-3">
                    <p className="text-sm">
                      Anda akan mengirim <strong>{chosen.length} email</strong> ke: <span className="break-all">{chosen.map((e) => e.to).join(", ")}</span>.
                      {skippedCount > 0 && <> {skippedCount} email lain <strong>tidak</strong> dikirim.</>}
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setConfirming(false)} disabled={send.isPending}>Kembali</Button>
                      <Button onClick={doSend} disabled={send.isPending}>{send.isPending && <Loader2 className="animate-spin" />} Ya, kirim sekarang</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={close}>Batal</Button>
                    <Button onClick={() => setConfirming(true)} disabled={chosen.length === 0}>Kirim {chosen.length > 0 ? `${chosen.length} email` : "email"}…</Button>
                  </div>
                )}
              </>
            )}
            {emails.length === 0 && <div className="flex justify-end"><Button onClick={close}>Tutup</Button></div>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const REASON_TEXT: Record<ReminderUnassignedItem["reason"], string> = {
  no_rule: "belum ada penanggung jawab",
  no_eligible_recipient: "penanggung jawab nonaktif / mematikan email",
};

/** Alat yang jatuh pada tahap pengingat tetapi tidak punya penerima: TIDAK dikirim ke siapa pun (bukan ke semua SPV). */
function UnassignedNotice({ items }: { items: ReminderUnassignedItem[] }) {
  const [open, setOpen] = useState(false);
  const shown = [...items].sort((a, b) => a.days_left - b.days_left).slice(0, 15);
  return (
    <Notice tone="warn" icon={<AlertTriangle className="size-4" aria-hidden="true" />}>
      <p>
        <strong>{items.length} alat</strong> jatuh pada tahap pengingat tetapi <strong>tidak punya penanggung jawab penerima email</strong>, sehingga tidak dikirim ke siapa pun.{" "}
        <Link href="/responsibilities" className="font-medium underline underline-offset-2">Atur penanggung jawab</Link>
      </p>
      <Button size="sm" variant="ghost" className="mt-1 h-7 px-2" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? <ChevronDown /> : <ChevronRight />} {open ? "Sembunyikan" : "Lihat"} alat
      </Button>
      {open && (
        <ul className="mt-1 max-h-40 divide-y overflow-auto rounded-md border border-yellow-300/60 text-xs dark:border-yellow-500/30">
          {shown.map((i) => (
            <li key={i.equipment_id} className="flex flex-wrap justify-between gap-x-3 px-2 py-1">
              <span className="break-words"><span className="font-mono">{i.inventory_code}</span> — {i.equipment_name}</span>
              <span className="whitespace-nowrap">{REASON_TEXT[i.reason]}</span>
            </li>
          ))}
          {items.length > shown.length && <li className="px-2 py-1">…dan {items.length - shown.length} alat lain</li>}
        </ul>
      )}
    </Notice>
  );
}

function RecipientRow({ email, checked, open, onCheck, onExpand, disabled }: { email: ReminderEmailPreview; checked: boolean; open: boolean; onCheck: () => void; onExpand: () => void; disabled: boolean }) {
  const counts = STAGE_ORDER.map((s) => ({ stage: s, n: email.items.filter((i) => i.stage === s).length })).filter((c) => c.n > 0);
  const checkboxId = `rem-${email.user_id}`;
  return (
    <li className={`rounded-md border p-3 ${checked ? "border-primary/50 bg-primary/5" : ""}`}>
      <div className="flex items-start gap-3">
        <input id={checkboxId} type="checkbox" className="mt-1 size-4" checked={checked} onChange={onCheck} disabled={disabled} />
        <div className="min-w-0 flex-1">
          <label htmlFor={checkboxId} className="block cursor-pointer">
            <span className="font-medium">{email.name}</span>{email.role && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{ROLE_LABEL[email.role as Role] ?? email.role}</span>} <span className="break-all text-sm text-muted-foreground">&lt;{email.to}&gt;</span>
          </label>
          <p className="mt-0.5 break-words text-sm text-muted-foreground">{email.subject}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {counts.map((c) => <MetaBadge key={c.stage} meta={{ label: `${REMINDER_LABEL[c.stage]}: ${c.n}`, tone: STAGE_TONE[c.stage] }} />)}
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onExpand} aria-expanded={open}>
              {open ? <ChevronDown /> : <ChevronRight />} {open ? "Sembunyikan" : "Lihat"} {email.item_count} alat
            </Button>
          </div>
          {open && <ItemList items={email.items} />}
        </div>
      </div>
    </li>
  );
}

function ItemList({ items }: { items: ReminderItem[] }) {
  const sorted = [...items].sort((a, b) => a.days_left - b.days_left);
  return (
    <ul className="mt-2 max-h-56 divide-y overflow-auto rounded-md border text-sm">
      {sorted.map((i) => (
        <li key={i.equipment_id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5">
          <span className="min-w-0 break-words"><span className="font-mono text-xs">{i.inventory_code}</span> — {i.equipment_name} <span className="text-muted-foreground">· {i.room_name}</span></span>
          <span className={`whitespace-nowrap text-xs ${i.days_left < 0 ? "text-destructive" : "text-muted-foreground"}`}>{i.due_date} ({dueText(i.days_left)})</span>
        </li>
      ))}
    </ul>
  );
}

function ResultView({ result, onCopy, onClose }: { result: ReminderSendResult; onCopy: () => void; onClose: () => void }) {
  const nothing = result.queued === 0;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        {nothing ? <AlertTriangle className="mt-0.5 size-5 text-yellow-600" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-5 text-green-600" aria-hidden="true" />}
        <div>
          <p className="font-medium">{nothing ? "Tidak ada email yang diantrekan" : `${result.queued} email diantrekan`}</p>
          <p className="text-muted-foreground">
            {nothing
              ? "Penerima yang Anda pilih sudah tidak terencana saat dikirim (mis. baru saja dikirim, atau jadwal berubah). Cek tabel log."
              : "Pengiriman berjalan di belakang layar. Status akhir (terkirim/gagal) tampil di tabel log; muat ulang untuk melihatnya."}
          </p>
        </div>
      </div>
      <ul className="list-inside list-disc text-muted-foreground">
        <li>Dipilih: {result.requested} penerima</li>
        {result.skipped > 0 && <li>{result.skipped} dilewati (sudah dibuat proses lain)</li>}
        {result.not_planned > 0 && <li>{result.not_planned} dipilih tetapi sudah tidak terencana</li>}
        {result.failed > 0 && <li className="text-destructive">{result.failed} gagal disiapkan (lihat log server backend)</li>}
        {!!result.unassigned && <li>{result.unassigned} alat jatuh tempo tanpa penanggung jawab tidak dikirim ke siapa pun</li>}
      </ul>
      {!result.email_enabled && (
        <Notice tone="warn" icon={<AlertTriangle className="size-4" aria-hidden="true" />}>
          Pengiriman email belum diaktifkan (mode uji): email dicatat sebagai terkirim, tetapi <strong>tidak benar-benar dikirim</strong>. Aktifkan di <Link href="/email-settings" className="underline">Pengaturan Email</Link>.
        </Notice>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCopy}><Copy /> Salin hasil</Button>
        <Button onClick={onClose}>Tutup</Button>
      </div>
    </div>
  );
}
