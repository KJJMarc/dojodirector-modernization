import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { GuestBookingFlow } from "@/components/booking/guest-booking-flow";
import {
  groupSessionsByDate,
} from "@/lib/booking";
import { getUpcomingBookableSessions } from "@/lib/booking.server";
import { toClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import { resolveGuestTrainingAgreementContent } from "@/lib/club-agreement-templates.server";
import { requireClubBySlug } from "@/lib/clubs.server";
import { shouldShowGuestBookingStudentPortalNotice } from "@/lib/clubs.shared";
import { publicAcademyDocumentTitle } from "@/lib/public-academy-branding.shared";

export const dynamic = "force-dynamic";

interface ClubBookPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubBookPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: publicAcademyDocumentTitle(club.name, "Guest Booking"),
    description: `Book a trial or guest class at ${club.name}.`,
  };
}

export default async function ClubBookPage({ params }: ClubBookPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const sessions = await getUpcomingBookableSessions(club.id);
  const sessionGroups = groupSessionsByDate(sessions);
  const trainingAgreement = toClientClubAgreementContent(
    await resolveGuestTrainingAgreementContent(club.id),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 py-4 pb-8 sm:px-5">
        <PublicAcademyPageHeader
          pageTitle="Guest Booking"
          clubName={club.name}
          sticky
        />

        <p className="text-sm text-dojo-muted">
          Book a trial or guest class at {club.name}.
        </p>

        <GuestBookingFlow
          clubSlug={club.slug}
          sessionGroups={sessionGroups}
          trainingAgreement={trainingAgreement}
          showMemberPortalNotice={shouldShowGuestBookingStudentPortalNotice(club.slug)}
        />
      </main>

      <PublicSiteFooter variant="academy" />
    </div>
  );
}
