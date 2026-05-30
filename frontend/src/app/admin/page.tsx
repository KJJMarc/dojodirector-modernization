import type { Metadata } from "next";
import Link from "next/link";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminSummaryCards } from "@/components/admin/admin-summary-cards";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Admin",
  description: "Dojo Director admin dashboard.",
};

export default async function AdminPage() {
  const stats = await getAdminDashboardStats();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Admin Dashboard" />

      <div className="flex justify-end">
        <Link
          href="/super-admin"
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Super Admin
        </Link>
      </div>

      <AdminSummaryCards stats={stats} />
      <AdminQuickActions clubSlug={KINGSTON_CLUB_SLUG} />
    </main>
  );
}
