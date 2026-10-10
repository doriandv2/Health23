"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { upsertContact } from "@/lib/crm";
import { track } from "@/lib/track";

export type FormState = { ok: boolean; message: string } | null;

const email = z.string().trim().toLowerCase().email("Please enter a valid email address.");

export async function subscribeNewsletter(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const user = await upsertContact(parsed.data, { source: "newsletter", marketingOptIn: true });
  await track({ type: "signup", userId: user.id, meta: { via: "newsletter" } });
  return { ok: true, message: "You're on the list — use WELCOME10 for 10% off your first order." };
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email,
  message: z.string().trim().min(5, "Please write a short message.").max(5000),
});

export async function sendContactMessage(_: FormState, form: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const user = await upsertContact(parsed.data.email, { name: parsed.data.name, source: "contact" });
  await db.contactMessage.create({ data: { ...parsed.data, userId: user.id } });
  return { ok: true, message: "Thanks — we aim to reply within 24–48 hours." };
}

export async function requestStockAlert(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, variantId: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const variant = await db.variant.findUnique({ where: { id: parsed.data.variantId } });
  if (!variant) return { ok: false, message: "Product not found." };
  await upsertContact(parsed.data.email, { source: "stock_alert" });
  await db.stockAlert.upsert({
    where: { email_variantId: { email: parsed.data.email, variantId: variant.id } },
    update: { notifiedAt: null },
    create: { email: parsed.data.email, variantId: variant.id },
  });
  return { ok: true, message: "We'll email you as soon as it's back in stock." };
}
