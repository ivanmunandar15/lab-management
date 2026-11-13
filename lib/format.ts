import { formatDistanceToNowStrict } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface RemainingTime {
  /** Contoh: "Sisa 1 hari 3 jam" atau "Terlambat 2 hari". */
  label: string;
  overdue: boolean;
  /** Kurang dari 24 jam lagi (belum terlambat). */
  urgent: boolean;
}

/** Sisa waktu / keterlambatan terhadap target, dalam bahasa Indonesia. */
export function formatRemaining(target: string | Date, now: Date = new Date()): RemainingTime {
  const diff = new Date(target).getTime() - now.getTime();
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const text =
    days > 0 ? (hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`)
    : hours > 0 ? `${hours} jam ${minutes} menit`
    : `${Math.max(1, minutes)} menit`;
  return { label: `${overdue ? "Terlambat" : "Sisa"} ${text}`, overdue, urgent: !overdue && abs < 86_400_000 };
}

export const timeAgo = (iso: string) => formatDistanceToNowStrict(new Date(iso), { locale: idLocale, addSuffix: true });

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/** "Rp 12,5 jt" untuk sumbu grafik. */
export const formatRupiahCompact = (n: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;

export const formatDecimal = (n: number) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
