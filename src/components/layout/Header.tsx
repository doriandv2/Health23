import Link from "next/link";
import { User } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { FUNCTIONS, GOALS, tagSlug } from "@/lib/taxonomy";
import { Logo } from "@/components/Logo";
import { CartButton, DesktopNav, MobileMenu, SearchBox, type NavGroup } from "./HeaderClient";

export async function Header() {
  const [categories, brands, session] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" }, where: { products: { some: { status: "ACTIVE" } } } }),
    db.product.groupBy({ by: ["brand"], where: { status: "ACTIVE" }, orderBy: { brand: "asc" } }),
    getSession(),
  ]);

  const groups: NavGroup[] = [
    { title: "Shop", href: "/shop", links: categories.map((c) => ({ label: c.name, href: `/shop?category=${c.slug}` })) },
    { title: "Shop by Goal", href: "/shop", links: GOALS.map((g) => ({ label: g, href: `/collections/${tagSlug(g)}` })) },
    { title: "Shop by Function", href: "/shop", links: FUNCTIONS.map((g) => ({ label: g, href: `/collections/${tagSlug(g)}` })) },
    { title: "Brands", href: "/shop", links: brands.map((b) => ({ label: b.brand, href: `/shop?brand=${encodeURIComponent(b.brand)}` })) },
  ];

  return (
    <>
      <div className="bg-ink text-white">
        <div className="container-x flex h-9 items-center justify-center gap-6 text-xs">
          <p><strong className="font-semibold">Free UK delivery</strong> on orders over £150</p>
          <span className="hidden text-white/30 sm:inline">|</span>
          <p className="hidden sm:block">Subscribe &amp; save 10% + free delivery on every repeat order</p>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/75">
        <div className="container-x flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
          <MobileMenu groups={groups} signedIn={Boolean(session)} />
          <Logo className="h-9 w-auto lg:h-11" />
          <DesktopNav groups={groups} />
          <div className="ml-auto flex items-center gap-1">
            <SearchBox className="mr-2 hidden w-64 xl:block" />
            <Link href="/shop" className="rounded-full p-2.5 hover:bg-black/5 xl:hidden" aria-label="Search"><SearchIcon /></Link>
            <Link href={session ? (session.role === "ADMIN" ? "/admin" : "/account") : "/login"} className="hidden rounded-full p-2.5 hover:bg-black/5 sm:block" aria-label={session ? "My account" : "Log in"}>
              <User className="h-5 w-5" />
            </Link>
            <CartButton />
          </div>
        </div>
      </header>
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
