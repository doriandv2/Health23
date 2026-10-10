import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe";
import { intervalLabel } from "@/lib/config";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getSubscriptionSnapshot, parseRange, RANGE_OPTIONS, subscriptionMonthlyValue } from "@/lib/admin/metrics";
import { formatPct, humanize, pageParam, param, qs, relativeDays, SUBSCRIPTION_STATUSES, type SearchParams } from "@/lib/admin/format";
import { EmptyState } from "@/components/ui";
import { KpiTile } from "@/components/admin/charts/KpiTile";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/buttons";
import { SubscriptionControls } from "@/components/admin/SubscriptionControls";
import { FilterBar, FilterField, filterInput, PageHeader, Pagination, SubStatusBadge, TableWrap, td, th } from "@/components/admin/ui";
import { runDueRenewals } from "./actions";

export const metadata = { title: "Subscriptions" };

const PAGE_SIZE = 25;

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status = param(sp, "status");
  const q = param(sp, "q");
  const days = parseRange(param(sp, "range"));
  const page = pageParam(sp);

  const where: Prisma.SubscriptionWhereInput = {};
  if (status && (SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (q) where.user = { OR: [{ email: { contains: q } }, { name: { contains: q } }] };

  const [snapshot, total, subs, dueNow] = await Promise.all([
    getSubscriptionSnapshot(days),
    db.subscription.count({ where }),
    db.subscription.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, items: { include: { variant: { include: { product: { select: { id: true, title: true } } } } } } },
      orderBy: [{ status: "asc" }, { nextChargeAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.subscription.count({ where: { status: "ACTIVE", nextChargeAt: { lte: new Date() }, stripeSubscriptionId: null } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date();
  const base = { status, q, range: days === 30 ? undefined : days };

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Subscribe & Save customers and their delivery schedules."
        actions={
          !stripeEnabled && (
            <ActionForm action={runDueRenewals} className="flex flex-col items-end">
              <SubmitButton className="btn-primary btn-sm" pendingLabel="Running…" confirm={`Charge ${dueNow} due subscription${dueNow === 1 ? "" : "s"} now (demo billing)?`}>
                Run due renewals ({dueNow})
              </SubmitButton>
              <span className="mt-1 text-[11px] text-ink-muted">Demo billing — Stripe is not configured</span>
            </ActionForm>
          )
        }
      />

      <nav aria-label="KPI period" className="mb-4 flex flex-wrap gap-2 text-xs">
        {RANGE_OPTIONS.map((r) => (
          <Link key={r} href={`/admin/subscriptions${qs({ ...base, range: r === 30 ? undefined : r })}`} aria-current={r === days ? "page" : undefined} className={r === days ? "chip bg-ink py-1 text-white" : "chip bg-white py-1 text-ink-soft ring-1 ring-line hover:text-ink"}>
            Last {r} days
          </Link>
        ))}
      </nav>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KpiTile label="Active" value={String(snapshot.active)} current={snapshot.active} previous={snapshot.activeThen} comparison={`vs ${days} days ago`} />
        <KpiTile label="Paused" value={String(snapshot.paused)} current={snapshot.paused} previous={null} upIsGood={false} comparison="right now" />
        <KpiTile label="Cancelled" value={String(snapshot.cancelledInPeriod)} current={snapshot.cancelledInPeriod} previous={null} upIsGood={false} comparison={`in last ${days} days`} />
        <KpiTile label="MRR" value={formatPrice(snapshot.mrr)} current={snapshot.mrr} previous={snapshot.mrrThen} comparison={`vs ${days} days ago`} />
        <KpiTile label="Churn rate" value={formatPct(snapshot.churnRate)} current={snapshot.churnRate} previous={null} upIsGood={false} comparison={`${days}-day, of subs live at start`} />
      </div>

      <FilterBar resetHref="/admin/subscriptions">
        <FilterField label="Search customer" htmlFor="q" className="min-w-[220px] flex-1 sm:flex-none">
          <input id="q" name="q" defaultValue={q} placeholder="Name or email" className={filterInput} />
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={status} className={filterInput}>
            <option value="">All statuses</option>
            {SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </FilterField>
        {days !== 30 && <input type="hidden" name="range" value={days} />}
      </FilterBar>

      {subs.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>Items</th>
              <th scope="col" className={th}>Interval</th>
              <th scope="col" className={th}>Next charge</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={`${th} text-right`}>Value</th>
              <th scope="col" className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => {
              const cycle = s.items.reduce((t, i) => t + i.unitPence * i.quantity, 0);
              const overdue = s.status === "ACTIVE" && s.nextChargeAt < now;
              return (
                <tr key={s.id} className="hover:bg-cream/40">
                  <td className={td}>
                    <Link href={`/admin/customers/${s.user.id}`} className="font-medium hover:underline">
                      {s.user.name || s.user.email}
                    </Link>
                    {s.user.name && <p className="text-xs text-ink-muted">{s.user.email}</p>}
                  </td>
                  <td className={`${td} max-w-[260px]`}>
                    <ul className="space-y-0.5 text-xs">
                      {s.items.map((i) => (
                        <li key={i.id} className="truncate">
                          {i.quantity}× {i.variant.product.title}
                          {i.variant.title !== "Default" && <span className="text-ink-muted"> – {i.variant.title}</span>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`${td} whitespace-nowrap text-xs`}>{intervalLabel(s.intervalMonths)}</td>
                  <td className={`${td} whitespace-nowrap text-xs`}>
                    {s.status === "CANCELLED" ? (
                      <span className="text-ink-muted">Cancelled {s.cancelledAt ? formatDate(s.cancelledAt) : ""}</span>
                    ) : (
                      <>
                        <span className={overdue ? "font-semibold text-red-700" : undefined}>{formatDate(s.nextChargeAt)}</span>
                        <span className="block text-ink-muted">{overdue ? "Overdue" : relativeDays(s.nextChargeAt, now)}</span>
                      </>
                    )}
                  </td>
                  <td className={td}>
                    <SubStatusBadge status={s.status} />
                  </td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                    <span className="font-semibold">{formatPrice(cycle)}</span>
                    {s.intervalMonths > 1 && <span className="block text-xs text-ink-muted">{formatPrice(Math.round(subscriptionMonthlyValue(s)))}/mo</span>}
                  </td>
                  <td className={td}>
                    <SubscriptionControls id={s.id} status={s.status} intervalMonths={s.intervalMonths} compact />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState title="No subscriptions found" body={status || q ? "Try clearing the filters." : "Subscriptions appear here when customers choose Subscribe & Save at checkout."} />
      )}
      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => `/admin/subscriptions${qs({ ...base, page: p })}`} />
    </>
  );
}
