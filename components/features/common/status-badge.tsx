import { cn } from "@/lib/utils";
import { CONDITION_META, STATUS_META, toneClass, toneDotClass, type AnyStatus, type BadgeMeta } from "@/lib/status";
import type { Condition } from "@/types/erd";

const UNKNOWN_CONDITION_META: BadgeMeta = { label: "Belum dinilai", tone: "slate" };

function Pill({ meta, className }: { meta: BadgeMeta; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", toneClass(meta.tone), className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", toneDotClass(meta.tone))} />
      {meta.label}
    </span>
  );
}

/** Status alat / penggunaan. Label teks selalu ada, tidak hanya warna. */
export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  return <Pill meta={STATUS_META[status]} className={className} />;
}

/** `null` = kondisi belum dinilai. */
export function ConditionBadge({ condition, className }: { condition: Condition | null; className?: string }) {
  return <Pill meta={condition ? CONDITION_META[condition] : UNKNOWN_CONDITION_META} className={className} />;
}

/** Badge generik dari BadgeMeta (mis. status kalibrasi, status sensor). */
export function MetaBadge({ meta, className }: { meta: BadgeMeta; className?: string }) {
  return <Pill meta={meta} className={className} />;
}
