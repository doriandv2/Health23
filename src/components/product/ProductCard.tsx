import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { Badge } from "@/components/ui";
import { QuickAdd } from "./QuickAdd";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const prices = product.variants.map((v) => v.pricePence);
  const min = Math.min(...prices);
  const multiPrice = new Set(prices).size > 1;
  const inStock = product.variants.filter((v) => v.stock > 0);
  const soldOut = inStock.length === 0;
  const compareAt = product.variants.find((v) => v.compareAtPence && v.pricePence === min)?.compareAtPence;
  const [img, hover] = product.images;
  const singleBuyable = product.variants.length === 1 && !soldOut;

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-line transition group-hover:shadow-card">
        {img && (
          <Image src={img.url} alt={img.alt || product.title} fill priority={priority} sizes="(min-width:1280px) 280px, (min-width:768px) 30vw, 46vw" className={`object-contain p-5 transition duration-500 ${hover ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"} ${soldOut ? "opacity-60" : ""}`} />
        )}
        {hover && <Image src={hover.url} alt="" fill sizes="(min-width:1280px) 280px, (min-width:768px) 30vw, 46vw" className="object-contain p-5 opacity-0 transition duration-500 group-hover:opacity-100" />}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut && <Badge tone="dark">Sold out</Badge>}
          {!soldOut && compareAt && <Badge tone="brand">Sale</Badge>}
          {!soldOut && product.subscribable && <Badge tone="sage">Save {product.subscriptionDiscountPct}% on repeat</Badge>}
        </div>
      </Link>
        {singleBuyable && (
          <div className="absolute bottom-3 right-3 transition sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:[&:focus-within]:opacity-100">
            <QuickAdd variantId={inStock[0].id} productId={product.id} title={product.title} />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{product.brand}</p>
        <h3 className="mt-0.5 font-sans text-sm font-medium leading-snug tracking-normal">
          <Link href={`/products/${product.slug}`} className="line-clamp-2 hover:text-brand-600">{product.title}</Link>
        </h3>
        <p className="mt-auto pt-2 text-sm">
          <span className="font-semibold tabular-nums">{multiPrice ? "From " : ""}{formatPrice(min)}</span>
          {compareAt && <span className="ml-2 text-ink-muted line-through tabular-nums">{formatPrice(compareAt)}</span>}
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < priorityCount} />)}
    </div>
  );
}
