"use client";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/features/borrowing/field";
import { useCreateUser, useUpdateUser } from "@/hooks";
import { ROLE_LABEL } from "@/lib/constants";
import { ServiceError } from "@/lib/services";
import { roleSchema } from "@/lib/schemas/enums";
import type { PublicUser, Role } from "@/types/erd";

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100, "Maksimal 100 karakter"),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  role: roleSchema,
  status: z.enum(["active", "inactive"]),
  password: z.string(),
});
type Values = z.infer<typeof schema>;
const toValues = (u?: PublicUser | null): Values => ({
  name: u?.name ?? "", email: u?.email ?? "", role: u?.role ?? "technician",
  status: u && !u.is_active ? "inactive" : "active", password: "",
});
const fieldClass = "h-11 w-full text-base sm:h-10 sm:text-sm";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; user?: PublicUser | null; currentUserId?: string }

export function UserFormSheet({ open, onOpenChange, user, currentUserId }: Props) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const { register, reset, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues() });
  const isEdit = !!user;
  const isSelf = !!user && user.user_id === currentUserId;
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) reset(toValues(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.user_id]);

  async function onSubmit(v: Values) {
    try {
      if (user) {
        await update.mutateAsync({ id: user.user_id, data: { name: v.name, email: v.email, role: v.role, is_active: v.status === "active" } });
      } else {
        if (v.password.length < 8) return setError("password", { message: "Kata sandi minimal 8 karakter" });
        await create.mutateAsync({ name: v.name, email: v.email, role: v.role, password: v.password });
      }
      toast.success(isEdit ? "Pengguna diperbarui" : "Pengguna ditambahkan");
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "CONFLICT" && /email/i.test(e.message)) setError("email", { message: e.message });
      toast.error(e instanceof Error ? e.message : "Pengguna gagal disimpan");
    }
  }

  return (
    <BottomSheet
      open={open} onOpenChange={(o) => !pending && onOpenChange(o)} title={isEdit ? "Edit Pengguna" : "Tambah Pengguna"}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1 sm:h-10" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" form="user-form" className="h-11 flex-[2] sm:h-10" disabled={pending}>{pending && <Loader2 className="animate-spin" />} Simpan</Button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pb-2">
        <Field label="Nama lengkap" htmlFor="user-name" error={errors.name?.message}>
          <Input id="user-name" className={fieldClass} autoComplete="off" aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="user-email" error={errors.email?.message}>
          <Input id="user-email" type="email" className={fieldClass} autoComplete="off" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Peran" htmlFor="user-role" error={errors.role?.message} hint={isSelf ? "Peran akun sendiri tidak dapat diubah." : undefined}>
            <NativeSelect id="user-role" className={fieldClass} disabled={isSelf} {...register("role")}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </NativeSelect>
          </Field>
          {isEdit && (
            <Field label="Status" htmlFor="user-status" hint={isSelf ? "Akun sendiri tidak dapat dinonaktifkan." : undefined}>
              <NativeSelect id="user-status" className={fieldClass} disabled={isSelf} {...register("status")}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </NativeSelect>
            </Field>
          )}
        </div>
        {!isEdit && (
          <Field label="Kata sandi awal" htmlFor="user-pass" error={errors.password?.message} hint="Minimal 8 karakter. Sampaikan ke pengguna secara aman.">
            <Input id="user-pass" type="password" className={fieldClass} autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
          </Field>
        )}
      </form>
    </BottomSheet>
  );
}
