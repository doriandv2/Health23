import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | Red23" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [openMessages, pendingAlerts] = await Promise.all([
    db.contactMessage.count({ where: { status: "OPEN" } }),
    // Alerts that can be actioned now: variant back in stock, nobody notified yet.
    db.stockAlert.count({ where: { notifiedAt: null, variant: { stock: { gt: 0 } } } }),
  ]);

  return (
    <div className="min-h-screen bg-[#F6F4EF] lg:flex">
      <AdminNav logo={<Logo className="h-8 w-auto" />} inboxCount={openMessages + pendingAlerts} adminName={admin.name || admin.email} />
      <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
