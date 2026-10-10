"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";
import { fail, zodFailure, type ActionResult } from "@/lib/admin/action-result";
import { productSchema } from "@/lib/admin/products";

function revalidateProduct(id?: string, slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/products/${id}`);
  // Storefront pages that show products.
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/products/${slug}`);
}

function jsonField(fd: FormData, key: string): unknown {
  try {
    return JSON.parse(String(fd.get(key) ?? "[]"));
  } catch {
    return [];
  }
}

async function uniqueCategorySlug(name: string) {
  const base = slugify(name) || "category";
  let slug = base;
  for (let i = 2; await db.category.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function saveProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse({
    id: (fd.get("id") as string) || undefined,
    title: fd.get("title") ?? "",
    slug: fd.get("slug") ?? "",
    brand: fd.get("brand") ?? "",
    categoryId: (fd.get("categoryId") as string) || undefined,
    newCategory: (fd.get("newCategory") as string) || undefined,
    tags: jsonField(fd, "tags"),
    status: fd.get("status"),
    featured: fd.get("featured") === "on",
    subscribable: fd.get("subscribable") === "on",
    subscriptionDiscountPct: fd.get("subscriptionDiscountPct") || 0,
    seoTitle: (fd.get("seoTitle") as string) || undefined,
    seoDescription: (fd.get("seoDescription") as string) || undefined,
    descriptionHtml: fd.get("descriptionHtml") ?? "",
    images: jsonField(fd, "images"),
    variants: jsonField(fd, "variants"),
  });
  if (!parsed.success) return zodFailure(parsed.error);
  const data = parsed.data;

  const existing = data.id ? await db.product.findUnique({ where: { id: data.id }, include: { variants: { select: { id: true } } } }) : null;
  if (data.id && !existing) return fail("This product no longer exists.");

  const clash = await db.product.findFirst({ where: { slug: data.slug, id: data.id ? { not: data.id } : undefined }, select: { id: true } });
  if (clash) return fail("That slug is already used by another product.", { slug: "Slug must be unique" });

  // Variants removed from the form: refuse if a live subscription still ships them.
  const keepIds = new Set(data.variants.map((v) => v.id).filter(Boolean));
  const removedIds = (existing?.variants ?? []).map((v) => v.id).filter((id) => !keepIds.has(id));
  if (removedIds.length) {
    const inUse = await db.subscriptionItem.count({ where: { variantId: { in: removedIds }, subscription: { status: { not: "CANCELLED" } } } });
    if (inUse) return fail("A removed variant is part of an active subscription. Set its stock to 0 instead of deleting it.");
  }

  let categoryId: string | null = data.categoryId && data.categoryId !== "__new" ? data.categoryId : null;
  if (data.categoryId === "__new") {
    if (!data.newCategory) return fail("Name the new category.", { newCategory: "Category name is required" });
    const found = await db.category.findFirst({ where: { name: data.newCategory } });
    categoryId = found?.id ?? (await db.category.create({ data: { name: data.newCategory, slug: await uniqueCategorySlug(data.newCategory), position: await db.category.count() } })).id;
  } else if (categoryId && !(await db.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    categoryId = null;
  }

  const fields = {
    title: data.title,
    slug: data.slug,
    brand: data.brand,
    categoryId,
    tags: [...new Set(data.tags)].join(","),
    status: data.status,
    featured: data.featured,
    subscribable: data.subscribable,
    subscriptionDiscountPct: data.subscriptionDiscountPct,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    descriptionHtml: cleanHtml(data.descriptionHtml),
  };
  const ownVariantIds = new Set((existing?.variants ?? []).map((v) => v.id));

  const productId = await db.$transaction(async (tx) => {
    const product = existing ? await tx.product.update({ where: { id: existing.id }, data: fields }) : await tx.product.create({ data: fields });

    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (data.images.length) {
      await tx.productImage.createMany({ data: data.images.map((img, i) => ({ productId: product.id, url: img.url, alt: img.alt || data.title, position: i })) });
    }

    if (removedIds.length) await tx.variant.deleteMany({ where: { id: { in: removedIds }, productId: product.id } });
    for (const [i, v] of data.variants.entries()) {
      const values = { title: v.title, sku: v.sku, pricePence: v.pricePence, compareAtPence: v.compareAtPence, stock: v.stock, position: i };
      if (v.id && ownVariantIds.has(v.id)) await tx.variant.update({ where: { id: v.id }, data: values });
      else await tx.variant.create({ data: { ...values, productId: product.id } });
    }
    return product.id;
  });

  revalidateProduct(productId, data.slug);
  if (existing && existing.slug !== data.slug) revalidatePath(`/products/${existing.slug}`);
  // Redirect (rather than return) so the form remounts with fresh variant/image ids.
  redirect(`/admin/products/${productId}?${existing ? "saved" : "created"}=${Date.now()}`);
}

/** Server-side sanitised preview so the live preview matches what will be stored. */
export async function previewDescription(html: string): Promise<string> {
  await requireAdmin();
  return cleanHtml(String(html).slice(0, 100_000));
}

const idSchema = z.object({ id: z.string().min(1) });

export async function duplicateProduct(fd: FormData) {
  await requireAdmin();
  const { id } = idSchema.parse({ id: fd.get("id") });
  const src = await db.product.findUnique({ where: { id }, include: { images: true, variants: true } });
  if (!src) redirect("/admin/products");

  let slug = `${src.slug}-copy`;
  for (let i = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${src.slug}-copy-${i}`;

  const copy = await db.product.create({
    data: {
      slug,
      title: `${src.title} (copy)`,
      brand: src.brand,
      categoryId: src.categoryId,
      tags: src.tags,
      descriptionHtml: src.descriptionHtml,
      status: "DRAFT",
      featured: false,
      subscribable: src.subscribable,
      subscriptionDiscountPct: src.subscriptionDiscountPct,
      seoTitle: src.seoTitle,
      seoDescription: src.seoDescription,
      images: { create: src.images.map((i) => ({ url: i.url, alt: i.alt, position: i.position })) },
      variants: { create: src.variants.map((v) => ({ title: v.title, sku: v.sku ? `${v.sku}-COPY` : null, pricePence: v.pricePence, compareAtPence: v.compareAtPence, stock: 0, position: v.position })) },
    },
  });
  revalidatePath("/admin/products");
  redirect(`/admin/products/${copy.id}?duplicated=1`);
}

/** Deletes a product, or archives it when order history references it. */
export async function deleteProduct(fd: FormData) {
  await requireAdmin();
  const { id } = idSchema.parse({ id: fd.get("id") });
  const product = await db.product.findUnique({ where: { id }, select: { slug: true, _count: { select: { orderItems: true } }, variants: { select: { _count: { select: { subscriptionItems: true } } } } } });
  if (!product) redirect("/admin/products");
  const referenced = product._count.orderItems > 0 || product.variants.some((v) => v._count.subscriptionItems > 0);
  if (referenced) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED", featured: false } });
  } else {
    await db.product.delete({ where: { id } });
  }
  revalidateProduct(undefined, product.slug);
  redirect(`/admin/products?${referenced ? "archived" : "deleted"}=1`);
}

/** Quick stock edit from the product list: fields named stock_<variantId>. */
export async function updateStock(fd: FormData) {
  await requireAdmin();
  const productId = String(fd.get("productId") ?? "");
  const variants = await db.variant.findMany({ where: { productId }, select: { id: true } });
  const updates: { id: string; stock: number }[] = [];
  for (const v of variants) {
    const raw = fd.get(`stock_${v.id}`);
    if (raw === null) continue;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n <= 1_000_000) updates.push({ id: v.id, stock: n });
  }
  await db.$transaction(updates.map((u) => db.variant.update({ where: { id: u.id }, data: { stock: u.stock } })));
  revalidateProduct(productId);
  revalidatePath("/admin/inbox");
}
