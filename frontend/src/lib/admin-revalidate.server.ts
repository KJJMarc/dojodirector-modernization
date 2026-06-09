import "server-only";

import { revalidatePath } from "next/cache";
import { clubAdminPath, clubBookingPath } from "@/lib/clubs.shared";

function revalidateUniquePaths(paths: string[]) {
  const seen = new Set<string>();

  for (const path of paths) {
    if (!seen.has(path)) {
      seen.add(path);
      revalidatePath(path);
    }
  }
}

export function revalidateStudentAdminPaths(clubSlug: string, userId?: string) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "students"),
    clubAdminPath(clubSlug, "students/promotion-candidates"),
    userId ? clubAdminPath(clubSlug, `students/${userId}/profile`) : "",
    userId ? clubAdminPath(clubSlug, `students/${userId}/edit`) : "",
    userId ? clubAdminPath(clubSlug, `students/${userId}/change-belt`) : "",
    userId
      ? clubAdminPath(clubSlug, `students/${userId}/grading-history`)
      : "",
    userId ? `/students/${userId}/attendance-card` : "",
    "/adult-belt-rankings",
    `/${clubSlug}/junior-belt-rankings`,
  ].filter(Boolean));

  // Booking dropdowns load student options from pages under /classes.
  revalidatePath(clubAdminPath(clubSlug, "classes"), "layout");
}

/** After attendance_records change (manual card or session register). */
export function revalidateAttendanceImpactPaths(clubSlug: string, userId: string) {
  revalidateStudentAdminPaths(clubSlug, userId);
}

export function revalidateClassManagementPaths(
  clubSlug: string,
  sessionId?: string,
) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "classes"),
    clubAdminPath(clubSlug, "classes/edit"),
    clubAdminPath(clubSlug, "classes/new"),
    clubAdminPath(clubSlug, "classes/new-event"),
    clubBookingPath(clubSlug),
    "/book",
    "/attendance",
    sessionId ? clubAdminPath(clubSlug, `classes/sessions/${sessionId}`) : "",
    sessionId
      ? clubAdminPath(clubSlug, `classes/sessions/${sessionId}/edit`)
      : "",
    sessionId ? `/attendance/${sessionId}` : "",
  ].filter(Boolean));
}

export function revalidateRecurringClassPaths(
  clubSlug: string,
  scheduleId?: string,
  userId?: string,
) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "classes"),
    clubAdminPath(clubSlug, "classes/edit"),
    clubBookingPath(clubSlug),
    "/book",
    "/attendance",
    scheduleId
      ? clubAdminPath(clubSlug, `classes/recurring/${scheduleId}/bookings`)
      : "",
    scheduleId ? clubAdminPath(clubSlug, `bookings/make/${scheduleId}`) : "",
    scheduleId ? clubAdminPath(clubSlug, "bookings/make") : "",
    scheduleId
      ? clubAdminPath(clubSlug, `classes/recurring/${scheduleId}/edit`)
      : "",
    userId ? `/students/${userId}/attendance-card` : "",
  ].filter(Boolean));
}

export function revalidateSessionBookingPaths(
  clubSlug: string,
  sessionId: string,
  userId?: string,
) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "classes"),
    clubAdminPath(clubSlug, `classes/sessions/${sessionId}`),
    clubBookingPath(clubSlug),
    "/book",
    "/attendance",
    `/attendance/${sessionId}`,
    userId ? `/students/${userId}/attendance-card` : "",
  ].filter(Boolean));
}

export function revalidateManageBookingsPaths(
  clubSlug: string,
  sessionId?: string,
  userId?: string,
) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug),
    clubAdminPath(clubSlug, "bookings"),
    clubAdminPath(clubSlug, "bookings/make"),
    clubAdminPath(clubSlug, "bookings/cancel"),
    sessionId ? clubAdminPath(clubSlug, `bookings/cancel/${sessionId}`) : "",
    sessionId ? `/attendance/${sessionId}` : "/attendance",
    sessionId ? clubAdminPath(clubSlug, `classes/sessions/${sessionId}`) : "",
    clubBookingPath(clubSlug),
    "/book",
    userId ? `/students/${userId}/attendance-card` : "",
  ].filter(Boolean));

  if (sessionId) {
    revalidateSessionBookingPaths(clubSlug, sessionId, userId);
  }
}

export function revalidateInstructorAdminPaths(clubSlug: string) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "instructors"),
    clubAdminPath(clubSlug, "instructors/classes"),
    clubAdminPath(clubSlug, "instructors/sessions"),
  ]);
}

export function revalidateBeltManagementPaths(clubSlug: string) {
  revalidateStudentAdminPaths(clubSlug);
  revalidatePath(clubAdminPath(clubSlug, "belt-management"), "layout");
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "belts"),
    clubAdminPath(clubSlug, "programmes"),
  ]);
}

export function revalidateMembershipAdminPaths(
  clubSlug: string,
  userId: string,
  options?: { revalidateInstructors?: boolean },
) {
  revalidateStudentAdminPaths(clubSlug, userId);

  if (options?.revalidateInstructors) {
    revalidateInstructorAdminPaths(clubSlug);
  }
}

export function revalidateTrainingAgreementsPaths(clubSlug: string) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "training-agreements"),
    clubAdminPath(clubSlug, "training-agreements/member_portal_agreement/edit"),
    clubAdminPath(clubSlug, "training-agreements/guest_training_agreement/edit"),
    clubBookingPath(clubSlug),
    "/book",
    "/student-portal/agreements",
    "/student-portal",
  ]);
}

export function revalidateStudentOfTheYearPaths(clubSlug: string) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "academy-pages"),
    clubAdminPath(clubSlug, "academy-pages/student-of-the-year/edit"),
    "/student-of-the-year",
  ]);
}

export function revalidateGuestBookingsPaths(clubSlug: string, sessionId?: string) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "guest-bookings"),
    clubBookingPath(clubSlug),
    "/book",
  ]);

  if (sessionId) {
    revalidateManageBookingsPaths(clubSlug, sessionId);
    revalidateSessionBookingPaths(clubSlug, sessionId);
  }
}
