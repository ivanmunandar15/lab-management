import type { Metadata } from "next";
import { PageHeader } from "@/components/features/common/page-header";
import { UsersTable } from "@/components/features/users/users-table";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" description="Kelola akun, peran, dan status pengguna. Pengguna tidak dihapus permanen, hanya dinonaktifkan." />
      <UsersTable />
    </>
  );
}
