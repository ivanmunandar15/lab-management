"use client";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys, useSupportingEquipmentList } from "@/hooks";
import { downloadStockSheet, MAX_STOCK_QTY, parseStockCsv, type StockRow } from "@/lib/import/supporting-stock";
import { supportingEquipmentService } from "@/lib/services";
import type { SupportingEquipment } from "@/types/erd";

type Mode = "set" | "csv";
interface Target { item: SupportingEquipment; qty: number }
interface Failure { label: string; message: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item yang sedang tampil di tabel. */
  items: SupportingEquipment[];
  /** Item yang dicentang di tabel (kosong = tidak ada pilihan). */
  selected: SupportingEquipment[];
}

const CONCURRENCY = 4;

/** Atur jumlah total banyak item sekaligus: samakan ke satu angka, atau perbarui dari CSV (kode item + jumlah). */
export function SupportingStockDialog({ open, onOpenChange, items, selected }: Props) {
  const qc = useQueryClient();
  const { data: all = [] } = useSupportingEquipmentList({ includeInactive: true });
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("set");
  const [qtyText, setQtyText] = useState("1");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [csvRows, setCsvRows] = useState<StockRow[]>([]);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);

  const qty = Number(qtyText);
  const qtyValid = qtyText.trim() !== "" && Number.isInteger(qty) && qty >= 0 && qty <= MAX_STOCK_QTY;
  const usingSelection = selected.length > 0;
  const pool = usingSelection ? selected : items.filter((s) => s.total_quantity === 0);

  const setTargets = useMemo<Target[]>(() => (qtyValid ? pool.filter((s) => s.total_quantity !== qty).map((item) => ({ item, qty })) : []), [pool, qty, qtyValid]);
  const csvTargets = useMemo<Target[]>(
    () => csvRows.filter((r) => !r.error && !r.unchanged && r.item && r.qty !== null).map((r) => ({ item: r.item!, qty: r.qty! })),
    [csvRows],
  );
  const csvErrors = csvRows.filter((r) => r.error);
  const csvUnchanged = csvRows.filter((r) => !r.error && r.unchanged).length;
  const targets = mode === "set" ? setTargets : csvTargets;

  function resetFile() {
    setCsvRows([]);
    setFileName("");
    setFileError(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }
  function close(o: boolean) {
    if (busy) return;
    if (!o) {
      resetFile();
      setFailures([]);
    }
    onOpenChange(o);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setFailures([]);
    setFileName(file.name);
    const res = parseStockCsv(await file.text(), all);
    setFileError(res.fileError);
    setCsvRows(res.rows);
  }

  async function run() {
    setFailures([]);
    const queue = [...targets];
    const failed: Failure[] = [];
    let done = 0;
    setBusy({ done: 0, total: queue.length });
    const worker = async () => {
      for (let t = queue.shift(); t; t = queue.shift()) {
        try {
          await supportingEquipmentService.update(t.item.supporting_equipment_id, { total_quantity: t.qty });
        } catch (e) {
          failed.push({ label: `${t.item.item_code} — ${t.item.item_name}`, message: e instanceof Error ? e.message : String(e) });
        }
        done += 1;
        setBusy({ done, total: targets.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.supportingEquipment.all }),
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all }),
    ]);
    setBusy(null);
    const ok = targets.length - failed.length;
    if (failed.length === 0) {
      toast.success(`Jumlah total ${ok} item berhasil diperbarui`);
      close(true);
      return;
    }
    setFailures(failed);
    if (ok > 0) toast.success(`${ok} item diperbarui, ${failed.length} gagal`);
    else toast.error(`Semua ${failed.length} item gagal diperbarui`);
  }

  const pct = busy ? Math.round((busy.done / Math.max(1, busy.total)) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur Stok Massal</DialogTitle>
          <DialogDescription>
            Ubah jumlah total banyak item sekaligus. Jumlah tersedia ikut menyesuaikan; jumlah yang sedang dipakai tidak berubah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stock-mode">Cara</Label>
            <NativeSelect id="stock-mode" className="w-full" value={mode} onChange={(e) => { setMode(e.target.value as Mode); setFailures([]); }} disabled={!!busy}>
              <option value="set">Samakan jumlah total ke satu angka</option>
              <option value="csv">Perbarui dari CSV (kode item + jumlah)</option>
            </NativeSelect>
          </div>

          {mode === "set" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="stock-qty">Jumlah total baru</Label>
                <Input id="stock-qty" type="number" inputMode="numeric" min={0} max={MAX_STOCK_QTY} step={1} value={qtyText} onChange={(e) => setQtyText(e.target.value)} aria-invalid={!qtyValid} disabled={!!busy} />
                {!qtyValid && <p role="alert" className="text-xs text-destructive">Isi bilangan bulat 0–{MAX_STOCK_QTY.toLocaleString("id-ID")}.</p>}
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  {usingSelection ? `${selected.length} item yang dipilih di tabel` : `${pool.length} item dengan jumlah total 0`}
                  {qtyValid && pool.length !== setTargets.length && ` (${setTargets.length} akan diubah, sisanya sudah ${qty})`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {usingSelection
                    ? "Hapus centang di tabel untuk memakai semua item berjumlah 0."
                    : "Tidak ada yang dicentang, jadi yang diubah adalah semua item berjumlah total 0 (misalnya karena kolom jumlah dulu dikosongkan). Centang item di tabel untuk memilih sendiri."}
                </p>
                {setTargets.length > 0 && (
                  <ul className="mt-2 max-h-28 space-y-0.5 overflow-auto text-xs">
                    {setTargets.slice(0, 50).map((t) => (
                      <li key={t.item.supporting_equipment_id} className="flex justify-between gap-2">
                        <span className="truncate">{t.item.item_code} — {t.item.item_name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{t.item.total_quantity} → {t.qty}</span>
                      </li>
                    ))}
                    {setTargets.length > 50 && <li className="text-muted-foreground">…dan {setTargets.length - 50} item lain</li>}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Unduh daftar item, isi kolom <code>total_quantity</code> di Excel, lalu unggah kembali. Hanya kolom <code>item_code</code> dan <code>total_quantity</code> yang dibaca,
                dan item dicocokkan lewat kode. Item baru tidak dibuat di sini.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => downloadStockSheet(all)} disabled={all.length === 0}><Download /> Unduh daftar item ({all.length})</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!!busy}><Upload /> Pilih file CSV</Button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="File CSV stok" onChange={(e) => onFile(e.target.files?.[0])} />
                {fileName && <span className="truncate text-xs text-muted-foreground">{fileName}</span>}
              </div>
              {fileError && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{fileError}</p>}
              {csvRows.length > 0 && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{csvTargets.length} item akan diubah</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {csvRows.length} baris dibaca{csvUnchanged > 0 && `, ${csvUnchanged} sudah sama`}{csvErrors.length > 0 && `, ${csvErrors.length} bermasalah (dilewati)`}.
                  </p>
                  {csvErrors.length > 0 && (
                    <ul className="mt-2 max-h-28 space-y-0.5 overflow-auto text-xs text-destructive">
                      {csvErrors.slice(0, 50).map((r) => <li key={r.line}>Baris {r.line}{r.code && ` (${r.code})`}: {r.error}</li>)}
                      {csvErrors.length > 50 && <li>…dan {csvErrors.length - 50} baris lain</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {busy && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Memperbarui {busy.done} dari {busy.total} item…</p>
              <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {failures.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-destructive"><XCircle className="size-4" aria-hidden="true" /> {failures.length} item gagal diperbarui</p>
              <ul className="mt-2 max-h-28 space-y-0.5 overflow-auto text-xs">
                {failures.map((f) => <li key={f.label}><span className="font-medium">{f.label}</span>: {f.message}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => close(false)} disabled={!!busy}>{failures.length > 0 ? "Tutup" : "Batal"}</Button>
          <Button onClick={run} disabled={!!busy || targets.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Terapkan{targets.length > 0 && ` (${targets.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
