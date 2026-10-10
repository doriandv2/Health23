"use client";

import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./buttons";
import { intervalLabel, SUBSCRIPTION_INTERVALS } from "@/lib/config";
import { subscriptionAction } from "@/app/admin/subscriptions/actions";

/** Pause / resume / skip / change interval / cancel controls for one subscription. */
export function SubscriptionControls({
  id,
  status,
  intervalMonths,
  compact = false,
}: {
  id: string;
  status: string;
  intervalMonths: number;
  compact?: boolean;
}) {
  if (status === "CANCELLED") return <span className="text-xs text-ink-muted">No actions</span>;
  const sm = "btn-outline btn-sm px-3 py-1.5";
  return (
    <ActionForm action={subscriptionAction} className={compact ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2"}>
      <input type="hidden" name="id" value={id} />
      {status === "PAUSED" ? (
        <SubmitButton name="op" value="resume" className={sm}>
          Resume
        </SubmitButton>
      ) : (
        <SubmitButton name="op" value="pause" className={sm}>
          Pause
        </SubmitButton>
      )}
      <SubmitButton name="op" value="skip" className={sm} confirm="Skip the next delivery?">
        Skip next
      </SubmitButton>
      <span className="inline-flex items-center gap-1">
        <label htmlFor={`interval-${id}`} className="sr-only">
          Delivery interval
        </label>
        <select id={`interval-${id}`} name="intervalMonths" defaultValue={intervalMonths} className="rounded-full border border-line bg-white px-2.5 py-1.5 text-xs">
          {SUBSCRIPTION_INTERVALS.map((m) => (
            <option key={m} value={m}>
              {intervalLabel(m)}
            </option>
          ))}
        </select>
        <SubmitButton name="op" value="interval" className={sm}>
          Set
        </SubmitButton>
      </span>
      <SubmitButton name="op" value="cancel" className="btn-ghost btn-sm px-3 py-1.5 text-red-700 hover:bg-red-50 hover:text-red-800" confirm="Cancel this subscription? This can't be undone.">
        Cancel
      </SubmitButton>
    </ActionForm>
  );
}
