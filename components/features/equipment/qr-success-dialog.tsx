"use client";
import { CheckCircle2, Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCard, type QrItem } from "./qr-card";
import type { QrEntityType } from "@/types/erd";

interface Props {
  equipment: QrItem | null;
  type?: QrEntityType;
  noun?: string;
  onAddAnother: () => void;
  onViewDetail: () => void;
  onClose: () => void;
}

export function QrSuccessDialog({ type = "eq", noun = "alat", equipment, onAddAnother, onViewDetail, onClose }: Props) {
  return (
    <Dialog open={!!equipment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-green-600" /> {noun.charAt(0).toUpperCase() + noun.slice(1)} berhasil disimpan</DialogTitle>
          <DialogDescription>
            QR dibuat otomatis dan tidak dapat diubah. Tempel label pada {noun} <strong>{equipment?.equipment_name}</strong>.
          </DialogDescription>
        </DialogHeader>
        {equipment && <QrCard equipment={equipment} size={200} type={type} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onViewDetail}><List /> Lihat Detail</Button>
          <Button onClick={onAddAnother}><Plus /> Tambah {noun.charAt(0).toUpperCase() + noun.slice(1)} Lagi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
