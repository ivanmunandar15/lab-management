"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QrCodeView } from "@/components/features/qr/qr-code-view";
import { downloadQrPng, printQrLabel } from "@/lib/qr";
import type { Equipment, QrEntityType } from "@/types/erd";

export type QrItem = Pick<Equipment, "qr_token" | "inventory_code" | "equipment_name">;

export function QrCard({ equipment, size = 160, type = "eq" }: { equipment: QrItem; size?: number; type?: QrEntityType }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    try { setBusy(true); await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Aksi QR gagal"); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <QrCodeView token={equipment.qr_token} type={type} size={size} label={`QR code ${equipment.inventory_code}`} />
      <p className="font-mono text-xs text-muted-foreground">{equipment.qr_token}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => downloadQrPng(type, equipment.qr_token, equipment.inventory_code))}>
          <Download /> Unduh PNG
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => printQrLabel(type, equipment.qr_token, equipment.equipment_name, equipment.inventory_code))}>
          <Printer /> Cetak Label
        </Button>
      </div>
    </div>
  );
}
