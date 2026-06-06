export type InstructorPortalSection = "messages" | "my-classes" | "session-cover";

export function instructorPortalEntryPath() {
  return "/instructor-portal";
}

export function instructorPortalLoginPath() {
  return "/instructor-portal/login";
}

export function instructorPortalClubPath(
  clubSlug: string,
  section?: InstructorPortalSection,
) {
  const normalizedClubSlug = clubSlug.trim().replace(/^\/+|\/+$/g, "");
  const base = `/instructor-portal/${normalizedClubSlug}`;

  return section ? `${base}/${section}` : base;
}

export function instructorPortalAttendanceKioskPath(
  clubSlug: string,
  sessionId: string,
) {
  return `${instructorPortalClubPath(clubSlug)}/attendance-kiosk/${sessionId}`;
}
