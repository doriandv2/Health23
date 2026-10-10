"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { initialActionResult, type ActionResult } from "@/lib/admin/action-result";
import { cn } from "@/lib/utils";

const ResultContext = createContext<ActionResult>(initialActionResult);
export const PendingContext = createContext(false);

/** Field-level error from the nearest ActionForm's last result. */
export function FieldError({ name }: { name: string }) {
  const result = useContext(ResultContext);
  const msg = result.fieldErrors?.[name];
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-red-600" id={`${name}-error`}>
      {msg}
    </p>
  );
}

/** The last result's message; place it anywhere inside an ActionForm with showMessage={false}. */
export function FormMessage({ className }: { className?: string }) {
  const state = useContext(ResultContext);
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("text-sm", state.ok ? "text-emerald-700" : "text-red-600", className)}>
      {state.message}
    </p>
  );
}

/**
 * A form bound to a server action returning ActionResult. Shows the result
 * message and exposes field errors to <FieldError>.
 *
 * Submits via onSubmit + startTransition rather than `action=` so React 19
 * doesn't auto-reset the fields — a failed validation keeps what was typed.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  showMessage = true,
  id,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  showMessage?: boolean;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionResult);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <ResultContext.Provider value={state}>
      <PendingContext.Provider value={pending}>
        <form
          ref={ref}
          id={id}
          className={className}
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as SubmitEvent).submitter;
            const fd = new FormData(e.currentTarget, submitter);
            startTransition(() => formAction(fd));
          }}
        >
          {children}
          {showMessage && <FormMessage className="mt-3" />}
        </form>
      </PendingContext.Provider>
    </ResultContext.Provider>
  );
}
