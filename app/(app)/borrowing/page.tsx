import type { Metadata } from "next";
import { Suspense } from "react";
import { BorrowingPage } from "@/components/features/borrowing/borrowing-page";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Peminjaman" };

export default function Page() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>}>
      <BorrowingPage />
    </Suspense>
  );
}
