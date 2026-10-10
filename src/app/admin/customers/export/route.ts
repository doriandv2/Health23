import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/admin/auth";
import { listCustomers, parseCustomerFilters } from "@/lib/admin/customers";

export const dynamic = "force-dynamic";

/** Quotes a CSV cell and neutralises spreadsheet formula injection (=, +, -, @). */
function cell(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const iso = (d: Date | null) => (d ? d.toISOString() : "");

export async function GET(req: NextRequest) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const filters = parseCustomerFilters(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const rows = await listCustomers(filters);

  const header = ["email", "name", "phone", "role", "crm_status", "tags", "source", "marketing_opt_in", "registered", "orders", "ltv_gbp", "last_order_at", "subscription_status", "subscription_monthly_gbp", "last_seen_at", "created_at"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.email, r.name, r.phone, r.role, r.crmStatus, r.tags.join(";"), r.source, r.marketingOptIn, r.registered, r.orderCount, (r.ltv / 100).toFixed(2), iso(r.lastOrder), r.subscription ?? "", (r.subscriptionMonthly / 100).toFixed(2), iso(r.lastSeenAt), iso(r.createdAt)]
        .map(cell)
        .join(","),
    );
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="red23-contacts-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
