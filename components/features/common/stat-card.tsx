import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toneClass, type ToneKey } from "@/lib/status";

interface StatCardProps {
  title: string;
  value?: number | string;
  icon: LucideIcon;
  tone?: ToneKey;
  hint?: string;
  href?: string;
  isLoading?: boolean;
}

export function StatCard({ title, value, icon: Icon, tone = "blue", hint, href, isLoading }: StatCardProps) {
  const body = (
    <Card className={cn("flex items-start justify-between gap-3 p-5", href && "transition-colors hover:bg-muted/40")}>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        {isLoading ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tabular-nums">{value ?? "–"}</p>
        )}
        {hint && !isLoading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg border", toneClass(tone))}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-lg">{body}</Link>
  ) : body;
}
