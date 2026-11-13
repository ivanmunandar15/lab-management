"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** Angka yang menghitung naik dari 0. Tanpa animasi jika pengguna memilih reduced motion. */
export function AnimatedNumber({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, { duration, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className="tabular-nums">{display}</span>;
}
