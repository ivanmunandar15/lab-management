import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { SupportingEditClient } from "@/components/features/supporting/supporting-edit-client";

export const metadata: Metadata = { title: "Edit Item" };

export default async function EditSupportingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!can(session?.user?.role, "supporting_equipment", "update")) redirect("/forbidden");
  const { id } = await params;
  return <SupportingEditClient id={id} />;
}
