import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { getCalibrationState, getDaysUntil } from "@/lib/domain";
import { CALIBRATION_STATE_META, toneClass } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Tanggal kalibrasi berikutnya, berwarna sesuai state (aman / segera / terlambat). */
export function CalibrationDate({ date }: { date: string | null }) {
  const state = getCalibrationState(date);
  const meta = CALIBRATION_STATE_META[state];
  const days = date ? getDaysUntil(date) : null;
  return (
    <div className="space-y-0.5">
      <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", toneClass(meta.tone))}>
        {date ? format(parseISO(date), "d MMM yyyy", { locale: idLocale }) : "Tanpa kalibrasi"}
      </span>
      <p className="text-xs text-muted-foreground">
        {days === null ? "Tidak ada jadwal" : days < 0 ? `Terlambat ${Math.abs(days)} hari` : days === 0 ? "Jatuh tempo hari ini" : `${days} hari lagi`}
      </p>
    </div>
  );
}
