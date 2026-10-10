"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Lock, ShoppingBag, X } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { useCart } from "./CartProvider";
import { CartLines, IntervalSelect } from "./CartLines";
import { FreeShippingBar } from "./FreeShippingBar";

export function CartDrawer() {
  const { open, setOpen, quote, state, loading } = useCart();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname, setOpen]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;
  const empty = state.lines.length === 0;
  const lines = quote?.lines ?? [];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your basket">
      <button className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" aria-label="Close basket" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-cream shadow-lift">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl">Your basket</h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-black/5" aria-label="Close basket"><X className="h-5 w-5" /></button>
        </header>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag className="h-10 w-10 text-ink-muted" />
            <p className="font-display text-xl">Your basket is empty</p>
            <p className="text-sm text-ink-muted">Discover supplements our nutrition team has researched and tested.</p>
            <Link href="/shop" className="btn-primary mt-2">Shop all products</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-5 pt-4">
              {quote && <FreeShippingBar remainingPence={quote.freeShippingRemainingPence} hasSubscription={quote.hasSubscription} />}
              {quote?.hasSubscription && <IntervalSelect />}
              {quote?.issues.map((i) => <p key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{i}</p>)}
            </div>
            <div className={`flex-1 overflow-y-auto px-5 transition-opacity ${loading && !quote ? "opacity-50" : ""}`}>
              {quote ? <CartLines lines={lines} onNavigate={() => setOpen(false)} /> : <div className="space-y-4 py-4">{state.lines.map((l) => <div key={l.variantId + l.subscribe} className="h-20 animate-pulse rounded-xl bg-black/5" />)}</div>}
            </div>
            <footer className="space-y-3 border-t border-line bg-white px-5 py-5">
              {quote && quote.savingsPence > 0 && (
                <div className="flex justify-between text-sm text-brand-700"><span>Subscription savings</span><span className="tabular-nums">−{formatPrice(quote.savingsPence)}</span></div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-soft">Subtotal</span>
                <span className="text-lg font-semibold tabular-nums">{quote ? formatPrice(quote.subtotalPence) : "—"}</span>
              </div>
              <p className="text-xs text-ink-muted">Delivery and discount codes calculated at checkout.</p>
              <Link href="/checkout" className="btn-primary w-full py-4 text-base" aria-disabled={!quote}>
                <Lock className="h-4 w-4" /> Checkout securely
              </Link>
              <button onClick={() => setOpen(false)} className="w-full text-center text-sm text-ink-soft underline-offset-4 hover:underline">Continue shopping</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
