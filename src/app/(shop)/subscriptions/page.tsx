import type { Metadata } from "next";
import { CalendarClock, PackageCheck, PiggyBank, RefreshCw, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { productCardInclude } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";

export const metadata: Metadata = { title: "Subscribe & Save", description: "Save 10% and get free UK delivery on every repeat order. Skip, pause or cancel anytime." };

const FAQ = [
  ["Can I cancel anytime?", "Yes. There's no minimum term — cancel, pause or skip a delivery from your account in a couple of clicks."],
  ["When will I be charged?", "You pay for your first order today. After that you're charged on each delivery date at the subscriber price."],
  ["Can I change how often it arrives?", "Yes — switch between monthly, every 2 months or every 3 months at any time."],
  ["Is delivery really free?", "Yes. Every subscription order ships free by Royal Mail Tracked 48, whatever its value."],
];

export default async function SubscriptionsLanding() {
  const products = await db.product.findMany({ where: { status: "ACTIVE", subscribable: true, variants: { some: { stock: { gt: 0 } } } }, include: productCardInclude, take: 8, orderBy: { featured: "desc" } });
  return (
    <>
      <section className="bg-sage-200">
        <div className="container-x py-16 text-center lg:py-24">
          <p className="eyebrow text-sage-800">Subscribe &amp; save</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-5xl leading-tight sm:text-6xl">Never run out of the essentials that keep you going.</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">10% off every order, free delivery, and total flexibility.</p>
        </div>
      </section>
      <section className="container-x -mt-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [PiggyBank, "Save 10%", "On every subscription order, automatically."],
            [Truck, "Free delivery", "Every repeat order ships free."],
            [CalendarClock, "Your schedule", "Every 1, 2 or 3 months."],
            [RefreshCw, "Total control", "Skip, pause or cancel anytime."],
          ].map(([Icon, t, b]) => {
            const I = Icon as typeof Truck;
            return (
              <li key={t as string} className="card p-6">
                <I className="h-6 w-6 text-brand-500" />
                <p className="mt-4 font-semibold">{t as string}</p>
                <p className="mt-1 text-sm text-ink-soft">{b as string}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="container-x mt-20">
        <h2 className="mb-8 flex items-center gap-2 text-3xl"><PackageCheck className="h-7 w-7 text-sage-600" /> Popular to subscribe</h2>
        <ProductGrid products={products} />
      </section>
      <section className="container-x mt-20 max-w-3xl">
        <h2 className="text-3xl">Questions</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="cursor-pointer list-none font-semibold">{q}</summary>
              <p className="mt-2 text-sm text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
