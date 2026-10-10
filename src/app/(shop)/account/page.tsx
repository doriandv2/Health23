import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPrice, orderRef } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { intervalLabel } from "@/lib/config";
import { updateProfile } from "@/lib/actions/account";
import { StatusBadge } from "@/components/OrderStatusBadge";
import { EmptyState, Field } from "@/components/ui";

export default async function AccountPage() {
  const user = await requireUser();
  const [orders, subs] = await Promise.all([
    db.order.findMany({ where: { userId: user.id, status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    db.subscription.findMany({ where: { userId: user.id, status: { not: "CANCELLED" } }, include: { items: { include: { variant: { include: { product: true } } } } } }),
  ]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h2 className="font-sans text-lg font-semibold tracking-normal">Order history</h2>
        {orders.length === 0 ? (
          <div className="mt-4"><EmptyState title="No orders yet" body="When you place an order it'll appear here." action={<Link href="/shop" className="btn-primary">Start shopping</Link>} /></div>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="card flex flex-wrap items-center gap-4 p-5 transition hover:shadow-lift">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{orderRef(o.id)} {o.isRenewal && <span className="ml-1 text-xs font-normal text-brand-600"><RefreshCw className="inline h-3 w-3" /> Subscription</span>}</p>
                    <p className="truncate text-sm text-ink-muted">{formatDate(o.createdAt)} · {o.items.map((i) => i.title).join(", ")}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <p className="w-20 text-right text-sm font-semibold tabular-nums">{formatPrice(o.totalPence)}</p>
                  <ArrowRight className="h-4 w-4 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-6">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold tracking-normal">Subscriptions</h2>
            <Link href="/account/subscriptions" className="text-sm text-brand-600">Manage</Link>
          </div>
          {subs.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Save 10% and get free delivery by subscribing to your favourites.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {subs.map((s) => (
                <li key={s.id} className="rounded-xl bg-cream p-3 text-sm">
                  <div className="flex items-center justify-between"><span className="font-medium">{intervalLabel(s.intervalMonths)}</span><StatusBadge status={s.status} /></div>
                  <p className="mt-1 text-ink-muted">{s.items.map((i) => i.variant.product.title).join(", ")}</p>
                  {s.status === "ACTIVE" && <p className="mt-1 text-xs text-ink-soft">Next delivery {formatDate(s.nextChargeAt)}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form action={updateProfile} className="card space-y-4 p-5">
          <h2 className="font-sans text-base font-semibold tracking-normal">Your details</h2>
          <p className="text-sm text-ink-muted">{user.email}</p>
          <Field label="Name" htmlFor="p-name"><input id="p-name" name="name" defaultValue={user.name ?? ""} className="input" /></Field>
          <Field label="Phone" htmlFor="p-phone"><input id="p-phone" name="phone" defaultValue={user.phone ?? ""} className="input" /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} className="h-4 w-4 accent-brand-500" /> Receive offers by email</label>
          <button className="btn-outline btn-sm">Save details</button>
        </form>
      </aside>
    </div>
  );
}
