import type { Metadata } from "next";
import { EquipmentDetail } from "@/components/features/equipment/equipment-detail";

export const metadata: Metadata = { title: "Detail Alat" };

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentDetail id={id} />;
}
