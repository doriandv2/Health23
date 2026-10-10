import type { ZodError } from "zod";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every submit so the form can reset/animate on success. */
  at?: number;
};

export const initialActionResult: ActionResult = { ok: false };

export function zodFailure(error: ZodError, message = "Please fix the highlighted fields."): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, message, fieldErrors, at: Date.now() };
}

export function ok(message?: string): ActionResult {
  return { ok: true, message, at: Date.now() };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, message, fieldErrors, at: Date.now() };
}
