"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export type NavGroup = { title: string; href: string; links: { label: string; href: string }[] };

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className="relative rounded-full p-2.5 hover:bg-black/5" aria-label={`Open basket, ${count} item${count === 1 ? "" : "s"}`}>
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">{count}</span>}
    </button>
  );
}

export function SearchBox({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search products, brands, goals…" aria-label="Search products" className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm placeholder:text-ink-muted focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100" />
    </form>
  );
}

export function DesktopNav({ groups }: { groups: NavGroup[] }) {
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {groups.map((g) => (
          <li key={g.title} className="group relative">
            <Link href={g.href} className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft hover:bg-black/5 hover:text-ink">
              {g.title}
              {g.links.length > 0 && <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" />}
            </Link>
            {g.links.length > 0 && (
              <div className="invisible absolute left-0 top-full z-40 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <ul className="grid w-max min-w-56 grid-cols-1 gap-0.5 rounded-2xl border border-line bg-white p-2 shadow-lift" style={{ gridTemplateColumns: g.links.length > 8 ? "repeat(2, minmax(0, 1fr))" : undefined }}>
                  {g.links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-sage-50 hover:text-ink">{l.label}</Link></li>
                  ))}
                  <li className="col-span-full mt-1 border-t border-line pt-1"><Link href={g.href} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">View all →</Link></li>
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function MobileMenu({ groups, signedIn }: { groups: NavGroup[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full p-2.5 hover:bg-black/5 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-cream p-5 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-xl">Menu</span>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-black/5" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <SearchBox className="mb-4" />
            <nav aria-label="Mobile" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
              {groups.map((g) => (
                <details key={g.title} className="border-b border-line py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-medium">
                    {g.title}
                    {g.links.length > 0 && <ChevronDown className="h-4 w-4" />}
                  </summary>
                  <ul className="pb-3 pl-2">
                    <li><Link href={g.href} className="block py-2 text-sm font-semibold text-brand-600">View all</Link></li>
                    {g.links.map((l) => <li key={l.href}><Link href={l.href} className="block py-2 text-sm text-ink-soft">{l.label}</Link></li>)}
                  </ul>
                </details>
              ))}
              <Link href="/blog" className="block border-b border-line py-4 font-medium">Blog</Link>
              <Link href="/contact" className="block border-b border-line py-4 font-medium">Contact us</Link>
              <Link href={signedIn ? "/account" : "/login"} className="mt-4 flex items-center gap-2 py-3 font-medium"><User className="h-4 w-4" /> {signedIn ? "My account" : "Log in"}</Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
