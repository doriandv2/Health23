import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";
import { db } from "@/lib/db";
import { listProducts, type ShopFilters } from "@/lib/catalog";
import { FUNCTIONS, GOALS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { ProductGrid } from "./ProductCard";
import { SortSelect } from "./SortSelect";

type Props = { filters: ShopFilters; title: string; intro?: string; basePath?: string };

export async function ShopView({ filters, title, intro, basePath = "/shop" }: Props) {
  const [products, categories, brands] = await Promise.all([
    listProducts(filters),
    db.category.findMany({ orderBy: { position: "asc" }, where: { products: { some: { status: "ACTIVE" } } } }),
    db.product.groupBy({ by: ["brand"], where: { status: "ACTIVE" }, orderBy: { brand: "asc" } }),
  ]);

  const href = (patch: Partial<Record<keyof ShopFilters, string | undefined>>) => {
    const merged: Record<string, string | undefined> = {
      q: filters.q, category: filters.category, tag: filters.tag, brand: filters.brand, sort: filters.sort,
      inStock: filters.inStock ? "1" : undefined, ...patch,
    };
    const qs = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    // Collection pages keep their path only while their own filter is unchanged.
    const s = qs.toString();
    return `/shop${s ? `?${s}` : ""}`;
  };

  const active: { label: string; remove: string }[] = [];
  if (filters.q) active.push({ label: `“${filters.q}”`, remove: href({ q: undefined }) });
  if (filters.category) active.push({ label: categories.find((c) => c.slug === filters.category)?.name ?? filters.category, remove: href({ category: undefined }) });
  if (filters.tag) active.push({ label: filters.tag, remove: href({ tag: undefined }) });
  if (filters.brand) active.push({ label: filters.brand, remove: href({ brand: undefined }) });
  if (filters.inStock) active.push({ label: "In stock", remove: href({ inStock: undefined }) });

  return (
    <div className="container-x pt-10">
      <header className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {intro && <p className="mt-3 text-ink-soft">{intro}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <FilterGroup title="Category">
            {categories.map((c) => <FilterLink key={c.id} href={href({ category: filters.category === c.slug ? undefined : c.slug })} active={filters.category === c.slug}>{c.name}</FilterLink>)}
          </FilterGroup>
          <FilterGroup title="Goal">
            {GOALS.map((g) => <FilterLink key={g} href={href({ tag: filters.tag === g ? undefined : g })} active={filters.tag === g}>{g}</FilterLink>)}
          </FilterGroup>
          <FilterGroup title="Function">
            {FUNCTIONS.map((g) => <FilterLink key={g} href={href({ tag: filters.tag === g ? undefined : g })} active={filters.tag === g}>{g}</FilterLink>)}
          </FilterGroup>
          <FilterGroup title="Brand">
            {brands.map((b) => <FilterLink key={b.brand} href={href({ brand: filters.brand === b.brand ? undefined : b.brand })} active={filters.brand === b.brand}>{b.brand}</FilterLink>)}
          </FilterGroup>
        </aside>

        <div className="min-w-0">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4 lg:hidden">
            {categories.map((c) => (
              <Link key={c.id} href={href({ category: filters.category === c.slug ? undefined : c.slug })} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm", filters.category === c.slug ? "border-ink bg-ink text-white" : "border-line bg-white")}>{c.name}</Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-sm text-ink-muted">{products.length} product{products.length === 1 ? "" : "s"}</p>
              {active.map((a) => (
                <Link key={a.label} href={a.remove} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white hover:bg-black">{a.label}<X className="h-3 w-3" /></Link>
              ))}
              {active.length > 1 && <Link href={basePath === "/shop" ? "/shop" : "/shop"} className="text-xs text-ink-soft underline">Clear all</Link>}
            </div>
            <div className="flex items-center gap-4">
              <Link href={href({ inStock: filters.inStock ? undefined : "1" })} className="flex items-center gap-2 text-sm">
                <span className={cn("relative h-5 w-9 rounded-full transition", filters.inStock ? "bg-sage-600" : "bg-black/15")}>
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", filters.inStock ? "left-[18px]" : "left-0.5")} />
                </span>
                In stock only
              </Link>
              <Suspense><SortSelect /></Suspense>
            </div>
          </div>

          <div className="mt-8">
            {products.length ? (
              <ProductGrid products={products} priorityCount={4} />
            ) : (
              <EmptyState title="No products match" body="Try removing a filter or searching for something else." action={<Link href="/shop" className="btn-outline">View all products</Link>} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} scroll={false} className={cn("block rounded-lg px-2.5 py-1.5 text-sm transition", active ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-black/5 hover:text-ink")}>{children}</Link>
    </li>
  );
}
