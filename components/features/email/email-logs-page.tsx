"use client";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Info, Loader2, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { PageHeader } from "@/components/features/common/page-header";
import { MetaBadge } from "@/components/features/common/status-badge";
import { queryKeys, useEmailLogs, useRetryEmail } from "@/hooks";
import { EMAIL_STATUS_LABEL, emailStatusMeta, REMINDER_LABEL } from "@/lib/email-status";
import type { EmailLog, EmailReminderType, EmailStatus } from "@/types/email";
import { EmailLogDetailDialog } from "./email-log-detail-dialog";
import { SendTestEmailButton } from "./send-test-email";

const PAGE_SIZE = 20;
const sel = "h-10 w-full text-sm";

export function EmailLogsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const retry = useRetryEmail();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<EmailStatus | "">("");
  const [type, setType] = useState<EmailReminderType | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<EmailLog | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => ({
    page, limit: PAGE_SIZE,
    status: status || undefined,
    reminder_type: type || undefined,
    search: search || undefined,
    date_from: from || undefined,
    date_to: to || undefined,
  }), [page, status, type, search, from, to]);

  const logs = useEmailLogs(params);
  const items = logs.data?.items ?? [];
  const meta = logs.data?.meta;
  const hasFilter = !!(status || type || searchInput || from || to);
  const reset = () => { setStatus(""); setType(""); setSearchInput(""); setSearch(""); setFrom(""); setTo(""); setPage(1); };

  async function doRetry(log: EmailLog) {
    setRetryingId(log.email_log_id);
    try {
      await retry.mutateAsync(log.email_log_id);
      toast.success("Email diantrekan ulang", { description: "Diproses di belakang layar; daftar dimuat ulang sebentar lagi." });
      setSelected(null);
      // Pengiriman ulang berjalan async di backend: muat ulang lagi setelah jeda singkat untuk melihat hasilnya.
      setTimeout(() => qc.invalidateQueries({ queryKey: queryKeys.emailLogs.all }), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengantrekan ulang email");
    } finally {
      setRetryingId(null);
    }
  }

  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const rangeEnd = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <>
      <PageHeader
        title="Log Email"
        description="Riwayat email pengingat dan email uji, beserta status pengiriman dan pesan error-nya. Email uji dikirim ke alamat akun Anda."
        actions={<SendTestEmailButton />}
      />

      <p className="mb-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Email uji dikirim ke {session?.user?.email ? <strong className="break-all">{session.user.email}</strong> : "alamat akun yang sedang login"}.
          Status &ldquo;Tidak dikirim (mode uji)&rdquo; berarti backend berjalan dengan EMAIL_ENABLED=false: email dicatat sebagai terkirim padahal tidak ada yang keluar.
        </span>
      </p>

      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5"><Label htmlFor="el-status">Status</Label>
          <NativeSelect id="el-status" className={sel} value={status} onChange={(e) => { setStatus(e.target.value as EmailStatus | ""); setPage(1); }}>
            <option value="">Semua</option>
            {(Object.keys(EMAIL_STATUS_LABEL) as EmailStatus[]).map((s) => <option key={s} value={s}>{EMAIL_STATUS_LABEL[s]}</option>)}
          </NativeSelect></div>
        <div className="space-y-1.5"><Label htmlFor="el-type">Jenis</Label>
          <NativeSelect id="el-type" className={sel} value={type} onChange={(e) => { setType(e.target.value as EmailReminderType | ""); setPage(1); }}>
            <option value="">Semua</option>
            {(Object.keys(REMINDER_LABEL) as EmailReminderType[]).map((t) => <option key={t} value={t}>{REMINDER_LABEL[t]}</option>)}
          </NativeSelect></div>
        <div className="space-y-1.5 lg:col-span-1"><Label htmlFor="el-search">Cari</Label>
          <Input id="el-search" className={sel} placeholder="Penerima atau subjek" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="el-from">Dari tanggal</Label>
          <Input id="el-from" type="date" className={sel} value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="el-to">Sampai tanggal</Label>
          <Input id="el-to" type="date" className={sel} value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div>
        <div className="flex items-end"><Button variant="ghost" className="h-10 w-full" disabled={!hasFilter} onClick={reset}>Reset filter</Button></div>
      </div>

      <Card className="overflow-hidden">
        {logs.isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label="Memuat log email">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : logs.error ? (
          <ErrorState
            title="Log email gagal dimuat"
            description={logs.error instanceof Error ? logs.error.message : undefined}
            onRetry={() => logs.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={hasFilter ? "Tidak ada email yang cocok" : "Belum ada email"}
            description={hasFilter ? "Coba ubah atau reset filter." : "Email pengingat dan email uji akan tercatat di sini."}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Subjek</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Percobaan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.email_log_id} className="cursor-pointer" onClick={() => setSelected(l)}>
                    <TableCell className="whitespace-nowrap">{format(new Date(l.created_at), "d MMM yyyy, HH:mm", { locale: idLocale })}</TableCell>
                    <TableCell className="max-w-[14rem] truncate" title={l.recipient_email}>{l.recipient_email}</TableCell>
                    <TableCell className="max-w-[20rem] truncate" title={l.subject}>{l.subject}</TableCell>
                    <TableCell className="whitespace-nowrap">{REMINDER_LABEL[l.reminder_type]}</TableCell>
                    <TableCell><MetaBadge meta={emailStatusMeta(l)} /></TableCell>
                    <TableCell className="text-right tabular-nums">{l.attempts}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(l)}>Detail</Button>
                        {l.status === "failed" && (
                          <Button size="sm" variant="outline" disabled={retryingId === l.email_log_id} onClick={() => doRetry(l)}>
                            {retryingId === l.email_log_id ? <Loader2 className="animate-spin" /> : <RotateCcw />} Kirim ulang
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {meta && meta.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span aria-live="polite">Menampilkan {rangeStart}–{rangeEnd} dari {meta.total} email</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={meta.page <= 1 || logs.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft /> Sebelumnya</Button>
            <span className="tabular-nums">Hal. {meta.page} / {meta.totalPages}</span>
            <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages || logs.isFetching} onClick={() => setPage((p) => p + 1)}>Berikutnya <ChevronRight /></Button>
          </div>
        </div>
      )}

      <EmailLogDetailDialog log={selected} onClose={() => setSelected(null)} onRetry={doRetry} retrying={!!selected && retryingId === selected.email_log_id} />
    </>
  );
}
