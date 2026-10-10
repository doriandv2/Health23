"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock, RefreshCw, Tag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { CartLines, IntervalSelect } from "@/components/cart/CartLines";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { sendEvent } from "@/components/analytics/sendEvent";
import { Field } from "@/components/ui";
import { formatPrice } from "@/lib/money";
import { SHIPPING_METHODS, intervalLabel } from "@/lib/config";
import type { Quote } from "@/lib/cart-types";

type Address = { name: string; line1: string; line2: string; city: string; postcode: string; phone: string };
type Props = {
  demoMode: boolean;
  cancelled: boolean;
  user: { email: string; name: string; phone: string; hasPassword: boolean } | null;
  savedAddress: Address | null;
};

export function CheckoutForm({ demoMode, cancelled, user, savedAddress }: Props) {
  const { state, quote: cartQuote, count } = useCart();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [addr, setAddr] = useState<Address>(savedAddress ?? { name: user?.name ?? "", line1: "", line2: "", city: "", postcode: "", phone: user?.phone ?? "" });
  const [method, setMethod] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const started = useRef(false);

  // Full quote including delivery method and discount code.
  useEffect(() => {
    if (state.lines.length === 0) return setQuote(null);
    const ctrl = new AbortController();
    fetch("/api/cart/quote", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...state, shippingMethod: method, discountCode: code }) })
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => {});
    return () => ctrl.abort();
  }, [state, method, code]);

  useEffect(() => {
    if (!started.current && count > 0) {
      started.current = true;
      sendEvent({ type: "checkout_started", valuePence: cartQuote?.totalPence });
    }
  }, [count, cartQuote]);

  const q = quote ?? cartQuote;
  const needsPassword = Boolean(q?.hasSubscription && !user);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: state, email, password: password || undefined, marketingOptIn: optIn, shippingMethod: method, discountCode: code, address: addr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error ?? "Something went wrong.", field: data.field });
        setSubmitting(false);
        if (data.field) document.getElementById(`f-${data.field}`)?.focus();
        return;
      }
      window.location.href = data.url;
    } catch {
      setError({ message: "Network error — please try again." });
      setSubmitting(false);
    }
  }

  if (count === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-4xl">Your basket is empty</h1>
        <p className="mt-3 text-ink-soft">Add something you love and come back here to check out.</p>
        <Link href="/shop" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));
  const fieldErr = (f: string) => (error?.field === f ? error.message : undefined);

  const summary = q && (
    <div className="space-y-4">
      <CartLines lines={q.lines} />
      {q.hasSubscription && <IntervalSelect />}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setCode(codeInput.trim() || null);
        }}
      >
        <label htmlFor="discount" className="sr-only">Discount code</label>
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input id="discount" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="Discount code" className="input pl-10" />
        </div>
        <button className="btn-outline shrink-0" disabled={!codeInput.trim()}>Apply</button>
      </form>
      {quote?.discountError && <p className="text-xs text-red-600">{quote.discountError}</p>}
      {quote?.discountCode && <p className="text-xs text-sage-700">Code <strong>{quote.discountCode}</strong> applied.</p>}
      <dl className="space-y-2 border-t border-line pt-4 text-sm">
        <Row label="Subtotal" value={formatPrice(q.subtotalPence)} />
        {q.savingsPence > 0 && <Row label="Subscription savings" value={`−${formatPrice(q.savingsPence)}`} accent />}
        {quote && quote.discountPence > 0 && <Row label={`Discount (${quote.discountCode})`} value={`−${formatPrice(quote.discountPence)}`} accent />}
        <Row label="Delivery" value={quote ? (quote.shippingPence === 0 ? "Free" : formatPrice(quote.shippingPence)) : "—"} />
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatPrice(quote?.totalPence ?? q.subtotalPence)}</dd>
        </div>
      </dl>
      {q.hasSubscription && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-xs text-brand-800">
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
          Subscription items renew {intervalLabel(q.intervalMonths).toLowerCase()} at {formatPrice(q.lines.filter((l) => l.subscribe).reduce((s, l) => s + l.lineTotalPence, 0))} with free delivery. Skip, pause or cancel anytime from your account.
        </p>
      )}
    </div>
  );

  return (
    <div className="container-x py-8 lg:py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl">Checkout</h1>
        <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Lock className="h-3.5 w-3.5" /> Secure checkout</p>
      </div>

      {cancelled && <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Payment was cancelled — your basket is still here whenever you&apos;re ready.</p>}
      {demoMode && <p className="mb-6 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-800"><strong>Demo mode:</strong> Stripe isn&apos;t configured, so no card will be charged. Add <code>STRIPE_SECRET_KEY</code> to take real payments.</p>}

      {/* Mobile order summary */}
      <div className="mb-6 rounded-2xl border border-line bg-white lg:hidden">
        <button type="button" onClick={() => setSummaryOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-4 text-sm" aria-expanded={summaryOpen}>
          <span className="flex items-center gap-2 font-medium">{summaryOpen ? "Hide" : "Show"} order summary <ChevronDown className={`h-4 w-4 transition ${summaryOpen ? "rotate-180" : ""}`} /></span>
          <span className="font-semibold tabular-nums">{q ? formatPrice(quote?.totalPence ?? q.subtotalPence) : "—"}</span>
        </button>
        {summaryOpen && <div className="border-t border-line px-4 pb-4">{summary}</div>}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
        <form onSubmit={submit} className="space-y-8" noValidate>
          <Section title="Contact" aside={!user && <Link href="/login?next=/checkout" className="text-sm text-brand-600 underline-offset-4 hover:underline">Have an account? Log in</Link>}>
            <Field label="Email" htmlFor="f-email" error={fieldErr("email")}>
              <input id="f-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={Boolean(user)} className="input read-only:bg-black/[.03]" />
            </Field>
            {!user && (
              <Field
                label={needsPassword ? "Create a password" : "Create a password (optional)"}
                htmlFor="f-password"
                error={fieldErr("password")}
                hint={needsPassword ? "You'll use this to manage your subscription." : "Save your details and track orders next time."}
              >
                <input id="f-password" type="password" autoComplete="new-password" minLength={8} required={needsPassword} value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="h-4 w-4 accent-brand-500" />
              Email me offers, giveaways and new arrivals
            </label>
          </Section>

          <Section title="Delivery address">
            <Field label="Full name" htmlFor="f-address.name" error={fieldErr("address.name")}><input id="f-address.name" required autoComplete="name" value={addr.name} onChange={set("name")} className="input" /></Field>
            <Field label="Address" htmlFor="f-address.line1" error={fieldErr("address.line1")}><input id="f-address.line1" required autoComplete="address-line1" value={addr.line1} onChange={set("line1")} className="input" /></Field>
            <Field label="Apartment, suite, etc. (optional)" htmlFor="f-address.line2"><input id="f-address.line2" autoComplete="address-line2" value={addr.line2} onChange={set("line2")} className="input" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Town / city" htmlFor="f-address.city" error={fieldErr("address.city")}><input id="f-address.city" required autoComplete="address-level2" value={addr.city} onChange={set("city")} className="input" /></Field>
              <Field label="Postcode" htmlFor="f-address.postcode" error={fieldErr("address.postcode")}><input id="f-address.postcode" required autoComplete="postal-code" value={addr.postcode} onChange={set("postcode")} className="input uppercase" /></Field>
            </div>
            <Field label="Phone (for delivery updates)" htmlFor="f-address.phone"><input id="f-address.phone" type="tel" autoComplete="tel" value={addr.phone} onChange={set("phone")} className="input" /></Field>
            <p className="text-xs text-ink-muted">We currently deliver to UK addresses.</p>
          </Section>

          <Section title="Delivery method">
            <div className="space-y-2.5">
              {Object.values(SHIPPING_METHODS).map((m) => {
                const price = m.freeOverThreshold && q && (q.hasSubscription || q.freeShippingRemainingPence === 0) ? "Free" : formatPrice(m.pricePence);
                return (
                  <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white px-4 py-4 transition ${method === m.id ? "border-ink" : "border-line hover:border-ink/25"}`}>
                    <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4 accent-brand-500" />
                    <span className="flex-1"><span className="block text-sm font-semibold">{m.label}</span><span className="block text-xs text-ink-muted">{m.description}</span></span>
                    <span className="text-sm font-semibold">{price}</span>
                  </label>
                );
              })}
            </div>
            {q && q.freeShippingRemainingPence > 0 && <FreeShippingBar remainingPence={q.freeShippingRemainingPence} hasSubscription={q.hasSubscription} />}
          </Section>

          {error && !error.field && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p>}
          {error?.field && <p role="alert" className="sr-only">{error.message}</p>}

          <div>
            <button type="submit" disabled={submitting || !quote} className="btn-primary w-full py-4 text-base">
              <Lock className="h-4 w-4" />
              {submitting ? "Redirecting to secure payment…" : `Continue to payment${quote ? ` · ${formatPrice(quote.totalPence)}` : ""}`}
            </button>
            <p className="mt-3 text-center text-xs text-ink-muted">
              Pay securely with card, Apple Pay or Google Pay via Stripe. By placing your order you agree to our <Link href="/pages/terms-of-service" className="underline">terms</Link>.
            </p>
          </div>
        </form>

        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-3xl border border-line bg-white p-6">
            <h2 className="mb-2 font-sans text-base font-semibold tracking-normal">Order summary</h2>
            {summary ?? <div className="h-40 animate-pulse rounded-xl bg-black/5" />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold tracking-normal">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-brand-700" : "text-ink-soft"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

