import type { Metadata } from "next";
import { PageHeader } from "@/components/features/common/page-header";
import { EquipmentTable } from "@/components/features/equipment/equipment-table";

export const metadata: Metadata = { title: "Equipment" };

export default function EquipmentPage() {
  return (
    <>
      <PageHeader title="Equipment" description="Daftar alat laboratorium, QR, ekspor label, dan import CSV." />
      <EquipmentTable />
    </>
  );
}
