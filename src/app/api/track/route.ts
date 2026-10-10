import { NextResponse } from "next/server";
import { z } from "zod";
import { track } from "@/lib/track";

const CLIENT_EVENTS = ["page_view", "product_view", "add_to_cart", "checkout_started", "search"] as const;

const schema = z.object({
  type: z.enum(CLIENT_EVENTS),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  productId: z.string().max(40).optional(),
  valuePence: z.number().int().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { referrer, ...rest } = parsed.data;
  // Store only the referring host, and skip our own domain.
  let refHost: string | undefined;
  try {
    const host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : undefined;
    if (host && host !== new URL(req.url).hostname) refHost = host;
  } catch {}
  await track({ ...rest, referrer: refHost });
  return NextResponse.json({ ok: true });
}
