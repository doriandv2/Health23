"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SUBSCRIPTION_INTERVALS } from "@/lib/config";
import * as subs from "@/lib/subscriptions";

async function ownSubscription(id: string) {
  const user = await requireUser();
  const sub = await db.subscription.findFirst({ where: { id, userId: user.id } });
  if (!sub) throw new Error("Subscription not found");
  return sub;
}

export async function manageSubscription(form: FormData) {
  const id = String(form.get("id"));
  const action = String(form.get("action"));
  const sub = await ownSubscription(id);
  if (sub.status === "CANCELLED") return;
  switch (action) {
    case "pause":
      await subs.pauseSubscription(id);
      break;
    case "resume":
      await subs.resumeSubscription(id);
      break;
    case "skip":
      await subs.skipNextDelivery(id);
      break;
    case "interval": {
      const months = Number(form.get("intervalMonths"));
      if ((SUBSCRIPTION_INTERVALS as readonly number[]).includes(months)) await subs.changeInterval(id, months);
      break;
    }
    case "cancel":
      await subs.cancelSubscription(id, String(form.get("reason") ?? "").slice(0, 200) || undefined);
      break;
  }
  revalidatePath("/account/subscriptions");
  revalidatePath("/account");
}

export async function updateSubscriptionQuantity(form: FormData) {
  const itemId = String(form.get("itemId"));
  const quantity = z.coerce.number().int().min(1).max(20).parse(form.get("quantity"));
  const user = await requireUser();
  const item = await db.subscriptionItem.findFirst({ where: { id: itemId, subscription: { userId: user.id, stripeSubscriptionId: null } } });
  if (item) await db.subscriptionItem.update({ where: { id: itemId }, data: { quantity } });
  revalidatePath("/account/subscriptions");
}

const profileSchema = z.object({ name: z.string().trim().max(120), phone: z.string().trim().max(30), marketingOptIn: z.string().optional() });

export async function updateProfile(form: FormData) {
  const user = await requireUser();
  const data = profileSchema.parse(Object.fromEntries(form));
  await db.user.update({ where: { id: user.id }, data: { name: data.name || null, phone: data.phone || null, marketingOptIn: Boolean(data.marketingOptIn) } });
  revalidatePath("/account");
}
