import type { Metadata } from "next";
import { Suspense } from "react";
import { MaintenancePage } from "@/components/features/maintenance/maintenance-page";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Maintenance" };

export default function Page() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>}>
      <MaintenancePage />
    </Suspense>
  );
}
