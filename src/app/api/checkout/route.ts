import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { quoteCart } from "@/lib/pricing";
import { upsertContact } from "@/lib/crm";
import { getSession, hashPassword, startSession } from "@/lib/auth";
import { createPendingOrder } from "@/lib/orders";
import { orderToken } from "@/lib/order-token";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { track } from "@/lib/track";
import { SITE, SHIPPING_METHODS } from "@/lib/config";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

const schema = z.object({
  cart: z.object({
    lines: z.array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(99), subscribe: z.boolean() })).min(1).max(50),
    intervalMonths: z.number().int(),
  }),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  marketingOptIn: z.boolean().default(false),
  password: z.string().max(200).optional(),
  shippingMethod: z.enum(["STANDARD", "EXPRESS"]),
  discountCode: z.string().max(40).nullish(),
  address: z.object({
    name: z.string().trim().min(2, "Enter your full name").max(120),
    line1: z.string().trim().min(2, "Enter your address").max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2, "Enter your town or city").max(100),
    postcode: z.string().trim().regex(UK_POSTCODE, "Enter a valid UK postcode"),
    phone: z.string().trim().max(30).optional(),
  }),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue.message, field: issue.path.join(".") }, { status: 400 });
  }
  const input = parsed.data;

  const quote = await quoteCart({ lines: input.cart.lines, intervalMonths: input.cart.intervalMonths, shippingMethod: input.shippingMethod, discountCode: input.discountCode });
  if (quote.lines.length === 0) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  if (quote.issues.length) return NextResponse.json({ error: quote.issues.join(" "), refresh: true }, { status: 409 });

  const session = await getSession();
  const user = await upsertContact(session?.email ?? input.email, {
    name: input.address.name,
    phone: input.address.phone,
    source: "checkout",
    marketingOptIn: input.marketingOptIn,
  });

  // A brand-new contact may set a password here. Existing contacts (e.g. past
  // guest buyers) claim their account via the order-confirmation link instead,
  // so knowing someone's email is never enough to read their order history.
  if (!session && !user.passwordHash && (await db.order.count({ where: { userId: user.id } })) === 0) {
    const pw = input.password ?? "";
    if (quote.hasSubscription && pw.length < 8) {
      return NextResponse.json({ error: "Create a password (8+ characters) so you can manage your subscription.", field: "password" }, { status: 400 });
    }
    if (pw.length >= 8) {
      await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw) } });
      await startSession(user);
    } else if (pw.length > 0) {
      return NextResponse.json({ error: "Passwords need at least 8 characters.", field: "password" }, { status: 400 });
    }
  }

  if ((await db.address.count({ where: { userId: user.id } })) === 0) {
    await db.address.create({ data: { userId: user.id, ...input.address, postcode: input.address.postcode.toUpperCase(), isDefault: true } });
  }

  const order = await createPendingOrder({ quote, email: user.email, userId: user.id, address: input.address });
  await track({ type: "checkout_submitted", userId: user.id, valuePence: quote.totalPence, meta: { orderId: order.id } });
  const token = orderToken(order.id);

  if (!stripeEnabled) {
    return NextResponse.json({ url: `/checkout/demo-payment?order=${order.id}&token=${token}` });
  }

  const s = stripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, name: input.address.name, metadata: { userId: user.id } });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = quote.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: "gbp",
      unit_amount: l.unitPence,
      product_data: { name: l.title, images: l.imageUrl ? [`${SITE.url}${l.imageUrl}`] : undefined, metadata: { variantId: l.variantId } },
      recurring: l.subscribe ? { interval: "month", interval_count: quote.intervalMonths } : undefined,
    },
  }));
  if (quote.shippingPence > 0) {
    lineItems.push({ quantity: 1, price_data: { currency: "gbp", unit_amount: quote.shippingPence, product_data: { name: `Delivery — ${SHIPPING_METHODS[quote.shippingMethod as keyof typeof SHIPPING_METHODS].label}` } } });
  }
  const discounts = quote.discountPence > 0
    ? [{ coupon: (await s.coupons.create({ amount_off: quote.discountPence, currency: "gbp", duration: "once", name: quote.discountCode ?? "Discount" })).id }]
    : undefined;

  const checkout = await s.checkout.sessions.create({
    mode: quote.hasSubscription ? "subscription" : "payment",
    customer: customerId,
    line_items: lineItems,
    discounts,
    metadata: { orderId: String(order.id) },
    subscription_data: quote.hasSubscription ? { metadata: { orderId: String(order.id), userId: user.id } } : undefined,
    payment_intent_data: quote.hasSubscription ? undefined : { metadata: { orderId: String(order.id) } },
    success_url: `${SITE.url}/checkout/success?order=${order.id}&token=${token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE.url}/checkout?cancelled=1`,
  });
  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: checkout.id } });
  return NextResponse.json({ url: checkout.url });
}
