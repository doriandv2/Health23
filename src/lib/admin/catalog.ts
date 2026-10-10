import "server-only";
import { db } from "@/lib/db";

/** Options for the product form's category select and brand autocomplete. */
export async function productFormOptions() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.product.findMany({ distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
  ]);
  return { categories, brands: brands.map((b) => b.brand).filter(Boolean) };
}
