import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/lib/crm";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui";
import { ActionForm, FieldError } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/buttons";
import { PageHeader, Panel, TableWrap, td, th } from "@/components/admin/ui";
import { createDiscount, deleteDiscount, toggleDiscount } from "./actions";

export const metadata = { title: "Discounts" };

export default async function DiscountsPage() {
  const [codes, usage] = await Promise.all([
    db.discountCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] }),
    db.order.groupBy({ by: ["discountCode"], where: { discountCode: { not: null }, status: { in: PAID_STATUSES } }, _sum: { discountPence: true } }),
  ]);
  const given = new Map(usage.map((u) => [u.discountCode, u._sum.discountPence ?? 0]));
  const now = new Date();

  return (
    <>
      <PageHeader title="Discounts" description="Codes customers can enter at checkout." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="New discount code" className="h-fit lg:order-2">
          <ActionForm action={createDiscount} resetOnSuccess className="space-y-4">
            <div>
              <label htmlFor="code" className="label">
                Code
              </label>
              <input id="code" name="code" required className="input uppercase" placeholder="SUMMER15" autoComplete="off" />
              <FieldError name="code" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="type" className="label">
                  Type
                </label>
                <select id="type" name="type" defaultValue="PERCENT" className="input">
                  <option value="PERCENT">% off</option>
                  <option value="FIXED">£ off</option>
                </select>
              </div>
              <div>
                <label htmlFor="value" className="label">
                  Value
                </label>
                <input id="value" name="value" required inputMode="decimal" className="input" placeholder="10" />
                <FieldError name="value" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="minSpend" className="label">
                  Min spend £
                </label>
                <input id="minSpend" name="minSpend" inputMode="decimal" className="input" placeholder="0.00" />
                <FieldError name="minSpend" />
              </div>
              <div>
                <label htmlFor="maxUses" className="label">
                  Max uses
                </label>
                <input id="maxUses" name="maxUses" type="number" min={1} className="input" placeholder="Unlimited" />
                <FieldError name="maxUses" />
              </div>
            </div>
            <div>
              <label htmlFor="expiresAt" className="label">
                Expires
              </label>
              <input id="expiresAt" name="expiresAt" type="date" className="input" />
              <p className="mt-1 text-xs text-ink-muted">Optional — valid until the end of this day.</p>
              <FieldError name="expiresAt" />
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Creating…">
              Create code
            </SubmitButton>
          </ActionForm>
        </Panel>

        <div className="lg:order-1 lg:col-span-2">
          {codes.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th scope="col" className={th}>Code</th>
                  <th scope="col" className={th}>Discount</th>
                  <th scope="col" className={th}>Min spend</th>
                  <th scope="col" className={th}>Uses</th>
                  <th scope="col" className={th}>Expires</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expiresAt ? c.expiresAt < now : false;
                  const usedUp = c.maxUses != null && c.usageCount >= c.maxUses;
                  const state = !c.active ? { tone: "neutral" as const, label: "Disabled" } : expired ? { tone: "red" as const, label: "Expired" } : usedUp ? { tone: "amber" as const, label: "Used up" } : { tone: "green" as const, label: "Active" };
                  return (
                    <tr key={c.id} className="hover:bg-cream/40">
                      <td className={td}>
                        <span className="font-mono text-sm font-semibold">{c.code}</span>
                        <p className="text-xs text-ink-muted">Created {formatDate(c.createdAt)}</p>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{c.type === "PERCENT" ? `${c.value}% off` : `${formatPrice(c.value)} off`}</td>
                      <td className={`${td} whitespace-nowrap text-ink-soft`}>{c.minSubtotalPence ? formatPrice(c.minSubtotalPence) : "—"}</td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>
                        {c.usageCount}
                        {c.maxUses != null && ` / ${c.maxUses}`}
                        {(given.get(c.code) ?? 0) > 0 && <p className="text-xs text-ink-muted">{formatPrice(given.get(c.code) ?? 0)} given</p>}
                      </td>
                      <td className={`${td} whitespace-nowrap text-ink-soft`}>{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                      <td className={td}>
                        <Badge tone={state.tone}>{state.label}</Badge>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <div className="flex justify-end gap-1">
                          <form action={toggleDiscount}>
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton className="btn-ghost btn-sm px-3">{c.active ? "Disable" : "Enable"}</SubmitButton>
                          </form>
                          <form action={deleteDiscount}>
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton className="btn-ghost btn-sm px-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${c.code}`} confirm={`Delete ${c.code}? Past orders keep their discount.`}>
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState title="No discount codes yet" body="Create your first code with the form." />
          )}
        </div>
      </div>
    </>
  );
}
