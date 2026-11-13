"use client";
import { PageHeader } from "@/components/features/common/page-header";
import { ErrorState } from "@/components/features/common/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipment } from "@/hooks";
import { EquipmentForm } from "./equipment-form";

export function EquipmentEditClient({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useEquipment(id);
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !data) return <ErrorState onRetry={() => refetch()} />;
  return (
    <>
      <PageHeader title={`Edit ${data.equipment_name}`} description={data.inventory_code} />
      <EquipmentForm equipment={data} />
    </>
  );
}
