import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatPrice, orderRef } from "@/lib/money";
import { verifyOrderToken } from "@/lib/order-token";
import { fulfilPaidOrder } from "@/lib/orders";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { SHIPPING_METHODS, intervalLabel } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string; token?: string; session_id?: string }> };

export default async function SuccessPage({ searchParams }: Props) {
  const { order: orderParam, token, session_id } = await searchParams;
  const id = Number(orderParam);
  if (!id || !verifyOrderToken(id, token)) notFound();

  let order = await db.order.findUnique({ where: { id } });
  if (!order) notFound();

  // Don't wait on the webhook: confirm with Stripe directly (idempotent).
  if (order.status === "PENDING" && stripeEnabled && session_id && session_id === order.stripeSessionId) {
    const s = await stripe().checkout.sessions.retrieve(session_id);
    if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
      await fulfilPaidOrder(id, {
        stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : s.subscription?.id,
        stripePaymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id,
      });
    }
  }

  const full = await db.order.findUniqueOrThrow({ where: { id }, include: { items: true, subscription: true, user: true } });
  order = full;
  const session = await getSession();
  const paid = full.status !== "PENDING";

  return (
    <div className="container-x max-w-3xl py-14">
      <ClearCart />
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-sage-600" />
        <h1 className="mt-4 text-4xl">{paid ? "Thank you for your order!" : "We're confirming your payment"}</h1>
        <p className="mt-3 text-ink-soft">
          Order <strong>{orderRef(full.id)}</strong> · a confirmation is on its way to <strong>{full.email}</strong>.
        </p>
      </div>

      {full.subscription && (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-900">
          <p className="flex items-center gap-2 font-semibold"><RefreshCw className="h-4 w-4" /> Your subscription is active</p>
          <p className="mt-1">Delivered {intervalLabel(full.subscription.intervalMonths).toLowerCase()} · next delivery around {formatDate(full.subscription.nextChargeAt)}. Manage it any time from <Link href="/account/subscriptions" className="underline">your account</Link>.</p>
        </div>
      )}

      <div className="card mt-8 p-6">
        <ul className="divide-y divide-line">
          {full.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line">
                {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-contain p-1" />}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{i.title}</p>
                <p className="text-ink-muted">Qty {i.quantity}{i.isSubscription && " · Subscription"}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatPrice(i.unitPence * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd>{formatPrice(full.subtotalPence)}</dd></div>
          {full.discountPence > 0 && <div className="flex justify-between text-brand-700"><dt>Discount</dt><dd>−{formatPrice(full.discountPence)}</dd></div>}
          <div className="flex justify-between text-ink-soft"><dt>Delivery ({SHIPPING_METHODS[full.shippingMethod as keyof typeof SHIPPING_METHODS]?.label})</dt><dd>{full.shippingPence ? formatPrice(full.shippingPence) : "Free"}</dd></div>
          <div className="flex justify-between pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(full.totalPence)}</dd></div>
        </dl>
        <div className="mt-6 rounded-xl bg-cream p-4 text-sm">
          <p className="font-semibold">Delivering to</p>
          <p className="mt-1 text-ink-soft">{full.shipName}, {full.shipLine1}{full.shipLine2 ? `, ${full.shipLine2}` : ""}, {full.shipCity} {full.shipPostcode}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {session ? <Link href="/account" className="btn-dark">View my orders</Link> : !full.user?.passwordHash && <Link href={`/register?email=${encodeURIComponent(full.email)}&order=${full.id}&token=${token}`} className="btn-dark">Create an account to track orders</Link>}
        <Link href="/shop" className="btn-outline">Continue shopping</Link>
      </div>
    </div>
  );
}
