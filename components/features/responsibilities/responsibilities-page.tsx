"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { PageHeader } from "@/components/features/common/page-header";
import { MetaBadge } from "@/components/features/common/status-badge";
import { useDeleteResponsibility, useResponsibilities } from "@/hooks";
import { ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@/types/erd";
import type { ResponsibilityRule } from "@/types/responsibility";
import { AddRuleDialog } from "./add-rule-dialog";

export function ResponsibilitiesPage() {
  const overview = useResponsibilities();
  const del = useDeleteResponsibility();
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<ResponsibilityRule | null>(null);

  const rules = overview.data?.rules ?? [];
  const cov = overview.data?.coverage;

  async function remove() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.responsibility_id);
      toast.success("Aturan dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aturan gagal dihapus");
    }
    setToDelete(null);
  }

  return (
    <>
      <PageHeader
        title="Penanggung Jawab Alat"
        description="Menentukan siapa yang menerima email pengingat kalibrasi untuk alat tertentu. Setiap orang hanya menerima email untuk alat yang menjadi tanggung jawabnya."
        actions={<Button onClick={() => setAdding(true)}><Plus /> Tambah aturan</Button>}
      />

      <ul className="mb-4 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
        <li>Satu aturan = satu orang + awalan kode inventaris dan/atau ruangan. Satu alat boleh punya beberapa penanggung jawab.</li>
        <li>Alat yang tidak punya penanggung jawab <strong>tidak dikirimi email ke siapa pun</strong> (tidak ada pengiriman ke semua SPV).</li>
        <li>Penanggung jawab ruangan (PIC) tetap menerima email untuk alat di ruangannya.</li>
        <li>Setiap orang menerima satu email ringkasan berisi hanya alat tanggung jawabnya. Orang yang mematikan email atau nonaktif dilewati.</li>
      </ul>

      {cov && (
        <Card className="mb-4 p-4" aria-label="Cakupan penanggung jawab">
          {cov.unassigned === 0 ? (
            <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-green-600" aria-hidden="true" /> Semua <strong>{cov.scheduled_equipment}</strong> alat berjadwal kalibrasi punya penanggung jawab.</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600" aria-hidden="true" />
                <span><strong>{cov.unassigned}</strong> dari {cov.scheduled_equipment} alat berjadwal kalibrasi belum punya penanggung jawab (tidak akan menerima email pengingat).</span></p>
              {cov.unassigned_sample.length > 0 && (
                <p className="pl-6 text-xs text-muted-foreground">Contoh: <span className="font-mono">{cov.unassigned_sample.join(", ")}</span>{cov.unassigned > cov.unassigned_sample.length && " …"}</p>
              )}
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        {overview.isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label="Memuat aturan">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : overview.error ? (
          <ErrorState title="Aturan gagal dimuat" description={overview.error instanceof Error ? overview.error.message : undefined} onRetry={() => overview.refetch()} />
        ) : rules.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Belum ada penanggung jawab" description="Tambahkan aturan agar email pengingat kalibrasi dikirim ke orang yang tepat." action={<Button onClick={() => setAdding(true)}><Plus /> Tambah aturan</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Penanggung jawab</TableHead>
                  <TableHead>Awalan kode</TableHead>
                  <TableHead>Ruangan</TableHead>
                  <TableHead className="text-right">Alat cocok</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.responsibility_id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{r.user.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{ROLE_LABEL[r.user.role as Role] ?? r.user.role}</span>
                        {!r.user.is_active && <MetaBadge meta={{ label: "Nonaktif", tone: "red" }} />}
                        {r.user.is_active && !r.user.email_notifications && <MetaBadge meta={{ label: "Email dimatikan", tone: "yellow" }} />}
                      </div>
                      <div className="break-all text-xs text-muted-foreground">{r.user.email}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">{r.code_prefix ?? "—"}</TableCell>
                    <TableCell>{r.room ? r.room.room_name : <span className="text-muted-foreground">Semua ruangan</span>}</TableCell>
                    <TableCell className={`text-right tabular-nums ${r.equipment_count === 0 ? "text-destructive" : ""}`}>
                      {r.equipment_count === 0 ? "0 (tidak cocok)" : r.equipment_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" aria-label={`Hapus aturan ${r.user.name} ${r.code_prefix ?? r.room?.room_name ?? ""}`} onClick={() => setToDelete(r)}><Trash2 /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AddRuleDialog open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus aturan penanggung jawab?"
        description={toDelete && <>{toDelete.user.name} tidak lagi menerima email pengingat untuk {toDelete.code_prefix ? <>alat berawalan <strong>{toDelete.code_prefix}</strong></> : "alat"}{toDelete.room ? <> di <strong>{toDelete.room.room_name}</strong></> : null}. Alat yang tidak punya penanggung jawab lain tidak akan dikirimi email.</>}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={remove}
      />
    </>
  );
}
