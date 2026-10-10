"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, ok, zodFailure, type ActionResult } from "@/lib/admin/action-result";
import { poundsToPence } from "@/lib/admin/products";

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "At least 3 characters")
      .max(32, "Up to 32 characters")
      .regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only"),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.string().trim().min(1, "Enter a value"),
    minSpend: z.string().trim(),
    maxUses: z.string().trim(),
    expiresAt: z.string().trim(),
  })
  .transform((v, ctx) => {
    let value = 0;
    if (v.type === "PERCENT") {
      value = Number(v.value);
      if (!Number.isInteger(value) || value < 1 || value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Whole percent between 1 and 100" });
    } else {
      const p = poundsToPence(v.value);
      if (p === null || Number.isNaN(p) || p <= 0) ctx.addIssue({ code: "custom", path: ["value"], message: "Amount in pounds, e.g. 5.00" });
      value = p ?? 0;
    }
    const min = v.minSpend ? poundsToPence(v.minSpend) : 0;
    if (min === null || Number.isNaN(min)) ctx.addIssue({ code: "custom", path: ["minSpend"], message: "Amount in pounds, e.g. 30.00" });
    const maxUses = v.maxUses ? Number(v.maxUses) : null;
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) ctx.addIssue({ code: "custom", path: ["maxUses"], message: "Whole number ≥ 1, or blank for unlimited" });
    let expiresAt: Date | null = null;
    if (v.expiresAt) {
      // Date input gives YYYY-MM-DD; the code stays valid through the end of that day (UK).
      expiresAt = new Date(`${v.expiresAt}T23:59:59`);
      if (Number.isNaN(expiresAt.getTime())) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Invalid date" });
      else if (expiresAt < new Date()) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be in the future" });
    }
    return { code: v.code, type: v.type, value, minSubtotalPence: min && !Number.isNaN(min) ? min : 0, maxUses, expiresAt };
  });

export async function createDiscount(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    code: fd.get("code") ?? "",
    type: fd.get("type"),
    value: fd.get("value") ?? "",
    minSpend: fd.get("minSpend") ?? "",
    maxUses: fd.get("maxUses") ?? "",
    expiresAt: fd.get("expiresAt") ?? "",
  });
  if (!parsed.success) return zodFailure(parsed.error);
  if (await db.discountCode.findUnique({ where: { code: parsed.data.code }, select: { id: true } })) return fail("That code already exists.", { code: "Code must be unique" });
  await db.discountCode.create({ data: parsed.data });
  revalidatePath("/admin/discounts");
  return ok(`Created ${parsed.data.code}.`);
}

const idSchema = z.string().min(1);

export async function toggleDiscount(fd: FormData) {
  await requireAdmin();
  const id = idSchema.parse(fd.get("id"));
  const code = await db.discountCode.findUnique({ where: { id }, select: { active: true } });
  if (code) await db.discountCode.update({ where: { id }, data: { active: !code.active } });
  revalidatePath("/admin/discounts");
}

export async function deleteDiscount(fd: FormData) {
  await requireAdmin();
  const id = idSchema.parse(fd.get("id"));
  await db.discountCode.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/discounts");
}
