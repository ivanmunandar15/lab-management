import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

export function ModulePlaceholder({ title, description, icon = Hammer }: { title: string; description: string; icon?: LucideIcon }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={icon} title="Modul ini dibangun di tahap berikutnya" description="Kerangka halaman, menu, dan hak akses sudah siap." />
      </Card>
    </>
  );
}
