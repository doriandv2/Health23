export const SITE = {
  name: "Red23",
  legalName: "Red23 Ltd",
  tagline: "Elite Health Products",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  email: "support@red23.co.uk",
  instagram: "https://www.instagram.com/red23.health",
  returnsAddress: "Unit 47 Mashbury Hall Ln, Chelmsford CM1 4TF",
};

export const FREE_SHIPPING_THRESHOLD_PENCE = 15000;

export const SHIPPING_METHODS = {
  STANDARD: {
    id: "STANDARD",
    label: "Royal Mail Tracked 48",
    description: "2–3 working days",
    pricePence: 595,
    freeOverThreshold: true,
  },
  EXPRESS: {
    id: "EXPRESS",
    label: "DPD Next Day",
    description: "Order before 2pm Mon–Fri · 1-hour delivery window",
    pricePence: 795,
    freeOverThreshold: false,
  },
} as const;

export type ShippingMethodId = keyof typeof SHIPPING_METHODS;

/** Delivery frequencies offered for Subscribe & Save. */
export const SUBSCRIPTION_INTERVALS = [1, 2, 3] as const;

export function intervalLabel(months: number) {
  return months === 1 ? "Every month" : `Every ${months} months`;
}

export const ORDER_STATUSES = ["PENDING", "PAID", "FULFILLED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
export const CRM_STATUSES = ["LEAD", "CUSTOMER", "VIP", "AT_RISK", "CHURNED"] as const;

/** Customers above this lifetime spend are flagged VIP automatically. */
export const VIP_LTV_PENCE = 50000;
/** A paying customer with no order in this many days is flagged at-risk. */
export const AT_RISK_DAYS = 120;
