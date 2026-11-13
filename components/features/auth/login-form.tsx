"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const res = await signIn("credentials", { ...values, redirect: false });
      if (!res || res.error) {
        setServerError("Email atau kata sandi salah, atau akun Anda nonaktif.");
        return;
      }
      toast.success("Berhasil masuk");
      router.replace(getSafeCallbackUrl(params.get("callbackUrl")));
      router.refresh();
    } catch {
      setServerError("Tidak dapat terhubung ke server. Coba lagi sebentar lagi.");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Masuk ke akun Anda</h1>
      <p className="mt-1 text-sm text-muted-foreground">Gunakan email dan kata sandi yang diberikan admin.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="nama@lab.test"
            aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
          {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-11"
              aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-8 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Akun demo (mode pengembangan)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Klik untuk mengisi form. Kata sandi: {DEMO_PASSWORD}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button key={a.email} type="button" variant="outline" size="sm"
                onClick={() => { setValue("email", a.email, { shouldValidate: true }); setValue("password", DEMO_PASSWORD, { shouldValidate: true }); }}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
