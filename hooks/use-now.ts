"use client";

import { useEffect, useState } from "react";

/** Waktu sekarang yang diperbarui berkala (untuk "sisa waktu" yang selalu segar). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
