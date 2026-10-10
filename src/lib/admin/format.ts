/** Shared, client-safe helpers for the admin area: badge tones, labels, param parsing. */

export type Tone = "neutral" | "brand" | "sage" | "green" | "amber" | "red" | "blue" | "dark";

const ORDER_TONES: Record<string, Tone> = {
  PENDING: "amber",
  PAID: "blue",
  FULFILLED: "sage",
  SHIPPED: "brand",
  DELIVERED: "green",
  CANCELLED: "neutral",
  REFUNDED: "red",
};

const CRM_TONES: Record<string, Tone> = {
  LEAD: "neutral",
  CUSTOMER: "blue",
  VIP: "brand",
  AT_RISK: "amber",
  CHURNED: "red",
};

const SUB_TONES: Record<string, Tone> = {
  ACTIVE: "green",
  PAUSED: "amber",
  PAST_DUE: "red",
  CANCELLED: "neutral",
};

const PRODUCT_TONES: Record<string, Tone> = {
  ACTIVE: "green",
  DRAFT: "amber",
  ARCHIVED: "neutral",
};

export const orderTone = (s: string): Tone => ORDER_TONES[s] ?? "neutral";
export const crmTone = (s: string): Tone => CRM_TONES[s] ?? "neutral";
export const subTone = (s: string): Tone => SUB_TONES[s] ?? "neutral";
export const productTone = (s: string): Tone => PRODUCT_TONES[s] ?? "neutral";

/** "AT_RISK" -> "At risk" */
export function humanize(s: string) {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "PAST_DUE", "CANCELLED"] as const;

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param, trimmed; empty string when absent. */
export function param(sp: SearchParams, key: string) {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function pageParam(sp: SearchParams) {
  const n = Number.parseInt(param(sp, "page"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Builds a query string from the given params, dropping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatPct(ratio: number, digits = 1) {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Compact integer: 1,284 / 12.9K / 1.2M */
export function compactNumber(n: number) {
  return new Intl.NumberFormat("en-GB", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

export function relativeDays(d: Date | string, now = new Date()) {
  const days = Math.round((new Date(d).getTime() - now.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
