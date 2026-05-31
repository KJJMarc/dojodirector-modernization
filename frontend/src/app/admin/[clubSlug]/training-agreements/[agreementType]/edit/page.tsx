import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainingAgreementEditForm } from "@/components/admin/training-agreement-edit-form";
import { AppHeader } from "@/components/layout/app-header";
import {
  CLUB_AGREEMENT_TEMPLATES_NOT_CONFIGURED_MESSAGE,
  loadClubAgreementTemplateForEdit,
} from "@/lib/club-agreement-templates.server";
import {
  clubAgreementTypeLabel,
  isClubAgreementType,
  trainingAgreementEditPageTitle,
  type ClubAgreementType,
} from "@/lib/club-agreement-templates.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface TrainingAgreementEditPageProps {
  params: { clubSlug: string; agreementType: string };
}

export async function generateMetadata({
  params,
}: TrainingAgreementEditPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  if (!isClubAgreementType(params.agreementType)) {
    return { title: "DojoDirector | Training Agreement" };
  }

  return {
    title: `DojoDirector | ${club.name} ${clubAgreementTypeLabel(params.agreementType)}`,
    description: `Edit ${clubAgreementTypeLabel(params.agreementType)} for ${club.name}.`,
  };
}

export default async function TrainingAgreementEditPage({
  params,
}: TrainingAgreementEditPageProps) {
  if (!isClubAgreementType(params.agreementType)) {
    notFound();
  }

  const agreementType = params.agreementType as ClubAgreementType;
  const club = await requireClubBySlug(params.clubSlug);
  const editState = await loadClubAgreementTemplateForEdit(club.id, agreementType);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader
        pageTitle={trainingAgreementEditPageTitle(agreementType)}
        clubName={club.name}
      />

      <Link
        href={clubAdminPath(club.slug, "training-agreements")}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Training Agreements
      </Link>

      {!editState.templatesTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {CLUB_AGREEMENT_TEMPLATES_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <TrainingAgreementEditForm clubSlug={club.slug} state={editState} />
        </section>
      )}
    </main>
  );
}
