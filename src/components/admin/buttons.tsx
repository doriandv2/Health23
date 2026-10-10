"use client";

import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { PendingContext } from "./ActionForm";

/**
 * Submit button that disables itself while its form submits (works both in
 * plain `<form action={serverAction}>` forms and inside <ActionForm>).
 * `confirm` asks for confirmation first.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-dark btn-sm",
  confirm,
  name,
  value,
  title,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = formPending || ctxPending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      aria-label={ariaLabel}
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
