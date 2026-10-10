import Link from "next/link";
import { Download, UserPlus } from "lucide-react";
import { CRM_STATUSES } from "@/lib/config";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { allCustomerTags, CUSTOMER_SORTS, crmStatusCounts, listCustomers, parseCustomerFilters } from "@/lib/admin/customers";
import { humanize, pageParam, qs, type SearchParams } from "@/lib/admin/format";
import { Badge, EmptyState } from "@/components/ui";
import { CrmBadge, FilterBar, FilterField, filterInput, PageHeader, Pagination, SubStatusBadge, TableWrap, td, th } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Customers" };

const PAGE_SIZE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const f = parseCustomerFilters(sp);
  const page = pageParam(sp);
  const [rows, counts, tags] = await Promise.all([listCustomers(f), crmStatusCounts(), allCustomerTags()]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterQs = { q: f.q, status: f.status, tag: f.tag, sub: f.sub, optin: f.optin, role: f.role, sort: f.sort === "created" ? undefined : f.sort };
  const totalContacts = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone we know about — customers, guest buyers, newsletter leads and admins."
        actions={
          <>
            <a href={`/admin/customers/export${qs(filterQs)}`} className="btn-outline btn-sm">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <Link href="/admin/customers/new" className="btn-primary btn-sm">
              <UserPlus className="h-4 w-4" aria-hidden /> Add contact
            </Link>
          </>
        }
      />

      {/* Status summary doubles as a quick filter */}
      <nav aria-label="Filter by CRM status" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link href={`/admin/customers${qs({ ...filterQs, status: undefined })}`} aria-current={!f.status ? "true" : undefined} className={cn("card p-4 transition hover:shadow-lift", !f.status && "ring-2 ring-ink")}>
          <p className="text-xs text-ink-muted">All contacts</p>
          <p className="mt-1 text-2xl font-semibold">{totalContacts}</p>
        </Link>
        {CRM_STATUSES.map((s) => (
          <Link key={s} href={`/admin/customers${qs({ ...filterQs, status: s })}`} aria-current={f.status === s ? "true" : undefined} className={cn("card p-4 transition hover:shadow-lift", f.status === s && "ring-2 ring-ink")}>
            <CrmBadge status={s} />
            <p className="mt-2 text-2xl font-semibold">{counts[s] ?? 0}</p>
          </Link>
        ))}
      </nav>

      <FilterBar resetHref="/admin/customers">
        <FilterField label="Search" htmlFor="q" className="min-w-[220px] flex-1 sm:flex-none">
          <input id="q" name="q" defaultValue={f.q} placeholder="Name, email or phone" className={filterInput} />
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={f.status} className={filterInput}>
            <option value="">All statuses</option>
            {CRM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "VIP" ? "VIP" : humanize(s)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Tag" htmlFor="tag">
          <select id="tag" name="tag" defaultValue={f.tag} className={filterInput}>
            <option value="">Any tag</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Subscription" htmlFor="sub">
          <select id="sub" name="sub" defaultValue={f.sub} className={filterInput}>
            <option value="">Any</option>
            <option value="yes">Has subscription</option>
            <option value="no">No subscription</option>
          </select>
        </FilterField>
        <FilterField label="Marketing" htmlFor="optin">
          <select id="optin" name="optin" defaultValue={f.optin} className={filterInput}>
            <option value="">Any</option>
            <option value="yes">Opted in</option>
            <option value="no">Not opted in</option>
          </select>
        </FilterField>
        <FilterField label="Role" htmlFor="role">
          <select id="role" name="role" defaultValue={f.role} className={filterInput}>
            <option value="">All roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </FilterField>
        <FilterField label="Sort by" htmlFor="sort">
          <select id="sort" name="sort" defaultValue={f.sort} className={filterInput}>
            {Object.entries(CUSTOMER_SORTS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {pageRows.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th scope="col" className={th}>Contact</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Tags</th>
              <th scope="col" className={th}>Source</th>
              <th scope="col" className={`${th} text-right`}>Orders</th>
              <th scope="col" className={`${th} text-right`}>LTV</th>
              <th scope="col" className={th}>Last order</th>
              <th scope="col" className={th}>Subscription</th>
              <th scope="col" className={th}>Last seen</th>
              <th scope="col" className={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <tr key={c.id} className="hover:bg-cream/40">
                <td className={`${td} max-w-[260px]`}>
                  <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                    {c.name || c.email}
                  </Link>
                  <p className="truncate text-xs text-ink-muted">
                    {c.name ? c.email : c.registered ? "Registered" : "No account"}
                    {c.marketingOptIn && " · Opted in"}
                  </p>
                </td>
                <td className={td}>
                  <span className="inline-flex flex-wrap gap-1">
                    <CrmBadge status={c.crmStatus} />
                    {c.role === "ADMIN" && <Badge tone="dark">Admin</Badge>}
                  </span>
                </td>
                <td className={`${td} max-w-[180px]`}>
                  <span className="flex flex-wrap gap-1">
                    {c.tags.length ? c.tags.map((t) => <Badge key={t}>{t}</Badge>) : <span className="text-xs text-ink-muted">—</span>}
                  </span>
                </td>
                <td className={`${td} text-xs capitalize text-ink-soft`}>{c.source.replace(/_/g, " ")}</td>
                <td className={`${td} text-right tabular-nums`}>{c.orderCount}</td>
                <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>{c.ltv ? formatPrice(c.ltv) : "—"}</td>
                <td className={`${td} whitespace-nowrap text-xs text-ink-soft`}>{c.lastOrder ? formatDate(c.lastOrder) : "—"}</td>
                <td className={`${td} whitespace-nowrap`}>
                  {c.subscription ? (
                    <span className="inline-flex items-center gap-1.5">
                      <SubStatusBadge status={c.subscription} />
                      {c.subscriptionMonthly > 0 && <span className="text-xs tabular-nums text-ink-muted">{formatPrice(c.subscriptionMonthly)}/mo</span>}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-xs text-ink-soft`}>{c.lastSeenAt ? formatDate(c.lastSeenAt) : "—"}</td>
                <td className={`${td} whitespace-nowrap text-xs text-ink-soft`}>{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState title="No contacts match" body="Try a different search or clear the filters." />
      )}
      <Pagination page={page} pageCount={pageCount} total={rows.length} hrefFor={(p) => `/admin/customers${qs({ ...filterQs, page: p })}`} />
    </>
  );
}
