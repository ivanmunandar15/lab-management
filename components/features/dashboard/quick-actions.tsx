import Link from "next/link";
import { ClipboardPlus, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/rbac";
import type { Role } from "@/types/erd";

/**
 * Aksi cepat sesuai hak akses (lib/rbac.ts). Mis. QA tidak melihat "Tambah Equipment".
 * Halaman tujuan membaca ?action=create untuk langsung membuka form.
 */
export function QuickActions({ role }: { role: Role }) {
  return (
    <>
      {can(role, "scan", "view") && (
        <Button asChild>
          <Link href="/scan"><QrCode /> Scan QR</Link>
        </Button>
      )}
      {can(role, "equipment", "create") && (
        <Button asChild variant="outline">
          <Link href="/equipment?action=create"><Plus /> Tambah Equipment</Link>
        </Button>
      )}
      {can(role, "borrowing", "create") && (
        <Button asChild variant="outline">
          <Link href="/borrowing?action=create"><ClipboardPlus /> Peminjaman Baru</Link>
        </Button>
      )}
    </>
  );
}
