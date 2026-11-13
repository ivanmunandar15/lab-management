"use client";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReportEquipmentIssue } from "@/hooks";
import { Field } from "./field";

const schema = z.object({
  description: z.string().trim().min(5, "Jelaskan masalahnya (minimal 5 karakter)").max(1000, "Maksimal 1000 karakter"),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: { equipment_id: string; name: string; code: string };
  title?: string;
}

/** Lapor kerusakan / lapor ke teknisi: notifikasi ke technician dan SPV. */
export function ReportIssueSheet({ open, onOpenChange, equipment, title = "Lapor Kerusakan" }: Props) {
  const report = useReportEquipmentIssue();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { description: "" } });
  useEffect(() => { if (open) form.reset({ description: "" }); }, [open, form]);

  async function onSubmit(v: FormValues) {
    try {
      await report.mutateAsync({ equipment_id: equipment.equipment_id, description: v.description });
      toast.success("Laporan terkirim", { description: "Teknisi dan SPV sudah diberi notifikasi." });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Laporan gagal dikirim");
    }
  }

  return (
    <BottomSheet
      open={open} onOpenChange={(o) => !report.isPending && onOpenChange(o)} title={title}
      description={`${equipment.name} (${equipment.code})`}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-12 flex-1 sm:h-10" onClick={() => onOpenChange(false)} disabled={report.isPending}>Batal</Button>
          <Button type="submit" form="report-issue-form" className="h-12 flex-[2] text-base sm:h-10 sm:text-sm" disabled={report.isPending}>
            {report.isPending && <Loader2 className="animate-spin" />} Kirim laporan
          </Button>
        </div>
      }
    >
      <form id="report-issue-form" onSubmit={form.handleSubmit(onSubmit)} noValidate className="pb-2">
        <Field label="Apa masalahnya?" htmlFor="report-description" error={form.formState.errors.description?.message}>
          <Textarea id="report-description" rows={4} placeholder="Mis. Layar tidak menyala, ada bunyi aneh saat dinyalakan" aria-invalid={!!form.formState.errors.description} {...form.register("description")} />
        </Field>
      </form>
    </BottomSheet>
  );
}
