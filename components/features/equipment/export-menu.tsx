"use client";
import { useState } from "react";
import { FileArchive, FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LABEL_SIZE_META, type LabelSize, type ProgressFn } from "@/lib/export/equipment-export";

interface Props {
  /** Jumlah baris yang akan diekspor (terpilih, atau sesuai filter). */
  count: number;
  selectedCount: number;
  noun?: string;
  actions: {
    csv: () => void | Promise<void>;
    zip: (onProgress: ProgressFn) => Promise<void>;
    pdf: (size: LabelSize, onProgress: ProgressFn) => Promise<void>;
  };
}

export function ExportMenu({ count, selectedCount, noun = "alat", actions }: Props) {
  const [progress, setProgress] = useState<{ phase: string; pct: number } | null>(null);
  const empty = count === 0;

  async function run(label: string, fn: (onProgress: (d: number, t: number, p: string) => void) => Promise<void>) {
    try {
      setProgress({ phase: "Menyiapkan…", pct: 0 });
      await fn((d, t, p) => setProgress({ phase: p, pct: Math.round((d / Math.max(1, t)) * 100) }));
      toast.success(`${label} berhasil dibuat (${count} ${noun})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `${label} gagal dibuat`);
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={empty || !!progress}><Upload className="rotate-180" /> Ekspor</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            {selectedCount > 0 ? `${selectedCount} baris dipilih` : `${count} ${noun} (sesuai filter)`}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => run("CSV", async () => { await actions.csv(); })}><FileSpreadsheet /> CSV (+ qr_token & qr_url)</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("ZIP QR", actions.zip)}><FileArchive /> ZIP QR (CSV + PNG)</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>PDF Label</DropdownMenuLabel>
          {(Object.keys(LABEL_SIZE_META) as LabelSize[]).map((s) => (
            <DropdownMenuItem key={s} onSelect={() => run("PDF label", (p) => actions.pdf(s, p))}><FileText /> {LABEL_SIZE_META[s]}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!progress}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" /> Membuat berkas…</DialogTitle>
            <DialogDescription>{progress?.phase} — jangan tutup halaman ini.</DialogDescription>
          </DialogHeader>
          <div role="progressbar" aria-valuenow={progress?.pct ?? 0} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress?.pct ?? 0}%` }} />
          </div>
          <p className="text-right text-xs tabular-nums text-muted-foreground">{progress?.pct ?? 0}%</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
