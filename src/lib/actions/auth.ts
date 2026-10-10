"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { verifyOrderToken } from "@/lib/order-token";
import { track } from "@/lib/track";
import type { FormState } from "./public";

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, message: "That email and password don't match." };
  }
  await startSession(user);
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  redirect(safeNext(form.get("next"), user.role === "ADMIN" ? "/admin" : "/account"));
}

const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
  marketing: z.string().optional(),
  order: z.string().optional(),
  token: z.string().optional(),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { name, email, password, marketing, order, token } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  let userId: string;
  if (existing?.passwordHash) {
    return { ok: false, message: "An account with this email already exists — please log in." };
  } else if (existing) {
    // Guest buyers can claim their record only with proof they placed an order.
    const orderId = Number(order);
    const owns = orderId && verifyOrderToken(orderId, token) && (await db.order.count({ where: { id: orderId, userId: existing.id } }));
    if (!owns) return { ok: false, message: "We already have this email from a previous order. Use the link on your order confirmation to create your account, or contact us." };
    await db.user.update({ where: { id: existing.id }, data: { name: existing.name || name, passwordHash: await hashPassword(password), marketingOptIn: marketing ? true : undefined } });
    userId = existing.id;
  } else {
    const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password), source: "website", marketingOptIn: Boolean(marketing) } });
    userId = user.id;
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await startSession(user);
  await track({ type: "signup", userId, meta: { via: "register" } });
  redirect(safeNext(form.get("next"), "/account"));
}

export async function logout() {
  await endSession();
  redirect("/");
}
