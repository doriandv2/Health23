"use client";

import Image from "next/image";
import Link from "next/link";
import { RefreshCw, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { SUBSCRIPTION_INTERVALS, intervalLabel } from "@/lib/config";
import type { QuotedLine } from "@/lib/cart-types";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./QuantityStepper";

export function CartLines({ lines, onNavigate }: { lines: QuotedLine[]; onNavigate?: () => void }) {
  const { update, remove } = useCart();
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <li key={`${l.variantId}-${l.subscribe}`} className="flex gap-4 py-4">
          <Link href={`/products/${l.slug}`} onClick={onNavigate} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line">
            {l.imageUrl && <Image src={l.imageUrl} alt={l.title} fill sizes="80px" className="object-contain p-1.5" />}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{l.brand}</p>
                <Link href={`/products/${l.slug}`} onClick={onNavigate} className="line-clamp-2 text-sm font-medium leading-snug hover:text-brand-600">{l.title}</Link>
                {l.variantTitle !== "Default" && <p className="text-xs text-ink-muted">{l.variantTitle}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{formatPrice(l.lineTotalPence)}</p>
                {l.subscribe && <p className="text-xs text-ink-muted line-through tabular-nums">{formatPrice(l.basePence * l.quantity)}</p>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <QuantityStepper size="sm" value={l.quantity} max={l.stock} onChange={(q) => update(l.variantId, l.subscribe, { quantity: q })} />
              <button type="button" onClick={() => remove(l.variantId, l.subscribe)} className="rounded-full p-2 text-ink-muted hover:bg-black/5 hover:text-red-600" aria-label={`Remove ${l.title}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {l.subscribable && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={l.subscribe} onChange={(e) => update(l.variantId, l.subscribe, { subscribe: e.target.checked })} />
                <span className={l.subscribe ? "font-semibold text-brand-700" : "text-ink-soft"}>
                  <RefreshCw className="mr-1 inline h-3 w-3" />
                  Subscribe &amp; save {l.subscriptionDiscountPct}%
                </span>
              </label>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IntervalSelect() {
  const { state, setInterval } = useCart();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm">
      <label htmlFor="cart-interval" className="flex items-center gap-2 font-medium text-brand-800">
        <RefreshCw className="h-4 w-4" /> Subscription delivery
      </label>
      <select id="cart-interval" className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm" value={state.intervalMonths} onChange={(e) => setInterval(Number(e.target.value))}>
        {SUBSCRIPTION_INTERVALS.map((m) => <option key={m} value={m}>{intervalLabel(m)}</option>)}
      </select>
    </div>
  );
}
