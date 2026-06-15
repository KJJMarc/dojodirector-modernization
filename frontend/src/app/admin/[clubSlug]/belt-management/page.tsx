import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { BeltManagementView } from "@/components/admin/belt-system-manager-view";
import { AppHeader } from "@/components/layout/app-header";
import { getBeltSystemManagerPageData } from "@/lib/admin-belt-management.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface BeltManagementPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: BeltManagementPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Belt Management`,
    description: `Manage belt systems and progression rules for ${club.name}.`,
  };
}

export default async function BeltManagementPage({ params }: BeltManagementPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { systems } = await getBeltSystemManagerPageData(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Belt Management" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Belt Systems
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Manage belt systems, grading structures and progression rules.
          </p>
        </div>

        <BeltManagementView clubSlug={club.slug} systems={systems} />
      </section>
    </main>
  );
}
