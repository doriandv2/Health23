import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Pause, Play, SkipForward } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { SUBSCRIPTION_INTERVALS, intervalLabel } from "@/lib/config";
import { manageSubscription, updateSubscriptionQuantity } from "@/lib/actions/account";
import { StatusBadge } from "@/components/OrderStatusBadge";
import { EmptyState } from "@/components/ui";

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const subs = await db.subscription.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { items: { include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } } } },
  });

  if (subs.length === 0) {
    return <EmptyState title="No subscriptions yet" body="Choose “Subscribe & save” on any eligible product to save 10% and get free delivery on every repeat order." action={<Link href="/shop" className="btn-primary">Browse products</Link>} />;
  }

  return (
    <div className="space-y-6">
      {subs.map((s) => {
        const total = s.items.reduce((n, i) => n + i.unitPence * i.quantity, 0);
        const live = s.status !== "CANCELLED";
        return (
          <section key={s.id} className={`card p-6 ${live ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><h2 className="font-sans text-lg font-semibold tracking-normal">{intervalLabel(s.intervalMonths)}</h2><StatusBadge status={s.status} /></div>
                <p className="mt-1 text-sm text-ink-muted">
                  {formatPrice(total)} per delivery · free delivery · {s.discountPct}% off
                  {s.status === "ACTIVE" && <> · <CalendarClock className="inline h-3.5 w-3.5" /> next delivery <strong className="text-ink">{formatDate(s.nextChargeAt)}</strong></>}
                  {s.status === "CANCELLED" && s.cancelledAt && <> · cancelled {formatDate(s.cancelledAt)}</>}
                </p>
              </div>
              {live && (
                <div className="flex flex-wrap gap-2">
                  {s.status === "ACTIVE" && <ActionButton id={s.id} action="skip" icon={<SkipForward className="h-3.5 w-3.5" />}>Skip next</ActionButton>}
                  {s.status === "ACTIVE" && <ActionButton id={s.id} action="pause" icon={<Pause className="h-3.5 w-3.5" />}>Pause</ActionButton>}
                  {s.status === "PAUSED" && <ActionButton id={s.id} action="resume" icon={<Play className="h-3.5 w-3.5" />}>Resume</ActionButton>}
                </div>
              )}
            </div>

            <ul className="mt-5 divide-y divide-line border-y border-line">
              {s.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-line">
                    {i.variant.product.images[0] && <Image src={i.variant.product.images[0].url} alt="" fill sizes="56px" className="object-contain p-1" />}
                  </div>
                  <Link href={`/products/${i.variant.product.slug}`} className="flex-1 text-sm font-medium hover:text-brand-600">{i.variant.product.title}</Link>
                  {live && !s.stripeSubscriptionId ? (
                    <form action={updateSubscriptionQuantity} className="flex items-center gap-2">
                      <input type="hidden" name="itemId" value={i.id} />
                      <label className="sr-only" htmlFor={`q-${i.id}`}>Quantity</label>
                      <select id={`q-${i.id}`} name="quantity" defaultValue={i.quantity} className="rounded-lg border border-line bg-white px-2 py-1 text-sm">
                        {Array.from({ length: 10 }, (_, n) => <option key={n + 1}>{n + 1}</option>)}
                      </select>
                      <button className="text-xs text-brand-600 underline">Update</button>
                    </form>
                  ) : (
                    <span className="text-sm text-ink-muted">× {i.quantity}</span>
                  )}
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatPrice(i.unitPence * i.quantity)}</span>
                </li>
              ))}
            </ul>

            {live && (
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <form action={manageSubscription} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="action" value="interval" />
                  <div>
                    <label htmlFor={`int-${s.id}`} className="label">Delivery frequency</label>
                    <select id={`int-${s.id}`} name="intervalMonths" defaultValue={s.intervalMonths} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      {SUBSCRIPTION_INTERVALS.map((m) => <option key={m} value={m}>{intervalLabel(m)}</option>)}
                    </select>
                  </div>
                  <button className="btn-outline btn-sm">Save</button>
                </form>
                <details className="text-sm">
                  <summary className="cursor-pointer text-ink-muted underline-offset-4 hover:text-red-600 hover:underline">Cancel subscription</summary>
                  <form action={manageSubscription} className="mt-3 space-y-2 rounded-xl bg-cream p-4">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="action" value="cancel" />
                    <label htmlFor={`reason-${s.id}`} className="label">Mind telling us why?</label>
                    <select id={`reason-${s.id}`} name="reason" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      <option value="">Prefer not to say</option>
                      <option>I have too much product</option>
                      <option>Too expensive</option>
                      <option>Trying a different product</option>
                      <option>Didn&apos;t see results</option>
                      <option>Other</option>
                    </select>
                    <p className="text-xs text-ink-muted">Tip: you can pause or skip instead and keep your 10% saving.</p>
                    <button className="btn btn-sm bg-red-600 text-white hover:bg-red-700">Confirm cancellation</button>
                  </form>
                </details>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ActionButton({ id, action, icon, children }: { id: string; action: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <form action={manageSubscription}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className="btn-outline btn-sm">{icon}{children}</button>
    </form>
  );
}
