import Link from "next/link";
import { Check } from "lucide-react";
import { getDashboard, parseRange, RANGE_OPTIONS } from "@/lib/admin/metrics";
import { compactNumber, formatPct, param, relativeDays, type SearchParams } from "@/lib/admin/format";
import { formatPrice, orderRef } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { intervalLabel } from "@/lib/config";
import { EmptyState } from "@/components/ui";
import { KpiTile } from "@/components/admin/charts/KpiTile";
import { TimeSeriesChart } from "@/components/admin/charts/TimeSeriesChart";
import { BarList } from "@/components/admin/charts/BarList";
import { Funnel } from "@/components/admin/charts/Funnel";
import { OrderStatusBadge, PageHeader, Panel, StockBadge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "Dashboard · Admin | Red23" } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const days = parseRange(param(sp, "range"));
  const d = await getDashboard(days);
  const vs = `vs previous ${days} days`;
  const k = d.kpis;

  return (
    <>
      <PageHeader title="Dashboard" description={`Store performance over the last ${days} days.`} />

      {/* Date range — one filter row above everything it scopes */}
      <nav aria-label="Date range" className="mb-6 inline-flex rounded-full border border-line bg-white p-1 shadow-card">
        {RANGE_OPTIONS.map((r) => (
          <Link
            key={r}
            href={`/admin?range=${r}`}
            aria-current={r === days ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition", r === days ? "bg-ink text-white" : "text-ink-soft hover:bg-black/5")}
          >
            {r === days && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
            Last {r} days
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile label="Revenue" value={formatPrice(k.revenue.current)} current={k.revenue.current} previous={k.revenue.previous} comparison={vs} hint="Paid, fulfilled, shipped and delivered orders" />
        <KpiTile label="Orders" value={k.orders.current.toLocaleString("en-GB")} current={k.orders.current} previous={k.orders.previous} comparison={vs} />
        <KpiTile label="Average order value" value={formatPrice(Math.round(k.aov.current))} current={k.aov.current} previous={k.aov.previous} comparison={vs} />
        <KpiTile label="Visitors" value={compactNumber(k.visitors.current)} current={k.visitors.current} previous={k.visitors.previous} comparison={vs} hint="Distinct visitors with a page view" />
        <KpiTile label="Conversion rate" value={formatPct(k.conversion.current, 2)} current={k.conversion.current} previous={k.conversion.previous} deltaMode="points" comparison={vs} hint="Orders ÷ visitors" />
        <KpiTile label="Active subscriptions" value={k.activeSubscriptions.current.toLocaleString("en-GB")} current={k.activeSubscriptions.current} previous={k.activeSubscriptions.previous} comparison={`vs ${days} days ago`} />
        <KpiTile label="MRR" value={formatPrice(k.mrr.current)} current={k.mrr.current} previous={k.mrr.previous} comparison={`vs ${days} days ago`} hint="Active subscriptions, normalised to a monthly value" />
        <KpiTile label="New customers" value={k.newCustomers.current.toLocaleString("en-GB")} current={k.newCustomers.current} previous={k.newCustomers.previous} comparison={vs} hint="First paid order in the period" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Revenue per day" description={`Total ${formatPrice(k.revenue.current)}`}>
          <TimeSeriesChart label="Revenue" format="gbp" kind="column" data={d.series.map((p) => ({ date: p.date, value: p.revenue }))} />
        </Panel>
        <Panel title="Orders per day" description={`Total ${k.orders.current.toLocaleString("en-GB")}`}>
          <TimeSeriesChart label="Orders" format="int" kind="column" data={d.series.map((p) => ({ date: p.date, value: p.orders }))} />
        </Panel>
        <Panel title="Visitors per day" description="Distinct visitors with at least one page view">
          <TimeSeriesChart label="Visitors" format="int" kind="area" data={d.series.map((p) => ({ date: p.date, value: p.visitors }))} />
        </Panel>
        <Panel title="Conversion funnel" description="Distinct visitors reaching each step">
          <Funnel steps={d.funnel} />
        </Panel>
        <Panel title="Top products by revenue" description="Line totals before order discounts">
          <BarList
            rows={d.topProducts.map((p) => ({
              key: p.productId ?? p.title,
              label: p.title,
              value: p.revenue,
              display: formatPrice(p.revenue),
              sub: `${p.units} sold`,
              href: p.productId ? `/admin/products/${p.productId}` : undefined,
            }))}
          />
        </Panel>
        <Panel title="Top traffic sources" description="Distinct visitors by referrer">
          <BarList rows={d.sources.map((s) => ({ key: s.name, label: s.name, value: s.visitors, display: s.visitors.toLocaleString("en-GB") }))} />
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Panel title="Recent orders" className="lg:col-span-2" bodyClassName="p-0" actions={<Link href="/admin/orders" className="btn-ghost btn-sm">View all</Link>}>
          {d.recentOrders.length ? (
            <ul className="divide-y divide-line">
              {d.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-cream/60">
                    <span className="w-24 shrink-0 font-semibold">{orderRef(o.id)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">
                      {o.shipName || o.email}
                      {o.isRenewal && <span className="ml-2 text-xs text-ink-muted">Renewal</span>}
                    </span>
                    <span className="hidden text-xs text-ink-muted sm:inline">{formatDate(o.createdAt)}</span>
                    <OrderStatusBadge status={o.status} />
                    <span className="w-20 shrink-0 text-right font-semibold tabular-nums">{formatPrice(o.totalPence)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState title="No orders yet" />
            </div>
          )}
        </Panel>

        <Panel title="Low & out of stock" description="Active products with 5 or fewer units" bodyClassName="p-0">
          {d.lowStock.length ? (
            <ul className="divide-y divide-line">
              {d.lowStock.map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/products/${v.product.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-cream/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{v.product.title}</span>
                      {(v.title !== "Default" || v._count.stockAlerts > 0) && (
                        <span className="block truncate text-xs text-ink-muted">
                          {v.title !== "Default" && v.title}
                          {v.title !== "Default" && v._count.stockAlerts > 0 && " · "}
                          {v._count.stockAlerts > 0 && `${v._count.stockAlerts} waiting`}
                        </span>
                      )}
                    </span>
                    <StockBadge stock={v.stock} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-ink-muted">Everything is well stocked.</p>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Subscriptions due in the next 7 days" bodyClassName="p-0" actions={<Link href="/admin/subscriptions" className="btn-ghost btn-sm">Manage</Link>}>
          {d.dueSubs.length ? (
            <ul className="divide-y divide-line">
              {d.dueSubs.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <Link href={`/admin/customers/${s.user.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {s.user.name || s.user.email}
                  </Link>
                  <span className="text-xs text-ink-muted">{intervalLabel(s.intervalMonths)}</span>
                  <span className={cn("text-xs", s.nextChargeAt < new Date() ? "font-semibold text-red-700" : "text-ink-soft")}>
                    {formatDate(s.nextChargeAt)} ({s.nextChargeAt < new Date() ? "overdue" : relativeDays(s.nextChargeAt)})
                  </span>
                  <span className="w-20 text-right font-semibold tabular-nums">{formatPrice(s.cycleValue)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-ink-muted">No renewals due this week.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
