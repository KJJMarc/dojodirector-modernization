import type { Metadata } from "next";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminSummaryCards } from "@/components/admin/admin-summary-cards";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";

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
      <AdminSummaryCards stats={stats} />
      <AdminQuickActions />
    </main>
  );
}
