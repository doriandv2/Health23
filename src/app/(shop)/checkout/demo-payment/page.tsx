import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { formatPrice, orderRef } from "@/lib/money";
import { verifyOrderToken } from "@/lib/order-token";
import { fulfilPaidOrder } from "@/lib/orders";
import { stripeEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string; token?: string }> };

/** Stand-in for Stripe Checkout when no Stripe keys are configured. */
export default async function DemoPaymentPage({ searchParams }: Props) {
  if (stripeEnabled) notFound();
  const { order: orderParam, token } = await searchParams;
  const id = Number(orderParam);
  if (!id || !verifyOrderToken(id, token)) notFound();
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  if (order.status !== "PENDING") redirect(`/checkout/success?order=${id}&token=${token}`);

  async function pay() {
    "use server";
    if (stripeEnabled || !verifyOrderToken(id, token)) return;
    await fulfilPaidOrder(id, {});
    redirect(`/checkout/success?order=${id}&token=${token}`);
  }

  return (
    <div className="container-x max-w-lg py-16">
      <div className="card p-8">
        <p className="eyebrow">Demo payment</p>
        <h1 className="mt-2 text-3xl">Order {orderRef(order.id)}</h1>
        <p className="mt-2 text-sm text-ink-soft">This simulates the Stripe payment step. Configure Stripe keys to take real card, Apple Pay and Google Pay payments.</p>
        <ul className="mt-6 divide-y divide-line text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-2">
              <span>{i.quantity} × {i.title}{i.isSubscription && <span className="ml-1 text-brand-600">(subscription)</span>}</span>
              <span className="tabular-nums">{formatPrice(i.unitPence * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <form action={pay} className="mt-6">
          <button className="btn-primary w-full py-4 text-base"><CreditCard className="h-5 w-5" /> Pay {formatPrice(order.totalPence)}</button>
        </form>
      </div>
    </div>
  );
}
