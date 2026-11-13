import Link from "next/link";
import { ArrowLeft, Ban, SearchX, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/features/common/empty-state";
import { cn } from "@/lib/utils";

export function ScanBackLink() {
  return (
    <Link href="/scan" className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> Scan lagi
    </Link>
  );
}

export function ScanSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4" aria-busy="true" aria-label="Memuat data alat">
      <Skeleton className="h-5 w-24" />
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex gap-4"><Skeleton className="size-16 rounded-2xl" /><div className="flex-1 space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></div>
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

export function UnknownQr() {
  return (
    <EmptyState
      icon={SearchX} title="QR tidak dikenali"
      description="QR ini tidak terdaftar di sistem. Pastikan label QR masih utuh, atau cari alat lewat kode inventaris."
      action={<Button asChild className="h-11"><Link href="/scan">Scan ulang</Link></Button>}
    />
  );
}

export function InactiveNotice({ title, description, href, linkLabel }: { title: string; description: string; href: string; linkLabel: string }) {
  return (
    <EmptyState
      icon={Ban} title={title} description={description}
      action={<div className="flex flex-wrap justify-center gap-2"><Button asChild variant="outline" className="h-11"><Link href={href}>{linkLabel}</Link></Button><Button asChild className="h-11"><Link href="/scan">Scan lagi</Link></Button></div>}
    />
  );
}

export function Banner({ tone, title, children }: { tone: "warning" | "danger" | "info"; title: string; children?: React.ReactNode }) {
  const styles = {
    warning: "border-yellow-300 bg-yellow-50 text-yellow-950 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200",
    danger: "border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200",
    info: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  } as const;
  return (
    <div role={tone === "info" ? "status" : "alert"} className={cn("flex gap-3 rounded-lg border p-3 text-sm", styles[tone])}>
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5"><p className="font-semibold">{title}</p>{children && <div className="text-sm opacity-90">{children}</div>}</div>
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
