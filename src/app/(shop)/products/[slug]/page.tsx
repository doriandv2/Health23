import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProduct, relatedProducts } from "@/lib/catalog";
import { cleanHtml } from "@/lib/sanitize";
import { splitTags } from "@/lib/utils";
import { tagSlug } from "@/lib/taxonomy";
import { SITE } from "@/lib/config";
import { Gallery } from "@/components/product/Gallery";
import { PurchaseBox } from "@/components/product/PurchaseBox";
import { TrustBadges } from "@/components/product/TrustBadges";
import { ProductGrid } from "@/components/product/ProductCard";
import { ProductViewTracker } from "@/components/analytics/PageTracker";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  const description = product.seoDescription || product.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 155);
  return {
    title: product.seoTitle || product.title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.title, description, images: product.images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  // Old Shopify handles keep working but resolve to the clean URL.
  if (decodeURIComponent(slug) !== product.slug) permanentRedirect(`/products/${product.slug}`);

  const related = await relatedProducts(product.id, product.categoryId, product.tags);
  const tags = splitTags(product.tags);
  const minPrice = Math.min(...product.variants.map((v) => v.pricePence));
  const inStock = product.variants.some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((i) => `${SITE.url}${i.url}`),
    sku: product.variants[0]?.sku ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: (minPrice / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE.url}/products/${product.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductViewTracker productId={product.id} />
      <div className="container-x pb-8 pt-6">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/shop" className="hover:text-ink">Shop</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
            </>
          )}
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Gallery images={product.images} title={product.title} />

          <div>
            <Link href={`/shop?brand=${encodeURIComponent(product.brand)}`} className="eyebrow hover:text-brand-700">{product.brand}</Link>
            <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{product.title}</h1>
            {tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Good for">
                {tags.map((t) => (
                  <li key={t}><Link href={`/collections/${tagSlug(t)}`} className="chip bg-sage-100 text-sage-800 hover:bg-sage-200">{t}</Link></li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <PurchaseBox
                productId={product.id}
                title={product.title}
                variants={product.variants.map((v) => ({ id: v.id, title: v.title, pricePence: v.pricePence, compareAtPence: v.compareAtPence, stock: v.stock }))}
                subscribable={product.subscribable}
                discountPct={product.subscriptionDiscountPct}
              />
            </div>
            <div className="mt-8"><TrustBadges compact /></div>

            <div className="mt-10 divide-y divide-line border-y border-line">
              <details open className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  Description <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                </summary>
                <div className="prose-r23 mt-3" dangerouslySetInnerHTML={{ __html: cleanHtml(product.descriptionHtml) }} />
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  Delivery &amp; returns <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                </summary>
                <div className="prose-r23 mt-3">
                  <ul>
                    <li><strong>Royal Mail Tracked 48</strong> — £5.95, 2–3 working days. Free on orders over £150.</li>
                    <li><strong>DPD Next Day</strong> — £7.95. Orders placed before 2pm Mon–Fri are dispatched the same day.</li>
                    <li><strong>Subscribers</strong> get free standard delivery on every order.</li>
                    <li>Unused goods bought in error can be returned &ldquo;as new&rdquo; within seven days. <Link href="/pages/refund-policy">Refund policy</Link></li>
                  </ul>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="mb-8 text-2xl sm:text-3xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
