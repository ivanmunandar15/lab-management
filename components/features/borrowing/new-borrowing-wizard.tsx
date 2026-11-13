"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, Loader2, Microscope, Package, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { CalibrationDate } from "@/components/features/equipment/calibration-date";
import { QrScannerView } from "@/components/features/scan/qr-scanner-view";
import { InfoRow } from "@/components/features/scan/scan-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateBorrowing, useEquipmentList, useSupportingEquipmentList } from "@/hooks";
import { getEquipmentBorrowBlock, getSupportingBorrowBlock } from "@/lib/borrowing-rules";
import { borrowDetailsFormSchema, type BorrowDetailsForm } from "@/lib/schemas/borrow-forms";
import { resolveQrText } from "@/lib/scan-resolver";
import { ServiceError } from "@/lib/services";
import { cn } from "@/lib/utils";
import { BorrowDetailsFields, defaultBorrowDetails, toCreateBorrowingInput } from "./borrow-fields";
import { QuantityStepper } from "./quantity-stepper";

const STEPS = ["Pilih alat", "Item pendukung", "Tujuan & lokasi", "Konfirmasi"] as const;

/** Wizard: pilih alat -> item pendukung + jumlah -> tujuan dan lokasi -> konfirmasi. Bisa tambah item lewat scan. */
export function NewBorrowingWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: session } = useSession();
  const create = useCreateBorrowing();
  const eqQuery = useEquipmentList({ status: "available" });
  const spQuery = useSupportingEquipmentList();

  const [step, setStep] = useState(0);
  const [selectedEq, setSelectedEq] = useState<string[]>([]);
  const [spQty, setSpQty] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const scanLast = useRef({ text: "", at: 0 });
  const form = useForm<BorrowDetailsForm>({ resolver: zodResolver(borrowDetailsFormSchema), defaultValues: defaultBorrowDetails() });

  useEffect(() => {
    if (!open) return;
    setStep(0); setSelectedEq([]); setSpQty({}); setSearch(""); setScanOpen(false);
    form.reset(defaultBorrowDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => setSearch(""), [step]);

  const equipment = useMemo(() => (eqQuery.data ?? []).filter((e) => getEquipmentBorrowBlock(e) === null), [eqQuery.data]);
  const supporting = useMemo(() => (spQuery.data ?? []).filter((s) => getSupportingBorrowBlock(s) === null), [spQuery.data]);
  const q = search.trim().toLowerCase();
  const eqShown = equipment.filter((e) => !q || [e.equipment_name, e.inventory_code, e.brand, e.model].some((v) => v.toLowerCase().includes(q)));
  const spShown = supporting.filter((s) => !q || [s.item_name, s.item_code, s.brand].some((v) => v.toLowerCase().includes(q)));

  const spLines = Object.entries(spQty).filter(([, n]) => n > 0);
  const totalItems = selectedEq.length + spLines.length;
  const toggleEq = (id: string) => setSelectedEq((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function onScan(text: string) {
    const now = Date.now();
    if (scanBusy || (scanLast.current.text === text && now - scanLast.current.at < 2500)) return;
    scanLast.current = { text, at: now };
    setScanBusy(true);
    try {
      const r = await resolveQrText(text);
      if (!r.ok) return void toast.error(r.message);
      if (r.kind === "eq") {
        const block = getEquipmentBorrowBlock(r.item);
        if (block) return void toast.error(`${r.item.equipment_name}: ${block}`);
        if (selectedEq.includes(r.item.equipment_id)) return void toast.warning(`${r.item.equipment_name} sudah dipilih`);
        setSelectedEq((s) => [...s, r.item.equipment_id]);
        toast.success(`${r.item.equipment_name} ditambahkan`);
      } else {
        const block = getSupportingBorrowBlock(r.item);
        if (block) return void toast.error(`${r.item.item_name}: ${block}`);
        const cur = spQty[r.item.supporting_equipment_id] ?? 0;
        if (cur >= r.item.available_quantity) return void toast.warning(`Stok ${r.item.item_name} hanya ${r.item.available_quantity} ${r.item.unit}`);
        setSpQty((m) => ({ ...m, [r.item.supporting_equipment_id]: cur + 1 }));
        toast.success(`${r.item.item_name} ditambahkan`);
      }
      try { navigator.vibrate?.(60); } catch { /* tidak didukung */ }
    } catch {
      toast.error("Gagal memuat data. Coba scan lagi.");
    } finally {
      setScanBusy(false);
    }
  }

  async function next() {
    if (step === 1 && totalItems === 0) {
      toast.error("Pilih minimal satu alat atau item pendukung");
      return;
    }
    if (step === 2 && !(await form.trigger())) return;
    setStep((s) => s + 1);
  }

  async function submit() {
    const userId = session?.user?.id;
    if (!userId) return void toast.error("Sesi login tidak ditemukan. Silakan login ulang.");
    const values = form.getValues();
    try {
      await create.mutateAsync(toCreateBorrowingInput(values, userId, selectedEq, spLines.map(([id, quantity]) => ({ supporting_equipment_id: id, quantity }))));
      toast.success("Peminjaman berhasil dicatat", { description: `${totalItems} item dipinjam.` });
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ServiceError && e.code === "CONFLICT") {
        toast.error(e.message, { description: "Data alat berubah. Kembali ke langkah 1 untuk memperbarui pilihan." });
        setStep(0);
      } else {
        toast.error(e instanceof Error ? e.message : "Peminjaman gagal disimpan");
      }
    }
  }

  const pending = create.isPending;
  const listLoading = (step === 0 && eqQuery.isLoading) || (step === 1 && spQuery.isLoading);
  const listError = (step === 0 && eqQuery.error) || (step === 1 && spQuery.error);
  const values = form.getValues();

  return (
    <>
      <BottomSheet
        open={open} onOpenChange={(o) => !pending && onOpenChange(o)} size="lg"
        title="Peminjaman Baru" description={`Langkah ${step + 1} dari ${STEPS.length}: ${STEPS[step]}`}
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-12 flex-1 sm:h-10" disabled={pending} onClick={() => (step === 0 ? onOpenChange(false) : setStep((s) => s - 1))}>
              {step === 0 ? "Batal" : "Kembali"}
            </Button>
            {step < 3 ? (
              <Button type="button" className="h-12 flex-[2] text-base sm:h-10 sm:text-sm" onClick={next}>
                Lanjut{step < 2 && totalItems > 0 && ` (${totalItems})`}
              </Button>
            ) : (
              <Button type="button" className="h-12 flex-[2] text-base sm:h-10 sm:text-sm" disabled={pending} onClick={submit}>
                {pending && <Loader2 className="animate-spin" />} Konfirmasi peminjaman
              </Button>
            )}
          </div>
        }
      >
        <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Langkah">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("mt-1 hidden truncate text-xs sm:block", i === step ? "font-semibold text-primary" : "text-muted-foreground")}>{label}</p>
            </li>
          ))}
        </ol>

        {step < 2 && (
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Cari" placeholder={step === 0 ? "Cari alat…" : "Cari item pendukung…"} className="h-11 pl-9 text-base sm:h-10 sm:text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => setScanOpen(true)}><QrCode /> Scan</Button>
          </div>
        )}

        {listLoading && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
        {listError && <ErrorState onRetry={() => (step === 0 ? eqQuery.refetch() : spQuery.refetch())} />}

        {step === 0 && !listLoading && !listError && (
          eqShown.length === 0 ? (
            <EmptyState icon={Microscope} title={q ? "Tidak ada alat yang cocok" : "Tidak ada alat tersedia"} description={q ? "Ubah kata kunci pencarian." : "Semua alat sedang dipinjam, dirawat, rusak, atau kalibrasinya terlambat. Anda masih bisa melanjutkan dengan item pendukung."} />
          ) : (
            <ul className="space-y-2" aria-label="Alat tersedia">
              {eqShown.map((e) => {
                const on = selectedEq.includes(e.equipment_id);
                return (
                  <li key={e.equipment_id}>
                    <label className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border-2 p-3", on ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
                      <input type="checkbox" className="size-5 accent-primary" checked={on} onChange={() => toggleEq(e.equipment_id)} aria-label={`Pilih ${e.equipment_name}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.equipment_name}</p>
                        <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{e.inventory_code}</span> • {[e.brand, e.model].filter(Boolean).join(" ")}</p>
                      </div>
                      {on && <Check className="size-5 text-primary" aria-hidden="true" />}
                    </label>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {step === 1 && !listLoading && !listError && (
          spShown.length === 0 ? (
            <EmptyState icon={Package} title={q ? "Tidak ada item yang cocok" : "Tidak ada item pendukung tersedia"} description={q ? "Ubah kata kunci pencarian." : "Stok semua item pendukung habis. Anda bisa melewati langkah ini."} />
          ) : (
            <ul className="space-y-2" aria-label="Item pendukung tersedia">
              {spShown.map((s) => {
                const n = spQty[s.supporting_equipment_id] ?? 0;
                return (
                  <li key={s.supporting_equipment_id} className={cn("flex items-center gap-3 rounded-lg border-2 p-3", n > 0 ? "border-primary bg-primary/5" : "border-border")}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.item_name}</p>
                      <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{s.item_code}</span> • Stok {s.available_quantity} {s.unit}</p>
                    </div>
                    <QuantityStepper label={`jumlah ${s.item_name}`} value={n} min={0} max={s.available_quantity} unit={s.unit} size="sm"
                      onChange={(v) => setSpQty((m) => ({ ...m, [s.supporting_equipment_id]: v }))} />
                  </li>
                );
              })}
            </ul>
          )
        )}

        {step === 2 && <BorrowDetailsFields form={form} idPrefix="wizard" />}

        {step === 3 && (
          <div className="space-y-4 pb-2">
            <section aria-label="Ringkasan item" className="space-y-2">
              <h3 className="text-sm font-semibold">Item ({totalItems})</h3>
              <ul className="divide-y rounded-lg border">
                {selectedEq.map((id) => {
                  const e = equipment.find((x) => x.equipment_id === id);
                  return (
                    <li key={id} className="flex items-center gap-3 p-3">
                      <Microscope className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e?.equipment_name ?? "Alat"}</p><p className="font-mono text-xs text-muted-foreground">{e?.inventory_code}</p></div>
                      {e && <CalibrationDate date={e.next_calibration_date} />}
                    </li>
                  );
                })}
                {spLines.map(([id, n]) => {
                  const s = supporting.find((x) => x.supporting_equipment_id === id);
                  return (
                    <li key={id} className="flex items-center gap-3 p-3">
                      <Package className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s?.item_name ?? "Item"}</p><p className="font-mono text-xs text-muted-foreground">{s?.item_code}</p></div>
                      <span className="text-sm font-semibold tabular-nums">{n} {s?.unit}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <dl className="divide-y rounded-lg border px-3">
              <InfoRow label="Tujuan">{values.purpose}</InfoRow>
              <InfoRow label="Lokasi">{values.usage_location}</InfoRow>
              <InfoRow label="Perkiraan kembali">{new Date(values.expected_return_time).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</InfoRow>
              {values.notes && <InfoRow label="Catatan">{values.notes}</InfoRow>}
            </dl>
            <p className="text-xs text-muted-foreground">Dengan menekan “Konfirmasi peminjaman”, status alat berubah menjadi Dipinjam dan stok item pendukung berkurang.</p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={scanOpen} onOpenChange={setScanOpen} title="Tambah item lewat scan"
        description="Scan QR alat atau item pendukung. Kamera tetap terbuka agar bisa scan beberapa kali."
        footer={<Button type="button" className="h-12 w-full text-base sm:h-10 sm:text-sm" onClick={() => setScanOpen(false)}>Selesai ({totalItems} item dipilih)</Button>}
      >
        <div className="mb-2 aspect-square w-full overflow-hidden rounded-xl bg-black sm:aspect-[4/3]">
          <QrScannerView onDetect={onScan} paused={scanBusy} hint="Arahkan ke QR alat" />
        </div>
      </BottomSheet>
    </>
  );
}
