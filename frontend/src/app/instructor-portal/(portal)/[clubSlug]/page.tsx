import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorQuickActions } from "@/components/instructor/instructor-quick-actions";
import { InstructorPortalSignOutButton } from "@/components/instructor-portal/instructor-portal-sign-out-button";
import { InstructorPortalSwitchAcademyButton } from "@/components/instructor-portal/instructor-portal-switch-academy-button";
import { countUnreadPortalMessages } from "@/lib/portal-messages.server";
import { formatPortalMessagesNavLabel } from "@/lib/portal-messages.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import {
  instructorPortalKidsPromotionCandidatesPath,
  isInstructorKidsPromotionCandidatesClub,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";
import { formatInstructorSlugFromName } from "@/lib/instructor-portal.shared";

export const dynamic = "force-dynamic";

interface InstructorPortalClubPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: InstructorPortalClubPageProps): Promise<Metadata> {
  const { club } = await requireInstructorPortalPageContext(params.clubSlug);

  return {
    title: `Dojo Director | Instructor Portal | ${club.name}`,
    description: `Instructor portal for ${club.name}.`,
  };
}

export default async function InstructorPortalClubPage({
  params,
}: InstructorPortalClubPageProps) {
  const { profile, club, clubContext } = await requireInstructorPortalPageContext(
    params.clubSlug,
  );
  const instructorSlug = formatInstructorSlugFromName(profile.fullName);
  const unreadMessageCount = await countUnreadPortalMessages({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "instructor",
  });

  return (
    <main className="portal-page-shell mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Instructor Portal" clubName={club.name} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {clubContext.accessibleClubs.length > 1 ? (
          <InstructorPortalSwitchAcademyButton />
        ) : null}
        <InstructorPortalSignOutButton />
      </div>

      <section className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3">
        <p className="text-sm text-dojo-muted">
          Signed in as{" "}
          <span className="font-semibold text-dojo-white">{profile.fullName}</span>
        </p>
      </section>

      <InstructorQuickActions
        slug={instructorSlug}
        clubSlug={club.slug}
        sectionTitle="QUICK ACTIONS"
        extraActions={[
          ...(isInstructorKidsPromotionCandidatesClub(club.slug)
            ? [
                {
                  label: "Promotion Candidates",
                  href: instructorPortalKidsPromotionCandidatesPath(club.slug),
                  description: "View and promote eligible students.",
                },
              ]
            : []),
          {
            label: formatPortalMessagesNavLabel(unreadMessageCount),
            href: instructorPortalClubPath(club.slug, "messages"),
            description: "Academy notices in your instructor portal",
          },
        ]}
      />
    </main>
  );
}
