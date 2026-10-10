import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const productCardInclude = {
  images: { orderBy: { position: "asc" }, take: 2 },
  variants: { orderBy: { position: "asc" } },
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export type ShopFilters = {
  q?: string;
  category?: string;
  tag?: string;
  brand?: string;
  inStock?: boolean;
  sort?: string;
};

export async function listProducts(filters: ShopFilters = {}) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const and: Prisma.ProductWhereInput[] = [];
  if (filters.q) {
    and.push({ OR: [{ title: { contains: filters.q } }, { brand: { contains: filters.q } }, { tags: { contains: filters.q } }, { descriptionHtml: { contains: filters.q } }] });
  }
  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.tag) and.push({ tags: { contains: filters.tag } });
  if (filters.brand) and.push({ brand: filters.brand });
  if (filters.inStock) and.push({ variants: { some: { stock: { gt: 0 } } } });
  if (and.length) where.AND = and;

  const products = await db.product.findMany({ where, include: productCardInclude, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });

  const price = (p: ProductCardData) => Math.min(...p.variants.map((v) => v.pricePence));
  const inStock = (p: ProductCardData) => p.variants.some((v) => v.stock > 0);
  switch (filters.sort) {
    case "price-asc":
      products.sort((a, b) => price(a) - price(b));
      break;
    case "price-desc":
      products.sort((a, b) => price(b) - price(a));
      break;
    case "name":
      products.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "newest":
      products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    default:
      // Featured first, but always keep purchasable products above sold-out ones.
      products.sort((a, b) => Number(inStock(b)) - Number(inStock(a)));
  }
  return products;
}

export async function getProduct(slug: string) {
  const decoded = decodeURIComponent(slug);
  return db.product.findFirst({
    where: { OR: [{ slug: decoded }, { legacyHandle: decoded }], status: "ACTIVE" },
    include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" } }, category: true },
  });
}

export async function relatedProducts(productId: string, categoryId: string | null, tags: string, take = 4) {
  const firstTag = tags.split(",")[0];
  const rows = await db.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: productId },
      variants: { some: { stock: { gt: 0 } } },
      OR: [{ categoryId: categoryId ?? undefined }, ...(firstTag ? [{ tags: { contains: firstTag } }] : [])],
    },
    include: productCardInclude,
    take: take * 2,
  });
  return rows.sort((a, b) => Number(b.categoryId === categoryId) - Number(a.categoryId === categoryId)).slice(0, take);
}
