"use client";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/features/common/page-header";
import { ROLE_LABEL } from "@/lib/constants";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/schemas/auth";
import { accountService } from "@/lib/services";

const SIGN_OUT_DELAY_MS = 2500;

export function AccountPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function onSubmit(v: ChangePasswordInput) {
    setServerError(null);
    try {
      await accountService.changePassword({ current_password: v.current_password, new_password: v.new_password });
      setDone(true);
      // Backend mencabut semua refresh token pengguna (termasuk sesi ini): keluar dan masuk lagi dengan password baru.
      timer.current = setTimeout(() => void signOut({ callbackUrl: "/login" }), SIGN_OUT_DELAY_MS);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Password gagal diubah";
      if (/password lama/i.test(message)) setError("current_password", { message });
      else setServerError(message);
    }
  }

  const field = (id: keyof ChangePasswordInput, label: string, autoComplete: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} disabled={done || isSubmitting}
        aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-error` : undefined} {...register(id)} />
      {errors[id] && <p id={`${id}-error`} className="text-sm text-destructive">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <>
      <PageHeader title="Akun Saya" description="Informasi akun dan penggantian password." />

      <div className="grid max-w-3xl gap-6">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold">Akun</h2>
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Nama</dt><dd>{user?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Email</dt><dd className="break-all">{user?.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Peran</dt><dd>{user?.role ? ROLE_LABEL[user.role] : "—"}</dd>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold">Ubah password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Minimal 8 karakter, mengandung huruf dan angka. Setelah berhasil, semua sesi Anda diakhiri dan Anda perlu masuk lagi dengan password baru.
          </p>

          {done ? (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p>Password berhasil diubah. Anda akan dialihkan ke halaman masuk.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => void signOut({ callbackUrl: "/login" })}>Keluar sekarang</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 max-w-sm space-y-4">
              {serverError && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError}
                </div>
              )}
              {field("current_password", "Password lama", "current-password")}
              {field("new_password", "Password baru", "new-password")}
              {field("confirm_password", "Ulangi password baru", "new-password")}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Tampilkan password
              </label>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Simpan password</Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
