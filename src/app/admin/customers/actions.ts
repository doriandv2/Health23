"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CRM_STATUSES } from "@/lib/config";
import { refreshCrmStatus } from "@/lib/crm";
import { splitTags } from "@/lib/utils";
import { fail, ok, zodFailure, type ActionResult } from "@/lib/admin/action-result";

const tagsField = z
  .string()
  .max(500)
  .transform((s) => [...new Set(splitTags(s).map((t) => t.toLowerCase().slice(0, 40)))].join(","));

const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  crmStatus: z.enum(CRM_STATUSES),
  tags: tagsField,
  marketingOptIn: z.boolean(),
});

export async function updateCustomer(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = profileSchema.safeParse({
    id: fd.get("id"),
    name: fd.get("name") ?? "",
    phone: fd.get("phone") ?? "",
    crmStatus: fd.get("crmStatus"),
    tags: fd.get("tags") ?? "",
    marketingOptIn: fd.get("marketingOptIn") === "on",
  });
  if (!parsed.success) return zodFailure(parsed.error);
  const { id, ...data } = parsed.data;
  const exists = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return fail("Contact not found.");
  await db.user.update({ where: { id }, data: { ...data, name: data.name || null, phone: data.phone || null } });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return ok("Contact saved.");
}

/** Recomputes the lifecycle status from order history (overrides a manual status). */
export async function recalculateStatus(fd: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(fd.get("id"));
  await refreshCrmStatus(id);
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
}

const noteSchema = z.object({ userId: z.string().min(1), body: z.string().trim().min(1, "Write a note first").max(5000) });

export async function addNote(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = noteSchema.safeParse({ userId: fd.get("userId"), body: fd.get("body") ?? "" });
  if (!parsed.success) return zodFailure(parsed.error, "");
  await db.customerNote.create({ data: { userId: parsed.data.userId, body: parsed.data.body, authorId: admin.id } });
  revalidatePath(`/admin/customers/${parsed.data.userId}`);
  return ok("Note added.");
}

export async function deleteNote(fd: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(fd.get("id"));
  const note = await db.customerNote.delete({ where: { id } }).catch(() => null);
  if (note) revalidatePath(`/admin/customers/${note.userId}`);
}

const newSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  name: z.string().trim().max(120),
  phone: z.string().trim().max(40),
  crmStatus: z.enum(CRM_STATUSES),
  tags: tagsField,
  marketingOptIn: z.boolean(),
  note: z.string().trim().max(5000),
});

export async function createCustomer(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = newSchema.safeParse({
    email: fd.get("email") ?? "",
    name: fd.get("name") ?? "",
    phone: fd.get("phone") ?? "",
    crmStatus: fd.get("crmStatus") || "LEAD",
    tags: fd.get("tags") ?? "",
    marketingOptIn: fd.get("marketingOptIn") === "on",
    note: fd.get("note") ?? "",
  });
  if (!parsed.success) return zodFailure(parsed.error);
  const { note, ...data } = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) return fail("A contact with this email already exists.", { email: "Already in the CRM" });

  const user = await db.user.create({
    data: { ...data, name: data.name || null, phone: data.phone || null, source: "admin", role: "CUSTOMER", notes: note ? { create: { body: note, authorId: admin.id } } : undefined },
  });
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${user.id}`);
}
