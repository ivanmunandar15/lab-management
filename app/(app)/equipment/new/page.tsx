import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/features/common/page-header";
import { EquipmentForm } from "@/components/features/equipment/equipment-form";

export const metadata: Metadata = { title: "Tambah Alat" };

export default async function NewEquipmentPage() {
  const session = await auth();
  if (!can(session?.user?.role, "equipment", "create")) redirect("/forbidden");
  return (
    <>
      <PageHeader title="Tambah Alat" description="QR token dibuat otomatis saat disimpan dan tidak bisa diubah." />
      <EquipmentForm />
    </>
  );
}
