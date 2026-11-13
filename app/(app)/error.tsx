"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/features/common/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorState title="Halaman gagal ditampilkan" description="Terjadi kesalahan tak terduga. Coba muat ulang halaman ini." onRetry={reset} />;
}
