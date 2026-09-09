import "server-only";

import {
  buildPublicTimetableVenueGroups,
  type PublicTimetableScheduleInput,
  type PublicTimetableVenueGroup,
} from "@/lib/public-timetable.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface RecurringTimetableQueryRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  is_active: boolean;
  class_id: string;
}

interface ClassTemplateStatusRow {
  id: string;
  name: string | null;
  is_active: boolean | null;
  programme_type: string | null;
}

/**
 * Canonical public timetable query: active recurring schedules for one academy,
 * joined to class template name/status/programme. Shared by the HTML timetable
 * page and the public JSON API. Does not load capacity, notes, instructors,
 * members, or attendance.
 *
 * start_time / end_time are academy-local wall clocks (not visitor/browser/UTC times).
 */
export async function loadPublicTimetableScheduleInputsForClub(
  clubId: string,
): Promise<PublicTimetableScheduleInput[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select("id, day_of_week, start_time, end_time, location, is_active, class_id")
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load class timetable: ${error.message}`);
  }

  const scheduleRows = (data ?? []) as RecurringTimetableQueryRow[];

  if (scheduleRows.length === 0) {
    return [];
  }

  const classIds = Array.from(new Set(scheduleRows.map((row) => row.class_id)));
  const classById = await loadClassTemplateStatusById(classIds);

  return scheduleRows.map((row) => {
    const classRow = classById.get(row.class_id);

    return {
      id: row.id,
      classId: row.class_id,
      className: classRow?.name?.trim() || "Class",
      dayOfWeek: row.day_of_week,
      startTime: row.start_time?.slice(0, 5) ?? "00:00",
      endTime: row.end_time?.slice(0, 5) ?? null,
      location: row.location,
      isActive: row.is_active === true,
      classIsActive: classRow ? classRow.is_active !== false : true,
      programmeType: classRow?.programme_type?.trim() || null,
    };
  });
}

/**
 * Load active recurring schedules for a single academy and group for the public timetable.
 * Uses service-role client like other public academy pages; always filters by club_id.
 * Returns only fields required for display (no capacity, notes, or attendance).
 *
 * start_time / end_time are academy-local wall clocks (not visitor/browser/UTC times).
 * The public page formats them as written using getClubIanaTimeZone only as the
 * semantic home zone of that academy — never to convert display for the visitor.
 */
export async function loadPublicTimetableVenuesForClub(
  clubId: string,
): Promise<PublicTimetableVenueGroup[]> {
  const inputs = await loadPublicTimetableScheduleInputsForClub(clubId);
  return buildPublicTimetableVenueGroups(inputs);
}

async function loadClassTemplateStatusById(
  classIds: string[],
): Promise<Map<string, ClassTemplateStatusRow>> {
  if (classIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, is_active, programme_type")
    .in("id", classIds);

  if (error) {
    throw new Error(`Failed to load class templates for timetable: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as ClassTemplateStatusRow[]).map((row) => [row.id, row]),
  );
}
