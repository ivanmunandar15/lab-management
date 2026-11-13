"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, BellRing, CheckCheck, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { MetaBadge } from "@/components/features/common/status-badge";
import { PageHeader } from "@/components/features/common/page-header";
import { useGenerateNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks";
import { timeAgo } from "@/lib/format";
import { getNotificationHref } from "@/lib/notification-link";
import { GENERATOR_LABEL, type NotificationGeneratorKind } from "@/lib/services";
import { NOTIFICATION_TYPE_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/erd";

export function NotificationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const canGenerate = session?.user?.role === "admin" || session?.user?.role === "SPV";
  const [type, setType] = useState<NotificationType | "">("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const list = useNotifications(userId ? { user_id: userId, type: type || undefined, unreadOnly } : undefined);
  const all = useNotifications(userId ? { user_id: userId } : undefined);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const generate = useGenerateNotifications();

  const unread = (all.data ?? []).filter((n) => !n.is_read).length;
  const rows = userId ? list.data ?? [] : [];

  async function open(n: Notification) {
    if (!n.is_read) await markRead.mutateAsync(n.notification_id).catch(() => undefined);
    router.push(getNotificationHref(n));
  }
  async function readAll() {
    if (!userId) return;
    try { const c = await markAll.mutateAsync(userId); toast.success(`${c} notifikasi ditandai dibaca`); }
    catch { toast.error("Gagal menandai notifikasi"); }
  }
  async function run(kinds: NotificationGeneratorKind[]) {
    try {
      const n = await generate.mutateAsync(kinds);
      n > 0 ? toast.success(`${n} notifikasi dibuat`) : toast.info("Tidak ada notifikasi baru", { description: "Kondisi belum memenuhi, atau notifikasi serupa sudah dibuat hari ini." });
    } catch { toast.error("Generator gagal dijalankan"); }
  }

  return (
    <>
      <PageHeader
        title="Notifikasi" description="Pemberitahuan peminjaman, kalibrasi, perawatan, dan kondisi ruangan."
        actions={
          <>
            {canGenerate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={generate.isPending}>{generate.isPending ? <Loader2 className="animate-spin" /> : <FlaskConical />} Buat notifikasi</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Buat dari kondisi data saat ini</DropdownMenuLabel>
                  {(Object.keys(GENERATOR_LABEL) as NotificationGeneratorKind[]).map((k) => (
                    <DropdownMenuItem key={k} onSelect={() => run([k])}>{GENERATOR_LABEL[k]}</DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => run(Object.keys(GENERATOR_LABEL) as NotificationGeneratorKind[])}>Jalankan semua</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" disabled={unread === 0 || markAll.isPending} onClick={readAll}><CheckCheck /> Tandai semua dibaca</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <NativeSelect aria-label="Filter tipe" value={type} onChange={(e) => setType(e.target.value as NotificationType | "")}>
          <option value="">Tipe: Semua</option>
          {(Object.keys(NOTIFICATION_TYPE_META) as NotificationType[]).map((t) => <option key={t} value={t}>{NOTIFICATION_TYPE_META[t].label}</option>)}
        </NativeSelect>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Belum dibaca saja
        </label>
        <p className="text-sm text-muted-foreground sm:ml-auto" role="status">{unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p>
      </div>

      <Card>
        {list.isLoading || !userId ? (
          <div className="space-y-2 p-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Bell} title={unreadOnly || type ? "Tidak ada notifikasi yang cocok" : "Belum ada notifikasi"}
            description={unreadOnly || type ? "Ubah filter untuk melihat notifikasi lain." : "Pemberitahuan baru akan tampil di sini."} />
        ) : (
          <ul className="divide-y">
            {rows.map((n) => (
              <li key={n.notification_id}>
                <button type="button" onClick={() => open(n)} className={cn("flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50", !n.is_read && "bg-primary/5")}>
                  <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary")} aria-hidden="true">
                    {n.is_read ? <Bell className="size-4" /> : <BellRing className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</span>
                      <MetaBadge meta={NOTIFICATION_TYPE_META[n.notification_type]} />
                      {!n.is_read && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Baru</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
