"use client";

import Link from "next/link";
import {
  Activity, ArrowRight, Boxes, ClipboardList, DoorOpen, FileText, Gauge, LogIn, Microscope,
  Thermometer, User, Wrench, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentActivity } from "@/hooks/use-dashboard";
import { describeActivity } from "@/lib/activity-text";
import { timeAgo } from "@/lib/format";
import { DashboardPanel } from "./panel";

const ENTITY_ICON: Record<string, LucideIcon> = {
  equipment: Microscope,
  supporting_equipment: Boxes,
  borrowing: ClipboardList,
  calibration: Gauge,
  maintenance: Wrench,
  user: User,
  room: DoorOpen,
  sensor: Thermometer,
  document: FileText,
  session: LogIn,
};

export function RecentActivityPanel({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useRecentActivity(10);

  return (
    <DashboardPanel
      className={className}
      title="Aktivitas terbaru"
      description="10 aktivitas terakhir di sistem."
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/activity-log">Semua log <ArrowRight /></Link>
        </Button>
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={data?.length === 0}
      empty={{ icon: Activity, title: "Belum ada aktivitas", description: "Aktivitas pengguna akan tercatat di sini." }}
      skeletonRows={6}
      skeletonClassName="h-10"
    >
      <ol className="space-y-3">
        {data?.map((a) => {
          const Icon = ENTITY_ICON[a.entity_type] ?? Activity;
          return (
            <li key={a.log_id} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{a.user_name}</span> {describeActivity(a.action, a.entity_type)}
                  {a.target_label && <> <span className="font-medium">{a.target_label}</span></>}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </DashboardPanel>
  );
}
