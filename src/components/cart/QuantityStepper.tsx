"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({ value, onChange, max = 99, size = "md" }: { value: number; onChange: (n: number) => void; max?: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-8" : "h-12";
  const w = size === "sm" ? "w-8" : "w-11";
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-line bg-white`}>
      <button type="button" aria-label="Decrease quantity" className={`${w} grid h-full place-items-center text-ink-soft hover:text-ink disabled:opacity-30`} disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="Increase quantity" className={`${w} grid h-full place-items-center text-ink-soft hover:text-ink disabled:opacity-30`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
