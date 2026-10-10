import "server-only";
import { db } from "./db";
import { AT_RISK_DAYS, VIP_LTV_PENCE } from "./config";

const PAID_STATUSES = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];
export { PAID_STATUSES };

/** Finds or creates the CRM contact for an email address. */
export async function upsertContact(email: string, data: { name?: string; phone?: string; source?: string; marketingOptIn?: boolean } = {}) {
  const normalized = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name || data.name || undefined,
        phone: existing.phone || data.phone || undefined,
        marketingOptIn: data.marketingOptIn ? true : undefined,
      },
    });
  }
  return db.user.create({
    data: { email: normalized, name: data.name, phone: data.phone, source: data.source ?? "website", marketingOptIn: data.marketingOptIn ?? false },
  });
}

/**
 * Derives the lifecycle status from order history. Statuses an admin sets by
 * hand are overwritten only when the data clearly says otherwise.
 */
export async function refreshCrmStatus(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      orders: { where: { status: { in: PAID_STATUSES } }, select: { totalPence: true, createdAt: true } },
      subscriptions: { select: { status: true } },
    },
  });
  if (!user || user.role === "ADMIN") return;
  const ltv = user.orders.reduce((s, o) => s + o.totalPence, 0);
  const last = user.orders.reduce<Date | null>((d, o) => (!d || o.createdAt > d ? o.createdAt : d), null);
  const activeSub = user.subscriptions.some((s) => s.status === "ACTIVE" || s.status === "PAUSED");
  const hadSub = user.subscriptions.length > 0;

  let status = "LEAD";
  if (user.orders.length > 0) {
    status = "CUSTOMER";
    if (ltv >= VIP_LTV_PENCE) status = "VIP";
    const daysSince = last ? (Date.now() - last.getTime()) / 86400000 : 0;
    if (!activeSub && daysSince > AT_RISK_DAYS) status = "AT_RISK";
    if (hadSub && !activeSub && daysSince > AT_RISK_DAYS) status = "CHURNED";
  }
  if (status !== user.crmStatus) await db.user.update({ where: { id: userId }, data: { crmStatus: status } });
}
