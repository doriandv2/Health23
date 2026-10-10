import type { Metadata } from "next";
import { RegisterForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; email?: string; order?: string; token?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <div className="container-x max-w-md py-16">
      <h1 className="text-center text-4xl">Create your account</h1>
      <p className="mt-2 text-center text-ink-soft">Faster checkout, order tracking and subscription management.</p>
      <div className="card mt-8 p-6 sm:p-8"><RegisterForm {...sp} /></div>
    </div>
  );
}
