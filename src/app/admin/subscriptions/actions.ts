"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { SUBSCRIPTION_INTERVALS } from "@/lib/config";
import { cancelSubscription, changeInterval, pauseSubscription, processDueRenewals, resumeSubscription, skipNextDelivery } from "@/lib/subscriptions";
import { fail, ok, type ActionResult } from "@/lib/admin/action-result";

const schema = z.object({
  id: z.string().min(1),
  op: z.enum(["pause", "resume", "skip", "cancel", "interval"]),
  intervalMonths: z.coerce.number().int().optional(),
  reason: z.string().max(500).optional(),
});

function revalidateSubscription(userId?: string) {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin");
  if (userId) revalidatePath(`/admin/customers/${userId}`);
}

/** One entry point for every admin subscription action, chosen by the submit button's `op`. */
export async function subscriptionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    op: formData.get("op"),
    intervalMonths: formData.get("intervalMonths") || undefined,
    reason: (formData.get("reason") as string | null) || undefined,
  });
  if (!parsed.success) return fail("Invalid request.");
  const { id, op, intervalMonths, reason } = parsed.data;
  const sub = await db.subscription.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!sub) return fail("Subscription not found.");
  if (sub.status === "CANCELLED") return fail("This subscription is already cancelled.");

  try {
    switch (op) {
      case "pause":
        if (sub.status === "PAUSED") return fail("Already paused.");
        await pauseSubscription(id);
        break;
      case "resume":
        await resumeSubscription(id);
        break;
      case "skip":
        await skipNextDelivery(id);
        break;
      case "cancel":
        await cancelSubscription(id, reason ? `Admin: ${reason}` : "Cancelled by admin");
        break;
      case "interval":
        if (!intervalMonths || !(SUBSCRIPTION_INTERVALS as readonly number[]).includes(intervalMonths)) return fail("Choose a valid interval.");
        await changeInterval(id, intervalMonths);
        break;
    }
  } catch (err) {
    console.error("subscription action failed", err);
    return fail("That didn't work — the payment provider may have rejected the change.");
  }

  revalidateSubscription(sub.userId);
  const labels = { pause: "Subscription paused.", resume: "Subscription resumed.", skip: "Next delivery skipped.", cancel: "Subscription cancelled.", interval: "Delivery interval updated." };
  return ok(labels[op]);
}

export async function runDueRenewals(): Promise<ActionResult> {
  await requireAdmin();
  const result = await processDueRenewals();
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  if ("note" in result && result.note) return ok(result.note);
  return ok(result.processed ? `Created ${result.processed} renewal order${result.processed === 1 ? "" : "s"}.` : "No subscriptions are due right now.");
}
