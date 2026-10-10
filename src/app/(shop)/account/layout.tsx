import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-2 text-4xl">Hello{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Account">
          <Link href="/account" className="btn-ghost">Overview</Link>
          <Link href="/account/subscriptions" className="btn-ghost">Subscriptions</Link>
          {user.role === "ADMIN" && <Link href="/admin" className="btn-ghost">Admin</Link>}
          <form action="/logout" method="post"><button className="btn-ghost">Log out</button></form>
        </nav>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
