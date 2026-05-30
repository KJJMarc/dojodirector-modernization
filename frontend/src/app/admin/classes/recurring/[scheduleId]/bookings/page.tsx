import { redirectLegacyClubAdmin } from "@/lib/admin-legacy-redirect.server";

interface RecurringScheduleBookingsPageProps {
  params: { scheduleId: string };
}

export default function RecurringScheduleBookingsPage({
  params,
}: RecurringScheduleBookingsPageProps) {
  redirectLegacyClubAdmin(`classes/recurring/${params.scheduleId}/bookings`);
}
