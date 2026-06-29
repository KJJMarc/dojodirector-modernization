import "server-only";

import { getBookingDateRange } from "@/lib/booking";
import type { BookableSession } from "@/lib/booking";
import { loadClassScheduleSessions } from "@/lib/class-session-schedule.server";
import { loadSessionWaitlistBookingAvailabilityBySessionId } from "@/lib/session-waitlist.server";
import { getEffectiveSpacesAvailable } from "@/lib/session-waitlist.shared";

export async function getUpcomingBookableSessions(
  clubId: string,
): Promise<BookableSession[]> {
  const { startIso, endIso } = getBookingDateRange();

  const sessions = await loadClassScheduleSessions({
    startIso,
    endIso,
    includeCancelled: false,
    activeClassesOnly: true,
    clubId,
  });

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const waitlistAvailabilityBySessionId =
    await loadSessionWaitlistBookingAvailabilityBySessionId(sessionIds, {
      skipExpiryProcessing: true,
    });

  return sessions.map((session) => {
    const waitlistAvailability = waitlistAvailabilityBySessionId.get(session.id) ?? {
      hasActiveWaitlistOffer: false,
      waitingQueueCount: 0,
    };

    return {
      ...session,
      spacesAvailable: getEffectiveSpacesAvailable({
        capacity: session.capacity,
        bookedCount: session.bookedCount,
        hasActiveWaitlistOffer: waitlistAvailability.hasActiveWaitlistOffer,
        waitingQueueCount: waitlistAvailability.waitingQueueCount,
      }),
    };
  });
}
