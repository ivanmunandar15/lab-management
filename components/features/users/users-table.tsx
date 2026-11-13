"use client";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Pencil, UserCheck, UserPlus, UserX } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { DataTable } from "@/components/features/common/data-table";
import { ROLE_LABEL } from "@/lib/constants";
import { useRestoreUser, useSoftDeleteUser, useUsers } from "@/hooks/use-users";
import { useCan } from "@/components/features/equipment/use-can";
import { UserFormSheet } from "./user-form-sheet";
import { cn } from "@/lib/utils";
import type { PublicUser, Role } from "@/types/erd";

export function UsersTable() {
  const { data = [], isLoading, error, refetch } = useUsers({ includeInactive: true });
  const deactivate = useSoftDeleteUser();
  const restore = useRestoreUser();
  const can = useCan("user");
  const canEdit = can("update");
  const meId = useSession().data?.user?.id;
  const [pending, setPending] = useState<{ users: PublicUser[]; clear: () => void } | null>(null);
  const [form, setForm] = useState<{ open: boolean; user: PublicUser | null }>({ open: false, user: null });
  const [toggle, setToggle] = useState<PublicUser | null>(null);

  const columns = useMemo<ColumnDef<PublicUser>[]>(() => [
    { accessorKey: "name", header: "Nama", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Peran", cell: ({ getValue }) => ROLE_LABEL[getValue<Role>()] },
    {
      accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => {
        const active = getValue<boolean>();
        return (
          <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
            active ? "border-green-300 bg-green-100 text-green-800 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300"
                   : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300")}>
            {active ? "Aktif" : "Nonaktif"}
          </span>
        );
      },
      // filter dropdown memakai nilai string
      filterFn: (row, id, value) => String(row.getValue(id)) === value,
    },
    {
      accessorKey: "created_at", header: "Dibuat",
      cell: ({ getValue }) => format(new Date(getValue<string>()), "d MMM yyyy", { locale: idLocale }),
    },
    ...(canEdit ? [{
      id: "actions", header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }: { row: { original: PublicUser } }) => {
        const u = row.original;
        const self = u.user_id === meId;
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" aria-label={`Edit ${u.name}`} onClick={() => setForm({ open: true, user: u })}><Pencil /></Button>
            <Button size="sm" variant="ghost" disabled={self && u.is_active} aria-label={`${u.is_active ? "Nonaktifkan" : "Aktifkan"} ${u.name}`}
              title={self && u.is_active ? "Akun sendiri tidak dapat dinonaktifkan" : undefined} onClick={() => setToggle(u)}>
              {u.is_active ? <UserX /> : <UserCheck />}
            </Button>
          </div>
        );
      },
    } as ColumnDef<PublicUser>] : []),
  ], [canEdit, meId]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        getRowId={(u) => u.user_id}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        enableRowSelection={canEdit}
        onRowClick={canEdit ? (u) => setForm({ open: true, user: u }) : undefined}
        toolbarActions={can("create") ? <Button onClick={() => setForm({ open: true, user: null })}><UserPlus /> Tambah Pengguna</Button> : undefined}
        searchPlaceholder="Cari nama atau email…"
        filters={[
          { columnId: "role", label: "Peran", options: (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] })) },
          { columnId: "is_active", label: "Status", options: [{ value: "true", label: "Aktif" }, { value: "false", label: "Nonaktif" }] },
        ]}
        bulkActions={(rows, clear) => (
          <Button size="sm" variant="outline" onClick={() => setPending({ users: rows.filter((r) => r.is_active && r.user_id !== meId), clear })} disabled={rows.every((r) => !r.is_active || r.user_id === meId)}>
            <UserX /> Nonaktifkan
          </Button>
        )}
        emptyTitle="Belum ada pengguna"
        emptyDescription="Pengguna yang ditambahkan admin akan tampil di sini."
      />
      <UserFormSheet open={form.open} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} user={form.user} currentUserId={meId} />
      <ConfirmDialog
        open={!!toggle}
        onOpenChange={(o) => !o && setToggle(null)}
        variant={toggle?.is_active ? "destructive" : "default"}
        title={toggle?.is_active ? `Nonaktifkan ${toggle?.name}?` : `Aktifkan kembali ${toggle?.name}?`}
        description={toggle?.is_active ? "Pengguna tidak bisa masuk lagi. Datanya tetap tersimpan dan bisa diaktifkan kembali." : "Pengguna dapat masuk kembali ke sistem."}
        confirmLabel={toggle?.is_active ? "Nonaktifkan" : "Aktifkan"}
        onConfirm={async () => {
          if (!toggle) return;
          try {
            await (toggle.is_active ? deactivate : restore).mutateAsync(toggle.user_id);
            toast.success(toggle.is_active ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan kembali");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Aksi gagal");
          }
        }}
      />
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        variant="destructive"
        title={`Nonaktifkan ${pending?.users.length ?? 0} pengguna?`}
        description="Pengguna yang dinonaktifkan tidak bisa masuk lagi. Datanya tetap tersimpan dan bisa diaktifkan kembali."
        confirmLabel="Nonaktifkan"
        onConfirm={async () => {
          const users = pending?.users ?? [];
          const results = await Promise.allSettled(users.map((u) => deactivate.mutateAsync(u.user_id)));
          const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
          const done = users.length - failed.length;
          if (done > 0) toast.success(`${done} pengguna dinonaktifkan`);
          if (failed.length > 0) toast.error(failed[0].reason instanceof Error ? failed[0].reason.message : "Sebagian pengguna gagal dinonaktifkan");
          pending?.clear();
        }}
      />
    </>
  );
}
