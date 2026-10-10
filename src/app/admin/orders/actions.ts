"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/config";
import { refreshCrmStatus } from "@/lib/crm";
import { fail, ok, zodFailure, type ActionResult } from "@/lib/admin/action-result";

const schema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().trim().max(80, "Keep it under 80 characters"),
});

export async function updateOrder(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse({ id: formData.get("id"), status: formData.get("status"), trackingNumber: formData.get("trackingNumber") ?? "" });
  if (!parsed.success) return zodFailure(parsed.error);
  const { id, status, trackingNumber } = parsed.data;

  const order = await db.order.findUnique({ where: { id }, select: { status: true, trackingNumber: true, userId: true, paidAt: true } });
  if (!order) return fail("Order not found.");
  const tracking = trackingNumber || null;
  if (order.status === status && (order.trackingNumber ?? null) === tracking) return ok("No changes to save.");

  await db.order.update({
    where: { id },
    data: {
      status,
      trackingNumber: tracking,
      paidAt: !order.paidAt && status !== "PENDING" && status !== "CANCELLED" ? new Date() : undefined,
    },
  });
  // Audit trail: shows on the order timeline and the customer's activity feed.
  if (order.status !== status) {
    await db.event.create({ data: { type: "order_status_changed", userId: order.userId, meta: JSON.stringify({ orderId: id, from: order.status, to: status, by: admin.email }) } });
  }
  if (tracking && tracking !== order.trackingNumber) {
    await db.event.create({ data: { type: "order_tracking_added", userId: order.userId, meta: JSON.stringify({ orderId: id, trackingNumber: tracking, by: admin.email }) } });
  }
  if (order.userId) await refreshCrmStatus(order.userId);

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  if (order.userId) revalidatePath(`/admin/customers/${order.userId}`);
  return ok("Order updated.");
}
