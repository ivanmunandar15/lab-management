import type { Metadata } from "next";
import { SupportingDetail } from "@/components/features/supporting/supporting-detail";

export const metadata: Metadata = { title: "Detail Item" };

export default async function SupportingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportingDetail id={id} />;
}
