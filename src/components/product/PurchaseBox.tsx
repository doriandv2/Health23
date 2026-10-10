"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, ShoppingBag, Zap } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { StockAlertForm } from "@/components/forms/StockAlertForm";
import { applyPct, formatPrice } from "@/lib/money";
import { SUBSCRIPTION_INTERVALS, intervalLabel } from "@/lib/config";

type Variant = { id: string; title: string; pricePence: number; compareAtPence: number | null; stock: number };

export function PurchaseBox(props: { productId: string; title: string; variants: Variant[]; subscribable: boolean; discountPct: number }) {
  const { productId, title, variants, subscribable, discountPct } = props;
  const { add } = useCart();
  const router = useRouter();
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [mode, setMode] = useState<"once" | "subscribe">("once");
  const [interval, setIntervalMonths] = useState(1);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const variant = variants.find((v) => v.id === variantId)!;
  const soldOut = variant.stock <= 0;
  const subPrice = applyPct(variant.pricePence, discountPct);
  const unit = mode === "subscribe" ? subPrice : variant.pricePence;

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addToCart = (openDrawer = true) => {
    add({ variantId, productId, quantity: qty, subscribe: mode === "subscribe", intervalMonths: interval }, { openDrawer });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums">{formatPrice(unit)}</span>
        {mode === "subscribe" && <span className="text-base text-ink-muted line-through tabular-nums">{formatPrice(variant.pricePence)}</span>}
        {mode === "once" && variant.compareAtPence && <span className="text-base text-ink-muted line-through tabular-nums">{formatPrice(variant.compareAtPence)}</span>}
      </div>

      {variants.length > 1 && (
        <fieldset>
          <legend className="label">Size / format</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" onClick={() => setVariantId(v.id)} aria-pressed={v.id === variantId}
                className={`rounded-full border px-4 py-2 text-sm transition ${v.id === variantId ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"} ${v.stock <= 0 ? "text-ink-muted line-through decoration-1" : ""}`}>
                {v.title}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {soldOut ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-black/5 px-4 py-3 text-sm font-medium">Currently sold out</p>
          <StockAlertForm variantId={variant.id} />
        </div>
      ) : (
        <>
          {subscribable && (
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Purchase option</legend>
              <PurchaseOption checked={mode === "once"} onSelect={() => setMode("once")} title="One-time purchase" price={formatPrice(variant.pricePence)} />
              <PurchaseOption checked={mode === "subscribe"} onSelect={() => setMode("subscribe")} title={`Subscribe & save ${discountPct}%`} price={formatPrice(subPrice)} highlight>
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {["Free UK delivery on every repeat order", "Skip, pause or cancel anytime — no commitment", "Never run out of your essentials"].map((t) => (
                    <li key={t} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sage-600" />{t}</li>
                  ))}
                </ul>
                {mode === "subscribe" && (
                  <div className="mt-3">
                    <label htmlFor="sub-interval" className="sr-only">Delivery frequency</label>
                    <select id="sub-interval" value={interval} onChange={(e) => setIntervalMonths(Number(e.target.value))} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      {SUBSCRIPTION_INTERVALS.map((m) => <option key={m} value={m}>Deliver {intervalLabel(m).toLowerCase()}</option>)}
                    </select>
                  </div>
                )}
              </PurchaseOption>
            </fieldset>
          )}

          <div ref={ctaRef} className="flex gap-3">
            <QuantityStepper value={qty} max={Math.min(99, variant.stock)} onChange={setQty} />
            <button type="button" onClick={() => addToCart()} className="btn-primary flex-1 py-3.5 text-base">
              {added ? <><Check className="h-5 w-5" /> Added</> : <><ShoppingBag className="h-5 w-5" /> {mode === "subscribe" ? "Subscribe now" : "Add to basket"}</>}
            </button>
          </div>
          <button type="button" onClick={() => { addToCart(false); router.push("/checkout"); }} className="btn-dark w-full py-3.5">
            <Zap className="h-4 w-4" /> Buy it now
          </button>
          <StockNote stock={variant.stock} />
        </>
      )}

      {!soldOut && (
        <div className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur transition-transform duration-300 lg:hidden ${showSticky ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!showSticky}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="text-sm font-semibold tabular-nums">{formatPrice(unit)}{mode === "subscribe" && <span className="ml-1 text-xs font-normal text-brand-600"><RefreshCw className="inline h-3 w-3" /> {intervalLabel(interval).toLowerCase()}</span>}</p>
            </div>
            <button type="button" tabIndex={showSticky ? 0 : -1} onClick={() => addToCart()} className="btn-primary">{added ? "Added" : "Add to basket"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseOption({ checked, onSelect, title, price, highlight, children }: { checked: boolean; onSelect: () => void; title: string; price: string; highlight?: boolean; children?: React.ReactNode }) {
  return (
    <label className={`block cursor-pointer rounded-2xl border-2 px-4 py-3.5 transition ${checked ? (highlight ? "border-brand-500 bg-brand-50/60" : "border-ink bg-white") : "border-line bg-white hover:border-ink/25"}`}>
      <div className="flex items-center gap-3">
        <input type="radio" name="purchase-mode" checked={checked} onChange={onSelect} className="h-4 w-4 accent-brand-500" />
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {highlight && <span className="chip bg-brand-500 text-white">Best value</span>}
        <span className="text-sm font-semibold tabular-nums">{price}</span>
      </div>
      {children && <div className="pl-7">{children}</div>}
    </label>
  );
}

function StockNote({ stock }: { stock: number }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${stock <= 5 ? "bg-amber-500" : "bg-emerald-500"}`} />
      {stock <= 5 ? <span><strong>Only {stock} left</strong> — order soon</span> : <span>In stock · order before 2pm for same-day dispatch</span>}
    </p>
  );
}
