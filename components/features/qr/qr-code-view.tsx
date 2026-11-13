"use client";
import { useEffect, useRef, useState } from "react";
import { qrToCanvas } from "@/lib/qr";
import { cn } from "@/lib/utils";
import type { QrEntityType } from "@/types/erd";

interface QrCodeViewProps {
  token: string;
  type?: QrEntityType;
  size?: number;
  className?: string;
  label?: string;
}

/** Render QR dari token (canvas). Latar putih tetap agar terbaca di dark mode. */
export function QrCodeView({ token, type = "eq", size = 160, className, label }: QrCodeViewProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    setFailed(false);
    qrToCanvas(ref.current, type, token, size).catch(() => setFailed(true));
  }, [token, type, size]);

  if (failed) return <p role="alert" className="text-sm text-destructive">Gagal membuat QR.</p>;
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label ?? `QR code ${token}`}
      style={{ width: size, height: size }}
      className={cn("rounded-md border bg-white", className)}
    />
  );
}

export { downloadQrPng } from "@/lib/qr";
