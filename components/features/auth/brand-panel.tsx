"use client";
import { FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { APP_NAME } from "@/lib/constants";
import { StatusBadge } from "@/components/features/common/status-badge";
import type { EquipmentStatus } from "@/types/erd";

const SAMPLE: { code: string; name: string; status: EquipmentStatus }[] = [
  { code: "LAB-0142", name: "Spektrofotometer UV-Vis", status: "available" },
  { code: "LAB-0087", name: "Centrifuge 5810R", status: "borrowed" },
  { code: "LAB-0203", name: "Analytical Balance", status: "calibration" },
];

export function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b2a6f] p-12 text-white lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-white text-[#2563EB]">
          <FlaskConical className="size-6" aria-hidden="true" />
        </div>
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </div>

      <div className="max-w-md">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
          Setiap alat lab terlacak, dari rak sampai kalibrasi.
        </h2>
        <p className="mt-4 text-blue-100">
          Scan QR di alat untuk meminjam, mengembalikan, dan melihat riwayat perawatannya.
        </p>

        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-10 space-y-2 rounded-xl bg-white p-3 text-slate-900 shadow-2xl"
          aria-label="Contoh daftar alat"
        >
          {SAMPLE.map((s) => (
            <li key={s.code} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-slate-600">{s.code}</p>
              </div>
              <StatusBadge status={s.status} />
            </li>
          ))}
        </motion.ul>
      </div>

      <p className="text-sm text-blue-200">© {new Date().getFullYear()} {APP_NAME}</p>
    </div>
  );
}
