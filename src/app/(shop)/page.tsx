import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, PackageCheck, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { listProducts, productCardInclude } from "@/lib/catalog";
import { formatDate } from "@/lib/utils";
import { ProductGrid } from "@/components/product/ProductCard";
import { TrustBadges } from "@/components/product/TrustBadges";
import { Stars } from "@/components/ui";

const TESTIMONIALS = [
  { quote: "I have been using this company for a couple of years to buy body ecology (amazing) products that actually work! I've had the odd delayed delivery but nothing longer than a week.", name: "Kim Thompson", city: "London" },
  { quote: "Excellent service - one of the most reliable and professional companies we deal with. We have been buying from Red23 for several years and have only praise for the consistency of great service. Highly recommended.", name: "Helen Bingham", city: "Brighton" },
  { quote: "Great products and love discovering new stuff every time I visit the site. Never had a problem with delivery.", name: "Tom Dean", city: "Leeds" },
  { quote: "I have known Red23 for 10 years. I find they have the best products and are a down-to-earth local business, great to deal with.", name: "Matthew Stockwell", city: "Barnet" },
];

const TILES = [
  { title: "Supplements", body: "Vitamins, minerals, aminos & more", href: "/shop", img: "/images/site/cat-supplements.png" },
  { title: "Organic Foods", body: "Superfoods & whole-food nutrition", href: "/shop?category=superfoods", img: "/images/site/cat-organic.jpg" },
  { title: "Shop by Goal", body: "Detox, Energy & Exercise, Keto, Sleep, Vegan", href: "/collections/energy-and-exercise", img: "/images/site/cat-goal.png" },
  { title: "Shop by Function", body: "Brain, Digestion, Heart, Joints, Liver, Thyroid", href: "/collections/brain", img: "/images/site/cat-function.png" },
];

export default async function HomePage() {
  const [all, protein, posts] = await Promise.all([
    listProducts(),
    db.product.findMany({ where: { status: "ACTIVE", category: { slug: "protein-and-aminos" } }, include: productCardInclude, take: 4 }),
    db.blogPost.findMany({ orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);
  const bestsellers = all.filter((p) => p.variants.some((v) => v.stock > 0)).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow">Elite health products</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl">
              We do the hard work, <em className="font-normal italic text-brand-500">so you don&apos;t have to.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-ink-soft">
              The finest natural health products to promote, enhance and optimise a natural and holistic lifestyle — researched and tested by our in-house nutrition team.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary px-7 py-4 text-base">Shop all products <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/subscriptions" className="btn-outline px-7 py-4 text-base"><RefreshCw className="h-4 w-4" /> Subscribe &amp; save 10%</Link>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-ink-soft">
              <Stars /> <span>Trusted by customers for over 10 years</span>
            </div>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] lg:aspect-square">
              <Image src="/images/site/hero-1.jpg" alt="Woman practising yoga at home" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 left-4 hidden rounded-2xl bg-white p-4 shadow-lift sm:block lg:-left-8">
              <p className="text-xs text-ink-muted">Free UK delivery</p>
              <p className="font-display text-lg">On orders over £150</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="container-x mt-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link key={t.title} href={t.href} className="group relative overflow-hidden rounded-3xl bg-sage-100">
              <div className="relative aspect-square">
                <Image src={t.img} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent p-4 pt-16 text-white sm:p-5 sm:pt-20">
                <p className="font-display text-xl sm:text-2xl">{t.title}</p>
                <p className="mt-1 hidden text-xs text-white/80 sm:block">{t.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="container-x mt-24">
        <SectionHead eyebrow="Customer favourites" title="Shop bestsellers" href="/shop" />
        <ProductGrid products={bestsellers} />
      </section>

      {/* Subscribe & save */}
      <section className="container-x mt-24">
        <div className="grid overflow-hidden rounded-[2rem] bg-sage-200 lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="eyebrow text-sage-800">Subscribe &amp; save</p>
            <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">Your essentials, on repeat.</h2>
            <p className="mt-4 max-w-md text-ink-soft">Save 10% on every order, get free delivery and never run out. Choose monthly, every 2 or every 3 months.</p>
            <ol className="mt-8 space-y-5">
              {[
                [PackageCheck, "Pick your products", "Choose “Subscribe & save” on any eligible product."],
                [CalendarClock, "Set your schedule", "Deliveries every 1, 2 or 3 months — change it anytime."],
                [RefreshCw, "Skip, pause or cancel", "Manage everything from your account. No commitment."],
              ].map(([Icon, title, body]) => {
                const I = Icon as typeof PackageCheck;
                return (
                  <li key={title as string} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white"><I className="h-5 w-5 text-sage-700" /></span>
                    <div><p className="font-semibold">{title as string}</p><p className="text-sm text-ink-soft">{body as string}</p></div>
                  </li>
                );
              })}
            </ol>
            <Link href="/subscriptions" className="btn-dark mt-10">How subscriptions work</Link>
          </div>
          <div className="relative min-h-72">
            <Image src="/images/site/hero-2.jpg" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* KA-EX feature */}
      <section className="container-x mt-24">
        <div className="grid items-center gap-8 rounded-[2rem] bg-ink p-8 text-white sm:p-12 lg:grid-cols-[1fr_1.1fr] lg:p-16">
          <div>
            <p className="eyebrow text-brand-300">Proud stockists of</p>
            <h2 className="mt-3 text-5xl">KA-EX®</h2>
            <p className="mt-4 max-w-md text-lg text-white/80">The world&apos;s first fast-acting cortisol stress reducer for athletes &amp; high-performers.</p>
            <Link href="/shop?brand=KA-EX" className="btn-primary mt-8">Shop KA-EX <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-white/5">
            <Image src="/images/site/kaex-banner.png" alt="KA-EX recharge drinks" fill sizes="(min-width:1024px) 40vw, 90vw" className="object-contain p-6" />
          </div>
        </div>
      </section>

      {protein.length > 0 && (
        <section className="container-x mt-24">
          <SectionHead eyebrow="Build & recover" title="Protein & Aminos" href="/shop?category=protein-and-aminos" />
          <ProductGrid products={protein} />
        </section>
      )}

      {/* About */}
      <section className="container-x mt-24 grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] sm:aspect-[4/3] lg:aspect-[4/5]">
          <Image src="/images/site/about.jpg" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div>
          <p className="eyebrow">About Red23</p>
          <h2 className="mt-3 text-4xl leading-tight">Meticulously researched. Carefully chosen.</h2>
          <div className="mt-6 space-y-4 text-ink-soft">
            <p>Here at Red23 HQ, our in house nutrition team have been working hard researching and testing new products to bring our valued customers the best available products on the market.</p>
            <p>With today&apos;s hectic lifestyle, with everything from long working hours, family commitments and personal health issues… to amateur and professional athletes, we appreciate our need to supplement this lifestyle.</p>
            <p>We are lucky to live in a time with such advancements in Science, Medicine and Nutrition, that we get to benefit from the products available to us and as easy as a click of a button.</p>
            <p>We meticulously research our products, their processes and suppliers to ensure we are offering our customers the best products available.</p>
          </div>
          <p className="mt-6 font-display text-xl italic text-brand-600">Our motto is… We do the hard work, so you don&apos;t have to!</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-24 bg-white py-20">
        <div className="container-x">
          <h2 className="text-center text-3xl sm:text-4xl">What our customers are saying</h2>
          <div className="no-scrollbar -mx-4 mt-12 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-4">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="w-[85%] shrink-0 snap-center rounded-3xl bg-cream p-6 md:w-auto">
                <Stars />
                <blockquote className="mt-4 text-sm leading-6 text-ink-soft">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 text-sm"><span className="font-semibold">{t.name}</span><span className="text-ink-muted"> · {t.city}</span></figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-14"><TrustBadges /></div>
        </div>
      </section>

      {/* Blog */}
      {posts.length > 0 && (
        <section className="container-x mt-24">
          <SectionHead eyebrow="Journal" title="Our latest blogs" href="/blog" />
          <div className="grid gap-6 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card group p-6 transition hover:shadow-lift">
                <p className="text-xs text-ink-muted">{formatDate(p.publishedAt)}</p>
                <h3 className="mt-2 text-xl leading-snug group-hover:text-brand-600">{p.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{p.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Read more <ArrowRight className="h-3.5 w-3.5" /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionHead({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-3xl sm:text-4xl">{title}</h2>
      </div>
      <Link href={href} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ink hover:text-brand-600 sm:inline-flex">View all <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
