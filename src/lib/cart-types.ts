export type CartLine = {
  variantId: string;
  quantity: number;
  /** Deliver on repeat at the cart's subscription interval. */
  subscribe: boolean;
};

export type CartState = {
  lines: CartLine[];
  /** Applies to every subscribe line so one checkout creates one subscription. */
  intervalMonths: number;
};

export type QuotedLine = {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  brand: string;
  variantTitle: string;
  imageUrl: string | null;
  quantity: number;
  subscribe: boolean;
  basePence: number;
  unitPence: number;
  compareAtPence: number | null;
  lineTotalPence: number;
  stock: number;
  subscribable: boolean;
  subscriptionDiscountPct: number;
};

export type Quote = {
  lines: QuotedLine[];
  intervalMonths: number;
  subtotalPence: number;
  savingsPence: number;
  discountPence: number;
  discountCode: string | null;
  discountError: string | null;
  shippingPence: number;
  shippingMethod: string;
  totalPence: number;
  hasSubscription: boolean;
  freeShippingRemainingPence: number;
  issues: string[];
};
