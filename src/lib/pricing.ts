import "server-only";
import { db } from "./db";
import { applyPct } from "./money";
import { FREE_SHIPPING_THRESHOLD_PENCE, SHIPPING_METHODS, SUBSCRIPTION_INTERVALS, type ShippingMethodId } from "./config";
import type { CartLine, Quote, QuotedLine } from "./cart-types";

type QuoteInput = {
  lines: CartLine[];
  intervalMonths?: number;
  shippingMethod?: string;
  discountCode?: string | null;
};

/**
 * Server-side source of truth for cart prices. Never trust client totals:
 * every checkout re-quotes from the database.
 */
export async function quoteCart(input: QuoteInput): Promise<Quote> {
  const issues: string[] = [];
  const intervalMonths = (SUBSCRIPTION_INTERVALS as readonly number[]).includes(input.intervalMonths ?? 1) ? input.intervalMonths ?? 1 : 1;
  const ids = [...new Set(input.lines.map((l) => l.variantId))];
  const variants = await db.variant.findMany({
    where: { id: { in: ids } },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: QuotedLine[] = [];
  for (const line of input.lines) {
    const v = byId.get(line.variantId);
    if (!v || v.product.status !== "ACTIVE") {
      issues.push("An item in your basket is no longer available and was removed.");
      continue;
    }
    let quantity = Math.max(1, Math.min(99, Math.floor(line.quantity)));
    if (v.stock <= 0) {
      issues.push(`${v.product.title} is out of stock and was removed.`);
      continue;
    }
    if (quantity > v.stock) {
      quantity = v.stock;
      issues.push(`Only ${v.stock} of ${v.product.title} left — quantity updated.`);
    }
    const subscribe = line.subscribe && v.product.subscribable;
    const unitPence = subscribe ? applyPct(v.pricePence, v.product.subscriptionDiscountPct) : v.pricePence;
    lines.push({
      variantId: v.id,
      productId: v.productId,
      slug: v.product.slug,
      title: v.product.title,
      brand: v.product.brand,
      variantTitle: v.title,
      imageUrl: v.product.images[0]?.url ?? null,
      quantity,
      subscribe,
      basePence: v.pricePence,
      unitPence,
      compareAtPence: v.compareAtPence,
      lineTotalPence: unitPence * quantity,
      stock: v.stock,
      subscribable: v.product.subscribable,
      subscriptionDiscountPct: v.product.subscriptionDiscountPct,
    });
  }

  const subtotalPence = lines.reduce((s, l) => s + l.lineTotalPence, 0);
  const savingsPence = lines.reduce((s, l) => s + (l.basePence - l.unitPence) * l.quantity, 0);
  const hasSubscription = lines.some((l) => l.subscribe);

  let discountPence = 0;
  let discountCode: string | null = null;
  let discountError: string | null = null;
  if (input.discountCode?.trim()) {
    const code = await db.discountCode.findUnique({ where: { code: input.discountCode.trim().toUpperCase() } });
    if (!code || !code.active || (code.expiresAt && code.expiresAt < new Date()) || (code.maxUses != null && code.usageCount >= code.maxUses)) {
      discountError = "That code isn't valid.";
    } else if (subtotalPence < code.minSubtotalPence) {
      discountError = `Spend £${(code.minSubtotalPence / 100).toFixed(2)} to use this code.`;
    } else {
      discountCode = code.code;
      discountPence = code.type === "PERCENT" ? Math.round((subtotalPence * code.value) / 100) : Math.min(code.value, subtotalPence);
    }
  }

  const methodId: ShippingMethodId = input.shippingMethod === "EXPRESS" ? "EXPRESS" : "STANDARD";
  const method = SHIPPING_METHODS[methodId];
  const afterDiscount = subtotalPence - discountPence;
  // Subscribers always get free standard delivery.
  const qualifiesFree = afterDiscount >= FREE_SHIPPING_THRESHOLD_PENCE || hasSubscription;
  const shippingPence = lines.length === 0 ? 0 : method.freeOverThreshold && qualifiesFree ? 0 : method.pricePence;

  return {
    lines,
    intervalMonths,
    subtotalPence,
    savingsPence,
    discountPence,
    discountCode,
    discountError,
    shippingPence,
    shippingMethod: methodId,
    totalPence: afterDiscount + shippingPence,
    hasSubscription,
    freeShippingRemainingPence: hasSubscription ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD_PENCE - afterDiscount),
    issues,
  };
}
