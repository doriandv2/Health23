import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const user = await getCurrentUser();
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : null;
  const { cancelled } = await searchParams;
  return (
    <CheckoutForm
      demoMode={!stripeEnabled}
      cancelled={cancelled === "1"}
      user={user ? { email: user.email, name: user.name ?? "", phone: user.phone ?? "", hasPassword: Boolean(user.passwordHash) } : null}
      savedAddress={address ? { name: address.name, line1: address.line1, line2: address.line2 ?? "", city: address.city, postcode: address.postcode, phone: address.phone ?? "" } : null}
    />
  );
}
