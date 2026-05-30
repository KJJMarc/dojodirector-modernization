import { AppHeader } from "@/components/layout/app-header";
import { BookingFlow } from "@/components/booking/booking-flow";
import {
  getUpcomingBookableSessions,
  groupSessionsByDate,
} from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const sessions = await getUpcomingBookableSessions();
  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Book a Class" />

      <p className="text-sm text-dojo-muted">
        Browse and book upcoming class sessions over the next 14 days.
      </p>

      <BookingFlow sessionGroups={sessionGroups} />
    </main>
  );
}
