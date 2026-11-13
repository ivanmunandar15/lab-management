import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { EquipmentEditClient } from "@/components/features/equipment/equipment-edit-client";

export const metadata: Metadata = { title: "Edit Alat" };

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!can(session?.user?.role, "equipment", "update")) redirect("/forbidden");
  const { id } = await params;
  return <EquipmentEditClient id={id} />;
}
