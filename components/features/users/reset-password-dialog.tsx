"use client";
import { useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { copyText } from "@/lib/clipboard";
import { accountService } from "@/lib/services";
import type { PublicUser } from "@/types/erd";

/** Admin: buat password sementara untuk pengguna. Password hanya tampil sekali di dialog ini. */
export function ResetPasswordDialog({ user, onClose }: { user: PublicUser | null; onClose: () => void }) {
  const [temp, setTemp] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setTemp(null);
    setError(null);
    onClose();
  }

  async function run() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const r = await accountService.resetUserPassword(user.user_id);
      if (!r.temporary_password) throw new Error("Backend tidak mengembalikan password sementara");
      setTemp(r.temporary_password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset password gagal");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (temp && (await copyText(temp))) toast.success("Password sementara disalin");
    else toast.error("Gagal menyalin", { description: "Browser memblokir clipboard (butuh HTTPS). Salin teks secara manual." });
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        {user && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KeyRound className="size-5" aria-hidden="true" />{temp ? "Password sementara dibuat" : `Reset password ${user.name}?`}</DialogTitle>
              <DialogDescription>
                {temp
                  ? "Berikan password ini kepada pengguna lewat saluran yang aman, dan minta ia menggantinya di menu Akun saya."
                  : "Backend membuat password sementara baru. Password lama tidak berlaku lagi dan semua sesi pengguna ini diakhiri."}
              </DialogDescription>
            </DialogHeader>

            {temp ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 select-all break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm" aria-label="Password sementara">{temp}</code>
                  <Button variant="outline" onClick={copy}><Copy /> Salin</Button>
                </div>
                <p role="note" className="text-sm text-yellow-900 dark:text-yellow-200">Password ini hanya ditampilkan sekali. Setelah dialog ditutup, Anda tidak bisa melihatnya lagi.</p>
                <div className="flex justify-end"><Button onClick={close}>Selesai</Button></div>
              </>
            ) : (
              <>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={close} disabled={pending}>Batal</Button>
                  <Button onClick={run} disabled={pending}>{pending && <Loader2 className="animate-spin" />} Buat password sementara</Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
