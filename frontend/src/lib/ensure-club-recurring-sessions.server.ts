import "server-only";

import { cache } from "react";
import { RECURRING_CLASS_SESSION_DAYS_AHEAD } from "@/lib/admin-recurring-classes.shared";
import { generateRecurringClassSessions } from "@/lib/generate-recurring-class-sessions.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Regenerate when an active schedule has no upcoming sessions (e.g. after orphan cleanup). */
const MIN_FUTURE_SESSIONS_PER_ACTIVE_SCHEDULE = 1;

export const ensureClubRecurringFutureSessions = cache(
  async function ensureClubRecurringFutureSessions(clubId: string) {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id")
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (schedulesError || !schedules?.length) {
    return;
  }

  const futureSessionCounts = await Promise.all(
    schedules.map(async (schedule) => {
      const { count, error: countError } = await supabase
        .from("class_sessions")
        .select("id", { count: "exact", head: true })
        .eq("recurring_schedule_id", schedule.id)
        .gte("starts_at", nowIso);

      return {
        scheduleId: schedule.id,
        futureSessionCount: countError ? MIN_FUTURE_SESSIONS_PER_ACTIVE_SCHEDULE : (count ?? 0),
      };
    }),
  );

  for (const { scheduleId, futureSessionCount } of futureSessionCounts) {
    if (futureSessionCount >= MIN_FUTURE_SESSIONS_PER_ACTIVE_SCHEDULE) {
      continue;
    }

    try {
      await generateRecurringClassSessions(
        scheduleId,
        RECURRING_CLASS_SESSION_DAYS_AHEAD,
      );
    } catch {
      // Best-effort horizon fill; booking paths surface generation errors explicitly.
    }
  }
  },
);
