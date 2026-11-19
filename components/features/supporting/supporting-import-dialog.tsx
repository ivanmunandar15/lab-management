"use client";
import { CsvImportDialog } from "@/components/features/common/csv-import-dialog";
import { downloadSupportingTemplate, parseSupportingCsv } from "@/lib/import/supporting-import";
import { useBulkCreateSupportingEquipment, useSupportingEquipmentList } from "@/hooks";

export function SupportingImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: all = [] } = useSupportingEquipmentList({ includeInactive: true });
  const bulk = useBulkCreateSupportingEquipment();
  return (
    <CsvImportDialog
      open={open} onOpenChange={onOpenChange} noun="item" codeKey="item_code" nameKey="item_name"
      title="Import alat pendukung dari CSV"
      description="Unduh template, isi data, lalu unggah. Kolom total_quantity yang dikosongkan dianggap 1. Jumlah tersedia awal otomatis sama dengan jumlah total, dan setiap baris baru mendapat QR token. Untuk memperbaiki stok item yang sudah ada, pakai tombol Atur Stok."
      parse={(text) => parseSupportingCsv(text, new Set(all.map((s) => s.item_code.toLowerCase())))}
      onTemplate={downloadSupportingTemplate}
      save={async (rows) => (await bulk.mutateAsync(rows)).length}
    />
  );
}
