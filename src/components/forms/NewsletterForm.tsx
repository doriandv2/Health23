"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/lib/actions/public";

export function NewsletterForm({ className = "" }: { className?: string }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) return <p className={`rounded-xl bg-sage-50 px-4 py-3 text-sm text-sage-900 ${className}`}>{state.message}</p>;
  return (
    <form action={action} className={className}>
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="Enter your email" className="input rounded-full" />
        <button className="btn-dark shrink-0" disabled={pending}>{pending ? "…" : "Subscribe"}</button>
      </div>
      {state && !state.ok && <p className="mt-2 text-xs text-red-600">{state.message}</p>}
    </form>
  );
}
