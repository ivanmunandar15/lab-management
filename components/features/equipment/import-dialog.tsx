"use client";
import { CsvImportDialog } from "@/components/features/common/csv-import-dialog";
import { downloadImportTemplate, parseImportCsv } from "@/lib/import/equipment-import";
import { useBulkCreateEquipment, useEquipmentList, useRooms } from "@/hooks";

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: rooms = [] } = useRooms();
  const { data: all = [] } = useEquipmentList({ includeInactive: true });
  const bulk = useBulkCreateEquipment();
  return (
    <CsvImportDialog
      open={open} onOpenChange={onOpenChange} noun="alat" codeKey="inventory_code" nameKey="equipment_name"
      title="Import alat dari CSV"
      description="Unduh template, isi data, lalu unggah. Setiap baris baru otomatis mendapat QR token. Gunakan kode ruangan (mis. LAB-01)."
      parse={(text) => parseImportCsv(text, rooms, new Set(all.map((e) => e.inventory_code.toLowerCase())))}
      onTemplate={downloadImportTemplate}
      save={async (rows) => (await bulk.mutateAsync(rows)).length}
    />
  );
}
