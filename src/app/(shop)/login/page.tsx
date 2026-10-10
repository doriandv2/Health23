import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-x max-w-md py-16">
      <h1 className="text-center text-4xl">Welcome back</h1>
      <p className="mt-2 text-center text-ink-soft">Log in to track orders and manage subscriptions.</p>
      <div className="card mt-8 p-6 sm:p-8"><LoginForm next={next} /></div>
    </div>
  );
}
