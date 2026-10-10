import "server-only";
import { db } from "./db";
import { addMonths } from "./utils";
import { refreshCrmStatus } from "./crm";
import type { Quote } from "./cart-types";

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  postcode: string;
  country?: string;
  phone?: string | null;
};

export async function createPendingOrder(params: { quote: Quote; email: string; userId: string; address: ShippingAddress }) {
  const { quote, email, userId, address } = params;
  return db.order.create({
    data: {
      userId,
      email,
      status: "PENDING",
      subtotalPence: quote.subtotalPence,
      discountPence: quote.discountPence,
      discountCode: quote.discountCode,
      shippingPence: quote.shippingPence,
      shippingMethod: quote.shippingMethod,
      totalPence: quote.totalPence,
      shipName: address.name,
      shipLine1: address.line1,
      shipLine2: address.line2 || null,
      shipCity: address.city,
      shipPostcode: address.postcode.toUpperCase(),
      shipCountry: address.country || "GB",
      shipPhone: address.phone || null,
      items: {
        create: quote.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          variantTitle: l.variantTitle,
          imageUrl: l.imageUrl,
          unitPence: l.unitPence,
          quantity: l.quantity,
          isSubscription: l.subscribe,
        })),
      },
      subscriptionInterval: quote.hasSubscription ? quote.intervalMonths : null,
    },
  });
}

/**
 * Marks an order paid exactly once: decrements stock, counts the discount
 * use, creates the subscription for subscribe items and logs the conversion.
 * Safe to call repeatedly (webhook retries, demo + webhook races).
 */
export async function fulfilPaidOrder(orderId: number, opts: { stripeSubscriptionId?: string | null; stripePaymentIntentId?: string | null }) {
  const result = await db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: opts.stripePaymentIntentId ?? undefined },
    });
    if (claimed.count === 0) return null;

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { product: true } } } });
    for (const item of order.items) {
      if (item.variantId) {
        await tx.variant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
      }
    }
    // Overselling by a race clamps to zero rather than going negative.
    await tx.variant.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } });
    if (order.discountCode) {
      await tx.discountCode.update({ where: { code: order.discountCode }, data: { usageCount: { increment: 1 } } }).catch(() => {});
    }

    const subItems = order.items.filter((i) => i.isSubscription && i.variantId);
    let subscriptionId: string | null = null;
    const intervalMonths = order.subscriptionInterval ?? 1;
    if (subItems.length && order.userId) {
      const sub = await tx.subscription.create({
        data: {
          userId: order.userId,
          intervalMonths: intervalMonths,
          discountPct: subItems[0].product?.subscriptionDiscountPct ?? 10,
          nextChargeAt: addMonths(new Date(), intervalMonths),
          stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
          shipName: order.shipName,
          shipLine1: order.shipLine1,
          shipLine2: order.shipLine2,
          shipCity: order.shipCity,
          shipPostcode: order.shipPostcode,
          shipCountry: order.shipCountry,
          items: { create: subItems.map((i) => ({ variantId: i.variantId!, quantity: i.quantity, unitPence: i.unitPence })) },
        },
      });
      subscriptionId = sub.id;
      await tx.order.update({ where: { id: order.id }, data: { subscriptionId } });
    }

    await tx.event.create({ data: { type: "order_completed", userId: order.userId, valuePence: order.totalPence, meta: JSON.stringify({ orderId: order.id }) } });
    if (subscriptionId) {
      await tx.event.create({ data: { type: "subscription_started", userId: order.userId, meta: JSON.stringify({ subscriptionId, intervalMonths: intervalMonths }) } });
    }
    await tx.user.update({ where: { id: order.userId! }, data: { crmStatus: "CUSTOMER" } }).catch(() => {});
    return order;
  });

  if (result?.userId) await refreshCrmStatus(result.userId);
  return result;
}
