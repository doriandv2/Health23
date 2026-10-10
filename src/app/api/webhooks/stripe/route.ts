import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { fulfilPaidOrder } from "@/lib/orders";
import { createRenewalOrder } from "@/lib/subscriptions";
import { refreshCrmStatus } from "@/lib/crm";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderId = Number(session.metadata?.orderId);
      if (orderId && session.payment_status !== "unpaid") {
        await fulfilPaidOrder(orderId, {
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        });
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      // The first invoice is the checkout itself; only renewals create new orders.
      if (invoice.billing_reason !== "subscription_cycle") break;
      const subId = invoice.parent?.subscription_details?.subscription;
      const stripeSubId = typeof subId === "string" ? subId : subId?.id;
      const sub = stripeSubId ? await db.subscription.findUnique({ where: { stripeSubscriptionId: stripeSubId } }) : null;
      if (sub) await createRenewalOrder(sub.id);
      break;
    }
    case "invoice.payment_failed": {
      const subId = event.data.object.parent?.subscription_details?.subscription;
      const stripeSubId = typeof subId === "string" ? subId : subId?.id;
      if (stripeSubId) await db.subscription.updateMany({ where: { stripeSubscriptionId: stripeSubId }, data: { status: "PAST_DUE" } });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const s = event.data.object;
      const status = s.status === "canceled" ? "CANCELLED" : s.pause_collection ? "PAUSED" : s.status === "past_due" || s.status === "unpaid" ? "PAST_DUE" : "ACTIVE";
      const sub = await db.subscription.findUnique({ where: { stripeSubscriptionId: s.id } });
      if (sub) {
        const periodEnd = s.items.data[0]?.current_period_end;
        await db.subscription.update({
          where: { id: sub.id },
          data: { status, cancelledAt: status === "CANCELLED" ? sub.cancelledAt ?? new Date() : undefined, nextChargeAt: periodEnd ? new Date(periodEnd * 1000) : undefined },
        });
        await refreshCrmStatus(sub.userId);
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
