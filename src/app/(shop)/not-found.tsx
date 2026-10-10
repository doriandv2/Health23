import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl">We couldn&apos;t find that page</h1>
      <p className="mt-4 text-ink-soft">It may have moved, or the product is no longer available.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/shop" className="btn-primary">Shop all products</Link>
        <Link href="/" className="btn-outline">Go home</Link>
      </div>
    </div>
  );
}
