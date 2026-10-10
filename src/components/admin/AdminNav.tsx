"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BadgePercent, ExternalLink, Inbox, LayoutDashboard, Menu, Package, Repeat, ShoppingBag, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox, countKey: "inbox" as const },
];

function NavLinks({ inboxCount, onNavigate }: { inboxCount: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-ink text-white" : "text-ink-soft hover:bg-black/5 hover:text-ink",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.countKey === "inbox" && inboxCount > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums", active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700")}>
                  {inboxCount}
                  <span className="sr-only"> open items</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
      <li className="pt-2">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-black/5 hover:text-ink">
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          View store
        </Link>
      </li>
    </ul>
  );
}

export function AdminNav({ logo, inboxCount, adminName }: { logo: React.ReactNode; inboxCount: number; adminName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <div className="px-2">{logo}</div>
        <p className="mt-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Admin</p>
        <nav aria-label="Admin" className="mt-6 flex-1 overflow-y-auto">
          <NavLinks inboxCount={inboxCount} />
        </nav>
        <p className="truncate border-t border-line px-2 pt-4 text-xs text-ink-muted">Signed in as {adminName}</p>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          {logo}
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Admin</span>
        </div>
        <button type="button" className="btn-ghost btn-sm" aria-expanded={open} aria-controls="admin-mobile-nav" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      {open && (
        <nav id="admin-mobile-nav" aria-label="Admin" className="sticky top-[61px] z-20 animate-fade-in border-b border-line bg-white px-4 py-3 shadow-card lg:hidden">
          <NavLinks inboxCount={inboxCount} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </>
  );
}
