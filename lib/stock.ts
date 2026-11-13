import { CHART_COLOR } from "@/lib/status";

export const LOW_STOCK_RATIO = 0.2;
export type StockLevel = "out" | "low" | "ok";

/** habis: 0 | menipis: di bawah 20% dari total | ok. */
export function getStockLevel(available: number, total: number): StockLevel {
  if (available <= 0) return "out";
  return total > 0 && available / total < LOW_STOCK_RATIO ? "low" : "ok";
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = { out: "Stok habis", low: "Stok menipis", ok: "Stok aman" };
export const stockPercent = (available: number, total: number) => (total > 0 ? Math.round((available / total) * 100) : 0);
export const stockBarColor = (l: StockLevel) => (l === "ok" ? CHART_COLOR.available : CHART_COLOR.damaged);
