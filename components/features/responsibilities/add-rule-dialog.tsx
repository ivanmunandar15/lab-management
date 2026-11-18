"use client";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateResponsibility, useRooms, useUsers } from "@/hooks";
import { ROLE_LABEL } from "@/lib/constants";

export function AddRuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const users = useUsers();
  const rooms = useRooms();
  const create = useCreateResponsibility();
  const [userId, setUserId] = useState("");
  const [prefix, setPrefix] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeUsers = useMemo(() => (users.data ?? []).filter((u) => u.is_active).sort((a, b) => a.name.localeCompare(b.name, "id")), [users.data]);

  function close() {
    if (create.isPending) return;
    setUserId(""); setPrefix(""); setRoomId(""); setError(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) return setError("Pilih penanggung jawab");
    if (!prefix.trim() && !roomId) return setError("Isi awalan kode inventaris dan/atau pilih ruangan");
    try {
      const rule = await create.mutateAsync({ user_id: userId, code_prefix: prefix.trim() || null, room_id: roomId || null });
      if (rule.equipment_count === 0) toast.warning("Aturan ditambahkan, tetapi tidak cocok dengan alat mana pun", { description: "Periksa penulisan awalan kode inventaris." });
      else toast.success(`Aturan ditambahkan: cocok dengan ${rule.equipment_count} alat`);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aturan gagal ditambahkan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah penanggung jawab alat</DialogTitle>
          <DialogDescription>Orang ini akan menerima email pengingat kalibrasi untuk alat yang cocok dengan kriteria di bawah.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="rule-user">Penanggung jawab</Label>
            <NativeSelect id="rule-user" className="h-10 w-full" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={users.isLoading}>
              <option value="">{users.isLoading ? "Memuat…" : "Pilih pengguna"}</option>
              {activeUsers.map((u) => <option key={u.user_id} value={u.user_id}>{u.name} ({ROLE_LABEL[u.role]})</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-prefix">Awalan kode inventaris</Label>
            <Input id="rule-prefix" placeholder="INV L-ACT 10" maxLength={50} value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Cocok dengan semua kode yang diawali ini pada batas kode: <code>INV L-ACT 10</code> cocok dengan <code>INV L-ACT 10-01</code> dan{" "}
              <code>INV L-ACT 10-02.01</code>, tetapi tidak dengan <code>INV L-ACT 100-1</code>. Tidak membedakan huruf besar/kecil.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-room">Ruangan (opsional)</Label>
            <NativeSelect id="rule-room" className="h-10 w-full" value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={rooms.isLoading}>
              <option value="">Semua ruangan</option>
              {(rooms.data ?? []).map((r) => <option key={r.room_id} value={r.room_id}>{r.room_name}</option>)}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">Jika awalan dan ruangan sama-sama diisi, alat harus cocok dengan keduanya.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>Batal</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="animate-spin" />} Tambah aturan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
