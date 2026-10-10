"use client";

import { useActionState } from "react";
import { Bell } from "lucide-react";
import { requestStockAlert } from "@/lib/actions/public";

export function StockAlertForm({ variantId, defaultEmail }: { variantId: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(requestStockAlert, null);
  if (state?.ok) return <p className="rounded-xl bg-sage-50 px-4 py-3 text-sm text-sage-900">{state.message}</p>;
  return (
    <form action={action} className="rounded-2xl border border-line bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-brand-500" /> Get notified when it&apos;s back</p>
      <input type="hidden" name="variantId" value={variantId} />
      <div className="mt-3 flex gap-2">
        <label htmlFor={`alert-${variantId}`} className="sr-only">Email address</label>
        <input id={`alert-${variantId}`} name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" placeholder="you@example.com" className="input" />
        <button className="btn-dark shrink-0" disabled={pending}>Notify me</button>
      </div>
      {state && !state.ok && <p className="mt-2 text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
