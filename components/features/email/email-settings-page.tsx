"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Info, Loader2, Mail, RotateCcw, Save, Wifi, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { ErrorState } from "@/components/features/common/error-state";
import { PageHeader } from "@/components/features/common/page-header";
import { useEmailSettings, useResetEmailSettings, useTestSmtp, useUpdateEmailSettings } from "@/hooks";
import type { CalibrationEmailMode, EmailSettingsPatch, EmailSettingsView, SmtpTestResult } from "@/types/email";
import { SendTestEmailButton } from "./send-test-email";

/** Bentuk form: angka disimpan sebagai teks agar bisa diketik bebas, divalidasi saat simpan. */
interface Form {
  email_enabled: boolean;
  calibration_email_mode: CalibrationEmailMode;
  overdue_repeat_days: string;
  calibration_job_time: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  clear_smtp_pass: boolean;
  mail_from: string;
  frontend_url: string;
}

const toForm = (d: EmailSettingsView): Form => ({
  email_enabled: d.email_enabled,
  calibration_email_mode: d.calibration_email_mode,
  overdue_repeat_days: String(d.overdue_repeat_days),
  calibration_job_time: d.calibration_job_time,
  smtp_host: d.smtp_host,
  smtp_port: String(d.smtp_port),
  smtp_secure: d.smtp_secure,
  smtp_user: d.smtp_user,
  smtp_pass: "",
  clear_smtp_pass: false,
  mail_from: d.mail_from,
  frontend_url: d.frontend_url,
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const isUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

type Errors = Partial<Record<keyof Form, string>>;
type SmtpOutcome = { kind: "result"; result: SmtpTestResult } | { kind: "error"; message: string };

/** Bandingkan form dengan nilai server; hasilnya hanya field yang berubah (PATCH parsial) + galat validasi. */
function buildPatch(form: Form, base: EmailSettingsView): { patch: EmailSettingsPatch; errors: Errors } {
  const patch: EmailSettingsPatch = {};
  const errors: Errors = {};

  if (form.email_enabled !== base.email_enabled) patch.email_enabled = form.email_enabled;
  if (form.calibration_email_mode !== base.calibration_email_mode) patch.calibration_email_mode = form.calibration_email_mode;

  const days = Number(form.overdue_repeat_days);
  if (!Number.isInteger(days) || days < 1 || days > 30 || form.overdue_repeat_days.trim() === "") errors.overdue_repeat_days = "Isi bilangan bulat 1–30";
  else if (days !== base.overdue_repeat_days) patch.overdue_repeat_days = days;

  if (!TIME_RE.test(form.calibration_job_time)) errors.calibration_job_time = "Isi jam yang valid, mis. 07:00";
  else if (form.calibration_job_time !== base.calibration_job_time) patch.calibration_job_time = form.calibration_job_time;

  const host = form.smtp_host.trim();
  if (!host) errors.smtp_host = "Host SMTP wajib diisi";
  else if (host !== base.smtp_host) patch.smtp_host = host;

  const port = Number(form.smtp_port);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || form.smtp_port.trim() === "") errors.smtp_port = "Port 1–65535";
  else if (port !== base.smtp_port) patch.smtp_port = port;

  if (form.smtp_secure !== base.smtp_secure) patch.smtp_secure = form.smtp_secure;
  if (form.smtp_user.trim() !== base.smtp_user) patch.smtp_user = form.smtp_user.trim();

  if (form.smtp_pass) patch.smtp_pass = form.smtp_pass;
  else if (form.clear_smtp_pass) patch.clear_smtp_pass = true;

  const from = form.mail_from.trim();
  if (from.length < 3) errors.mail_from = "Pengirim minimal 3 karakter";
  else if (from !== base.mail_from) patch.mail_from = from;

  const url = form.frontend_url.trim();
  if (!isUrl(url)) errors.frontend_url = "Isi URL lengkap, mis. https://lab.contoh.ac.id";
  else if (url !== base.frontend_url) patch.frontend_url = url;

  return { patch, errors };
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: "warn" | "info"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "warn"
    ? "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200"
    : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200";
  return <div role="note" className={`flex items-start gap-2 rounded-md border p-3 text-sm ${cls}`}><span className="mt-0.5 shrink-0">{icon}</span><div>{children}</div></div>;
}

function SmtpOutcomeView({ outcome }: { outcome: SmtpOutcome }) {
  if (outcome.kind === "error") {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
        <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Permintaan gagal: {outcome.message}</span>
      </p>
    );
  }
  const r = outcome.result;
  if (r.ok) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Terhubung ke <strong>{r.host}:{r.port}</strong> dan login berhasil.</span>
      </p>
    );
  }
  return (
    <div role="alert" className="space-y-1 text-sm text-destructive">
      <p className="flex items-start gap-2"><XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Gagal terhubung ke <strong>{r.host}:{r.port}</strong>.</span></p>
      {r.error && <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-2 font-mono text-xs text-foreground">{r.error}</pre>}
    </div>
  );
}

const MODE_OPTIONS: { value: CalibrationEmailMode; title: string; desc: string }[] = [
  { value: "auto", title: "Otomatis", desc: "Job harian mengirim email pengingat ke semua penanggung jawab alat yang jatuh tempo." },
  { value: "manual", title: "Manual", desc: "Job harian hanya membuat notifikasi di aplikasi. Email dikirim admin lewat tombol \"Kirim email pengingat\" di Log Email, ke penerima yang dipilih." },
];

export function EmailSettingsPage() {
  const settings = useEmailSettings();
  const update = useUpdateEmailSettings();
  const reset = useResetEmailSettings();
  const testSmtp = useTestSmtp();

  const base = settings.data;
  const [form, setForm] = useState<Form | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [smtpOutcome, setSmtpOutcome] = useState<SmtpOutcome | null>(null);

  // Isi ulang form setiap data server berubah (awal muat, setelah simpan, setelah reset).
  useEffect(() => {
    if (base) {
      setForm(toForm(base));
      setShowErrors(false);
    }
  }, [base]);

  const built = useMemo(() => (base && form ? buildPatch(form, base) : null), [base, form]);
  const dirty = !!built && Object.keys(built.patch).length > 0;
  const errors = built?.errors ?? {};
  const err = (k: keyof Form) => (showErrors ? errors[k] : undefined);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!built) return;
    if (Object.keys(built.errors).length > 0) {
      setShowErrors(true);
      toast.error("Periksa kembali isian yang ditandai");
      return;
    }
    if (!dirty) return;
    try {
      await update.mutateAsync(built.patch);
      setSmtpOutcome(null);
      toast.success("Pengaturan email disimpan", { description: "Berlaku langsung, tanpa restart server." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    }
  }

  async function runSmtpTest() {
    setSmtpOutcome(null);
    try {
      setSmtpOutcome({ kind: "result", result: await testSmtp.mutateAsync() });
    } catch (e) {
      setSmtpOutcome({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function doReset() {
    try {
      await reset.mutateAsync();
      setSmtpOutcome(null);
      toast.success("Pengaturan dikembalikan ke default .env");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengembalikan pengaturan");
    }
  }

  const busy = update.isPending || reset.isPending;
  const header = (
    <PageHeader
      title="Pengaturan Email"
      description="Atur email pengingat dari sini: mode otomatis/manual, jam pengiriman, dan server SMTP. Perubahan berlaku langsung tanpa mengedit file .env atau restart server."
      actions={<Button variant="outline" asChild><Link href="/email-logs"><Mail /> Log Email</Link></Button>}
    />
  );

  if (settings.isLoading || (base && !form)) {
    return (
      <>
        {header}
        <div className="space-y-4" aria-busy="true" aria-label="Memuat pengaturan">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </>
    );
  }
  if (settings.error || !base || !form) {
    return (
      <>
        {header}
        <Card>
          <ErrorState
            title="Pengaturan gagal dimuat"
            description={settings.error instanceof Error ? settings.error.message : undefined}
            onRetry={() => settings.refetch()}
          />
        </Card>
      </>
    );
  }

  const localhostWarning = form.email_enabled && ["localhost", "127.0.0.1"].includes(form.smtp_host.trim().toLowerCase());

  return (
    <>
      {header}

      <div className="mb-4">
        {base.using_defaults ? (
          <Notice tone="info" icon={<Info className="size-4" aria-hidden="true" />}>
            Belum pernah diubah dari halaman ini, jadi semua nilai di bawah masih berasal dari file <code>.env</code> backend. Setelah Anda menyimpan,
            nilai dari sini yang dipakai.
          </Notice>
        ) : (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>Terakhir disimpan {base.updated_at ? format(new Date(base.updated_at), "d MMM yyyy HH:mm", { locale: idLocale }) : "—"}. Nilai di sini menimpa isi <code>.env</code>.</span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Pengiriman email</CardTitle>
            <CardDescription>Saklar utama. Bila mati, email hanya dicatat di log (berstatus &ldquo;Tidak dikirim (mode uji)&rdquo;) dan tidak ada yang keluar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="es-enabled">Kirim email sungguhan</Label>
                <p className="mt-1 text-xs text-muted-foreground">{form.email_enabled ? "Aktif: email dikirim lewat server SMTP di bawah." : "Nonaktif: mode uji, tidak ada email keluar."}</p>
              </div>
              <Switch id="es-enabled" checked={form.email_enabled} onCheckedChange={(v) => set("email_enabled", v)} aria-label="Kirim email sungguhan" />
            </div>
            {localhostWarning && (
              <div className="mt-3">
                <Notice tone="warn" icon={<AlertTriangle className="size-4" aria-hidden="true" />}>
                  Email aktif tetapi host SMTP masih <code>{form.smtp_host.trim()}</code>. Isi server SMTP yang sebenarnya di bawah agar email sampai ke kotak masuk.
                </Notice>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengingat kalibrasi</CardTitle>
            <CardDescription>Berlaku untuk job harian. Notifikasi di dalam aplikasi selalu dibuat, apa pun modenya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Mode email</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODE_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${form.calibration_email_mode === o.value ? "border-primary bg-primary/5" : ""}`}
                  >
                    <input
                      type="radio"
                      name="es-mode"
                      className="mt-1"
                      checked={form.calibration_email_mode === o.value}
                      onChange={() => set("calibration_email_mode", o.value)}
                    />
                    <span><span className="block font-medium">{o.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{o.desc}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="es-time" label="Jam job harian" error={err("calibration_job_time")} hint="Mengikuti zona waktu server (default Asia/Jakarta). Berlaku untuk mode otomatis.">
                <Input id="es-time" type="time" value={form.calibration_job_time} onChange={(e) => set("calibration_job_time", e.target.value)} aria-invalid={!!err("calibration_job_time")} />
              </Field>
              <Field id="es-repeat" label="Ulangi pengingat terlambat tiap (hari)" error={err("overdue_repeat_days")} hint="Alat yang kalibrasinya terlambat diingatkan ulang sampai kalibrasi dicatat.">
                <Input id="es-repeat" type="number" inputMode="numeric" min={1} max={30} value={form.overdue_repeat_days} onChange={(e) => set("overdue_repeat_days", e.target.value)} aria-invalid={!!err("overdue_repeat_days")} />
              </Field>
            </div>

            {form.calibration_email_mode === "manual" && (
              <Notice tone="info" icon={<Info className="size-4" aria-hidden="true" />}>
                Mode manual: tidak ada email otomatis. Kirim lewat tombol &ldquo;Kirim email pengingat…&rdquo; di <Link href="/email-logs" className="underline">Log Email</Link>.
                Penerima ditentukan di menu <Link href="/responsibilities" className="underline">Penanggung Jawab</Link>.
              </Notice>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server SMTP</CardTitle>
            <CardDescription>Akun pengirim email. Untuk Gmail atau Microsoft 365, gunakan App Password, bukan password akun.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="es-host" label="Host SMTP" error={err("smtp_host")} hint="Mis. smtp.gmail.com">
                <Input id="es-host" value={form.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} autoComplete="off" aria-invalid={!!err("smtp_host")} />
              </Field>
              <Field id="es-port" label="Port" error={err("smtp_port")} hint="587 (STARTTLS) atau 465 (SSL/TLS)">
                <Input id="es-port" type="number" inputMode="numeric" min={1} max={65535} value={form.smtp_port} onChange={(e) => set("smtp_port", e.target.value)} aria-invalid={!!err("smtp_port")} />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="es-secure">Koneksi SSL/TLS langsung</Label>
                <p className="mt-1 text-xs text-muted-foreground">Aktifkan untuk port 465. Biarkan mati untuk port 587 atau 25 (STARTTLS otomatis bila didukung server).</p>
              </div>
              <Switch id="es-secure" checked={form.smtp_secure} onCheckedChange={(v) => set("smtp_secure", v)} aria-label="Koneksi SSL/TLS langsung" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="es-user" label="Username SMTP" hint="Kosongkan bila server tidak memerlukan login.">
                <Input id="es-user" value={form.smtp_user} onChange={(e) => set("smtp_user", e.target.value)} autoComplete="off" />
              </Field>
              <Field
                id="es-pass"
                label="Password SMTP"
                hint={base.smtp_pass_set ? "Sudah terisi dan tidak ditampilkan. Kosongkan bila tidak ingin mengubah. Disimpan terenkripsi di server." : "Belum diisi. Disimpan terenkripsi di server."}
              >
                <Input
                  id="es-pass"
                  type="password"
                  value={form.smtp_pass}
                  onChange={(e) => setForm((f) => (f ? { ...f, smtp_pass: e.target.value, clear_smtp_pass: false } : f))}
                  placeholder={base.smtp_pass_set ? "•••••••• (tersimpan)" : ""}
                  autoComplete="new-password"
                />
                {base.smtp_pass_set && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={form.clear_smtp_pass}
                      disabled={!!form.smtp_pass}
                      onChange={(e) => set("clear_smtp_pass", e.target.checked)}
                    />
                    Hapus password tersimpan (kembali ke SMTP_PASS di .env bila ada)
                  </label>
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="es-from" label="Pengirim (From)" error={err("mail_from")} hint={'Contoh: Lab Equipment <no-reply@kampus.ac.id>'}>
                <Input id="es-from" value={form.mail_from} onChange={(e) => set("mail_from", e.target.value)} aria-invalid={!!err("mail_from")} />
              </Field>
              <Field id="es-url" label="URL aplikasi (untuk tautan di email)" error={err("frontend_url")} hint="Alamat yang dibuka penerima saat menekan tautan di email.">
                <Input id="es-url" type="url" value={form.frontend_url} onChange={(e) => set("frontend_url", e.target.value)} aria-invalid={!!err("frontend_url")} />
              </Field>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={runSmtpTest} disabled={testSmtp.isPending || dirty}>
                  {testSmtp.isPending ? <Loader2 className="animate-spin" /> : <Wifi />} {testSmtp.isPending ? "Menguji…" : "Tes koneksi SMTP"}
                </Button>
                <SendTestEmailButton />
                {dirty && <span className="text-xs text-muted-foreground">Simpan dulu: tes memakai pengaturan yang sudah tersimpan.</span>}
              </div>
              {smtpOutcome && <SmtpOutcomeView outcome={smtpOutcome} />}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={busy || base.using_defaults}>
          <RotateCcw /> Kembalikan ke default .env
        </Button>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">Ada perubahan belum disimpan</span>}
          <Button variant="outline" onClick={() => base && setForm(toForm(base))} disabled={!dirty || busy}>Batalkan</Button>
          <Button onClick={save} disabled={!dirty || busy}>
            {update.isPending ? <Loader2 className="animate-spin" /> : <Save />} {update.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Kembalikan ke default .env?"
        description="Semua pengaturan email yang tersimpan dari halaman ini (termasuk password SMTP) dihapus, dan server kembali memakai isi file .env."
        confirmLabel="Ya, kembalikan"
        variant="destructive"
        onConfirm={doReset}
      />
    </>
  );
}
