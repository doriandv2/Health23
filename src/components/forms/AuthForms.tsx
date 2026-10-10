"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/lib/actions/auth";
import { Field } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="l-email"><input id="l-email" name="email" type="email" required autoComplete="email" className="input" /></Field>
      <Field label="Password" htmlFor="l-password"><input id="l-password" name="password" type="password" required autoComplete="current-password" className="input" /></Field>
      {state && !state.ok && <p role="alert" className="text-sm text-red-600">{state.message}</p>}
      <button className="btn-primary w-full py-3.5" disabled={pending}>{pending ? "Signing in…" : "Log in"}</button>
      <p className="text-center text-sm text-ink-soft">New to Red23? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next, email, order, token }: { next?: string; email?: string; order?: string; token?: string }) {
  const [state, action, pending] = useActionState(register, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="order" value={order ?? ""} />
      <input type="hidden" name="token" value={token ?? ""} />
      <Field label="Name" htmlFor="r-name"><input id="r-name" name="name" required autoComplete="name" className="input" /></Field>
      <Field label="Email" htmlFor="r-email"><input id="r-email" name="email" type="email" required autoComplete="email" defaultValue={email} className="input" /></Field>
      <Field label="Password" htmlFor="r-password" hint="At least 8 characters"><input id="r-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" name="marketing" className="h-4 w-4 accent-brand-500" /> Email me offers and new arrivals</label>
      {state && !state.ok && <p role="alert" className="text-sm text-red-600">{state.message}</p>}
      <button className="btn-primary w-full py-3.5" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-sm text-ink-soft">Already have an account? <Link href="/login" className="font-semibold text-brand-600">Log in</Link></p>
    </form>
  );
}
