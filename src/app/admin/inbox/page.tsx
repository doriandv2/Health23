import Link from "next/link";
import { BellRing, CheckCircle2, Mail, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { formatDateTime, param, qs, type SearchParams } from "@/lib/admin/format";
import { Badge, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { PageHeader, Panel, Thumb } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { markAlertsNotified, setMessageStatus } from "./actions";

export const metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tab = param(sp, "tab") === "alerts" ? "alerts" : "messages";
  const msgStatus = ["OPEN", "CLOSED", "ALL"].includes(param(sp, "status")) ? param(sp, "status") : "OPEN";

  const [messages, openCount, pendingAlerts] = await Promise.all([
    db.contactMessage.findMany({ where: msgStatus === "ALL" ? {} : { status: msgStatus }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.contactMessage.count({ where: { status: "OPEN" } }),
    db.stockAlert.findMany({
      where: { notifiedAt: null },
      orderBy: { createdAt: "asc" },
      include: { variant: { include: { product: { select: { id: true, title: true, status: true, images: { take: 1, orderBy: { position: "asc" } } } } } } },
    }),
  ]);

  // Link messages and alert emails to CRM contacts.
  const emails = [...new Set([...messages.map((m) => m.email.toLowerCase()), ...pendingAlerts.map((a) => a.email.toLowerCase())])];
  const contacts = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  const contactByEmail = new Map(contacts.map((c) => [c.email.toLowerCase(), c.id]));

  type Group = { variant: (typeof pendingAlerts)[number]["variant"]; alerts: typeof pendingAlerts };
  const groups = new Map<string, Group>();
  for (const a of pendingAlerts) {
    const g = groups.get(a.variantId) ?? { variant: a.variant, alerts: [] };
    g.alerts.push(a);
    groups.set(a.variantId, g);
  }
  // Actionable first (back in stock), then by demand.
  const grouped = [...groups.values()].sort((a, b) => Number(b.variant.stock > 0) - Number(a.variant.stock > 0) || b.alerts.length - a.alerts.length);
  const readyCount = grouped.filter((g) => g.variant.stock > 0).length;

  const tabCls = (on: boolean) => cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition", on ? "bg-ink text-white" : "text-ink-soft hover:bg-black/5");

  return (
    <>
      <PageHeader title="Inbox" description="Customer messages and back-in-stock requests." />
      <nav aria-label="Inbox sections" className="mb-6 inline-flex rounded-full border border-line bg-white p-1 shadow-card">
        <Link href="/admin/inbox" aria-current={tab === "messages" ? "page" : undefined} className={tabCls(tab === "messages")}>
          <Mail className="h-4 w-4" aria-hidden /> Messages {openCount > 0 && <span className="tabular-nums opacity-80">({openCount})</span>}
        </Link>
        <Link href="/admin/inbox?tab=alerts" aria-current={tab === "alerts" ? "page" : undefined} className={tabCls(tab === "alerts")}>
          <BellRing className="h-4 w-4" aria-hidden /> Stock alerts {readyCount > 0 && <span className="tabular-nums opacity-80">({readyCount} ready)</span>}
        </Link>
      </nav>

      {tab === "messages" ? (
        <>
          <nav aria-label="Message status" className="mb-4 flex gap-2">
            {(["OPEN", "CLOSED", "ALL"] as const).map((s) => (
              <Link key={s} href={`/admin/inbox${qs({ status: s === "OPEN" ? undefined : s })}`} aria-current={msgStatus === s ? "page" : undefined} className={msgStatus === s ? "chip bg-ink py-1 text-white" : "chip bg-white py-1 text-ink-soft ring-1 ring-line hover:text-ink"}>
                {s === "ALL" ? "All" : s === "OPEN" ? "Open" : "Closed"}
              </Link>
            ))}
          </nav>
          {messages.length ? (
            <ul className="space-y-3">
              {messages.map((m) => {
                const contactId = m.userId ?? contactByEmail.get(m.email.toLowerCase());
                return (
                  <li key={m.id} className={cn("card p-5", m.status === "CLOSED" && "opacity-75")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {contactId ? (
                            <Link href={`/admin/customers/${contactId}`} className="hover:underline">
                              {m.name}
                            </Link>
                          ) : (
                            m.name
                          )}{" "}
                          <span className="font-normal text-ink-muted">&lt;{m.email}&gt;</span>
                        </p>
                        <p className="text-xs text-ink-muted">{formatDateTime(m.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={m.status === "OPEN" ? "amber" : "neutral"}>{m.status === "OPEN" ? "Open" : "Closed"}</Badge>
                        <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Red23")}`} className="btn-outline btn-sm">
                          Reply
                        </a>
                        <form action={setMessageStatus}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="status" value={m.status === "OPEN" ? "CLOSED" : "OPEN"} />
                          <SubmitButton className="btn-ghost btn-sm">
                            {m.status === "OPEN" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> Close
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4" aria-hidden /> Reopen
                              </>
                            )}
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{m.message}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={msgStatus === "OPEN" ? "Inbox zero" : "No messages"} body={msgStatus === "OPEN" ? "No open messages — nice work." : "Messages from the contact form appear here."} />
          )}
        </>
      ) : grouped.length ? (
        <div className="space-y-3">
          {grouped.map(({ variant, alerts }) => {
            const ready = variant.stock > 0;
            return (
              <Panel
                key={variant.id}
                className={cn(ready && "ring-2 ring-emerald-300")}
                title={
                  <span className="flex items-center gap-3">
                    <Thumb src={variant.product.images[0]?.url} alt="" size={40} />
                    <span>
                      <Link href={`/admin/products/${variant.product.id}`} className="hover:underline">
                        {variant.product.title}
                      </Link>
                      {variant.title !== "Default" && <span className="font-normal text-ink-muted"> – {variant.title}</span>}
                    </span>
                  </span>
                }
                description={
                  <span className="mt-1 inline-flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {alerts.length} {alerts.length === 1 ? "person" : "people"} waiting
                    </span>
                    {ready ? <Badge tone="green">Back in stock · {variant.stock} available</Badge> : <Badge tone="red">Out of stock</Badge>}
                    {variant.product.status !== "ACTIVE" && <Badge>{variant.product.status.toLowerCase()}</Badge>}
                    <span>since {formatDate(alerts[0].createdAt)}</span>
                  </span>
                }
                actions={
                  <form action={markAlertsNotified}>
                    <input type="hidden" name="variantId" value={variant.id} />
                    <SubmitButton className={ready ? "btn-primary btn-sm" : "btn-outline btn-sm"} pendingLabel="Saving…" confirm={ready ? undefined : "This variant is still out of stock. Mark everyone as notified anyway?"}>
                      Mark notified
                    </SubmitButton>
                  </form>
                }
              >
                <details>
                  <summary className="cursor-pointer rounded text-xs font-semibold text-ink-muted hover:text-ink">Show emails</summary>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {alerts.map((a) => {
                      const cid = contactByEmail.get(a.email.toLowerCase());
                      return (
                        <li key={a.id}>
                          {cid ? (
                            <Link href={`/admin/customers/${cid}`} className="chip bg-cream py-1 text-ink-soft hover:text-ink">
                              {a.email}
                            </Link>
                          ) : (
                            <span className="chip bg-cream py-1 text-ink-soft">{a.email}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </Panel>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No pending stock alerts" body="When customers ask to be told about out-of-stock products, they'll be grouped here by variant." />
      )}
    </>
  );
}
