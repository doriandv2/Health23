import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPrice, orderRef } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/OrderStatusBadge";

const STEPS = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];
const STEP_LABELS = ["Order placed", "Packed", "Shipped", "Delivered"];

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const order = await db.order.findFirst({ where: { id: Number((await params).id), userId: user.id }, include: { items: { include: { product: true } } } });
  if (!order) notFound();
  const step = STEPS.indexOf(order.status);

  return (
    <div className="max-w-3xl">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h2 className="text-3xl">{orderRef(order.id)}</h2>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">Placed {formatDate(order.createdAt)}</p>

      {step >= 0 && (
        <ol className="mt-8 grid grid-cols-4 gap-2">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="text-center text-xs">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-sage-600" : "bg-black/10"}`} />
              <p className={`mt-2 ${i <= step ? "font-semibold text-ink" : "text-ink-muted"}`}>{label}</p>
            </li>
          ))}
        </ol>
      )}
      {order.trackingNumber && <p className="mt-4 text-sm">Tracking number: <strong>{order.trackingNumber}</strong></p>}

      <div className="card mt-8 p-6">
        <ul className="divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-contain p-1" />}</div>
              <div className="flex-1 text-sm">
                {i.product ? <Link href={`/products/${i.product.slug}`} className="font-medium hover:text-brand-600">{i.title}</Link> : <p className="font-medium">{i.title}</p>}
                <p className="text-ink-muted">Qty {i.quantity}{i.variantTitle !== "Default" && ` · ${i.variantTitle}`}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatPrice(i.unitPence * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-ink-soft"><dt>Subtotal</dt><dd>{formatPrice(order.subtotalPence)}</dd></div>
          {order.discountPence > 0 && <div className="flex justify-between text-brand-700"><dt>Discount</dt><dd>−{formatPrice(order.discountPence)}</dd></div>}
          <div className="flex justify-between text-ink-soft"><dt>Delivery</dt><dd>{order.shippingPence ? formatPrice(order.shippingPence) : "Free"}</dd></div>
          <div className="flex justify-between pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(order.totalPence)}</dd></div>
        </dl>
        <p className="mt-6 text-sm text-ink-soft"><strong className="text-ink">Delivery address:</strong> {order.shipName}, {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}, {order.shipCity} {order.shipPostcode}</p>
      </div>
    </div>
  );
}
