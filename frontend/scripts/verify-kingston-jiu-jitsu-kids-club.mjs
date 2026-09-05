#!/usr/bin/env node
/**
 * Verifies Kingston Jiu Jitsu Kids academy setup and data separation.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-kingston-jiu-jitsu-kids-club.mjs
 */

import { createClient } from "@supabase/supabase-js";

const KJJ_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
const KIDS_SLUG = "kingston-jiu-jitsu-kids";

const EXPECTED_PROGRAMME_COUNT = 3;
const EXPECTED_BELT_LEVEL_COUNT = 92;
const EXPECTED_JUNIOR_GRADING_REQUIREMENT_COUNT = 51;
const EXPECTED_ACTIVE_CLASS_TEMPLATE_COUNT = 4;
const EXPECTED_RECURRING_SCHEDULE_COUNT = 16;

const EXPECTED_KIDS_CLASS_NAMES = [
  "Kids Jiu Jitsu (5-10)",
  "Kids Jiu Jitsu (11-15)",
  "Kids Kickboxing (5-10)",
  "Kids Kickboxing (11-15)",
];

/** Official Kids timetable slots (matches supabase/seed-kjj-kids-timetable.sql). */
const EXPECTED_KIDS_RECURRING_SLOTS = [
  { className: "Kids Jiu Jitsu (11-15)", dow: 1, startTime: "17:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Kickboxing (5-10)", dow: 2, startTime: "17:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Kickboxing (11-15)", dow: 2, startTime: "17:45:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 2, startTime: "17:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 3, startTime: "17:15:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (11-15)", dow: 3, startTime: "18:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Kickboxing (11-15)", dow: 4, startTime: "17:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 5, startTime: "17:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (11-15)", dow: 5, startTime: "17:45:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 0, startTime: "15:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 0, startTime: "16:00:00", location: "Tiffin Sports Centre" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 6, startTime: "08:15:00", location: "St. John's Parish Hall" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 6, startTime: "09:00:00", location: "St. John's Parish Hall" },
  { className: "Kids Jiu Jitsu (11-15)", dow: 6, startTime: "09:45:00", location: "St. John's Parish Hall" },
  { className: "Kids Jiu Jitsu (5-10)", dow: 5, startTime: "17:15:00", location: "St. John's Parish Hall" },
  { className: "Kids Jiu Jitsu (11-15)", dow: 5, startTime: "18:00:00", location: "St. John's Parish Hall" },
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 8);
}

function recurringSlotKey({ className, dow, startTime, location }) {
  return `${className}|${dow}|${normalizeTime(startTime)}|${location}`;
}

async function countRows(supabase, table, clubIdColumn, clubId, extraFilter) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(clubIdColumn, clubId);

  if (extraFilter) {
    query = extraFilter(query);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count ${table} for ${clubId}: ${error.message}`);
  }

  return count ?? 0;
}

async function tableExists(supabase, table) {
  const response = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .limit(0);
  const { count, error } = response;
  const status = response.status;

  if (error || status === 403) {
    const message = (error?.message ?? "").toLowerCase();
    const code = error?.code;

    if (
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find")
    ) {
      return false;
    }

    if (
      message.includes("permission denied") ||
      code === "42501" ||
      status === 403
    ) {
      return true;
    }

    throw new Error(
      `Failed to inspect ${table}: ${error?.message || error?.code || status || "unknown error"}`,
    );
  }

  return count !== null;
}

async function loadJuniorBeltLevelIds(supabase, clubId) {
  const { data, error } = await supabase
    .from("belt_levels")
    .select("id")
    .eq("club_id", clubId)
    .eq("belt_category", "junior");

  if (error) {
    throw new Error(`Failed to load junior belt_levels for ${clubId}: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.id));
}

async function loadAllJuniorGradingRequirements(supabase) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("junior_grading_requirements")
      .select(
        "id, from_belt_level_id, to_belt_level_id, required_attendance, required_weeks",
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }

    from += pageSize;
  }
}

function filterJuniorRequirementsForClub(requirements, beltLevelIds) {
  return requirements.filter(
    (row) =>
      beltLevelIds.has(row.from_belt_level_id) &&
      beltLevelIds.has(row.to_belt_level_id),
  );
}

async function countRowsMatchingAnyId(supabase, table, idColumn, ids) {
  if (ids.length === 0) {
    return 0;
  }

  const batchSize = 100;
  let total = 0;

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(idColumn, batch);

    if (error) {
      throw new Error(`Failed to count ${table} for ${idColumn} batch: ${error.message}`);
    }

    total += count ?? 0;
  }

  return total;
}

async function countBookingsForKidsClub(supabase, kidsClubId, kidsSessionIds) {
  let total = 0;

  const guestBookingsExists = await tableExists(supabase, "guest_bookings");

  if (guestBookingsExists) {
    total += await countRows(supabase, "guest_bookings", "club_id", kidsClubId);
  }

  const sessionAttendeesExists = await tableExists(supabase, "session_attendees");

  if (sessionAttendeesExists && kidsSessionIds.length > 0) {
    total += await countRowsMatchingAnyId(
      supabase,
      "session_attendees",
      "class_session_id",
      kidsSessionIds,
    );
  }

  return total;
}

async function countAttendanceForKidsClub(supabase, kidsClubId, kidsSessionIds) {
  const attendanceRecordsExists = await tableExists(supabase, "attendance_records");

  if (!attendanceRecordsExists) {
    return 0;
  }

  const byClubCount = await countRows(
    supabase,
    "attendance_records",
    "club_id",
    kidsClubId,
  );

  if (byClubCount > 0) {
    return byClubCount;
  }

  if (kidsSessionIds.length === 0) {
    return 0;
  }

  try {
    return await countRowsMatchingAnyId(
      supabase,
      "attendance_records",
      "class_session_id",
      kidsSessionIds,
    );
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

    if (message.includes("class_session_id") && message.includes("does not exist")) {
      return byClubCount;
    }

    throw error;
  }
}

async function verifyKidsClassSchedule(supabase, kidsClubId) {
  const { data: kidsClasses, error: kidsClassesError } = await supabase
    .from("classes")
    .select("id, name, is_active, club_id")
    .eq("club_id", kidsClubId);

  if (kidsClassesError) {
    throw new Error(`Failed to load Kids classes: ${kidsClassesError.message}`);
  }

  const activeKidsClasses = (kidsClasses ?? []).filter((row) => row.is_active !== false);
  const activeClassNames = activeKidsClasses.map((row) => row.name).sort();

  assert(
    activeKidsClasses.length === EXPECTED_ACTIVE_CLASS_TEMPLATE_COUNT,
    `Expected ${EXPECTED_ACTIVE_CLASS_TEMPLATE_COUNT} active Kids class templates, found ${activeKidsClasses.length}.`,
  );

  for (const expectedName of EXPECTED_KIDS_CLASS_NAMES) {
    assert(
      activeClassNames.includes(expectedName),
      `Missing active Kids class template: ${expectedName}`,
    );
  }

  const kidsClassIds = activeKidsClasses.map((row) => row.id);
  const classNameById = new Map(activeKidsClasses.map((row) => [row.id, row.name]));

  const { data: kjjKidsNamedClasses, error: kjjKidsNamedClassesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("club_id", KJJ_CLUB_ID)
    .ilike("name", "%Kids%");

  if (kjjKidsNamedClassesError) {
    throw new Error(
      `Failed to check KJJ for Kids class names: ${kjjKidsNamedClassesError.message}`,
    );
  }

  assert(
    (kjjKidsNamedClasses ?? []).length === 0,
    "Kingston Jiu Jitsu should not contain Kids class templates.",
  );

  if (kidsClassIds.length > 0) {
    const { count: crossClubClasses, error: crossClubClassesError } = await supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .in("id", kidsClassIds)
      .neq("club_id", kidsClubId);

    if (crossClubClassesError) {
      throw new Error(
        `Failed to verify Kids class club scoping: ${crossClubClassesError.message}`,
      );
    }

    assert(
      (crossClubClasses ?? 0) === 0,
      "Kids class templates must belong to the Kids club only.",
    );
  }

  const { data: recurringSchedules, error: recurringSchedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id, class_id, day_of_week, start_time, location, is_active, club_id")
    .eq("club_id", kidsClubId)
    .eq("is_active", true);

  if (recurringSchedulesError) {
    throw new Error(
      `Failed to load Kids recurring_class_schedules: ${recurringSchedulesError.message}`,
    );
  }

  const activeRecurringSchedules = recurringSchedules ?? [];

  assert(
    activeRecurringSchedules.length === EXPECTED_RECURRING_SCHEDULE_COUNT,
    `Expected ${EXPECTED_RECURRING_SCHEDULE_COUNT} active Kids recurring class schedules, found ${activeRecurringSchedules.length}.`,
  );

  const actualSlotKeys = new Set(
    activeRecurringSchedules.map((row) =>
      recurringSlotKey({
        className: classNameById.get(row.class_id) ?? "",
        dow: row.day_of_week,
        startTime: row.start_time,
        location: row.location ?? "",
      }),
    ),
  );

  for (const expectedSlot of EXPECTED_KIDS_RECURRING_SLOTS) {
    const key = recurringSlotKey(expectedSlot);
    assert(
      actualSlotKeys.has(key),
      `Missing Kids recurring schedule slot: ${key}`,
    );
  }

  const { count: kjjRecurringForKidsClasses, error: kjjRecurringError } =
    kidsClassIds.length > 0
      ? await supabase
          .from("recurring_class_schedules")
          .select("id", { count: "exact", head: true })
          .eq("club_id", KJJ_CLUB_ID)
          .in("class_id", kidsClassIds)
      : { count: 0, error: null };

  if (kjjRecurringError) {
    throw new Error(
      `Failed to verify KJJ recurring schedules for Kids classes: ${kjjRecurringError.message}`,
    );
  }

  assert(
    (kjjRecurringForKidsClasses ?? 0) === 0,
    "Kids recurring class schedules must not appear under Kingston Jiu Jitsu.",
  );

  const nowIso = new Date().toISOString();

  const { count: upcomingSessions, error: upcomingSessionsError } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", kidsClubId)
    .eq("status", "scheduled")
    .gte("starts_at", nowIso);

  if (upcomingSessionsError) {
    throw new Error(`Failed to count upcoming Kids sessions: ${upcomingSessionsError.message}`);
  }

  assert(
    (upcomingSessions ?? 0) > 0,
    "Expected generated upcoming Kids class sessions.",
  );

  if (kidsClassIds.length > 0) {
    const { count: crossClubSessions, error: crossClubSessionsError } = await supabase
      .from("class_sessions")
      .select("id", { count: "exact", head: true })
      .in("class_id", kidsClassIds)
      .neq("club_id", kidsClubId);

    if (crossClubSessionsError) {
      throw new Error(
        `Failed to verify Kids session club scoping: ${crossClubSessionsError.message}`,
      );
    }

    assert(
      (crossClubSessions ?? 0) === 0,
      "Kids class sessions must belong to the Kids club only.",
    );
  }

  const { data: kidsSessions, error: kidsSessionsListError } = await supabase
    .from("class_sessions")
    .select("id, starts_at, external_id, class_id")
    .eq("club_id", kidsClubId)
    .eq("status", "scheduled")
    .gte("starts_at", nowIso);

  if (kidsSessionsListError) {
    throw new Error(`Failed to load Kids session ids: ${kidsSessionsListError.message}`);
  }

  let sessionTimeMismatches = 0;

  for (const session of kidsSessions ?? []) {
    const externalMatch = session.external_id?.match(
      /:(\d{4}-\d{2}-\d{2}):(\d{1,2}:\d{2}):/,
    );

    if (!externalMatch) {
      continue;
    }

    const slotTime = normalizeTime(externalMatch[2]);
    const londonTime = new Date(session.starts_at).toLocaleTimeString("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (slotTime.slice(0, 5) !== londonTime) {
      sessionTimeMismatches += 1;
    }
  }

  assert(
    sessionTimeMismatches === 0,
    `Kids class session times must match recurring timetable slots (${sessionTimeMismatches} mismatches).`,
  );

  return {
    activeClassTemplates: activeKidsClasses.length,
    recurringSchedules: activeRecurringSchedules.length,
    upcomingSessions: upcomingSessions ?? 0,
    kidsSessionIds: (kidsSessions ?? []).map((row) => row.id),
  };
}

async function main() {
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: kidsClub, error: kidsClubError } = await supabase
    .from("clubs")
    .select("id, name, slug, is_active")
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (kidsClubError) {
    throw new Error(`Failed to load Kids club: ${kidsClubError.message}`);
  }

  assert(kidsClub, "Kingston Jiu Jitsu Kids club record was not found.");
  assert(kidsClub.name === "Kingston Jiu Jitsu Kids", "Kids club name mismatch.");
  assert(kidsClub.is_active === true, "Kids club should be active.");

  const kidsClubId = kidsClub.id;

  const programmesTableExists = await tableExists(supabase, "programmes");

  if (programmesTableExists) {
    const { count: programmeCount, error: programmeError } = await supabase
      .from("programmes")
      .select("id", { count: "exact", head: true })
      .eq("club_id", kidsClubId);

    if (programmeError) {
      throw new Error(`Failed to count Kids programmes: ${programmeError.message}`);
    }

    assert(
      programmeCount === EXPECTED_PROGRAMME_COUNT,
      `Expected ${EXPECTED_PROGRAMME_COUNT} Kids programmes, found ${programmeCount}.`,
    );

    const { data: programmeTypes, error: programmeTypesError } = await supabase
      .from("programmes")
      .select("programme_type")
      .eq("club_id", kidsClubId);

    if (programmeTypesError) {
      throw new Error(`Failed to load Kids programme types: ${programmeTypesError.message}`);
    }

    const typeSet = new Set((programmeTypes ?? []).map((row) => row.programme_type));
    for (const expectedType of ["bjj", "muay_thai", "strength_conditioning"]) {
      assert(typeSet.has(expectedType), `Missing Kids programme type: ${expectedType}`);
    }

    const { data: kidsProgrammes, error: kidsProgrammesListError } = await supabase
      .from("programmes")
      .select("id")
      .eq("club_id", kidsClubId);

    if (kidsProgrammesListError) {
      throw new Error(
        `Failed to load Kids programme ids: ${kidsProgrammesListError.message}`,
      );
    }

    const kidsProgrammeIds = (kidsProgrammes ?? []).map((row) => row.id);

    if (kidsProgrammeIds.length > 0) {
      const programmeMembershipsTableExists = await tableExists(
        supabase,
        "programme_memberships",
      );

      if (programmeMembershipsTableExists) {
        const { count, error: kidsProgrammeMembershipsError } = await supabase
          .from("programme_memberships")
          .select("id", { count: "exact", head: true })
          .in("programme_id", kidsProgrammeIds);

        if (kidsProgrammeMembershipsError) {
          throw new Error(
            `Failed to count Kids programme memberships: ${kidsProgrammeMembershipsError.message}`,
          );
        }

        assert(
          (count ?? 0) === 0,
          "Kids academy should have no programme memberships.",
        );
      }
    }
  } else {
    console.warn("Skipping programme checks: public.programmes does not exist.");
  }

  const kidsBeltLevels = await countRows(supabase, "belt_levels", "club_id", kidsClubId);

  assert(
    kidsBeltLevels === EXPECTED_BELT_LEVEL_COUNT,
    `Expected ${EXPECTED_BELT_LEVEL_COUNT} Kids belt_levels, found ${kidsBeltLevels}.`,
  );

  const kidsStudentMemberships = await countRows(
    supabase,
    "memberships",
    "club_id",
    kidsClubId,
    (query) => query.eq("role", "student"),
  );
  assert(kidsStudentMemberships === 0, "Kids academy should have no student memberships.");

  const scheduleSummary = await verifyKidsClassSchedule(supabase, kidsClubId);

  const gradeAwardsTableExists = await tableExists(supabase, "grade_awards");

  if (gradeAwardsTableExists) {
    const { count: kidsGradeAwards, error: kidsGradeAwardsError } = await supabase
      .from("grade_awards")
      .select("id", { count: "exact", head: true })
      .eq("club_id", kidsClubId);

    if (kidsGradeAwardsError) {
      throw new Error(`Failed to count Kids grade awards: ${kidsGradeAwardsError.message}`);
    }

    assert((kidsGradeAwards ?? 0) === 0, "Kids academy should have no grade awards.");
  }

  const kidsBookingCount = await countBookingsForKidsClub(
    supabase,
    kidsClubId,
    scheduleSummary.kidsSessionIds,
  );
  assert(kidsBookingCount === 0, "Kids academy should have no bookings.");

  const kidsAttendanceCount = await countAttendanceForKidsClub(
    supabase,
    kidsClubId,
    scheduleSummary.kidsSessionIds,
  );
  assert(kidsAttendanceCount === 0, "Kids academy should have no attendance records.");

  const { data: kjjInstructors, error: kjjInstructorsError } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("club_id", KJJ_CLUB_ID)
    .in("role", ["instructor", "admin", "super_admin"]);

  if (kjjInstructorsError) {
    throw new Error(`Failed to load KJJ instructor memberships: ${kjjInstructorsError.message}`);
  }

  const { data: kidsInstructors, error: kidsInstructorsError } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("club_id", kidsClubId)
    .in("role", ["instructor", "admin", "super_admin"]);

  if (kidsInstructorsError) {
    throw new Error(`Failed to load Kids instructor memberships: ${kidsInstructorsError.message}`);
  }

  const kjjInstructorIds = new Set((kjjInstructors ?? []).map((row) => row.user_id));
  const kidsInstructorIds = new Set((kidsInstructors ?? []).map((row) => row.user_id));

  assert(kidsInstructorIds.size > 0, "Kids academy should have staff memberships.");

  for (const userId of kjjInstructorIds) {
    assert(
      kidsInstructorIds.has(userId),
      `KJJ instructor ${userId} is missing Kids academy instructor access.`,
    );
  }

  const juniorGradingTableExists = await tableExists(supabase, "junior_grading_requirements");

  if (juniorGradingTableExists) {
    const kidsJuniorBeltIds = await loadJuniorBeltLevelIds(supabase, kidsClubId);
    const kjjJuniorBeltIds = await loadJuniorBeltLevelIds(supabase, KJJ_CLUB_ID);

    assert(kidsJuniorBeltIds.size > 0, "Expected Kids junior belt_levels.");

    let allJuniorRequirements;

    try {
      allJuniorRequirements = await loadAllJuniorGradingRequirements(supabase);
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
      const code = error?.code;

      if (
        message.includes("permission denied") ||
        code === "42501" ||
        error?.status === 403
      ) {
        throw new Error(
          "Cannot verify junior_grading_requirements via API. Run in Supabase SQL Editor: GRANT SELECT ON public.junior_grading_requirements TO service_role;",
        );
      }

      throw error;
    }

    const kidsJuniorRequirements = filterJuniorRequirementsForClub(
      allJuniorRequirements,
      kidsJuniorBeltIds,
    );

    assert(
      kidsJuniorRequirements.length === EXPECTED_JUNIOR_GRADING_REQUIREMENT_COUNT,
      `Expected ${EXPECTED_JUNIOR_GRADING_REQUIREMENT_COUNT} Kids junior_grading_requirements, found ${kidsJuniorRequirements.length}.`,
    );

    for (const requirement of kidsJuniorRequirements) {
      assert(
        kidsJuniorBeltIds.has(requirement.from_belt_level_id),
        `Kids junior requirement ${requirement.id} from_belt_level_id is not a Kids belt level.`,
      );
      assert(
        kidsJuniorBeltIds.has(requirement.to_belt_level_id),
        `Kids junior requirement ${requirement.id} to_belt_level_id is not a Kids belt level.`,
      );
      assert(
        !kjjJuniorBeltIds.has(requirement.from_belt_level_id),
        `Kids junior requirement ${requirement.id} still references a KJJ from_belt_level_id.`,
      );
      assert(
        !kjjJuniorBeltIds.has(requirement.to_belt_level_id),
        `Kids junior requirement ${requirement.id} still references a KJJ to_belt_level_id.`,
      );
    }
  } else {
    throw new Error("public.junior_grading_requirements table does not exist.");
  }

  console.log("Kingston Jiu Jitsu Kids verification passed.");
  console.log(`Kids club id: ${kidsClubId}`);
  console.log(`Kids programmes: ${EXPECTED_PROGRAMME_COUNT}`);
  console.log(`Kids belt_levels: ${kidsBeltLevels}`);
  console.log(`Kids junior_grading_requirements: ${EXPECTED_JUNIOR_GRADING_REQUIREMENT_COUNT}`);
  console.log(`Kids staff memberships: ${kidsInstructorIds.size}`);
  console.log(`Kids active class templates: ${scheduleSummary.activeClassTemplates}`);
  console.log(`Kids recurring class schedules: ${scheduleSummary.recurringSchedules}`);
  console.log(`Kids upcoming sessions: ${scheduleSummary.upcomingSessions}`);
  console.log(`Kids student memberships: ${kidsStudentMemberships}`);
  console.log(`Kids bookings: ${kidsBookingCount}`);
  console.log(`Kids attendance records: ${kidsAttendanceCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
