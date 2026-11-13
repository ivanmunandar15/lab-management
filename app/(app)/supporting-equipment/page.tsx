import type { Metadata } from "next";
import { PageHeader } from "@/components/features/common/page-header";
import { SupportingTable } from "@/components/features/supporting/supporting-table";

export const metadata: Metadata = { title: "Supporting Equipment" };

export default function SupportingEquipmentPage() {
  return (
    <>
      <PageHeader title="Supporting Equipment" description="Alat pendukung berbasis jumlah. Satu QR mewakili satu jenis item, bukan unit fisik." />
      <SupportingTable />
    </>
  );
}
