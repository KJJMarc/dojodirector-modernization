import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { ClassMetricsView } from "@/components/admin/class-metrics-view";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminClassMetricsPageData } from "@/lib/admin-class-metrics.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClassDataPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClassDataPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Class Data`,
    description: `Class performance and attendance metrics for ${club.name}.`,
  };
}

export default async function ClassDataPage({ params }: ClassDataPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const data = await getAdminClassMetricsPageData(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Class Data" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Class metrics
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-dojo-muted">
          Understand class popularity, instructor performance, no-shows, and
          attendance trends from bookings and register data.
        </p>
      </section>

      <ClassMetricsView clubSlug={club.slug} data={data} />
    </main>
  );
}
