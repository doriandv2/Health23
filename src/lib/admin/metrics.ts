import "server-only";
import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/lib/crm";

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

export function parseRange(v: string | undefined): RangeDays {
  const n = Number(v);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

const DAY = 86400000;

/** UTC day key, e.g. "2026-10-10". */
export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Current window = the last `days` calendar days including today; previous = the same length before it. */
export function rangeBounds(days: number, now = new Date()) {
  const end = now;
  const start = new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  return { start, end, prevStart, prevEnd: start };
}

export type Kpi = { current: number; previous: number | null };

export type DailyPoint = { date: string; revenue: number; orders: number; visitors: number };

export type FunnelStep = { label: string; count: number };

/** Monthly-normalised value of a subscription in pence. */
export function subscriptionMonthlyValue(sub: { intervalMonths: number; items: { unitPence: number; quantity: number }[] }) {
  const cycle = sub.items.reduce((s, i) => s + i.unitPence * i.quantity, 0);
  return cycle / Math.max(1, sub.intervalMonths);
}

/** Normalises a referrer (host or URL) to a bare hostname; null/empty -> "Direct". */
export function sourceName(referrer: string | null) {
  if (!referrer) return "Direct";
  const raw = referrer.trim();
  if (!raw) return "Direct";
  try {
    const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
    return host.replace(/^www\./, "") || "Direct";
  } catch {
    return raw;
  }
}

type SubForMrr = { status: string; createdAt: Date; cancelledAt: Date | null; intervalMonths: number; items: { unitPence: number; quantity: number }[] };

/**
 * Subscriptions that were active at a point in time. Pause history isn't
 * stored, so for a past date we count subscriptions that existed, weren't yet
 * cancelled, and aren't currently paused/past-due (assumed paused back then
 * too) — keeping "then" comparable with "now", which uses the real ACTIVE status.
 */
function liveAt(subs: SubForMrr[], at: Date | "now") {
  if (at === "now") return subs.filter((s) => s.status === "ACTIVE");
  return subs.filter((s) => s.createdAt < at && (s.status === "ACTIVE" || (s.status === "CANCELLED" && s.cancelledAt !== null && s.cancelledAt >= at)));
}

export async function getSubscriptionSnapshot(days: number) {
  const { start } = rangeBounds(days);
  const subs = await db.subscription.findMany({
    select: { status: true, createdAt: true, cancelledAt: true, intervalMonths: true, items: { select: { unitPence: true, quantity: true } } },
  });
  const activeNow = liveAt(subs, "now");
  const activeThen = liveAt(subs, start);
  const mrr = activeNow.reduce((s, x) => s + subscriptionMonthlyValue(x), 0);
  const mrrThen = activeThen.reduce((s, x) => s + subscriptionMonthlyValue(x), 0);
  const cancelledInPeriod = subs.filter((s) => s.cancelledAt && s.cancelledAt >= start).length;
  // Churn base: every not-yet-cancelled subscription (active or paused) at the start of the period.
  const baseAtStart = subs.filter((s) => s.createdAt < start && (s.status !== "CANCELLED" || (s.cancelledAt !== null && s.cancelledAt >= start))).length;
  const newInPeriod = subs.filter((s) => s.createdAt >= start).length;
  return {
    active: activeNow.length,
    activeThen: activeThen.length,
    paused: subs.filter((s) => s.status === "PAUSED").length,
    pastDue: subs.filter((s) => s.status === "PAST_DUE").length,
    cancelledInPeriod,
    newInPeriod,
    mrr: Math.round(mrr),
    mrrThen: Math.round(mrrThen),
    /** Cancellations in the period over subscriptions live (active or paused) at its start. */
    churnRate: baseAtStart ? cancelledInPeriod / baseAtStart : 0,
  };
}

export async function getDashboard(days: RangeDays) {
  const { start, prevStart, prevEnd } = rangeBounds(days);
  const paid = { in: PAID_STATUSES };

  const [orders, prevOrders, pageViews, prevPageViews, funnelEvents, firstOrders, subs, lineTotals, lowStock, recentOrders, dueSubs] = await Promise.all([
    db.order.findMany({ where: { status: paid, createdAt: { gte: start } }, select: { totalPence: true, createdAt: true } }),
    db.order.findMany({ where: { status: paid, createdAt: { gte: prevStart, lt: prevEnd } }, select: { totalPence: true } }),
    db.event.findMany({ where: { type: "page_view", createdAt: { gte: start } }, select: { visitorId: true, createdAt: true, referrer: true } }),
    db.event.findMany({ where: { type: "page_view", createdAt: { gte: prevStart, lt: prevEnd } }, select: { visitorId: true } }),
    db.event.findMany({
      where: { type: { in: ["product_view", "add_to_cart", "checkout_started"] }, createdAt: { gte: start } },
      select: { type: true, visitorId: true, userId: true },
    }),
    // First paid order per customer -> "new customers" in a window.
    db.order.groupBy({ by: ["email"], where: { status: paid }, _min: { createdAt: true } }),
    getSubscriptionSnapshot(days),
    db.orderItem.findMany({
      where: { order: { status: paid, createdAt: { gte: start } } },
      select: { productId: true, title: true, unitPence: true, quantity: true },
    }),
    db.variant.findMany({
      where: { stock: { lte: 5 }, product: { status: "ACTIVE" } },
      include: { product: { select: { id: true, title: true } }, _count: { select: { stockAlerts: { where: { notifiedAt: null } } } } },
      orderBy: [{ stock: "asc" }],
      take: 12,
    }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, email: true, shipName: true, status: true, totalPence: true, createdAt: true, isRenewal: true } }),
    db.subscription.findMany({
      where: { status: "ACTIVE", nextChargeAt: { lte: new Date(Date.now() + 7 * DAY) } },
      include: { user: { select: { id: true, name: true, email: true } }, items: { select: { unitPence: true, quantity: true } } },
      orderBy: { nextChargeAt: "asc" },
      take: 10,
    }),
  ]);

  // Revenue per product (line totals; excludes order-level discounts and shipping).
  const byProduct = new Map<string, { productId: string | null; title: string; revenue: number; units: number }>();
  for (const l of lineTotals) {
    const key = l.productId ?? `title:${l.title}`;
    const row = byProduct.get(key) ?? { productId: l.productId, title: l.title, revenue: 0, units: 0 };
    row.revenue += l.unitPence * l.quantity;
    row.units += l.quantity;
    byProduct.set(key, row);
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const revenue = orders.reduce((s, o) => s + o.totalPence, 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + o.totalPence, 0);
  const visitors = new Set(pageViews.map((e) => e.visitorId).filter(Boolean)).size;
  const prevVisitors = new Set(prevPageViews.map((e) => e.visitorId).filter(Boolean)).size;
  const newCustomers = firstOrders.filter((f) => f._min.createdAt && f._min.createdAt >= start).length;
  const prevNewCustomers = firstOrders.filter((f) => f._min.createdAt && f._min.createdAt >= prevStart && f._min.createdAt < prevEnd).length;

  // Daily series
  const daily = new Map<string, DailyPoint & { visitorSet: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const date = dayKey(new Date(start.getTime() + i * DAY));
    daily.set(date, { date, revenue: 0, orders: 0, visitors: 0, visitorSet: new Set() });
  }
  for (const o of orders) {
    const d = daily.get(dayKey(o.createdAt));
    if (d) {
      d.revenue += o.totalPence;
      d.orders += 1;
    }
  }
  for (const e of pageViews) {
    const d = daily.get(dayKey(e.createdAt));
    if (d && e.visitorId) d.visitorSet.add(e.visitorId);
  }
  const series: DailyPoint[] = [...daily.values()].map(({ visitorSet, ...p }) => ({ ...p, visitors: visitorSet.size }));

  // Funnel: distinct people (visitor id, falling back to user id) reaching each step.
  const distinct = (type: string) => new Set(funnelEvents.filter((e) => e.type === type).map((e) => e.visitorId ?? e.userId).filter(Boolean)).size;
  const funnel: FunnelStep[] = [
    { label: "Visitors", count: visitors },
    { label: "Viewed a product", count: distinct("product_view") },
    { label: "Added to basket", count: distinct("add_to_cart") },
    { label: "Started checkout", count: distinct("checkout_started") },
    { label: "Ordered", count: orders.length },
  ];

  // Traffic sources by distinct visitor; a visitor counts once per source.
  const sourceVisitors = new Map<string, Set<string>>();
  for (const e of pageViews) {
    if (!e.visitorId) continue;
    const name = sourceName(e.referrer);
    if (name === "Direct") continue; // assigned below so referred visitors aren't double-counted as direct
    const set = sourceVisitors.get(name) ?? new Set<string>();
    set.add(e.visitorId);
    sourceVisitors.set(name, set);
  }
  const referred = new Set([...sourceVisitors.values()].flatMap((s) => [...s]));
  const directCount = new Set(pageViews.map((e) => e.visitorId).filter((v): v is string => !!v && !referred.has(v))).size;
  const sources = [...sourceVisitors.entries()].map(([name, set]) => ({ name, visitors: set.size }));
  if (directCount) sources.push({ name: "Direct", visitors: directCount });
  sources.sort((a, b) => b.visitors - a.visitors);

  const kpis = {
    revenue: { current: revenue, previous: prevRevenue },
    orders: { current: orders.length, previous: prevOrders.length },
    aov: { current: orders.length ? revenue / orders.length : 0, previous: prevOrders.length ? prevRevenue / prevOrders.length : 0 },
    visitors: { current: visitors, previous: prevVisitors },
    conversion: { current: visitors ? orders.length / visitors : 0, previous: prevVisitors ? prevOrders.length / prevVisitors : 0 },
    activeSubscriptions: { current: subs.active, previous: subs.activeThen },
    mrr: { current: subs.mrr, previous: subs.mrrThen },
    newCustomers: { current: newCustomers, previous: prevNewCustomers },
  } satisfies Record<string, Kpi>;

  return {
    days,
    kpis,
    series,
    funnel,
    topProducts,
    sources: sources.slice(0, 8),
    lowStock,
    recentOrders,
    dueSubs: dueSubs.map((s) => ({ ...s, cycleValue: s.items.reduce((t, i) => t + i.unitPence * i.quantity, 0) })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
