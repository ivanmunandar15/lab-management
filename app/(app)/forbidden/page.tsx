import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/features/common/empty-state";

export const metadata = { title: "Akses ditolak" };

export default function ForbiddenPage() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Anda tidak punya akses ke halaman ini"
      description="Peran akun Anda tidak mencakup fitur ini. Hubungi admin bila Anda merasa ini keliru."
      action={<Button asChild><Link href="/dashboard">Kembali ke Dashboard</Link></Button>}
    />
  );
}
