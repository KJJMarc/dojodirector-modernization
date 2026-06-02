import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { PublicSiteFooter } from "@/components/layout/public-site-footer";
import { GuestBookingFlow } from "@/components/booking/guest-booking-flow";
import {
  groupSessionsByDate,
} from "@/lib/booking";
import { getUpcomingBookableSessions } from "@/lib/booking.server";
import { toClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import { resolveGuestTrainingAgreementContent } from "@/lib/club-agreement-templates.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubBookPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubBookPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Guest Booking`,
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
        <AppHeader pageTitle="Guest Booking" clubName={club.name} />

        <p className="text-sm text-dojo-muted">
          Book a trial or guest class at {club.name}.
        </p>

        <GuestBookingFlow
          clubSlug={club.slug}
          sessionGroups={sessionGroups}
          trainingAgreement={trainingAgreement}
        />
      </main>

      <PublicSiteFooter />
    </div>
  );
}
