import { AlertTriangle } from "lucide-react";
import { getStockLevel, stockBarColor, stockPercent, STOCK_LEVEL_LABEL } from "@/lib/stock";
import { cn } from "@/lib/utils";

interface Props { available: number; total: number; unit: string; showWarning?: boolean; className?: string }

/** Progress bar stok. Merah + teks peringatan (bukan hanya warna) jika habis atau < 20%. */
export function StockBar({ available, total, unit, showWarning = true, className }: Props) {
  const level = getStockLevel(available, total);
  const pct = stockPercent(available, total);
  return (
    <div className={cn("min-w-36 space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={cn("font-medium tabular-nums", level !== "ok" && "text-red-700 dark:text-red-400")}>{available} / {total} {unit}</span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div role="progressbar" aria-label="Stok tersedia" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${available} dari ${total} ${unit}`} className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stockBarColor(level) }} />
      </div>
      {showWarning && level !== "ok" && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400"><AlertTriangle className="size-3.5" aria-hidden="true" />{STOCK_LEVEL_LABEL[level]}</p>
      )}
    </div>
  );
}
