import "server-only";

import { getBookingDateRange } from "@/lib/booking";
import type { BookableSession } from "@/lib/booking";
import { loadClassScheduleSessions } from "@/lib/class-session-schedule.server";

export async function getUpcomingBookableSessions(
  clubId: string,
): Promise<BookableSession[]> {
  const { startIso, endIso } = getBookingDateRange();

  return loadClassScheduleSessions({
    startIso,
    endIso,
    includeCancelled: false,
    activeClassesOnly: true,
    clubId,
  });
}
