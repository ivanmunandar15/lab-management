"use client";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  unit?: string;
  label: string;
  size?: "default" | "sm";
  className?: string;
}

/** Stepper jumlah dengan target sentuh besar (44px) untuk HP. */
export function QuantityStepper({ value, onChange, min = 0, max, unit, label, size = "default", className }: Props) {
  const btn = size === "sm" ? "size-9" : "size-11";
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-2", className)}>
      <Button type="button" variant="outline" size="icon" className={btn} aria-label={`Kurangi ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus />
      </Button>
      <output aria-live="polite" className={cn("min-w-12 text-center font-semibold tabular-nums", size === "sm" ? "text-base" : "text-lg")}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </output>
      <Button type="button" variant="outline" size="icon" className={btn} aria-label={`Tambah ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus />
      </Button>
    </div>
  );
}
