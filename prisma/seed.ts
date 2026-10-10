/**
 * Seeds the catalogue imported from red23.co.uk (products, blog, policies)
 * plus the first admin. Pass --demo to also generate sample customers,
 * orders, subscriptions and analytics events so the admin dashboard has data.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import products from "./seed-data/products.json";
import posts from "./seed-data/posts.json";
import pages from "./seed-data/pages.json";

const db = new PrismaClient();
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CATEGORY_ORDER = [
  "Protein & Aminos", "Energy & Exercise", "Digestive Support", "Vitamins & Minerals", "Healthy Oils & Omega 3",
  "Specialty Nutrients", "Meal Replacements", "Superfoods", "Herbal & Botanical", "Sleep & Recovery",
  "Dental Care", "Pet Health", "Wellness Accessories",
];

async function seedCatalogue() {
  const names = [...new Set(products.map((p) => p.category))];
  const categoryIds = new Map<string, string>();
  for (const name of names) {
    const position = CATEGORY_ORDER.indexOf(name);
    const c = await db.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { slug: slugify(name), name, position: position < 0 ? 99 : position },
    });
    categoryIds.set(name, c.id);
  }

  for (const p of products) {
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await db.product.create({
      data: {
        slug: p.slug,
        legacyHandle: p.legacyHandle,
        title: p.title,
        brand: p.brand,
        categoryId: categoryIds.get(p.category),
        tags: p.tags.join(","),
        descriptionHtml: p.descriptionHtml,
        featured: p.featured,
        subscribable: p.subscribable,
        images: { create: p.images.map((im, i) => ({ url: im.url, alt: im.alt, position: i })) },
        variants: { create: p.variants.map((v) => ({ title: v.title, sku: v.sku, pricePence: v.pricePence, compareAtPence: v.compareAtPence, stock: v.stock, position: v.position })) },
      },
    });
  }

  for (const post of posts) {
    await db.blogPost.upsert({ where: { slug: post.slug }, update: {}, create: { ...post, publishedAt: new Date(post.publishedAt) } });
  }
  for (const [slug, page] of Object.entries(pages)) {
    await db.page.upsert({ where: { slug }, update: {}, create: { slug, ...page } });
  }
  await db.discountCode.upsert({ where: { code: "WELCOME10" }, update: {}, create: { code: "WELCOME10", type: "PERCENT", value: 10 } });

  const email = (process.env.ADMIN_EMAIL || "admin@red23.co.uk").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "change-me-admin";
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name: "Red23 Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10), source: "admin" },
  });
  console.log(`Catalogue: ${products.length} products, ${posts.length} posts. Admin: ${email}`);
}

// ---------- demo data ----------
const FIRST = ["Kim", "Helen", "Tom", "Matthew", "Sarah", "James", "Priya", "Oliver", "Amelia", "Noah", "Grace", "Leo", "Chloe", "Ethan", "Isla", "Jack", "Ava", "Harry", "Mia", "George", "Ruby", "Oscar", "Freya", "Alfie", "Zara", "Theo", "Lily", "Arthur", "Poppy", "Finn"];
const LAST = ["Thompson", "Bingham", "Dean", "Stockwell", "Patel", "Smith", "Jones", "Taylor", "Brown", "Wilson", "Evans", "Walker", "Wright", "Hughes", "Green", "Hall", "Clarke", "Khan", "Lewis", "Young"];
const CITIES = [["London", "N1 9GU"], ["Brighton", "BN1 1AA"], ["Leeds", "LS1 4AP"], ["Barnet", "EN5 5TH"], ["Chelmsford", "CM1 1HT"], ["Manchester", "M1 1AE"], ["Bristol", "BS1 4DJ"], ["Cambridge", "CB2 1TN"]];

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000 - Math.floor(rand() * 86400000));

async function seedDemo() {
  if (await db.user.count({ where: { email: { endsWith: "@example.com" } } })) {
    console.log("Demo data already present — skipping.");
    return;
  }
  const variants = await db.variant.findMany({ where: { stock: { gt: 0 } }, include: { product: { include: { images: { take: 1 } } } } });
  const all = await db.variant.findMany({ include: { product: true } });

  for (let i = 0; i < 60; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const [city, postcode] = pick(CITIES);
    const createdAt = daysAgo(Math.floor(rand() * 180));
    const user = await db.user.create({
      data: {
        email: `${name.toLowerCase().replace(" ", ".")}.${i}@example.com`,
        name, createdAt, marketingOptIn: rand() > 0.4,
        source: pick(["checkout", "checkout", "newsletter", "website"]),
        lastSeenAt: daysAgo(Math.floor(rand() * 30)),
      },
    });
    const orderCount = rand() < 0.25 ? 0 : 1 + Math.floor(rand() * 4);
    for (let o = 0; o < orderCount; o++) {
      const lines = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pick(variants));
      const subtotal = lines.reduce((s, v) => s + v.pricePence, 0);
      const shipping = subtotal >= 15000 ? 0 : 595;
      const at = new Date(createdAt.getTime() + rand() * (Date.now() - createdAt.getTime()));
      await db.order.create({
        data: {
          userId: user.id, email: user.email, status: pick(["DELIVERED", "DELIVERED", "SHIPPED", "PAID", "FULFILLED"]),
          subtotalPence: subtotal, shippingPence: shipping, totalPence: subtotal + shipping,
          shipName: name, shipLine1: `${1 + Math.floor(rand() * 120)} High Street`, shipCity: city, shipPostcode: postcode,
          createdAt: at, paidAt: at,
          items: { create: lines.map((v) => ({ productId: v.productId, variantId: v.id, title: v.product.title, variantTitle: v.title, imageUrl: v.product.images[0]?.url, unitPence: v.pricePence, quantity: 1 })) },
        },
      });
      await db.event.create({ data: { type: "order_completed", userId: user.id, valuePence: subtotal + shipping, createdAt: at } });
    }
    if (orderCount > 0 && rand() < 0.35) {
      const v = pick(variants.filter((x) => x.product.subscribable));
      const interval = pick([1, 1, 2, 3]);
      const status = pick(["ACTIVE", "ACTIVE", "ACTIVE", "PAUSED", "CANCELLED"]);
      await db.subscription.create({
        data: {
          userId: user.id, status, intervalMonths: interval, nextChargeAt: new Date(Date.now() + rand() * interval * 30 * 86400000),
          shipName: name, shipLine1: "12 High Street", shipCity: city, shipPostcode: postcode, createdAt: daysAgo(Math.floor(rand() * 120)),
          cancelledAt: status === "CANCELLED" ? daysAgo(Math.floor(rand() * 20)) : null,
          items: { create: [{ variantId: v.id, quantity: 1, unitPence: Math.round(v.pricePence * 0.9) }] },
        },
      });
    }
    const ltv = (await db.order.aggregate({ where: { userId: user.id }, _sum: { totalPence: true } }))._sum.totalPence ?? 0;
    await db.user.update({ where: { id: user.id }, data: { crmStatus: orderCount === 0 ? "LEAD" : ltv >= 50000 ? "VIP" : "CUSTOMER" } });
  }

  // Traffic for the last 30 days: page views → product views → carts → checkouts.
  const events: { type: string; visitorId: string; path?: string; productId?: string; createdAt: Date; referrer?: string }[] = [];
  for (let d = 0; d < 30; d++) {
    const visitors = 25 + Math.floor(rand() * 30) + (d < 7 ? 10 : 0);
    for (let v = 0; v < visitors; v++) {
      const vid = `demo-${d}-${v}`;
      const at = daysAgo(d);
      const ref = pick(["instagram.com", "google.com", "google.com", "", "", "facebook.com"]);
      events.push({ type: "page_view", visitorId: vid, path: "/", createdAt: at, referrer: ref || undefined });
      if (rand() < 0.6) {
        const p = pick(all);
        events.push({ type: "page_view", visitorId: vid, path: `/products/${p.product.slug}`, createdAt: at });
        events.push({ type: "product_view", visitorId: vid, productId: p.productId, createdAt: at });
        if (rand() < 0.3) {
          events.push({ type: "add_to_cart", visitorId: vid, productId: p.productId, createdAt: at });
          if (rand() < 0.5) events.push({ type: "checkout_started", visitorId: vid, createdAt: at });
        }
      }
    }
  }
  await db.event.createMany({ data: events });
  console.log(`Demo data: 60 customers, ${events.length} events.`);
}

seedCatalogue()
  .then(() => (process.argv.includes("--demo") ? seedDemo() : undefined))
  .finally(() => db.$disconnect());
