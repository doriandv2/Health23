import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";
import { FUNCTIONS, GOALS, tagSlug } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.blogPost.findMany({ select: { slug: true, publishedAt: true } }),
    db.page.findMany({ select: { slug: true } }),
  ]);
  const u = (p: string) => `${SITE.url}${p}`;
  return [
    { url: u("/"), priority: 1 },
    { url: u("/shop"), priority: 0.9 },
    { url: u("/subscriptions"), priority: 0.7 },
    ...[...GOALS, ...FUNCTIONS].map((t) => ({ url: u(`/collections/${tagSlug(t)}`), priority: 0.6 })),
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
    { url: u("/blog"), priority: 0.5 },
    ...posts.map((p) => ({ url: u(`/blog/${p.slug}`), lastModified: p.publishedAt, priority: 0.4 })),
    ...pages.map((p) => ({ url: u(`/pages/${p.slug}`), priority: 0.2 })),
  ];
}
