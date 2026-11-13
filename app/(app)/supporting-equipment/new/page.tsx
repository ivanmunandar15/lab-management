import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/features/common/page-header";
import { SupportingForm } from "@/components/features/supporting/supporting-form";

export const metadata: Metadata = { title: "Tambah Item" };

export default async function NewSupportingPage() {
  const session = await auth();
  if (!can(session?.user?.role, "supporting_equipment", "create")) redirect("/forbidden");
  return (<><PageHeader title="Tambah Item" description="QR token dibuat otomatis dan tidak bisa diubah. Jumlah tersedia awal sama dengan jumlah total." /><SupportingForm /></>);
}
