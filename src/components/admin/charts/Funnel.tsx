import { formatPct } from "@/lib/admin/format";

/**
 * Conversion funnel: one bar per ordered step, width relative to the first
 * step, with step-over-step and overall conversion labelled on each row.
 */
export function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  const top = Math.max(steps[0]?.count ?? 0, 1);
  return (
    <ol className="space-y-3" aria-label="Conversion funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].count : null;
        const stepRate = prev ? s.count / prev : null;
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-ink-soft" aria-hidden>
                  {i + 1}
                </span>
                {s.label}
              </span>
              <span className="shrink-0 text-right">
                <span className="font-semibold tabular-nums text-ink">{s.count.toLocaleString("en-GB")}</span>
                {stepRate !== null && (
                  <span className="ml-2 text-xs tabular-nums text-ink-muted">
                    {formatPct(stepRate)} of previous
                  </span>
                )}
              </span>
            </div>
            <div className="h-6 w-full rounded-r bg-cream" aria-hidden>
              <div className="flex h-6 items-center rounded-r bg-[#C2683F]" style={{ width: `${Math.max(1, (s.count / top) * 100)}%` }} />
            </div>
          </li>
        );
      })}
      {steps.length > 1 && (
        <li className="pt-1 text-xs text-ink-muted">
          Overall: <span className="font-semibold text-ink">{formatPct(steps[steps.length - 1].count / top, 2)}</span> of visitors ordered
        </li>
      )}
    </ol>
  );
}
