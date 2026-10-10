"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartLine, CartState, Quote } from "@/lib/cart-types";
import { sendEvent } from "@/components/analytics/sendEvent";

const STORAGE_KEY = "r23_cart_v1";

type CartContextValue = {
  state: CartState;
  quote: Quote | null;
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  add: (line: CartLine & { productId?: string; intervalMonths?: number }, opts?: { openDrawer?: boolean }) => void;
  update: (variantId: string, subscribe: boolean, patch: Partial<CartLine>) => void;
  remove: (variantId: string, subscribe: boolean) => void;
  setInterval: (months: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY: CartState = { lines: [], intervalMonths: 1 };

function load(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartState;
    return Array.isArray(parsed.lines) ? { lines: parsed.lines, intervalMonths: parsed.intervalMonths || 1 } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** The same variant can sit in the cart twice: once one-off, once on subscription. */
const sameLine = (a: CartLine, variantId: string, subscribe: boolean) => a.variantId === variantId && a.subscribe === subscribe;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  // Re-price from the server whenever the cart changes.
  useEffect(() => {
    if (!hydrated) return;
    if (state.lines.length === 0) {
      setQuote(null);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
        const q = (await res.json()) as Quote;
        if (id !== requestId.current) return;
        setQuote(q);
        // Drop lines the server rejected and clamp quantities to stock.
        const valid = q.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, subscribe: l.subscribe }));
        if (JSON.stringify(valid) !== JSON.stringify(state.lines)) setState((s) => ({ ...s, lines: valid }));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  const add = useCallback<CartContextValue["add"]>((line, opts) => {
    setState((s) => {
      const existing = s.lines.find((l) => sameLine(l, line.variantId, line.subscribe));
      const lines = existing
        ? s.lines.map((l) => (l === existing ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l))
        : [...s.lines, { variantId: line.variantId, quantity: line.quantity, subscribe: line.subscribe }];
      return { lines, intervalMonths: line.subscribe && line.intervalMonths ? line.intervalMonths : s.intervalMonths };
    });
    sendEvent({ type: "add_to_cart", productId: line.productId, meta: { subscribe: line.subscribe, quantity: line.quantity } });
    if (opts?.openDrawer !== false) setOpen(true);
  }, []);

  const update = useCallback<CartContextValue["update"]>((variantId, subscribe, patch) => {
    setState((s) => {
      const target = s.lines.find((l) => sameLine(l, variantId, subscribe));
      if (!target) return s;
      const next = { ...target, ...patch };
      // Merge if toggling subscribe collides with an existing line.
      const clash = s.lines.find((l) => l !== target && sameLine(l, next.variantId, next.subscribe));
      const lines = clash
        ? s.lines.filter((l) => l !== target).map((l) => (l === clash ? { ...l, quantity: Math.min(99, l.quantity + next.quantity) } : l))
        : s.lines.map((l) => (l === target ? next : l));
      return { ...s, lines: lines.filter((l) => l.quantity > 0) };
    });
  }, []);

  const remove = useCallback((variantId: string, subscribe: boolean) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => !sameLine(l, variantId, subscribe)) }));
  }, []);

  const setInterval = useCallback((intervalMonths: number) => setState((s) => ({ ...s, intervalMonths })), []);
  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({ state, quote, loading, open, setOpen, count: state.lines.reduce((n, l) => n + l.quantity, 0), add, update, remove, setInterval, clear }),
    [state, quote, loading, open, add, update, remove, setInterval, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
