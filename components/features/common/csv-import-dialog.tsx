"use client";
import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/features/common/confirm-dialog";
import { cn } from "@/lib/utils";

export interface CsvImportRow<T> {
  line: number;
  raw: Record<string, string>;
  data?: T;
  errors: string[];
}

interface Props<T> {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  noun: string;
  codeKey: string;
  nameKey: string;
  parse: (text: string) => { rows: CsvImportRow<T>[]; fileError?: string };
  onTemplate: () => void;
  /** Simpan baris valid; kembalikan jumlah yang tersimpan. */
  save: (data: T[]) => Promise<number>;
}

/** Dialog import CSV generik: pilih file, preview + error per baris, konfirmasi, simpan. */
export function CsvImportDialog<T>({ open, onOpenChange, title, description, noun, codeKey, nameKey, parse, onTemplate, save }: Props<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvImportRow<T>[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = rows.filter((r) => r.data);
  const invalid = rows.length - valid.length;

  function reset() { setRows([]); setFileName(""); setFileError(undefined); if (fileRef.current) fileRef.current.value = ""; }

  async function onFile(file?: File) {
    if (!file) return;
    reset();
    setFileName(file.name);
    const res = parse(await file.text());
    setRows(res.rows);
    setFileError(res.fileError);
  }

  async function doSave() {
    try {
      setSaving(true);
      const n = await save(valid.map((r) => r.data!));
      toast.success(`${n} ${noun} berhasil diimpor, QR dibuat otomatis`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import gagal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onTemplate}><Download /> Unduh template</Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}><FileUp /> Pilih file CSV</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Berkas CSV" onChange={(e) => onFile(e.target.files?.[0])} />
            {fileName && <span className="self-center text-sm text-muted-foreground">{fileName}</span>}
          </div>

          {fileError && <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{fileError}</p>}

          {rows.length > 0 && (
            <>
              <p className="text-sm">
                <span className="font-medium text-green-700 dark:text-green-400">{valid.length} baris valid</span>
                {invalid > 0 && <> · <span className="font-medium text-destructive">{invalid} baris bermasalah</span></>}
              </p>
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted text-xs">
                    <tr><th className="p-2">Baris</th><th className="p-2">Kode</th><th className="p-2">Nama</th><th className="p-2">Hasil</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className={cn("border-t align-top", r.errors.length > 0 && "bg-destructive/5")}>
                        <td className="p-2 tabular-nums">{r.line}</td>
                        <td className="p-2 font-mono text-xs">{r.raw[codeKey]}</td>
                        <td className="p-2">{r.raw[nameKey]}</td>
                        <td className="p-2">
                          {r.errors.length === 0
                            ? <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="size-4" /> Siap diimpor</span>
                            : <ul className="list-disc space-y-0.5 pl-4 text-xs text-destructive">{r.errors.map((m, i) => <li key={i}>{m}</li>)}</ul>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button disabled={valid.length === 0 || saving} onClick={() => setConfirm(true)}>
              {saving && <Loader2 className="animate-spin" />}
              Impor {valid.length > 0 ? `${valid.length} ${noun}` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm} onOpenChange={setConfirm}
        title={`Impor ${valid.length} ${noun}?`}
        description={invalid > 0 ? `${invalid} baris bermasalah akan dilewati. ${valid.length} baris valid akan disimpan.` : "Semua baris valid akan disimpan dan masing-masing mendapat QR token baru."}
        confirmLabel="Ya, impor" onConfirm={doSave}
      />
    </>
  );
}
