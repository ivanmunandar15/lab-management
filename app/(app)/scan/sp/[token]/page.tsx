import type { Metadata } from "next";
import { SupportingScanResult } from "@/components/features/supporting/supporting-scan-result";

export const metadata: Metadata = { title: "Hasil Scan Item" };

export default async function ScanSupportingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SupportingScanResult token={token} />;
}
