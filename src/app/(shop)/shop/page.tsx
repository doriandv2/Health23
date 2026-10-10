import type { Metadata } from "next";
import { ShopView } from "@/components/product/ShopView";
import { track } from "@/lib/track";

export const metadata: Metadata = { title: "Shop all products", description: "Natural health supplements, superfoods and wellness essentials, researched and tested by the Red23 nutrition team." };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = { q: sp.q?.slice(0, 80), category: sp.category, tag: sp.tag, brand: sp.brand, sort: sp.sort, inStock: sp.inStock === "1" };
  if (filters.q) await track({ type: "search", path: "/shop", meta: { q: filters.q } });
  const title = filters.q ? `Results for “${filters.q}”` : filters.tag ?? filters.brand ?? "All products";
  return <ShopView filters={filters} title={title} intro={filters.q || filters.tag || filters.brand ? undefined : "The finest natural health products to promote, enhance and optimise a natural and holistic lifestyle."} />;
}
