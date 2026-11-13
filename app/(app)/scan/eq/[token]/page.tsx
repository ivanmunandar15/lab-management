import type { Metadata } from "next";
import { EquipmentScanResult } from "@/components/features/equipment/scan-result";

export const metadata: Metadata = { title: "Hasil Scan Alat" };

export default async function ScanEquipmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <EquipmentScanResult token={token} />;
}
