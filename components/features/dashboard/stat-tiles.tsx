"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, CheckCircle2, ClipboardList, Gauge, ShieldAlert, Wrench, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/features/common/error-state";
import { useEquipmentStatusCounts } from "@/hooks/use-dashboard";
import { EQUIPMENT_STATUS_META, toneClass, type ToneKey } from "@/lib/status";
import type { EquipmentStatusCounts } from "@/lib/services";
import type { EquipmentStatus } from "@/types/erd";
import { AnimatedNumber } from "./animated-number";

interface Tile {
  key: keyof EquipmentStatusCounts;
  title: string;
  icon: LucideIcon;
  tone: ToneKey;
  /** Daftar equipment terfilter: /equipment?status=... (halaman equipment membaca parameter ini). */
  href: string;
}

const statusTile = (status: EquipmentStatus, icon: LucideIcon): Tile => ({
  key: status,
  title: EQUIPMENT_STATUS_META[status].label,
  icon,
  tone: EQUIPMENT_STATUS_META[status].tone,
  href: `/equipment?status=${status}`,
});

// "Total" memakai warna netral (slate) agar tidak tertukar dengan arti biru = dipinjam.
const TILES: Tile[] = [
  { key: "total", title: "Total alat", icon: Boxes, tone: "slate", href: "/equipment" },
  statusTile("available", CheckCircle2),
  statusTile("borrowed", ClipboardList),
  statusTile("damaged", ShieldAlert),
  statusTile("maintenance", Wrench),
  statusTile("calibration", Gauge),
];


const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

export function StatTiles() {
  const { data, isLoading, isError, refetch } = useEquipmentStatusCounts();
  const reduce = useReducedMotion();

  if (isError) {
    return <Card><ErrorState className="py-8" onRetry={() => refetch()} /></Card>;
  }

  return (
    <motion.ul
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      variants={reduce ? undefined : container}
      initial={reduce ? false : "hidden"}
      animate={reduce ? undefined : "show"}
      aria-label="Ringkasan status alat"
    >
      {TILES.map((t) => {
        const value = data?.[t.key];
        const share = data && t.key !== "total" && data.total > 0 ? Math.round((data[t.key] / data.total) * 100) : null;
        return (
          <motion.li key={t.key} variants={reduce ? undefined : item}>
            <Link
              href={t.href}
              aria-label={isLoading ? t.title : `${t.title}: ${value} alat. Buka daftar equipment.`}
              className="block rounded-lg"
            >
              <Card className="flex items-start justify-between gap-2 p-4 transition-colors hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">{t.title}</p>
                  {isLoading ? (
                    <Skeleton className="mt-2 h-8 w-14" />
                  ) : (
                    <p className="mt-1 text-3xl font-semibold"><AnimatedNumber value={value ?? 0} /></p>
                  )}
                  <p className="mt-1 h-4 text-xs text-muted-foreground">
                    {isLoading ? "" : share !== null ? `${share}% dari total` : "Alat aktif"}
                  </p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${toneClass(t.tone)}`}>
                  <t.icon className="size-[18px]" aria-hidden="true" />
                </div>
              </Card>
            </Link>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
