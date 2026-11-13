import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/features/common/empty-state";
import { ErrorState } from "@/components/features/common/error-state";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  description?: React.ReactNode;
  /** Tombol/tautan di pojok kanan atas header. */
  action?: React.ReactNode;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isEmpty?: boolean;
  empty?: { icon?: LucideIcon; title: string; description?: string };
  skeletonRows?: number;
  skeletonClassName?: string;
  className?: string;
  children: React.ReactNode;
}

/** Kerangka panel dashboard: header + state loading (skeleton), error, kosong, atau isi. */
export function DashboardPanel({
  title, description, action, isLoading, isError, onRetry, isEmpty, empty,
  skeletonRows = 4, skeletonClassName = "h-12", className, children,
}: DashboardPanelProps) {
  return (
    <Card role="region" aria-label={title} className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Memuat data">
            {Array.from({ length: skeletonRows }).map((_, i) => <Skeleton key={i} className={skeletonClassName} />)}
          </div>
        ) : isError ? (
          <ErrorState className="py-8" onRetry={onRetry} />
        ) : isEmpty && empty ? (
          <EmptyState className="py-8" icon={empty.icon} title={empty.title} description={empty.description} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
