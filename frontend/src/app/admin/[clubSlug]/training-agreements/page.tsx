import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { TrainingAgreementsOverview } from "@/components/admin/training-agreements-overview";
import { AppHeader } from "@/components/layout/app-header";
import {
  CLUB_AGREEMENT_TEMPLATES_NOT_CONFIGURED_MESSAGE,
  loadTrainingAgreementsAdminOverview,
} from "@/lib/club-agreement-templates.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface TrainingAgreementsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: TrainingAgreementsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Training Agreements`,
    description: `Manage agreement templates for ${club.name}.`,
  };
}

export default async function TrainingAgreementsPage({
  params,
}: TrainingAgreementsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { templatesTableAvailable, cards } =
    await loadTrainingAgreementsAdminOverview(club.id, club.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Training Agreements" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Manage agreement templates used when members sign in to the student portal
        and when guests book through the public booking page.
      </p>

      {!templatesTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {CLUB_AGREEMENT_TEMPLATES_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <TrainingAgreementsOverview cards={cards} />
      )}
    </main>
  );
}
