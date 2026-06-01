import { redirect } from "next/navigation";
import { clubAdminPath } from "@/lib/clubs.shared";

export const dynamic = "force-dynamic";

interface LegacyRecurringBookingsPageProps {
  params: { clubSlug: string; scheduleId: string };
}

/** Preserves the legacy route by redirecting to Manage Bookings → Make Bookings. */
export default function LegacyRecurringBookingsPage({
  params,
}: LegacyRecurringBookingsPageProps) {
  redirect(clubAdminPath(params.clubSlug, `bookings/make/${params.scheduleId}`));
}
