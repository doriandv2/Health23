import { z } from "zod";

/** Client-safe product form types and validation shared by ProductForm and its server action. */

export type ImageInput = { id?: string; url: string; alt: string };
export type VariantInput = { id?: string; title: string; sku: string; price: string; compareAt: string; stock: string };

export const ACCEPTED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** "12.50" / "£12.5" / "12" -> 1250 pence; null when blank; NaN when invalid. */
export function poundsToPence(v: string): number | null {
  const s = v.replace(/[£,\s]/g, "");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return Number.NaN;
  return Math.round(Number(s) * 100);
}

export function penceToPounds(p: number | null | undefined) {
  return p == null ? "" : (p / 100).toFixed(2);
}

const imageUrl = z
  .string()
  .trim()
  .min(1, "Image URL is required")
  .max(1000)
  .refine((v) => v.startsWith("/") || /^https?:\/\//i.test(v), "Use an https:// URL or a /path on this site");

export const imageSchema = z.object({ id: z.string().optional(), url: imageUrl, alt: z.string().trim().max(200).default("") });

export const variantSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(1, "Variant title is required").max(120),
    sku: z.string().trim().max(64),
    price: z.string(),
    compareAt: z.string(),
    stock: z.string(),
  })
  .transform((v, ctx) => {
    const pricePence = poundsToPence(v.price);
    const compareAtPence = poundsToPence(v.compareAt);
    const stock = v.stock.trim() === "" ? 0 : Number(v.stock);
    if (pricePence === null || Number.isNaN(pricePence) || pricePence <= 0) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price like 12.99" });
    if (compareAtPence !== null && Number.isNaN(compareAtPence)) ctx.addIssue({ code: "custom", path: ["compareAt"], message: "Enter a price like 15.99 or leave blank" });
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) ctx.addIssue({ code: "custom", path: ["stock"], message: "Stock must be a whole number ≥ 0" });
    return { id: v.id, title: v.title, sku: v.sku || null, pricePence: pricePence ?? 0, compareAtPence: compareAtPence && !Number.isNaN(compareAtPence) ? compareAtPence : null, stock };
  });

export const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only"),
  brand: z.string().trim().min(1, "Brand is required").max(120),
  categoryId: z.string().optional(),
  newCategory: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(40),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  featured: z.boolean(),
  subscribable: z.boolean(),
  subscriptionDiscountPct: z.coerce.number().int("Whole number").min(0, "0–50").max(50, "0–50"),
  seoTitle: z.string().trim().max(70, "Keep SEO titles under 70 characters").optional(),
  seoDescription: z.string().trim().max(170, "Keep SEO descriptions under 170 characters").optional(),
  descriptionHtml: z.string().max(100_000),
  images: z.array(imageSchema).max(20, "Up to 20 images"),
  variants: z.array(variantSchema).min(1, "Add at least one variant").max(50),
});
