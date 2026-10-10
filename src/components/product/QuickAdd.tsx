"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export function QuickAdd({ variantId, productId, title }: { variantId: string; productId: string; title: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        add({ variantId, productId, quantity: 1, subscribe: false });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white shadow-card transition hover:scale-105 hover:bg-brand-500"
      aria-label={`Add ${title} to basket`}
    >
      {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
