import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stat tile: label, value, and a signed delta vs the previous period.
 * Delta colour = direction × whether up is good; an icon + text carry it too.
 */
export function KpiTile({
  label,
  value,
  current,
  previous,
  upIsGood = true,
  comparison,
  deltaMode = "relative",
  formatDelta,
  hint,
}: {
  label: string;
  value: string;
  current: number;
  previous: number | null;
  upIsGood?: boolean;
  comparison: string;
  /** "relative" = % change; "points" = absolute difference in percentage points (for rates). */
  deltaMode?: "relative" | "points";
  formatDelta?: (diff: number) => string;
  hint?: string;
}) {
  let deltaText = "—";
  let direction: "up" | "down" | "flat" = "flat";
  if (previous !== null) {
    const diff = current - previous;
    direction = Math.abs(diff) < 1e-9 ? "flat" : diff > 0 ? "up" : "down";
    if (deltaMode === "points") {
      deltaText = `${diff >= 0 ? "+" : "−"}${Math.abs(diff * 100).toFixed(1)} pts`;
    } else if (formatDelta) {
      deltaText = `${diff >= 0 ? "+" : "−"}${formatDelta(Math.abs(diff))}`;
    } else if (previous === 0) {
      deltaText = current === 0 ? "0%" : "New";
    } else {
      const pct = (diff / Math.abs(previous)) * 100;
      deltaText = `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
    }
  }
  const good = direction === "flat" ? null : (direction === "up") === upIsGood;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium text-ink-muted" title={hint}>
        {label}
      </p>
      <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{value}</p>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
            good === null ? "bg-black/5 text-ink-soft" : good ? "bg-emerald-50 text-[#006300]" : "bg-red-50 text-red-700",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <span>
            <span className="sr-only">{direction === "up" ? "Up " : direction === "down" ? "Down " : "No change "}</span>
            {deltaText}
          </span>
        </span>
        <span className="text-ink-muted">{comparison}</span>
      </p>
    </div>
  );
}
