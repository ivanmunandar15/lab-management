"use client";
import { useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { borrowingsService, roomsService, usersService } from "@/lib/services";
import { LOGBOOK_TEMPLATE } from "@/lib/config/document-template";
import {
  buildLogbookRows, exportLogbookCsv, exportLogbookPdf, exportLogbookZip, type LogbookMeta, type LogbookRow,
} from "@/lib/export/logbook-export";
import type { Equipment } from "@/types/erd";

type Mode = "pdf" | "csv" | "blank";
const MODE_LABEL: Record<Mode, string> = {
  pdf: `PDF log book (${LOGBOOK_TEMPLATE.documentNumber})`,
  csv: "CSV (data mentah, ada tujuan & catatan kerusakan)",
  blank: "PDF form kosong (cadangan isi manual)",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment[];
}

export function LogbookExportDialog({ open, onOpenChange, equipment }: Props) {
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [mode, setMode] = useState<Mode>("pdf");
  const [busy, setBusy] = useState<{ phase: string; pct: number } | null>(null);

  const invalidRange = mode !== "blank" && (!from || !to || from > to);
  const single = equipment.length === 1;

  async function run() {
    try {
      setBusy({ phase: "Mengambil data peminjaman…", pct: 0 });
      const [rooms, users] = await Promise.all([roomsService.list(), usersService.list({ includeInactive: true })]);
      const roomName = (id: string) => rooms.find((r) => r.room_id === id)?.room_name ?? "—";
      const items: { meta: LogbookMeta; rows: LogbookRow[] }[] = [];
      for (const e of equipment) {
        const borrowings = mode === "blank" ? [] : await borrowingsService.list({ equipment_id: e.equipment_id });
        items.push({
          meta: { equipment: e, roomName: roomName(e.room_id) },
          rows: buildLogbookRows(e.equipment_id, borrowings, users, { from, to }),
        });
      }

      if (mode === "csv") {
        if (items.every((i) => i.rows.length === 0)) throw new Error("Tidak ada data penggunaan pada rentang tanggal ini.");
        exportLogbookCsv(items);
      } else if (single) {
        if (mode === "pdf" && items[0].rows.length === 0) throw new Error("Tidak ada data penggunaan pada rentang tanggal ini.");
        await exportLogbookPdf(items[0].meta, items[0].rows, { blank: mode === "blank" });
      } else {
        await exportLogbookZip(items, { blank: mode === "blank" }, (d, t, p) => setBusy({ phase: p, pct: Math.round((d / Math.max(1, t)) * 100) }));
      }
      toast.success(`Log book berhasil dibuat (${equipment.length} alat)`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Log book gagal dibuat");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ekspor Log Book Penggunaan</DialogTitle>
          <DialogDescription>
            {single ? equipment[0].equipment_name : `${equipment.length} alat`}
            {!single && " — hasilnya satu file ZIP berisi PDF per alat."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="logbook-mode">Format</Label>
            <NativeSelect id="logbook-mode" className="w-full" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              {(Object.keys(MODE_LABEL) as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
            </NativeSelect>
          </div>

          {mode !== "blank" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="logbook-from">Dari tanggal</Label>
                <Input id="logbook-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logbook-to">Sampai tanggal</Label>
                <Input id="logbook-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </div>
              {invalidRange && <p role="alert" className="col-span-2 text-xs font-medium text-destructive">Rentang tanggal tidak valid.</p>}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {mode === "csv"
              ? "Satu file CSV memuat semua alat terpilih."
              : `Satu halaman memuat ${LOGBOOK_TEMPLATE.rowsPerPage} baris; baris kosong tetap dicetak sampai penuh. Dihitung dari tanggal mulai peminjaman.`}
          </p>

          {busy && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{busy.phase}</p>
              <div role="progressbar" aria-valuenow={busy.pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${busy.pct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busy}>Batal</Button>
          <Button onClick={run} disabled={!!busy || invalidRange || equipment.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <FileText />} Buat berkas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
