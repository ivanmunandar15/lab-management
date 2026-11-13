"use client";
import { useMemo } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from "@/components/features/dashboard/chart-theme";
import { getReadingStatus } from "@/lib/domain";
import { formatDecimal } from "@/lib/format";
import type { RoomMonitoring, Sensor } from "@/types/erd";

export const SENSOR_COLORS = ["#2563eb", "#9333ea", "#0d9488", "#ea580c", "#db2777", "#4d7c0f"];
const MAX_POINTS = 160;

interface Props {
  sensors: Sensor[];
  readings: RoomMonitoring[];
  fromMs: number;
  toMs: number;
  /** Tinggi grafik (px). */
  height?: number;
}

/** Garis per sensor, garis batas min/max putus-putus, titik merah untuk nilai di luar batas. */
export function ReadingsChart({ sensors, readings, fromMs, toMs, height = 280 }: Props) {
  const { rows, outCount, yDomain } = useMemo(() => {
    const byTime = new Map<number, Record<string, number>>();
    let out = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of sensors) {
      lo = Math.min(lo, s.min_threshold); hi = Math.max(hi, s.max_threshold);
      const own = readings.filter((r) => r.sensor_id === s.sensor_id);
      const stride = Math.max(1, Math.ceil(own.length / MAX_POINTS));
      own.forEach((r, i) => {
        const bad = getReadingStatus(r.value, s) !== "normal";
        if (bad) out++;
        lo = Math.min(lo, r.value); hi = Math.max(hi, r.value);
        if (i % stride !== 0 && !bad && i !== own.length - 1) return; // jarangkan titik, tapi jangan buang yang di luar batas
        const t = Date.parse(r.measurement_time);
        byTime.set(t, { ...(byTime.get(t) ?? { t }), [s.sensor_id]: r.value });
      });
    }
    return {
      rows: [...byTime.values()].sort((a, b) => a.t - b.t),
      outCount: out,
      yDomain: [Math.floor(lo - 1), Math.ceil(hi + 1)] as [number, number],
    };
  }, [sensors, readings]);

  const span = toMs - fromMs;
  const tickFmt = (t: number) => format(t, span <= 26 * 3_600_000 ? "HH:mm" : "d MMM", { locale: idLocale });
  const single = sensors.length === 1;
  const unit = sensors[0]?.unit ?? "";

  return (
    <figure>
      <div role="img" aria-label={`Grafik ${sensors.map((s) => s.sensor_code).join(", ")}. ${outCount} pembacaan di luar batas normal.`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" scale="time" domain={[fromMs, toMs]} tickFormatter={tickFmt} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis domain={yDomain} tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} unit={unit === "%RH" ? "" : unit} />
            <Tooltip
              {...TOOLTIP_STYLE} cursor={{ stroke: GRID_STROKE }}
              labelFormatter={(t) => format(Number(t), "d MMM yyyy, HH:mm", { locale: idLocale })}
              formatter={(v: number, _n, item) => [`${formatDecimal(v)} ${unit}`, sensors.find((s) => s.sensor_id === item.dataKey)?.sensor_code ?? ""]}
            />
            {sensors.map((s, i) => {
              const color = SENSOR_COLORS[i % SENSOR_COLORS.length];
              return [
                <ReferenceLine key={`${s.sensor_id}-min`} y={s.min_threshold} stroke={color} strokeDasharray="5 4" strokeOpacity={0.7}
                  label={single ? { value: `Min ${s.min_threshold}`, fill: "hsl(var(--muted-foreground))", fontSize: 11, position: "insideBottomRight" } : undefined} />,
                <ReferenceLine key={`${s.sensor_id}-max`} y={s.max_threshold} stroke={color} strokeDasharray="5 4" strokeOpacity={0.7}
                  label={single ? { value: `Maks ${s.max_threshold}`, fill: "hsl(var(--muted-foreground))", fontSize: 11, position: "insideTopRight" } : undefined} />,
                <Line
                  key={s.sensor_id} dataKey={s.sensor_id} name={s.sensor_code} stroke={color} strokeWidth={2} connectNulls isAnimationActive={false}
                  dot={(p: { cx?: number; cy?: number; value?: number; index?: number }) =>
                    p.value !== undefined && p.cx !== undefined && p.cy !== undefined && getReadingStatus(p.value, s) !== "normal"
                      ? <circle key={`o-${s.sensor_id}-${p.index}`} cx={p.cx} cy={p.cy} r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
                      : <g key={`n-${s.sensor_id}-${p.index}`} />}
                  activeDot={{ r: 4 }}
                />,
              ];
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {sensors.map((s, i) => (
          <span key={s.sensor_id} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: SENSOR_COLORS[i % SENSOR_COLORS.length] }} aria-hidden="true" />{s.sensor_code}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-600" aria-hidden="true" />Di luar batas ({outCount})</span>
        <span>Garis putus-putus = batas min/maks</span>
      </figcaption>
    </figure>
  );
}
