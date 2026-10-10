import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/** Unguessable token that lets a guest view their own order confirmation. */
export function orderToken(orderId: number) {
  return createHmac("sha256", process.env.AUTH_SECRET || "").update(`order:${orderId}`).digest("base64url").slice(0, 32);
}

export function verifyOrderToken(orderId: number, token: string | undefined | null) {
  if (!token) return false;
  const a = Buffer.from(orderToken(orderId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
