import "server-only";
import { db } from "./db";
import { addMonths } from "./utils";
import { refreshCrmStatus } from "./crm";
import { stripe, stripeEnabled } from "./stripe";

/**
 * Creates the order for one billing cycle of a subscription. In Stripe mode
 * this runs from the invoice.paid webhook; in demo mode from processDueRenewals.
 */
export async function createRenewalOrder(subscriptionId: string, opts: { stripePaymentIntentId?: string | null } = {}) {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: true, items: { include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } } } },
  });
  if (!sub || sub.status === "CANCELLED") return null;

  const subtotal = sub.items.reduce((s, i) => s + i.unitPence * i.quantity, 0);
  const order = await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: sub.userId,
        email: sub.user.email,
        status: "PAID",
        paidAt: new Date(),
        subtotalPence: subtotal,
        shippingPence: 0,
        totalPence: subtotal,
        shippingMethod: "STANDARD",
        shipName: sub.shipName,
        shipLine1: sub.shipLine1,
        shipLine2: sub.shipLine2,
        shipCity: sub.shipCity,
        shipPostcode: sub.shipPostcode,
        shipCountry: sub.shipCountry,
        subscriptionId: sub.id,
        isRenewal: true,
        stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
        items: {
          create: sub.items.map((i) => ({
            productId: i.variant.productId,
            variantId: i.variantId,
            title: i.variant.product.title,
            variantTitle: i.variant.title,
            imageUrl: i.variant.product.images[0]?.url ?? null,
            unitPence: i.unitPence,
            quantity: i.quantity,
            isSubscription: true,
          })),
        },
      },
    });
    for (const i of sub.items) await tx.variant.update({ where: { id: i.variantId }, data: { stock: { decrement: i.quantity } } });
    await tx.variant.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } });
    await tx.subscription.update({ where: { id: sub.id }, data: { nextChargeAt: addMonths(sub.nextChargeAt > new Date() ? sub.nextChargeAt : new Date(), sub.intervalMonths), status: "ACTIVE" } });
    await tx.event.create({ data: { type: "subscription_renewed", userId: sub.userId, valuePence: subtotal, meta: JSON.stringify({ subscriptionId: sub.id, orderId: order.id }) } });
    return order;
  });
  await refreshCrmStatus(sub.userId);
  return order;
}

/** Demo-mode billing run: renews every active subscription that is due. */
export async function processDueRenewals() {
  if (stripeEnabled) return { processed: 0, note: "Stripe bills subscriptions automatically." };
  const due = await db.subscription.findMany({ where: { status: "ACTIVE", nextChargeAt: { lte: new Date() }, stripeSubscriptionId: null } });
  for (const s of due) await createRenewalOrder(s.id);
  return { processed: due.length };
}

export async function pauseSubscription(id: string) {
  const sub = await db.subscription.findUniqueOrThrow({ where: { id } });
  if (sub.stripeSubscriptionId) await stripe().subscriptions.update(sub.stripeSubscriptionId, { pause_collection: { behavior: "void" } });
  await db.subscription.update({ where: { id }, data: { status: "PAUSED" } });
  await db.event.create({ data: { type: "subscription_paused", userId: sub.userId, meta: JSON.stringify({ subscriptionId: id }) } });
}

export async function resumeSubscription(id: string) {
  const sub = await db.subscription.findUniqueOrThrow({ where: { id } });
  if (sub.stripeSubscriptionId) await stripe().subscriptions.update(sub.stripeSubscriptionId, { pause_collection: null });
  const next = sub.nextChargeAt < new Date() ? addMonths(new Date(), sub.intervalMonths) : sub.nextChargeAt;
  await db.subscription.update({ where: { id }, data: { status: "ACTIVE", nextChargeAt: next } });
}

/** Pushes the next delivery back by one interval. */
export async function skipNextDelivery(id: string) {
  const sub = await db.subscription.findUniqueOrThrow({ where: { id } });
  const next = addMonths(sub.nextChargeAt, sub.intervalMonths);
  if (sub.stripeSubscriptionId) {
    await stripe().subscriptions.update(sub.stripeSubscriptionId, { trial_end: Math.floor(next.getTime() / 1000), proration_behavior: "none" });
  }
  await db.subscription.update({ where: { id }, data: { nextChargeAt: next } });
  await db.event.create({ data: { type: "subscription_skipped", userId: sub.userId, meta: JSON.stringify({ subscriptionId: id }) } });
}

export async function changeInterval(id: string, intervalMonths: number) {
  const sub = await db.subscription.findUniqueOrThrow({ where: { id }, include: { items: { include: { variant: { include: { product: true } } } } } });
  if (sub.stripeSubscriptionId) {
    const s = await stripe().subscriptions.retrieve(sub.stripeSubscriptionId);
    await stripe().subscriptions.update(sub.stripeSubscriptionId, {
      proration_behavior: "none",
      items: s.items.data.map((item) => ({
        id: item.id,
        price_data: {
          currency: "gbp",
          product: typeof item.price.product === "string" ? item.price.product : item.price.product.id,
          unit_amount: item.price.unit_amount ?? 0,
          recurring: { interval: "month", interval_count: intervalMonths },
        },
      })),
    });
  }
  await db.subscription.update({ where: { id }, data: { intervalMonths } });
}

export async function cancelSubscription(id: string, reason?: string) {
  const sub = await db.subscription.findUniqueOrThrow({ where: { id } });
  if (sub.stripeSubscriptionId) await stripe().subscriptions.cancel(sub.stripeSubscriptionId);
  await db.subscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason || null } });
  await db.event.create({ data: { type: "subscription_cancelled", userId: sub.userId, meta: JSON.stringify({ subscriptionId: id, reason }) } });
  await refreshCrmStatus(sub.userId);
}
