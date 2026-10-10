import Link from "next/link";

/**
 * Ranked horizontal bars with every value labelled at the row end — a list,
 * so the numbers double as the table view. One series, one colour.
 */
export function BarList({ rows, emptyLabel = "No data for this period." }: { rows: { key: string; label: string; value: number; display: string; sub?: string; href?: string }[]; emptyLabel?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-muted">{emptyLabel}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">
              {r.href ? (
                <Link href={r.href} className="rounded hover:underline">
                  {r.label}
                </Link>
              ) : (
                r.label
              )}
              {r.sub && <span className="ml-2 text-xs text-ink-muted">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{r.display}</span>
          </div>
          <div className="h-2 w-full rounded-r bg-cream" aria-hidden>
            <div className="h-2 rounded-r bg-[#C2683F]" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
