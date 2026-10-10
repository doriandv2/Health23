import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, FileText, Mail, MousePointerClick, ShoppingBag, StickyNote, Trash2, UserPlus } from "lucide-react";
import { CRM_STATUSES, intervalLabel } from "@/lib/config";
import { formatPrice, orderRef } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getCustomerDetail, type TimelineItem } from "@/lib/admin/customers";
import { subscriptionMonthlyValue } from "@/lib/admin/metrics";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { Badge } from "@/components/ui";
import { ActionForm, FieldError } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/buttons";
import { SubscriptionControls } from "@/components/admin/SubscriptionControls";
import { CrmBadge, OrderStatusBadge, PageHeader, Panel, StatPair, SubStatusBadge } from "@/components/admin/ui";
import { addNote, deleteNote, recalculateStatus, updateCustomer } from "../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const d = await getCustomerDetail(id);
  return { title: d ? d.user.name || d.user.email : "Contact" };
}

const KIND_ICON: Record<TimelineItem["kind"], typeof Mail> = {
  event: MousePointerClick,
  order: ShoppingBag,
  message: Mail,
  stock_alert: Bell,
  note: StickyNote,
  signup: UserPlus,
};

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();
  const { user, stats, timeline, stockAlerts, messages } = detail;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={user.name || user.email}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <CrmBadge status={user.crmStatus} />
            {user.role === "ADMIN" && <Badge tone="dark">Admin</Badge>}
            <span>{user.passwordHash ? "Registered account" : "No account (guest / lead)"}</span>
            <span>· Source: {user.source.replace(/_/g, " ")}</span>
            <span>· Added {formatDate(user.createdAt)}</span>
          </span>
        }
        actions={
          <a href={`mailto:${user.email}`} className="btn-outline btn-sm">
            <Mail className="h-4 w-4" aria-hidden /> Email
          </a>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Lifetime value", value: formatPrice(stats.ltv) },
          { label: "Paid orders", value: String(stats.orders) },
          { label: "Average order", value: stats.orders ? formatPrice(stats.aov) : "—" },
          { label: "First order", value: stats.firstOrder ? formatDate(stats.firstOrder) : "—" },
          { label: "Last order", value: stats.lastOrder ? formatDate(stats.lastOrder) : "—" },
          { label: "Subscriber since", value: stats.subscriberSince ? formatDate(stats.subscriberSince) : "—" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-1 text-lg font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Panel title="Profile">
            <ActionForm action={updateCustomer} className="space-y-4">
              <input type="hidden" name="id" value={user.id} />
              <div>
                <p className="label">Email</p>
                <p className="break-all text-sm">{user.email}</p>
              </div>
              <div>
                <label htmlFor="name" className="label">
                  Name
                </label>
                <input id="name" name="name" defaultValue={user.name ?? ""} className="input" />
                <FieldError name="name" />
              </div>
              <div>
                <label htmlFor="phone" className="label">
                  Phone
                </label>
                <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" />
                <FieldError name="phone" />
              </div>
              <div>
                <label htmlFor="crmStatus" className="label">
                  CRM status
                </label>
                <select id="crmStatus" name="crmStatus" defaultValue={user.crmStatus} className="input">
                  {CRM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "VIP" ? "VIP" : humanize(s)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-muted">Recalculated automatically after orders and subscription changes.</p>
              </div>
              <div>
                <label htmlFor="tags" className="label">
                  Tags
                </label>
                <input id="tags" name="tags" defaultValue={user.tags.split(",").filter(Boolean).join(", ")} className="input" placeholder="wholesale, athlete" />
                <p className="mt-1 text-xs text-ink-muted">Comma separated</p>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} className="h-4 w-4 rounded border-line accent-brand-500" />
                Marketing opt-in
              </label>
              <SubmitButton className="btn-dark w-full" pendingLabel="Saving…">
                Save profile
              </SubmitButton>
            </ActionForm>
            <form action={recalculateStatus} className="mt-3">
              <input type="hidden" name="id" value={user.id} />
              <SubmitButton className="btn-ghost btn-sm w-full" pendingLabel="Recalculating…">
                Recalculate status from orders
              </SubmitButton>
            </form>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <StatPair label="Last seen" value={user.lastSeenAt ? formatDate(user.lastSeenAt) : "—"} />
              <StatPair label="Stripe customer" value={user.stripeCustomerId ? "Linked" : "—"} />
            </dl>
            {user.addresses.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="label">Saved addresses</p>
                <ul className="space-y-2 text-sm text-ink-soft">
                  {user.addresses.map((a) => (
                    <li key={a.id}>
                      {a.name}, {a.line1}
                      {a.line2 && `, ${a.line2}`}, {a.city} {a.postcode}
                      {a.isDefault && <Badge className="ml-2">Default</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Notes" description="Internal only — never shown to the customer.">
            <ActionForm action={addNote} resetOnSuccess className="space-y-2">
              <input type="hidden" name="userId" value={user.id} />
              <label htmlFor="body" className="sr-only">
                New note
              </label>
              <textarea id="body" name="body" rows={3} className="input" placeholder="Add a note…" required />
              <FieldError name="body" />
              <SubmitButton className="btn-dark btn-sm" pendingLabel="Adding…">
                Add note
              </SubmitButton>
            </ActionForm>
            {user.notes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {user.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-cream/70 p-3 text-sm">
                    <p className="whitespace-pre-wrap text-ink">{n.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
                      <span>
                        {n.author?.name || n.author?.email || "Admin"} · {formatDateTime(n.createdAt)}
                      </span>
                      <form action={deleteNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <SubmitButton className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-red-700" aria-label="Delete note" confirm="Delete this note?">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Panel title={`Orders (${user.orders.length})`} bodyClassName="p-0">
            {user.orders.length ? (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <tbody className="divide-y divide-line">
                    {user.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-cream/40">
                        <td className="px-5 py-3">
                          <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                            {orderRef(o.id)}
                          </Link>
                          {o.isRenewal && <span className="ml-2 text-xs text-ink-muted">Renewal</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-ink-soft">{formatDate(o.createdAt)}</td>
                        <td className="px-5 py-3 text-xs text-ink-soft">
                          {o._count.items} item{o._count.items === 1 ? "" : "s"}
                        </td>
                        <td className="px-5 py-3">
                          <OrderStatusBadge status={o.status} />
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatPrice(o.totalPence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-5 text-sm text-ink-muted">No orders yet.</p>
            )}
          </Panel>

          <div id="subscriptions" className="scroll-mt-20">
            <Panel title={`Subscriptions (${user.subscriptions.length})`} bodyClassName="p-0">
              {user.subscriptions.length ? (
                <ul className="divide-y divide-line">
                  {user.subscriptions.map((s) => {
                    const cycle = s.items.reduce((t, i) => t + i.unitPence * i.quantity, 0);
                    return (
                      <li key={s.id} className="space-y-3 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <SubStatusBadge status={s.status} />
                          <span className="font-medium">{intervalLabel(s.intervalMonths)}</span>
                          <span className="text-ink-muted">·</span>
                          <span className="tabular-nums">
                            {formatPrice(cycle)} per delivery{s.intervalMonths > 1 && ` (${formatPrice(Math.round(subscriptionMonthlyValue(s)))}/mo)`}
                          </span>
                          <span className="text-ink-muted">·</span>
                          <span className="text-ink-soft">{s.status === "CANCELLED" ? `Cancelled ${s.cancelledAt ? formatDate(s.cancelledAt) : ""}` : `Next charge ${formatDate(s.nextChargeAt)}`}</span>
                        </div>
                        <ul className="text-xs text-ink-soft">
                          {s.items.map((i) => (
                            <li key={i.id}>
                              {i.quantity}× {i.variant.product.title}
                              {i.variant.title !== "Default" && ` – ${i.variant.title}`} · {formatPrice(i.unitPence)}
                            </li>
                          ))}
                        </ul>
                        {s.cancelReason && <p className="text-xs text-ink-muted">Reason: {s.cancelReason}</p>}
                        <SubscriptionControls id={s.id} status={s.status} intervalMonths={s.intervalMonths} />
                        <p className="text-[11px] text-ink-muted">
                          Started {formatDate(s.createdAt)} · {s.discountPct}% subscriber discount · {s.stripeSubscriptionId ? "Billed by Stripe" : "Demo billing"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="p-5 text-sm text-ink-muted">No subscriptions.</p>
              )}
            </Panel>
          </div>

          {(messages.length > 0 || stockAlerts.length > 0) && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Panel title={`Messages (${messages.length})`} actions={<Link href="/admin/inbox" className="btn-ghost btn-sm">Inbox</Link>}>
                {messages.length ? (
                  <ul className="space-y-3">
                    {messages.map((m) => (
                      <li key={m.id} className="text-sm">
                        <p className="flex items-center gap-2 text-xs text-ink-muted">
                          <Badge tone={m.status === "OPEN" ? "amber" : "neutral"}>{humanize(m.status)}</Badge> {formatDateTime(m.createdAt)}
                        </p>
                        <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-ink-soft">{m.message}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">None.</p>
                )}
              </Panel>
              <Panel title={`Stock alerts (${stockAlerts.length})`}>
                {stockAlerts.length ? (
                  <ul className="space-y-2 text-sm">
                    {stockAlerts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2">
                        <Link href={`/admin/products/${a.variant.product.id}`} className="min-w-0 truncate hover:underline">
                          {a.variant.product.title}
                          {a.variant.title !== "Default" && ` – ${a.variant.title}`}
                        </Link>
                        {a.notifiedAt ? <Badge>Notified</Badge> : a.variant.stock > 0 ? <Badge tone="green">Back in stock</Badge> : <Badge tone="amber">Waiting</Badge>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">None.</p>
                )}
              </Panel>
            </div>
          )}

          <Panel title="Activity" description="Product views, baskets, orders, messages and notes — newest first.">
            {timeline.length ? (
              <ol className="relative space-y-4 border-l border-line pl-6">
                {timeline.map((t) => {
                  const Icon = KIND_ICON[t.kind] ?? FileText;
                  const body = (
                    <>
                      <p className="text-sm font-medium text-ink">{t.title}</p>
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(t.at)}
                        {t.detail && <> · {t.detail}</>}
                      </p>
                    </>
                  );
                  return (
                    <li key={t.id} className="relative">
                      <span className="absolute -left-[37px] top-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft" aria-hidden>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {t.href ? (
                        <Link href={t.href} className="block rounded hover:underline">
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-ink-muted">No activity recorded.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
