"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/lib/actions/public";
import { Field } from "@/components/ui";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessage, null);
  if (state?.ok) return <div className="card p-8 text-center"><p className="font-display text-2xl">Message sent</p><p className="mt-2 text-sm text-ink-soft">{state.message}</p></div>;
  return (
    <form action={action} className="card space-y-4 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name"><input id="c-name" name="name" required autoComplete="name" className="input" /></Field>
        <Field label="Email" htmlFor="c-email"><input id="c-email" name="email" type="email" required autoComplete="email" className="input" /></Field>
      </div>
      <Field label="Message" htmlFor="c-msg"><textarea id="c-msg" name="message" required rows={6} className="input" /></Field>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
