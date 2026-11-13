import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandPanel } from "@/components/features/auth/brand-panel";
import { LoginForm } from "@/components/features/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <BrandPanel />
      <main className="flex items-center justify-center p-6 sm:p-10">
        <Suspense fallback={<Skeleton className="h-80 w-full max-w-sm" />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
