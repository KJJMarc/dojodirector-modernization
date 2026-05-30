import "server-only";

import { revalidatePath } from "next/cache";
import { clubAdminPath } from "@/lib/clubs.shared";

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
    userId ? clubAdminPath(clubSlug, `students/${userId}/profile`) : "",
    userId ? clubAdminPath(clubSlug, `students/${userId}/change-belt`) : "",
    userId ? `/students/${userId}/attendance-card` : "",
  ].filter(Boolean));

  // Booking dropdowns load student options from pages under /classes.
  revalidatePath(clubAdminPath(clubSlug, "classes"), "layout");
}

export function revalidateClassManagementPaths(
  clubSlug: string,
  sessionId?: string,
) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "classes"),
    clubAdminPath(clubSlug, "classes/new"),
    clubAdminPath(clubSlug, "classes/new-event"),
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
    "/book",
    "/attendance",
    scheduleId
      ? clubAdminPath(clubSlug, `classes/recurring/${scheduleId}/bookings`)
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
    "/book",
    "/attendance",
    `/attendance/${sessionId}`,
    userId ? `/students/${userId}/attendance-card` : "",
  ].filter(Boolean));
}

export function revalidateInstructorAdminPaths(clubSlug: string) {
  revalidateUniquePaths([
    clubAdminPath(clubSlug, "instructors"),
    clubAdminPath(clubSlug, "instructors/classes"),
    clubAdminPath(clubSlug, "instructors/sessions"),
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
