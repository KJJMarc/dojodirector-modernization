import "server-only";

import { notFound } from "next/navigation";
import { getStudentFullName } from "@/lib/attendance";
import { getRecurringClassSchedules } from "@/lib/admin-recurring-classes.server";
import {
  compareRecurringClassSchedules,
  formatDayOfWeekLabel,
  formatScheduleTimeLabel,
} from "@/lib/admin-recurring-classes.shared";
import {
  getAdminInstructors,
  getInstructorSessionAssignmentsPageData,
} from "@/lib/admin-instructors.server";
import type { AdminInstructorRow } from "@/lib/admin-instructors.shared";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formatInstructorSlugFromName,
  instructorPortalPath,
  type InstructorMyClassesPageData,
  type InstructorPortalIdentity,
  type InstructorRecurringClassRow,
  type InstructorSessionCoverPageData,
} from "@/lib/instructor-portal.shared";

const TEMPORARY_INSTRUCTOR_FIRST_NAME = "Marc";
const TEMPORARY_INSTRUCTOR_LAST_NAME = "Barton";
const TEMPORARY_INSTRUCTOR_SLUG = formatInstructorSlugFromName(
  `${TEMPORARY_INSTRUCTOR_FIRST_NAME} ${TEMPORARY_INSTRUCTOR_LAST_NAME}`,
);

function toPortalIdentity(instructor: AdminInstructorRow): InstructorPortalIdentity {
  const displayName = getStudentFullName(instructor.firstName, instructor.lastName);

  return {
    userId: instructor.id,
    displayName,
    slug: formatInstructorSlugFromName(displayName),
    role: instructor.role,
    email: instructor.email,
  };
}

function findInstructorByName(
  instructors: AdminInstructorRow[],
  firstName: string,
  lastName: string,
) {
  return instructors.find(
    (instructor) =>
      instructor.firstName?.trim().toLowerCase() === firstName.toLowerCase() &&
      instructor.lastName?.trim().toLowerCase() === lastName.toLowerCase(),
  );
}

async function findMarcBartonInClub(clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .ilike("first_name", TEMPORARY_INSTRUCTOR_FIRST_NAME)
    .ilike("last_name", TEMPORARY_INSTRUCTOR_LAST_NAME);

  if (error) {
    throw new Error(`Failed to look up temporary instructor: ${error.message}`);
  }

  for (const user of users ?? []) {
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new Error(`Failed to load instructor membership: ${membershipError.message}`);
    }

    if (membership) {
      return {
        id: user.id as string,
        firstName: user.first_name as string | null,
        lastName: user.last_name as string | null,
        email: user.email as string | null,
        role: membership.role as string,
        status: "active",
      } satisfies AdminInstructorRow;
    }
  }

  return null;
}

/**
 * TODO: Replace with the authenticated instructor session user once real login ships.
 * Until then, prefer an existing super_admin/instructor membership, then Marc Barton.
 */
export async function resolveTemporaryInstructorIdentity(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<InstructorPortalIdentity> {
  const instructors = await getAdminInstructors(clubId);

  const superAdmin = instructors.find((instructor) => instructor.role === "super_admin");
  if (superAdmin) {
    return toPortalIdentity(superAdmin);
  }

  const staffInstructor = instructors.find(
    (instructor) => instructor.role === "instructor" || instructor.role === "admin",
  );
  if (staffInstructor) {
    return toPortalIdentity(staffInstructor);
  }

  const marcFromStaff = findInstructorByName(
    instructors,
    TEMPORARY_INSTRUCTOR_FIRST_NAME,
    TEMPORARY_INSTRUCTOR_LAST_NAME,
  );
  if (marcFromStaff) {
    return toPortalIdentity(marcFromStaff);
  }

  const marcFromClub = await findMarcBartonInClub(clubId);
  if (marcFromClub) {
    return toPortalIdentity(marcFromClub);
  }

  return {
    userId: null,
    displayName: `${TEMPORARY_INSTRUCTOR_FIRST_NAME} ${TEMPORARY_INSTRUCTOR_LAST_NAME}`,
    slug: TEMPORARY_INSTRUCTOR_SLUG,
    role: "instructor",
    email: null,
  };
}

export async function getDefaultInstructorPortalPath(
  clubId: string = ACTIVE_CLUB_ID,
) {
  const identity = await resolveTemporaryInstructorIdentity(clubId);
  return instructorPortalPath(identity.slug);
}

/**
 * TODO: Replace slug lookup with authenticated instructor id once real login ships.
 */
export async function resolveInstructorIdentityBySlug(
  slug: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<InstructorPortalIdentity | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const instructors = await getAdminInstructors(clubId);

  for (const instructor of instructors) {
    const identity = toPortalIdentity(instructor);
    if (identity.slug === normalizedSlug) {
      return identity;
    }
  }

  if (normalizedSlug === TEMPORARY_INSTRUCTOR_SLUG) {
    const marcFromClub = await findMarcBartonInClub(clubId);
    if (marcFromClub) {
      return toPortalIdentity(marcFromClub);
    }

    return {
      userId: null,
      displayName: `${TEMPORARY_INSTRUCTOR_FIRST_NAME} ${TEMPORARY_INSTRUCTOR_LAST_NAME}`,
      slug: TEMPORARY_INSTRUCTOR_SLUG,
      role: "instructor",
      email: null,
    };
  }

  return null;
}

export async function requireInstructorIdentityBySlug(
  slug: string,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const identity = await resolveInstructorIdentityBySlug(slug, clubId);

  if (!identity) {
    notFound();
  }

  return identity;
}

async function getRecurringClassesForInstructor(
  instructorUserId: string,
  clubId: string,
): Promise<InstructorRecurringClassRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("instructor_assignments")
    .select("recurring_schedule_id")
    .eq("club_id", clubId)
    .eq("instructor_user_id", instructorUserId)
    .eq("is_active", true)
    .not("recurring_schedule_id", "is", null);

  if (error) {
    throw new Error(`Failed to load instructor recurring classes: ${error.message}`);
  }

  const scheduleIds = new Set(
    (data ?? [])
      .map((row) => row.recurring_schedule_id as string | null)
      .filter((scheduleId): scheduleId is string => Boolean(scheduleId)),
  );

  if (scheduleIds.size === 0) {
    return [];
  }

  const schedules = await getRecurringClassSchedules(clubId);
  const assignedSchedules = schedules.filter(
    (schedule) => scheduleIds.has(schedule.id) && schedule.isActive,
  );

  assignedSchedules.sort(compareRecurringClassSchedules);

  return assignedSchedules.map((schedule) => ({
    scheduleId: schedule.id,
    className: schedule.className,
    programmeType: schedule.programmeType,
    dayLabel: formatDayOfWeekLabel(schedule.dayOfWeek),
    timeLabel: `${formatScheduleTimeLabel(schedule.startTime)} – ${formatScheduleTimeLabel(schedule.endTime)}`,
    locationLabel: schedule.location,
  }));
}

export async function getInstructorSessionCoverPageData(
  slug: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<InstructorSessionCoverPageData> {
  const [identity, sessionData] = await Promise.all([
    requireInstructorIdentityBySlug(slug, clubId),
    getInstructorSessionAssignmentsPageData(clubId),
  ]);

  return {
    identity,
    sessions: sessionData.sessions,
  };
}

export async function getInstructorMyClassesPageData(
  slug: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<InstructorMyClassesPageData> {
  const [identity, sessionData] = await Promise.all([
    requireInstructorIdentityBySlug(slug, clubId),
    getInstructorSessionAssignmentsPageData(clubId),
  ]);

  const recurringClasses =
    identity.userId === null
      ? []
      : await getRecurringClassesForInstructor(identity.userId, clubId);

  const assignedScheduleIds = new Set(
    recurringClasses.map((classRow) => classRow.scheduleId),
  );

  const upcomingSessions =
    identity.userId === null
      ? []
      : sessionData.sessions.filter((session) => {
          if (session.instructorUserId === identity.userId) {
            return true;
          }

          return (
            session.assignmentSource !== "session" &&
            session.recurringScheduleId !== null &&
            assignedScheduleIds.has(session.recurringScheduleId)
          );
        });

  return {
    identity,
    recurringClasses,
    upcomingSessions,
  };
}
