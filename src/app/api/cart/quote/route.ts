import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCart } from "@/lib/pricing";

const schema = z.object({
  lines: z.array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(99), subscribe: z.boolean() })).max(50),
  intervalMonths: z.number().int().optional(),
  shippingMethod: z.string().optional(),
  discountCode: z.string().max(40).nullish(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  return NextResponse.json(await quoteCart(parsed.data));
}
