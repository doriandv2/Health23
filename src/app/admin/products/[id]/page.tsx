import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { FUNCTIONS, GOALS } from "@/lib/taxonomy";
import { splitTags } from "@/lib/utils";
import { productFormOptions } from "@/lib/admin/catalog";
import { penceToPounds } from "@/lib/admin/products";
import { param, type SearchParams } from "@/lib/admin/format";
import { ProductForm } from "@/components/admin/ProductForm";
import { SubmitButton } from "@/components/admin/buttons";
import { Notice, PageHeader, ProductStatusBadge } from "@/components/admin/ui";
import { deleteProduct, duplicateProduct } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id }, select: { title: true } });
  return { title: p ? `Edit ${p.title}` : "Product" };
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const product = await db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" } }, _count: { select: { orderItems: true } } },
  });
  if (!product) notFound();
  const { categories, brands } = await productFormOptions();
  const hasOrders = product._count.orderItems > 0;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={product.title}
        description={
          <span className="inline-flex items-center gap-2">
            <ProductStatusBadge status={product.status} /> {product.brand}
            {hasOrders && <span>· in {product._count.orderItems} order line{product._count.orderItems === 1 ? "" : "s"}</span>}
          </span>
        }
        actions={
          <>
            {product.status === "ACTIVE" && (
              <Link href={`/products/${product.slug}`} target="_blank" className="btn-ghost btn-sm">
                <ExternalLink className="h-4 w-4" aria-hidden /> View in shop
              </Link>
            )}
            <form action={duplicateProduct}>
              <input type="hidden" name="id" value={product.id} />
              <SubmitButton className="btn-outline btn-sm" pendingLabel="Duplicating…">
                <Copy className="h-4 w-4" aria-hidden /> Duplicate
              </SubmitButton>
            </form>
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={product.id} />
              <SubmitButton
                className="btn-outline btn-sm text-red-700 hover:border-red-300"
                confirm={hasOrders ? "This product has order history, so it will be archived (hidden from the shop) instead of deleted. Continue?" : "Permanently delete this product? This can't be undone."}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> {hasOrders ? "Archive" : "Delete"}
              </SubmitButton>
            </form>
          </>
        }
      />
      {param(sp, "created") && (
        <div className="mb-4">
          <Notice tone="success">Product created.</Notice>
        </div>
      )}
      {param(sp, "saved") && (
        <div className="mb-4">
          <Notice tone="success">Product saved.</Notice>
        </div>
      )}
      {param(sp, "duplicated") && (
        <div className="mb-4">
          <Notice tone="success">This is a draft copy with stock set to 0. Review it, then set it Active.</Notice>
        </div>
      )}
      <ProductForm
        key={product.updatedAt.toISOString()}
        categories={categories}
        brands={brands}
        goals={GOALS}
        functions={FUNCTIONS}
        initial={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          brand: product.brand,
          categoryId: product.categoryId ?? "",
          tags: splitTags(product.tags),
          status: product.status,
          featured: product.featured,
          subscribable: product.subscribable,
          subscriptionDiscountPct: product.subscriptionDiscountPct,
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          descriptionHtml: product.descriptionHtml,
          images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
          variants: product.variants.map((v) => ({ id: v.id, title: v.title, sku: v.sku ?? "", price: penceToPounds(v.pricePence), compareAt: penceToPounds(v.compareAtPence), stock: String(v.stock) })),
        }}
      />
    </>
  );
}
