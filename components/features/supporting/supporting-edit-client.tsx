"use client";
import { PageHeader } from "@/components/features/common/page-header";
import { ErrorState } from "@/components/features/common/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportingEquipment } from "@/hooks";
import { SupportingForm } from "./supporting-form";

export function SupportingEditClient({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useSupportingEquipment(id);
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !data) return <ErrorState onRetry={() => refetch()} />;
  return (<><PageHeader title={`Edit ${data.item_name}`} description={data.item_code} /><SupportingForm item={data} /></>);
}
