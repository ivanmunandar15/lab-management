"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Keyboard, Loader2, Minus, Plus, Search, ShoppingBasket, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BorrowSheet, type BorrowLine } from "@/components/features/borrowing/borrow-sheet";
import { getEquipmentBorrowBlock, getSupportingBorrowBlock } from "@/lib/borrowing-rules";
import { resolveManualInput, resolveQrText, scanPath, type ScanResolution } from "@/lib/scan-resolver";
import { cn } from "@/lib/utils";
import { QrScannerView } from "./qr-scanner-view";

type Notice = { tone: "success" | "warning" | "error"; message: string };
const SAME_CODE_COOLDOWN_MS = 2500;

const vibrate = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch { /* tidak didukung */ }
};

export function ScannerScreen() {
  const router = useRouter();
  const [cartMode, setCartMode] = useState(false);
  const [cart, setCart] = useState<BorrowLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [borrowOpen, setBorrowOpen] = useState(false);
  const last = useRef({ text: "", at: 0 });
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyRef = useRef(false);

  const showNotice = useCallback((n: Notice) => {
    setNotice(n);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const addToCart = useCallback((r: Extract<ScanResolution, { ok: true }>) => {
    if (r.kind === "eq") {
      const e = r.item;
      const block = getEquipmentBorrowBlock(e);
      if (block) return showNotice({ tone: "error", message: `${e.equipment_name}: ${block}` });
      if (cart.some((l) => l.kind === "eq" && l.id === e.equipment_id)) {
        return showNotice({ tone: "warning", message: `${e.equipment_name} sudah ada di keranjang` });
      }
      setCart((c) => [...c, { kind: "eq", id: e.equipment_id, name: e.equipment_name, code: e.inventory_code }]);
      vibrate(60);
      return showNotice({ tone: "success", message: `${e.equipment_name} ditambahkan` });
    }
    const s = r.item;
    const block = getSupportingBorrowBlock(s);
    if (block) return showNotice({ tone: "error", message: `${s.item_name}: ${block}` });
    const existing = cart.find((l) => l.kind === "sp" && l.id === s.supporting_equipment_id);
    if (existing && (existing.quantity ?? 1) >= s.available_quantity) {
      return showNotice({ tone: "warning", message: `Stok ${s.item_name} hanya ${s.available_quantity} ${s.unit}` });
    }
    setCart((c) => {
      const idx = c.findIndex((l) => l.kind === "sp" && l.id === s.supporting_equipment_id);
      if (idx >= 0) return c.map((l, i) => (i === idx ? { ...l, quantity: Math.min(s.available_quantity, (l.quantity ?? 1) + 1), max: s.available_quantity } : l));
      return [...c, { kind: "sp", id: s.supporting_equipment_id, name: s.item_name, code: s.item_code, quantity: 1, max: s.available_quantity, unit: s.unit }];
    });
    vibrate(60);
    showNotice({ tone: "success", message: `${s.item_name} ditambahkan` });
  }, [cart, showNotice]);

  const handleResolution = useCallback((r: ScanResolution) => {
    if (!r.ok) {
      vibrate([80, 60, 80]);
      showNotice({ tone: "error", message: r.message });
      return false;
    }
    if (cartMode) {
      addToCart(r);
      return true;
    }
    vibrate(60);
    router.push(scanPath(r));
    return true;
  }, [addToCart, cartMode, router, showNotice]);

  const run = useCallback(async (fn: () => Promise<ScanResolution>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    let navigated = false;
    try {
      const r = await fn();
      navigated = handleResolution(r) && !cartMode;
      return r.ok;
    } catch {
      showNotice({ tone: "error", message: "Gagal memuat data alat. Periksa koneksi lalu coba lagi." });
      return false;
    } finally {
      // Saat berpindah halaman biarkan tetap sibuk agar tidak ada scan ganda.
      if (!navigated) { busyRef.current = false; setBusy(false); }
    }
  }, [cartMode, handleResolution, showNotice]);

  const onDetect = useCallback((text: string) => {
    const now = Date.now();
    if (busyRef.current) return;
    if (last.current.text === text && now - last.current.at < SAME_CODE_COOLDOWN_MS) return;
    last.current = { text, at: now };
    void run(() => resolveQrText(text));
  }, [run]);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() => resolveManualInput(manualValue));
    if (ok && cartMode) setManualValue("");
  }

  const cartCount = cart.length;
  const setQty = (id: string, delta: number) =>
    setCart((c) => c.map((l) => (l.kind === "sp" && l.id === id ? { ...l, quantity: Math.max(1, Math.min(l.max ?? 1, (l.quantity ?? 1) + delta)) } : l)));

  return (
    <div
      className={cn(
        "relative -mx-4 -mt-6 -mb-28 flex flex-col overflow-hidden bg-black",
        "h-[calc(100dvh-4rem-4.5rem-env(safe-area-inset-bottom))]",
        "md:mx-auto md:mb-0 md:mt-0 md:h-[calc(100dvh-10rem)] md:max-w-3xl md:rounded-xl",
      )}
    >
      <div className="relative min-h-0 flex-1">
        <QrScannerView onDetect={onDetect} paused={busy || borrowOpen} onCameraUnavailable={() => setManualOpen(true)} hint={cartMode ? "Mode keranjang: scan semua alat yang dipinjam" : undefined} />

        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "absolute inset-x-4 bottom-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
              notice.tone === "success" && "bg-green-600 text-white",
              notice.tone === "warning" && "bg-yellow-400 text-yellow-950",
              notice.tone === "error" && "bg-red-600 text-white",
            )}
          >
            {notice.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : notice.tone === "warning" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40" role="status" aria-label="Memproses QR">
            <Loader2 className="size-10 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="max-h-[48%] shrink-0 space-y-3 overflow-y-auto rounded-t-2xl bg-card p-3 text-card-foreground">
        <div className="flex items-center gap-3">
          <label htmlFor="cart-mode" className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium">
            <ShoppingBasket className="size-5 text-primary" aria-hidden="true" /> Scan beberapa
          </label>
          <Switch id="cart-mode" checked={cartMode} onCheckedChange={setCartMode} aria-label="Scan beberapa (mode keranjang)" />
          <Button type="button" variant="outline" className="h-11" aria-expanded={manualOpen} onClick={() => setManualOpen((o) => !o)}>
            <Keyboard /> Ketik kode
          </Button>
        </div>

        {manualOpen && (
          <form onSubmit={submitManual} className="flex gap-2">
            <label htmlFor="manual-code" className="sr-only">Kode inventaris</label>
            <Input
              id="manual-code" value={manualValue} onChange={(e) => setManualValue(e.target.value)}
              placeholder="Kode inventaris, mis. EQ-001" autoCapitalize="characters" autoComplete="off" autoCorrect="off" inputMode="text"
              className="h-12 text-base"
            />
            <Button type="submit" className="h-12 px-5" disabled={busy || !manualValue.trim()}>
              <Search /> Cari
            </Button>
          </form>
        )}

        {cartMode && (
          <section aria-label="Keranjang peminjaman" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Keranjang ({cartCount})</h2>
              {cartCount > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setCart([])}>Kosongkan</Button>}
            </div>
            {cartCount === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">Belum ada item. Scan QR alat atau item pendukung untuk menambahkan.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {cart.map((l) => (
                  <li key={`${l.kind}-${l.id}`} className="flex items-center gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{l.code}</p>
                    </div>
                    {l.kind === "sp" && (
                      <div className="flex items-center gap-1" role="group" aria-label={`Jumlah ${l.name}`}>
                        <Button type="button" variant="outline" size="icon" className="size-9" aria-label={`Kurangi ${l.name}`} disabled={(l.quantity ?? 1) <= 1} onClick={() => setQty(l.id, -1)}><Minus /></Button>
                        <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                        <Button type="button" variant="outline" size="icon" className="size-9" aria-label={`Tambah ${l.name}`} disabled={(l.quantity ?? 1) >= (l.max ?? 1)} onClick={() => setQty(l.id, 1)}><Plus /></Button>
                      </div>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="size-10 text-destructive hover:text-destructive" aria-label={`Hapus ${l.name} dari keranjang`} onClick={() => setCart((c) => c.filter((x) => !(x.kind === l.kind && x.id === l.id)))}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" className="h-12 w-full text-base" disabled={cartCount === 0} onClick={() => setBorrowOpen(true)}>
              Lanjut{cartCount > 0 && ` (${cartCount} item)`}
            </Button>
          </section>
        )}
      </div>

      <BorrowSheet open={borrowOpen} onOpenChange={setBorrowOpen} lines={cart} onSuccess={() => setCart([])} />
    </div>
  );
}
