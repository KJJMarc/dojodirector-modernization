import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { GuestBookingFlow } from "@/components/booking/guest-booking-flow";
import {
  getUpcomingBookableSessions,
  groupSessionsByDate,
} from "@/lib/booking";
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
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Guest Booking" clubName={club.name} />

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-dojo-white">Guest Booking</h1>
        <p className="text-sm text-dojo-muted">
          Book a trial or guest class at {club.name}.
        </p>
      </div>

      <GuestBookingFlow
        clubSlug={club.slug}
        sessionGroups={sessionGroups}
        trainingAgreement={trainingAgreement}
      />
    </main>
  );
}
