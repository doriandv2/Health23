import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FUNCTIONS, GOALS, tagSlug } from "@/lib/taxonomy";
import { ShopView } from "@/components/product/ShopView";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

const INTROS: Record<string, string> = {
  Detox: "Support your body's natural cleansing processes.",
  "Energy & Exercise": "Fuel performance, focus and recovery — for amateur and professional athletes alike.",
  Sleep: "Wind down and wake up restored.",
  Vegan: "Plant-powered nutrition, free from animal products.",
  Brain: "Nutrients for focus, memory and mental clarity.",
};

// Old Shopify collection handles that map to a category rather than a tag.
const LEGACY: Record<string, string> = {
  "health-oils-omega-3": "healthy-oils-and-omega-3",
  "energy-exercise": "energy-and-exercise",
  "protein-aminos": "protein-and-aminos",
};

async function resolve(slug: string) {
  const tag = [...GOALS, ...FUNCTIONS].find((t) => tagSlug(t) === slug || tagSlug(t) === slug.replace(/-and-/g, "-"));
  if (tag) return { tag };
  const category = await db.category.findUnique({ where: { slug: LEGACY[slug] ?? slug } });
  if (category) return { category };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve((await params).slug);
  const title = r?.tag ?? r?.category?.name;
  return title ? { title, description: INTROS[title] ?? `Shop ${title} supplements and health products at Red23.` } : {};
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (["all", "all-products", "supplements", "shop-by-goal", "shop-by-body-part", "brand", "featured-products"].includes(slug)) redirect("/shop");
  const r = await resolve(slug);
  if (!r) notFound();
  const sp = await searchParams;
  if (r.category) redirect(`/shop?category=${r.category.slug}`);
  return <ShopView filters={{ tag: r.tag, sort: sp.sort, inStock: sp.inStock === "1" }} title={r.tag!} intro={INTROS[r.tag!]} basePath={`/collections/${slug}`} />;
}
