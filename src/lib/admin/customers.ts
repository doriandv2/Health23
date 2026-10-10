import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/lib/crm";
import { splitTags } from "@/lib/utils";
import { param, type SearchParams } from "./format";
import { subscriptionMonthlyValue } from "./metrics";

export const CUSTOMER_SORTS = {
  created: "Newest",
  ltv: "Lifetime value",
  last_order: "Last order",
  last_seen: "Last seen",
} as const;
export type CustomerSort = keyof typeof CUSTOMER_SORTS;

export type CustomerFilters = {
  q: string;
  status: string;
  tag: string;
  sub: "" | "yes" | "no";
  optin: "" | "yes" | "no";
  role: "" | "CUSTOMER" | "ADMIN";
  sort: CustomerSort;
};

export function parseCustomerFilters(sp: SearchParams): CustomerFilters {
  const sort = param(sp, "sort");
  const sub = param(sp, "sub");
  const optin = param(sp, "optin");
  const role = param(sp, "role");
  return {
    q: param(sp, "q"),
    status: param(sp, "status"),
    tag: param(sp, "tag"),
    sub: sub === "yes" || sub === "no" ? sub : "",
    optin: optin === "yes" || optin === "no" ? optin : "",
    role: role === "CUSTOMER" || role === "ADMIN" ? role : "",
    sort: sort in CUSTOMER_SORTS ? (sort as CustomerSort) : "created",
  };
}

const LIVE_SUB = ["ACTIVE", "PAUSED", "PAST_DUE"];

/**
 * Every contact matching the filters with derived CRM stats. Stats are
 * computed in memory, which is fine for a shop of this size (thousands of
 * contacts); move to SQL aggregates if the list grows far beyond that.
 */
export async function listCustomers(f: CustomerFilters) {
  const and: Prisma.UserWhereInput[] = [];
  if (f.q) and.push({ OR: [{ email: { contains: f.q } }, { name: { contains: f.q } }, { phone: { contains: f.q } }] });
  if (f.status) and.push({ crmStatus: f.status });
  if (f.tag) and.push({ tags: { contains: f.tag } });
  if (f.role) and.push({ role: f.role });
  if (f.optin) and.push({ marketingOptIn: f.optin === "yes" });
  if (f.sub === "yes") and.push({ subscriptions: { some: { status: { in: LIVE_SUB } } } });
  if (f.sub === "no") and.push({ subscriptions: { none: { status: { in: LIVE_SUB } } } });

  const users = await db.user.findMany({
    where: and.length ? { AND: and } : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      crmStatus: true,
      tags: true,
      source: true,
      marketingOptIn: true,
      passwordHash: true,
      createdAt: true,
      lastSeenAt: true,
      orders: { where: { status: { in: PAID_STATUSES } }, select: { totalPence: true, createdAt: true } },
      subscriptions: { select: { status: true, intervalMonths: true, items: { select: { unitPence: true, quantity: true } } } },
    },
  });

  const rows = users.map((u) => {
    const ltv = u.orders.reduce((s, o) => s + o.totalPence, 0);
    const lastOrder = u.orders.reduce<Date | null>((d, o) => (!d || o.createdAt > d ? o.createdAt : d), null);
    const activeSubs = u.subscriptions.filter((s) => s.status === "ACTIVE");
    const liveSubs = u.subscriptions.filter((s) => LIVE_SUB.includes(s.status));
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      crmStatus: u.crmStatus,
      tags: splitTags(u.tags),
      source: u.source,
      marketingOptIn: u.marketingOptIn,
      /** Registered = has a password; otherwise guest checkout or lead. */
      registered: Boolean(u.passwordHash),
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
      orderCount: u.orders.length,
      ltv,
      lastOrder,
      subscription: liveSubs.length ? (activeSubs.length ? "ACTIVE" : liveSubs[0].status) : null,
      subscriptionMonthly: Math.round(activeSubs.reduce((s, x) => s + subscriptionMonthlyValue(x), 0)),
    };
  });

  const t = (d: Date | null) => d?.getTime() ?? 0;
  rows.sort((a, b) => {
    switch (f.sort) {
      case "ltv":
        return b.ltv - a.ltv;
      case "last_order":
        return t(b.lastOrder) - t(a.lastOrder);
      case "last_seen":
        return t(b.lastSeenAt) - t(a.lastSeenAt);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });
  return rows;
}

export type CustomerRow = Awaited<ReturnType<typeof listCustomers>>[number];

export async function crmStatusCounts() {
  const groups = await db.user.groupBy({ by: ["crmStatus"], where: { role: { not: "ADMIN" } }, _count: { _all: true } });
  return Object.fromEntries(groups.map((g) => [g.crmStatus, g._count._all])) as Record<string, number>;
}

/** Distinct tags in use across all contacts, for the filter dropdown. */
export async function allCustomerTags() {
  const users = await db.user.findMany({ where: { tags: { not: "" } }, select: { tags: true } });
  return [...new Set(users.flatMap((u) => splitTags(u.tags)))].sort((a, b) => a.localeCompare(b));
}

export type TimelineItem = {
  id: string;
  at: Date;
  kind: "event" | "order" | "message" | "stock_alert" | "note" | "signup";
  title: string;
  detail?: string;
  href?: string;
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Viewed page",
  product_view: "Viewed product",
  add_to_cart: "Added to basket",
  checkout_started: "Started checkout",
  order_completed: "Completed order",
  subscription_started: "Started subscription",
  subscription_renewed: "Subscription renewed",
  subscription_paused: "Paused subscription",
  subscription_skipped: "Skipped a delivery",
  subscription_cancelled: "Cancelled subscription",
  order_status_changed: "Order status changed",
  search: "Searched",
  signup: "Created account",
};

function parseMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    const v: unknown = JSON.parse(meta);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Cached per request so generateMetadata and the page share one query. */
export const getCustomerDetail = cache(async (id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { variant: { include: { product: { select: { id: true, title: true } } } } } } },
      },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, email: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 80, include: { product: { select: { id: true, title: true } } } },
    },
  });
  if (!user) return null;

  const [messages, stockAlerts] = await Promise.all([
    db.contactMessage.findMany({ where: { OR: [{ userId: user.id }, { email: user.email }] }, orderBy: { createdAt: "desc" } }),
    db.stockAlert.findMany({ where: { email: user.email }, orderBy: { createdAt: "desc" }, include: { variant: { include: { product: { select: { id: true, title: true } } } } } }),
  ]);

  const paidOrders = user.orders.filter((o) => (PAID_STATUSES as string[]).includes(o.status));
  const ltv = paidOrders.reduce((s, o) => s + o.totalPence, 0);
  const dates = paidOrders.map((o) => o.createdAt.getTime());
  const subStarts = user.subscriptions.map((s) => s.createdAt.getTime());
  const stats = {
    ltv,
    orders: paidOrders.length,
    aov: paidOrders.length ? Math.round(ltv / paidOrders.length) : 0,
    firstOrder: dates.length ? new Date(Math.min(...dates)) : null,
    lastOrder: dates.length ? new Date(Math.max(...dates)) : null,
    subscriberSince: subStarts.length ? new Date(Math.min(...subStarts)) : null,
  };

  const timeline: TimelineItem[] = [];
  timeline.push({ id: `signup-${user.id}`, at: user.createdAt, kind: "signup", title: "Contact created", detail: `Source: ${user.source}` });
  for (const e of user.events) {
    // Plain page views are noise; product pages are surfaced via product_view.
    if (e.type === "page_view") continue;
    if (e.type === "order_completed") continue; // shown as the order itself
    const meta = parseMeta(e.meta);
    const detailParts: string[] = [];
    if (e.product) detailParts.push(e.product.title);
    if (e.type === "search" && typeof meta.q === "string") detailParts.push(`“${meta.q}”`);
    if (e.type === "order_status_changed" && typeof meta.to === "string") detailParts.push(`${String(meta.from ?? "?")} → ${meta.to}`);
    if (e.type === "subscription_cancelled" && typeof meta.reason === "string" && meta.reason) detailParts.push(`Reason: ${meta.reason}`);
    timeline.push({
      id: e.id,
      at: e.createdAt,
      kind: "event",
      title: EVENT_LABELS[e.type] ?? e.type,
      detail: detailParts.join(" · ") || undefined,
      href: e.product ? `/admin/products/${e.product.id}` : typeof meta.orderId === "number" ? `/admin/orders/${meta.orderId}` : undefined,
    });
  }
  for (const o of user.orders) {
    timeline.push({ id: `order-${o.id}`, at: o.createdAt, kind: "order", title: o.isRenewal ? "Subscription renewal order" : "Placed order", detail: `${o._count.items} item${o._count.items === 1 ? "" : "s"} · ${o.status}`, href: `/admin/orders/${o.id}` });
  }
  for (const m of messages) {
    timeline.push({ id: `msg-${m.id}`, at: m.createdAt, kind: "message", title: "Sent a contact message", detail: m.message.slice(0, 140), href: "/admin/inbox" });
  }
  for (const a of stockAlerts) {
    timeline.push({ id: `alert-${a.id}`, at: a.createdAt, kind: "stock_alert", title: "Requested back-in-stock alert", detail: `${a.variant.product.title}${a.variant.title !== "Default" ? ` – ${a.variant.title}` : ""}`, href: `/admin/products/${a.variant.product.id}` });
  }
  for (const n of user.notes) {
    timeline.push({ id: `note-${n.id}`, at: n.createdAt, kind: "note", title: `Note by ${n.author?.name || n.author?.email || "admin"}`, detail: n.body.slice(0, 140) });
  }
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  return { user, messages, stockAlerts, stats, timeline: timeline.slice(0, 100) };
});

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>;
