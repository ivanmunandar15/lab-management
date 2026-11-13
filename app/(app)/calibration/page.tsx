import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CalibrationPage } from "@/components/features/calibration/calibration-page";

export const metadata: Metadata = { title: "Kalibrasi" };

export default function Page() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>}>
      <CalibrationPage />
    </Suspense>
  );
}
