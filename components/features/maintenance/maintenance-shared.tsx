"use client";
import { ArrowRight, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaintenanceStatus } from "@/types/erd";

/** Perpindahan status yang diizinkan. completed/cancelled adalah status akhir. */
export const NEXT_STATUSES: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const ACTION_LABEL: Partial<Record<MaintenanceStatus, { label: string; icon: typeof Check; destructive?: boolean }>> = {
  in_progress: { label: "Mulai", icon: ArrowRight },
  completed: { label: "Selesaikan", icon: Check },
  cancelled: { label: "Batalkan", icon: X, destructive: true },
};

interface Props {
  status: MaintenanceStatus;
  canUpdate: boolean;
  onChange: (next: MaintenanceStatus) => void;
  onEdit: () => void;
}

/** Tombol ubah status + edit. Tidak tampil apa pun jika pengguna tidak boleh mengubah. */
export function MaintenanceActionButtons({ status, canUpdate, onChange, onEdit }: Props) {
  if (!canUpdate) return null;
  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {NEXT_STATUSES[status].map((next) => {
        const meta = ACTION_LABEL[next]!;
        return (
          <Button key={next} size="sm" variant={meta.destructive ? "outline" : "default"} onClick={() => onChange(next)}
            className={meta.destructive ? "text-destructive hover:text-destructive" : undefined}>
            <meta.icon /> {meta.label}
          </Button>
        );
      })}
      <Button size="sm" variant="outline" onClick={onEdit}><Pencil /> Edit</Button>
    </div>
  );
}
