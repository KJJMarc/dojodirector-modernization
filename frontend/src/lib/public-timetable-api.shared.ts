/**
 * Public JSON timetable payload — maps the HTML timetable grouping to a
 * read-only contract for the Kingston website. Does not add private fields.
 */

import {
  PROGRAMME_TYPES,
  formatProgrammeTypeLabel,
  type ProgrammeType,
} from "@/lib/admin-programme-types";
import { getClubIanaTimeZone } from "@/lib/clubs.shared";
import type { PublicTimetableVenueGroup } from "@/lib/public-timetable.shared";

export const PUBLIC_TIMETABLE_API_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export interface PublicTimetableApiClass {
  id: string;
  classId: string | null;
  name: string;
  day: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string | null;
  venue: string;
  ageGroup: string | null;
  programme: string | null;
  programmeType: string | null;
  instructor: string | null;
  displayColour: string | null;
}

export interface PublicTimetableApiDay {
  day: string;
  dayOfWeek: number;
  classes: PublicTimetableApiClass[];
}

export interface PublicTimetableApiVenue {
  name: string;
  days: PublicTimetableApiDay[];
}

export interface PublicTimetableApiClub {
  slug: string;
  name: string;
}

export interface PublicTimetableApiResponse {
  club: PublicTimetableApiClub;
  timeZone: string;
  venues: PublicTimetableApiVenue[];
}

function formatPublicProgrammeLabel(programmeType: string | null): string | null {
  if (!programmeType) {
    return null;
  }

  if (!PROGRAMME_TYPES.includes(programmeType as ProgrammeType)) {
    return programmeType;
  }

  return formatProgrammeTypeLabel(programmeType as ProgrammeType);
}

export function buildPublicTimetableApiResponse(input: {
  club: PublicTimetableApiClub;
  venues: readonly PublicTimetableVenueGroup[];
}): PublicTimetableApiResponse {
  return {
    club: {
      slug: input.club.slug,
      name: input.club.name,
    },
    timeZone: getClubIanaTimeZone(input.club.slug),
    venues: input.venues.map((venue) => ({
      name: venue.venueName,
      days: venue.days.map((day) => ({
        day: day.dayLabel,
        dayOfWeek: day.dayOfWeek,
        classes: day.classes.map((entry) => ({
          id: entry.id,
          classId: entry.classId,
          name: entry.className,
          day: entry.dayLabel,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime || null,
          venue: entry.locationLabel,
          ageGroup: null,
          programme: formatPublicProgrammeLabel(entry.programmeType),
          programmeType: entry.programmeType,
          instructor: null,
          displayColour: null,
        })),
      })),
    })),
  };
}

export function publicTimetableApiHeaders(kind: "ok" | "error"): HeadersInit {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control":
      kind === "ok" ? PUBLIC_TIMETABLE_API_CACHE_CONTROL : "private, no-store",
  };

  return cors;
}
