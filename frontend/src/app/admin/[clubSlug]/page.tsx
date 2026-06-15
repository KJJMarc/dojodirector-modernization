import type { Metadata } from "next";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminSummaryCards } from "@/components/admin/admin-summary-cards";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAdminPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubAdminPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Admin`,
    description: `Club admin dashboard for ${club.name}.`,
  };
}

export default async function ClubAdminPage({ params }: ClubAdminPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const stats = await getAdminDashboardStats(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Admin Dashboard" clubName={club.name} />

      <AdminSummaryCards stats={stats} />
      <AdminQuickActions clubSlug={club.slug} />
    </main>
  );
}
