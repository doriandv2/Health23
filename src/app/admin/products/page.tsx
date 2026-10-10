import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Copy, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { humanize, pageParam, param, PRODUCT_STATUSES, qs, type SearchParams } from "@/lib/admin/format";
import { EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/admin/buttons";
import { FilterBar, FilterField, filterInput, Notice, PageHeader, Pagination, ProductStatusBadge, StockBadge, TableWrap, td, th, Thumb } from "@/components/admin/ui";
import { duplicateProduct, updateStock } from "./actions";

export const metadata = { title: "Products" };

const PAGE_SIZE = 30;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const category = param(sp, "category");
  const stock = param(sp, "stock");
  const page = pageParam(sp);

  const and: Prisma.ProductWhereInput[] = [];
  if (q) and.push({ OR: [{ title: { contains: q } }, { brand: { contains: q } }, { slug: { contains: q } }, { variants: { some: { sku: { contains: q } } } }] });
  if (status && (PRODUCT_STATUSES as readonly string[]).includes(status)) and.push({ status });
  if (category === "none") and.push({ categoryId: null });
  else if (category) and.push({ categoryId: category });
  if (stock === "out") and.push({ variants: { every: { stock: { lte: 0 } } } });
  if (stock === "low") and.push({ variants: { some: { stock: { gt: 0, lte: 5 } } } });
  if (stock === "in") and.push({ variants: { some: { stock: { gt: 0 } } } });
  const where: Prisma.ProductWhereInput = and.length ? { AND: and } : {};

  const [total, products, categories] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: { orderBy: { position: "asc" } }, category: { select: { name: true } } },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = { q, status, category, stock };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}${and.length ? " match" : ""}`}
        actions={
          <Link href="/admin/products/new" className="btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden /> Add product
          </Link>
        }
      />
      {param(sp, "deleted") && (
        <div className="mb-4">
          <Notice tone="success">Product deleted.</Notice>
        </div>
      )}
      {param(sp, "archived") && (
        <div className="mb-4">
          <Notice tone="info">The product has order history, so it was archived instead of deleted.</Notice>
        </div>
      )}

      <FilterBar resetHref="/admin/products">
        <FilterField label="Search" htmlFor="q" className="min-w-[220px] flex-1 sm:flex-none">
          <input id="q" name="q" defaultValue={q} placeholder="Title, brand or SKU" className={filterInput} />
        </FilterField>
        <FilterField label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={status} className={filterInput}>
            <option value="">All statuses</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category" htmlFor="category">
          <select id="category" name="category" defaultValue={category} className={filterInput}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">Uncategorised</option>
          </select>
        </FilterField>
        <FilterField label="Stock" htmlFor="stock">
          <select id="stock" name="stock" defaultValue={stock} className={filterInput}>
            <option value="">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low (1–5)</option>
            <option value="out">Out of stock</option>
          </select>
        </FilterField>
      </FilterBar>

      {products.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th scope="col" className={th}>
                <span className="sr-only">Image</span>
              </th>
              <th scope="col" className={th}>Product</th>
              <th scope="col" className={th}>Category</th>
              <th scope="col" className={`${th} text-right`}>Price</th>
              <th scope="col" className={th}>Stock</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const prices = p.variants.map((v) => v.pricePence);
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;
              const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id} className="hover:bg-cream/40">
                  <td className={`${td} w-14`}>
                    <Thumb src={p.images[0]?.url} alt="" />
                  </td>
                  <td className={`${td} max-w-[320px]`}>
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      {p.brand}
                      {p.variants.length > 1 && ` · ${p.variants.length} variants`}
                      {p.featured && " · Featured"}
                    </p>
                  </td>
                  <td className={`${td} text-xs text-ink-soft`}>{p.category?.name ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{prices.length ? (min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`) : "—"}</td>
                  <td className={td}>
                    <details className="group">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-black/5 [&::-webkit-details-marker]:hidden">
                        <StockBadge stock={totalStock} />
                        <span className="text-[11px] font-semibold text-ink-muted underline-offset-2 group-open:underline">Edit</span>
                      </summary>
                      <form action={updateStock} className="mt-2 w-56 space-y-2 rounded-xl border border-line bg-cream/50 p-3">
                        <input type="hidden" name="productId" value={p.id} />
                        {p.variants.map((v) => (
                          <div key={v.id} className="flex items-center justify-between gap-2">
                            <label htmlFor={`stock-${v.id}`} className="min-w-0 truncate text-xs text-ink-soft">
                              {v.title}
                            </label>
                            <input id={`stock-${v.id}`} name={`stock_${v.id}`} type="number" min={0} step={1} defaultValue={v.stock} className="w-20 rounded-lg border border-line px-2 py-1 text-right text-sm tabular-nums" />
                          </div>
                        ))}
                        <SubmitButton className="btn-dark btn-sm w-full" pendingLabel="Saving…">
                          Save stock
                        </SubmitButton>
                      </form>
                    </details>
                  </td>
                  <td className={td}>
                    <ProductStatusBadge status={p.status} />
                  </td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/products/${p.id}`} className="btn-ghost btn-sm px-3">
                        Edit
                      </Link>
                      <form action={duplicateProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton className="btn-ghost btn-sm px-2" aria-label={`Duplicate ${p.title}`} title="Duplicate">
                          <Copy className="h-4 w-4" aria-hidden />
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
        <EmptyState
          title="No products found"
          body={and.length ? "Try a different search or clear the filters." : "Add your first product to start selling."}
          action={
            <Link href="/admin/products/new" className="btn-primary btn-sm">
              Add product
            </Link>
          }
        />
      )}
      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(n) => `/admin/products${qs({ ...base, page: n })}`} />
    </>
  );
}
