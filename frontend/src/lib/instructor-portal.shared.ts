import type { ProgrammeType } from "@/lib/admin-programme-types";
import type { InstructorSessionAllocationRow } from "@/lib/admin-instructors.shared";

export interface InstructorPortalIdentity {
  userId: string | null;
  displayName: string;
  slug: string;
  role: string;
  email: string | null;
}

export interface InstructorRecurringClassRow {
  scheduleId: string;
  className: string;
  programmeType: ProgrammeType;
  dayLabel: string;
  timeLabel: string;
  locationLabel: string;
}

export interface InstructorMyClassesPageData {
  identity: InstructorPortalIdentity;
  recurringClasses: InstructorRecurringClassRow[];
  upcomingSessions: InstructorSessionAllocationRow[];
}

export interface InstructorSessionCoverPageData {
  identity: InstructorPortalIdentity;
  sessions: InstructorSessionAllocationRow[];
}

/** Slug from instructor display name, e.g. "Marc Barton" → "marc-barton". */
export function formatInstructorSlugFromName(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function instructorPortalPath(slug: string, section?: "my-classes" | "session-cover") {
  const base = `/instructor/${slug}`;
  return section ? `${base}/${section}` : base;
}
