import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { crmTone, humanize, orderTone, productTone, subTone } from "@/lib/admin/format";

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-ink-muted hover:text-ink">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="truncate text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-sans text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Horizontally scrollable table container. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      {/* relative: keeps absolutely-positioned sr-only cells inside the scroller */}
      <div className="relative overflow-x-auto">
        <table className="admin-table w-full min-w-[720px] border-collapse text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export const th = "whitespace-nowrap border-b border-line bg-cream/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted";
export const td = "border-b border-line/70 px-4 py-3 align-middle";

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={orderTone(status)}>{humanize(status)}</Badge>;
}
export function CrmBadge({ status }: { status: string }) {
  return <Badge tone={crmTone(status)}>{status === "VIP" ? "VIP" : humanize(status)}</Badge>;
}
export function SubStatusBadge({ status }: { status: string }) {
  return <Badge tone={subTone(status)}>{humanize(status)}</Badge>;
}
export function ProductStatusBadge({ status }: { status: string }) {
  return <Badge tone={productTone(status)}>{humanize(status)}</Badge>;
}
export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge tone="red">Out of stock</Badge>;
  if (stock <= 5) return <Badge tone="amber">{stock} left</Badge>;
  return <span className="tabular-nums">{stock}</span>;
}

export function Thumb({ src, alt, size = 40 }: { src?: string | null; alt: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-cream" style={{ width: size, height: size }}>
      {src ? (
        // Admin thumbnails can be any uploaded/external URL, so a plain img avoids next/image remote config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} width={size} height={size} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-ink-muted" aria-hidden>
          —
        </span>
      )}
    </span>
  );
}

export function Pagination({ page, pageCount, total, hrefFor }: { page: number; pageCount: number; total: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return <p className="mt-3 text-xs text-ink-muted">{total} result{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-xs text-ink-muted">
        Page {page} of {pageCount} · {total} results
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="btn-outline btn-sm" rel="prev">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
          </Link>
        ) : (
          <span className="btn-outline btn-sm pointer-events-none opacity-40" aria-disabled>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
          </span>
        )}
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} className="btn-outline btn-sm" rel="next">
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : (
          <span className="btn-outline btn-sm pointer-events-none opacity-40" aria-disabled>
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

/** A GET form row for list filters. Children are labelled controls. */
export function FilterBar({ children, resetHref }: { children: React.ReactNode; resetHref?: string }) {
  return (
    <form method="get" role="search" className="mb-4 flex flex-wrap items-end gap-3">
      {children}
      <div className="flex gap-2">
        <button type="submit" className="btn-dark btn-sm h-[38px]">
          Apply
        </button>
        {resetHref && (
          <Link href={resetHref} className="btn-ghost btn-sm h-[38px]">
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}

export const filterInput = "input h-[38px] py-2";

export function FilterField({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-[140px]", className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}

export function StatPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: React.ReactNode }) {
  const tones = { info: "border-sky-200 bg-sky-50 text-sky-900", success: "border-emerald-200 bg-emerald-50 text-emerald-900", error: "border-red-200 bg-red-50 text-red-800" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}
