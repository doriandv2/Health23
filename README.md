# Red23 — Elite Health Products

A rebuild of [red23.co.uk](https://red23.co.uk) (previously Shopify) as a Next.js store with
subscriptions, a CRM and an admin back office.

## What's inside

**Storefront**: all 39 live products from the Shopify store, with their original descriptions,
images, prices and variants. Also the blog, the policy pages and the homepage copy and testimonials.
- Product pages: gallery, variant picker, **one-time vs Subscribe & Save** selector, "Buy it now",
  stock urgency, sticky add-to-cart on mobile, trust badges, related products, JSON-LD.
- Slide-out basket with a free-delivery progress bar, per-line subscribe toggle and server-validated prices.
- One-page checkout: guest or account, UK postcode validation, Royal Mail / DPD delivery options,
  discount codes, then Stripe Checkout (cards, Apple Pay, Google Pay).
- Shop page filters by category, goal, function and brand, plus search, sort and in-stock only.
- Old Shopify URLs (`/products/<handle>`, `/collections/…`, `/blogs/news/…`, `/policies/…`) redirect.

**Subscriptions**: every 1, 2 or 3 months, 10% off (set per product) and free delivery. Customers
can skip, pause, resume, change frequency or quantity, and cancel (with a reason) from `/account/subscriptions`.

**Admin** (`/admin`):
- Dashboard: revenue, orders, AOV, visitors, conversion, MRR, funnel, traffic sources and stock alerts.
- CRM covering every contact (customers, guest buyers, newsletter leads), with lifecycle status, tags,
  notes, an activity timeline and CSV export.
- Product management, orders, subscriptions, discount codes, and an inbox for contact messages and back-in-stock requests.

## Running locally

```bash
cp .env.example .env        # then set AUTH_SECRET
npm install
npm run db:push             # create the SQLite database
npm run db:seed:demo        # catalogue + admin + sample customers/orders/traffic
npm run dev
```

Admin login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (default `admin@red23.co.uk` / `change-me-admin`).
Use `npm run db:seed` instead of `db:seed:demo` to get the real catalogue without sample data
(sample customers all use `@example.com` emails).

## Payments

Without `STRIPE_SECRET_KEY`, checkout runs in **demo mode**: a stand-in payment page marks orders
as paid, and the admin can run subscription renewals by hand. To take real payments:

1. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_SITE_URL`.
2. Point a Stripe webhook at `/api/webhooks/stripe` with `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.updated` and `customer.subscription.deleted`, and set `STRIPE_WEBHOOK_SECRET`.
   Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Stripe then bills renewals, and each paid renewal invoice creates an order.

## Production notes

- Switch `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL`.
- Admin image uploads go to `public/uploads/`. On serverless hosts, swap this for object storage (S3/R2/Vercel Blob).
- No email provider is wired up yet. Order confirmations, back-in-stock notifications and password reset need one (e.g. Resend or Postmark).
- Stock levels came across as 25 for in-stock items and 0 for sold-out ones, because Shopify's public data
  doesn't expose real quantities. Set real numbers in the admin before launch.

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS · Prisma · Stripe.
