import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Repeat } from "lucide-react";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/config";
import { formatPrice, orderRef } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { humanize, pageParam, param, qs, type SearchParams } from "@/lib/admin/format";
import { EmptyState } from "@/components/ui";
import { FilterBar, FilterField, filterInput, OrderStatusBadge, PageHeader, Pagination, TableWrap, td, th } from "@/components/admin/ui";

export const metadata = { title: "Orders" };

const PAGE_SIZE = 25;

/** Accepts "R23-1042", "1042" (display ref) or a raw id. */
function idFromQuery(q: string): number[] {
  const digits = q.replace(/^r23-?/i, "");
  if (!/^\d+$/.test(digits)) return [];
  const n = Number(digits);
  const ids = [n];
  if (n >= 1000) ids.push(n - 1000);
  return ids.filter((x) => x > 0 && x < 2 ** 31);
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const type = param(sp, "type");
  const page = pageParam(sp);

  const and: Prisma.OrderWhereInput[] = [];
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) and.push({ status });
  if (type === "renewal") and.push({ isRenewal: true });
  if (type === "one-off") and.push({ isRenewal: false });
  if (q) {
    const ids = idFromQuery(q);
    and.push({
      OR: [{ email: { contains: q } }, { shipName: { contains: q } }, { user: { name: { contains: q } } }, { trackingNumber: { contains: q } }, ...(ids.length ? [{ id: { in: ids } }] : [])],
    });
  }
  const where: Prisma.OrderWhereInput = and.length ? { AND: and } : {};

  const [total, orders, counts] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = { q, status, type };

  return (
    <>
      <PageHeader title="Orders" description={`${Object.values(countBy).reduce((a, b) => a + b, 0)} orders in total`} />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        <Link href={`/admin/orders${qs({ q, type })}`} aria-current={!status ? "page" : undefined} className={!status ? "chip bg-ink py-1 text-white" : "chip bg-white py-1 text-ink-soft ring-1 ring-line hover:text-ink"}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders${qs({ q, type, status: s })}`} aria-current={status === s ? "page" : undefined} className={status === s ? "chip bg-ink py-1 text-white" : "chip bg-white py-1 text-ink-soft ring-1 ring-line hover:text-ink"}>
            {humanize(s)} <span className="ml-1 tabular-nums opacity-70">{countBy[s] ?? 0}</span>
          </Link>
        ))}
      </nav>

      <FilterBar resetHref="/admin/orders">
        <FilterField label="Search" htmlFor="q" className="min-w-[240px] flex-1 sm:flex-none">
          <input id="q" name="q" defaultValue={q} placeholder="Ref, email, name or tracking" className={filterInput} />
        </FilterField>
        <FilterField label="Type" htmlFor="type">
          <select id="type" name="type" defaultValue={type} className={filterInput}>
            <option value="">All orders</option>
            <option value="one-off">Checkout orders</option>
            <option value="renewal">Subscription renewals</option>
          </select>
        </FilterField>
        {status && <input type="hidden" name="status" value={status} />}
      </FilterBar>

      {orders.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th scope="col" className={th}>Order</th>
              <th scope="col" className={th}>Date</th>
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>Items</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Shipping</th>
              <th scope="col" className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-cream/40">
                <td className={td}>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:underline">
                    {orderRef(o.id)}
                  </Link>
                  {o.isRenewal && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-ink-muted">
                      <Repeat className="h-3 w-3" aria-hidden /> Renewal
                    </span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-xs text-ink-soft`}>{formatDate(o.createdAt)}</td>
                <td className={td}>
                  {o.user ? (
                    <Link href={`/admin/customers/${o.user.id}`} className="hover:underline">
                      {o.user.name || o.shipName}
                    </Link>
                  ) : (
                    o.shipName
                  )}
                  <p className="text-xs text-ink-muted">{o.email}</p>
                </td>
                <td className={`${td} tabular-nums`}>{o._count.items}</td>
                <td className={td}>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className={`${td} text-xs text-ink-soft`}>
                  {o.shippingMethod === "EXPRESS" ? "Express" : "Standard"}
                  {o.trackingNumber && <span className="block text-ink-muted">#{o.trackingNumber}</span>}
                </td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{formatPrice(o.totalPence)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState title="No orders match" body={q || status || type ? "Try a different search or clear the filters." : "Orders will appear here as soon as customers check out."} />
      )}
      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => `/admin/orders${qs({ ...base, page: p })}`} />
    </>
  );
}
