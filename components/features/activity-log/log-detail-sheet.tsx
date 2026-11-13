"use client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { describeActivity } from "@/lib/activity-text";
import type { ActivityLog } from "@/types/erd";

const show = (v: unknown) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));

export function LogDetailSheet({ log, userName, onClose }: { log: ActivityLog | null; userName: string; onClose: () => void }) {
  const keys = log ? Array.from(new Set([...Object.keys(log.old_data ?? {}), ...Object.keys(log.new_data ?? {})])) : [];
  return (
    <BottomSheet open={!!log} onOpenChange={(o) => !o && onClose()} title="Detail Aktivitas">
      {log && (
        <div className="space-y-5 pb-2">
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Waktu</dt>
            <dd>{format(new Date(log.created_at), "EEEE, d MMMM yyyy HH:mm:ss", { locale: idLocale })}</dd>
            <dt className="text-muted-foreground">Pengguna</dt>
            <dd className="font-medium">{userName}</dd>
            <dt className="text-muted-foreground">Aktivitas</dt>
            <dd>{describeActivity(log.action, log.entity_type)}</dd>
            <dt className="text-muted-foreground">Entitas</dt>
            <dd className="break-all font-mono text-xs">{log.entity_type} / {log.entity_id}</dd>
            <dt className="text-muted-foreground">Alamat IP</dt>
            <dd className="font-mono text-xs">{log.ip_address}</dd>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Perubahan data</h3>
            {keys.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Aktivitas ini tidak menyimpan perubahan data.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr><th className="px-3 py-2 font-medium">Field</th><th className="px-3 py-2 font-medium">Sebelum</th><th className="px-3 py-2 font-medium">Sesudah</th></tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k} className="border-t align-top">
                        <td className="px-3 py-2 font-mono text-xs">{k}</td>
                        <td className="break-all px-3 py-2 text-red-700 dark:text-red-300">{show(log.old_data?.[k])}</td>
                        <td className="break-all px-3 py-2 text-green-700 dark:text-green-300">{show(log.new_data?.[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
