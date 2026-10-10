import Link from "next/link";
import { notFound } from "next/navigation";
import { Repeat } from "lucide-react";
import { db } from "@/lib/db";
import { ORDER_STATUSES, SHIPPING_METHODS, intervalLabel, type ShippingMethodId } from "@/lib/config";
import { formatPrice, orderRef } from "@/lib/money";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { ActionForm, FieldError } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/buttons";
import { CrmBadge, OrderStatusBadge, PageHeader, Panel, SubStatusBadge, Thumb } from "@/components/admin/ui";
import { updateOrder } from "../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const n = Number(id);
  return { title: Number.isInteger(n) ? `Order ${orderRef(n)}` : "Order" };
}

function parseMeta(meta: string | null): Record<string, unknown> {
  try {
    const v: unknown = meta ? JSON.parse(meta) : {};
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true } } } },
      user: { select: { id: true, name: true, email: true, crmStatus: true, phone: true, _count: { select: { orders: true } } } },
      subscription: { select: { id: true, status: true, intervalMonths: true, nextChargeAt: true } },
    },
  });
  if (!order) notFound();

  // Events that reference this order. Match the exact JSON number so 5 doesn't match 50.
  const events = await db.event.findMany({
    where: { OR: [{ meta: { contains: `"orderId":${id},` } }, { meta: { contains: `"orderId":${id}}` } }] },
    orderBy: { createdAt: "asc" },
  });

  const timeline: { at: Date; title: string; detail?: string }[] = [{ at: order.createdAt, title: order.isRenewal ? "Renewal order created" : "Order placed", detail: `${order.items.length} line${order.items.length === 1 ? "" : "s"} · ${formatPrice(order.totalPence)}` }];
  if (order.paidAt) timeline.push({ at: order.paidAt, title: "Payment received", detail: order.stripePaymentIntentId ? `Stripe ${order.stripePaymentIntentId}` : "Demo / manual" });
  for (const e of events) {
    const m = parseMeta(e.meta);
    if (e.type === "order_completed") continue; // same moment as payment
    if (e.type === "order_status_changed") timeline.push({ at: e.createdAt, title: `Status: ${humanize(String(m.from ?? "?"))} → ${humanize(String(m.to ?? "?"))}`, detail: typeof m.by === "string" ? `by ${m.by}` : undefined });
    else if (e.type === "order_tracking_added") timeline.push({ at: e.createdAt, title: "Tracking number added", detail: `${String(m.trackingNumber ?? "")}${typeof m.by === "string" ? ` · by ${m.by}` : ""}` });
    else if (e.type === "subscription_renewed") timeline.push({ at: e.createdAt, title: "Subscription renewed" });
  }
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime());

  const method = SHIPPING_METHODS[order.shippingMethod as ShippingMethodId];
  const hasSubItems = order.items.some((i) => i.isSubscription);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={`Order ${orderRef(order.id)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span>Placed {formatDateTime(order.createdAt)}</span>
            {order.isRenewal && (
              <span className="inline-flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5" aria-hidden /> Subscription renewal
              </span>
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Items" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <Thumb src={i.imageUrl} alt="" size={48} />
                  <div className="min-w-0 flex-1">
                    {i.product ? (
                      <Link href={`/admin/products/${i.product.id}`} className="font-medium hover:underline">
                        {i.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{i.title}</span>
                    )}
                    <p className="text-xs text-ink-muted">
                      {i.variantTitle !== "Default" && `${i.variantTitle} · `}
                      {formatPrice(i.unitPence)} × {i.quantity}
                      {i.isSubscription && " · Subscribe & Save"}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatPrice(i.unitPence * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotalPence)}</dd>
              </div>
              {order.discountPence > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Discount{order.discountCode && ` (${order.discountCode})`}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.discountPence)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping · {method?.label ?? order.shippingMethod}</dt>
                <dd className="tabular-nums">{order.shippingPence ? formatPrice(order.shippingPence) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(order.totalPence)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Timeline">
            <ol className="relative space-y-4 border-l border-line pl-5">
              {timeline.map((t, idx) => (
                <li key={idx} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" aria-hidden />
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(t.at)}
                    {t.detail && ` · ${t.detail}`}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Fulfilment">
            <ActionForm action={updateOrder} className="space-y-4">
              <input type="hidden" name="id" value={order.id} />
              <div>
                <label htmlFor="status" className="label">
                  Status
                </label>
                <select id="status" name="status" defaultValue={order.status} className="input">
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
                <FieldError name="status" />
              </div>
              <div>
                <label htmlFor="trackingNumber" className="label">
                  Tracking number
                </label>
                <input id="trackingNumber" name="trackingNumber" defaultValue={order.trackingNumber ?? ""} className="input" placeholder="e.g. RM123456789GB" autoComplete="off" />
                <FieldError name="trackingNumber" />
              </div>
              <SubmitButton className="btn-dark w-full" pendingLabel="Saving…">
                Save changes
              </SubmitButton>
              <p className="text-xs text-ink-muted">Status changes don&apos;t email the customer or adjust stock automatically.</p>
            </ActionForm>
          </Panel>

          <Panel title="Customer">
            {order.user ? (
              <div className="space-y-1 text-sm">
                <Link href={`/admin/customers/${order.user.id}`} className="font-semibold hover:underline">
                  {order.user.name || order.user.email}
                </Link>
                <p className="text-ink-soft">{order.email}</p>
                {order.user.phone && <p className="text-ink-soft">{order.user.phone}</p>}
                <p className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
                  <CrmBadge status={order.user.crmStatus} /> {order.user._count.orders} order{order.user._count.orders === 1 ? "" : "s"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">{order.email} (no linked contact)</p>
            )}
          </Panel>

          <Panel title="Shipping address">
            <address className="text-sm not-italic leading-6 text-ink-soft">
              <span className="font-medium text-ink">{order.shipName}</span>
              <br />
              {order.shipLine1}
              <br />
              {order.shipLine2 && (
                <>
                  {order.shipLine2}
                  <br />
                </>
              )}
              {order.shipCity}
              <br />
              {order.shipPostcode}
              <br />
              {order.shipCountry}
              {order.shipPhone && (
                <>
                  <br />
                  {order.shipPhone}
                </>
              )}
            </address>
          </Panel>

          {(order.subscription || hasSubItems) && (
            <Panel title="Subscription">
              {order.subscription ? (
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <SubStatusBadge status={order.subscription.status} /> {intervalLabel(order.subscription.intervalMonths)}
                  </p>
                  <p className="text-ink-soft">
                    {order.isRenewal ? "Renewal of a subscription" : "This order started a subscription"}. Next charge {formatDateTime(order.subscription.nextChargeAt)}.
                  </p>
                  {order.user && (
                    <Link href={`/admin/customers/${order.user.id}#subscriptions`} className="btn-outline btn-sm">
                      Manage subscription
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-soft">Contains Subscribe &amp; Save items{order.subscriptionInterval ? ` (${intervalLabel(order.subscriptionInterval).toLowerCase()})` : ""}; the subscription is created when payment completes.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
