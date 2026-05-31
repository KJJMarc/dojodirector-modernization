import { AppHeader } from "@/components/layout/app-header";
import { GuestBookingFlow } from "@/components/booking/guest-booking-flow";
import {
  getUpcomingBookableSessions,
  groupSessionsByDate,
} from "@/lib/booking";
import { ACTIVE_CLUB_ID, ACTIVE_CLUB_NAME } from "@/lib/branding";
import { toClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import { resolveGuestTrainingAgreementContent } from "@/lib/club-agreement-templates.server";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const sessions = await getUpcomingBookableSessions();
  const sessionGroups = groupSessionsByDate(sessions);
  const trainingAgreement = toClientClubAgreementContent(
    await resolveGuestTrainingAgreementContent(ACTIVE_CLUB_ID),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Guest Booking" clubName={ACTIVE_CLUB_NAME} />

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-dojo-white">Guest Booking</h1>
        <p className="text-sm text-dojo-muted">
          Book a trial or guest class at Kingston Jiu Jitsu.
        </p>
      </div>

      <GuestBookingFlow
        sessionGroups={sessionGroups}
        trainingAgreement={trainingAgreement}
      />
    </main>
  );
}
