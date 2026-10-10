"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/money";

export type SeriesPoint = { date: string; value: number };
type ValueFormat = "gbp" | "int";

// Single-series charts use brand-500 (validated: chroma, contrast >= 3:1 on white).
const SERIES = "#C2683F";
const GRID = "#ECE8E1";
const BASELINE = "#C9C3B8";
const MUTED = "#7A827D";

function fmt(v: number, f: ValueFormat) {
  return f === "gbp" ? formatPrice(v) : new Intl.NumberFormat("en-GB").format(v);
}

/** Compact tick labels: £0 / £500 / £1.2K, 0 / 20 / 1K */
function fmtTick(v: number, f: ValueFormat) {
  const n = f === "gbp" ? v / 100 : v;
  const s = n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${Math.round(n)}`;
  return f === "gbp" ? `£${s}` : s;
}

/** Rounds max up to a clean step so ticks read 0 / 50 / 100 … */
function niceScale(max: number, f: ValueFormat, ticks = 4) {
  const unit = f === "gbp" ? 100 : 1;
  const m = Math.max(max / unit, 1);
  const raw = m / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const niceStep = Math.max(f === "int" ? Math.ceil(step) : step, f === "int" ? 1 : 0);
  return { max: niceStep * ticks * unit, ticks: Array.from({ length: ticks + 1 }, (_, i) => i * niceStep * unit) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Hand-formatted so server and browser ICU data can't disagree (hydration-safe). */
function dayLabel(date: string, long = false) {
  const d = new Date(`${date}T00:00:00Z`);
  const short = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return long ? `${WEEKDAYS[d.getUTCDay()]} ${short}` : short;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Daily time series as columns (counts/amounts per day) or a line with a
 * light area wash. Hover/focus shows a crosshair + tooltip; arrow keys step
 * through days; a table view mirrors every value.
 */
export function TimeSeriesChart({ data, kind = "column", format = "int", label, height = 200 }: { data: SeriesPoint[]; kind?: "column" | "area"; format?: ValueFormat; label: string; height?: number }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();

  const pad = { top: 12, right: 8, bottom: 26, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const n = data.length;
  const scale = niceScale(Math.max(0, ...data.map((d) => d.value)), format);
  const y = (v: number) => pad.top + plotH - (scale.max ? (v / scale.max) * plotH : 0);
  const band = plotW / Math.max(n, 1);
  const cx = (i: number) => pad.left + band * i + band / 2;
  const barW = Math.max(1, Math.min(24, band - 2)); // 2px surface gap between neighbours, capped at 24px

  // X labels: ~6 evenly spaced, always including the last day.
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))));
  const xLabels = data.map((d, i) => ({ i, d })).filter(({ i }) => (n - 1 - i) % labelEvery === 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  function indexFromX(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left - pad.left;
    return Math.max(0, Math.min(n - 1, Math.floor(x / band)));
  }

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const areaPath = n ? `${linePath} L${cx(n - 1).toFixed(1)},${y(0)} L${cx(0).toFixed(1)},${y(0)} Z` : "";

  const activePoint = active !== null ? data[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(cx(active), 70), width - 70) : 0;

  return (
    <div>
      <div ref={wrapRef} className="relative w-full select-none overflow-x-clip">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}. Total ${fmt(total, format)}. Use arrow keys to read each day.`}
          aria-describedby={activePoint ? tooltipId : undefined}
          tabIndex={0}
          className="block rounded-lg focus-visible:ring-2 focus-visible:ring-brand-400"
          onPointerMove={(e) => setActive(indexFromX(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
            else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
            else return;
            e.preventDefault();
          }}
        >
          {/* Grid + y ticks */}
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtTick(t, format)}
              </text>
            </g>
          ))}
          {/* X labels */}
          {xLabels.map(({ i, d }) => (
            <text key={d.date} x={cx(i) + 22 > width ? width - 1 : cx(i)} y={height - 8} textAnchor={cx(i) + 22 > width ? "end" : "middle"} fontSize={11} fill={MUTED}>
              {dayLabel(d.date)}
            </text>
          ))}

          {kind === "column" ? (
            data.map((d, i) => {
              const top = y(d.value);
              const h = y(0) - top;
              if (h <= 0) return null;
              const r = Math.min(4, barW / 2, h);
              const x0 = cx(i) - barW / 2;
              // Rounded data-end (top), square at the baseline.
              const path = `M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${y(0)} Z`;
              return <path key={d.date} d={path} fill={SERIES} opacity={active === null || active === i ? 1 : 0.55} />;
            })
          ) : (
            <>
              <path d={areaPath} fill={SERIES} opacity={0.1} />
              <path d={linePath} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}

          {/* Crosshair + active marker */}
          {active !== null && activePoint && (
            <g pointerEvents="none">
              <line x1={cx(active)} x2={cx(active)} y1={pad.top} y2={y(0)} stroke={BASELINE} strokeWidth={1} />
              {kind === "area" && <circle cx={cx(active)} cy={y(activePoint.value)} r={4.5} fill={SERIES} stroke="#fff" strokeWidth={2} />}
            </g>
          )}

          {/* Selective direct label: the peak day (when not hovering) */}
          {active === null && n > 0 && data[peak].value > 0 && (
            <text x={Math.min(Math.max(cx(peak), pad.left + 24), width - pad.right - 24)} y={Math.max(y(data[peak].value) - 6, 10)} textAnchor="middle" fontSize={11} fontWeight={600} fill="#4A524D">
              {fmt(data[peak].value, format)}
            </text>
          )}
        </svg>

        {activePoint && active !== null && (
          <div
            id={tooltipId}
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lift"
            style={{ left: tipLeft }}
          >
            <p className="text-sm font-semibold text-ink">{fmt(activePoint.value, format)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-ink-muted">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: SERIES }} aria-hidden />
              {dayLabel(activePoint.date, true)}
            </p>
          </div>
        )}
      </div>

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer rounded text-ink-muted hover:text-ink">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 bg-cream px-3 py-1.5 font-semibold">
                  Day
                </th>
                <th scope="col" className="sticky top-0 bg-cream px-3 py-1.5 text-right font-semibold">
                  {label}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-line/60">
                  <td className="px-3 py-1">{dayLabel(d.date, true)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{fmt(d.value, format)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
