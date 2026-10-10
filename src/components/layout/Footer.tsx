import Link from "next/link";
import { Mail } from "lucide-react";
import { SITE } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/forms/NewsletterForm";

const PAYMENT = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", "PayPal"];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo className="h-12 w-auto" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-soft">
            The finest natural health products to promote, enhance and optimise a natural and holistic lifestyle. We do the hard work, so you don&apos;t have to.
          </p>
          <div className="mt-5 flex gap-2">
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line p-2.5 hover:border-ink/30" aria-label="Red23 on Instagram"><InstagramIcon /></a>
            <a href={`mailto:${SITE.email}`} className="rounded-full border border-line p-2.5 hover:border-ink/30" aria-label="Email Red23"><Mail className="h-4 w-4" /></a>
          </div>
        </div>
        <FooterCol title="Shop" links={[["All products", "/shop"], ["Protein & Aminos", "/shop?category=protein-and-aminos"], ["Energy & Exercise", "/shop?category=energy-and-exercise"], ["Digestive Support", "/shop?category=digestive-support"], ["Subscribe & Save", "/subscriptions"]]} />
        <FooterCol title="Help" links={[["Contact us", "/contact"], ["Shipping policy", "/pages/shipping-policy"], ["Refund policy", "/pages/refund-policy"], ["Privacy policy", "/pages/privacy-policy"], ["Terms of service", "/pages/terms-of-service"]]} />
        <div className="lg:col-span-4">
          <p className="text-sm font-semibold">Sign up and save</p>
          <p className="mt-2 text-sm text-ink-soft">Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.</p>
          <NewsletterForm className="mt-4" />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-6 text-xs text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Red23 Elite Health Products | {SITE.legalName}</p>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Accepted payment methods">
            {PAYMENT.map((p) => <li key={p} className="rounded-md border border-line px-2 py-1 font-medium text-ink-soft">{p}</li>)}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="lg:col-span-2">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-ink-soft hover:text-ink">{label}</Link></li>)}
      </ul>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
