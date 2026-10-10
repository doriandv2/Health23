"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function revalidateInbox() {
  revalidatePath("/admin/inbox");
  revalidatePath("/admin", "layout"); // nav badge count
}

export async function setMessageStatus(fd: FormData) {
  await requireAdmin();
  const { id, status } = z.object({ id: z.string().min(1), status: z.enum(["OPEN", "CLOSED"]) }).parse({ id: fd.get("id"), status: fd.get("status") });
  await db.contactMessage.update({ where: { id }, data: { status } }).catch(() => null);
  revalidateInbox();
}

/**
 * Marks every pending alert for a variant as notified. Sending the email is
 * out of scope here; this records that the customers were contacted.
 */
export async function markAlertsNotified(fd: FormData) {
  await requireAdmin();
  const variantId = z.string().min(1).parse(fd.get("variantId"));
  await db.stockAlert.updateMany({ where: { variantId, notifiedAt: null }, data: { notifiedAt: new Date() } });
  revalidateInbox();
}
