/**
 * Public class timetable helpers — pure grouping, sorting, and UK time formatting.
 * Recurring_class_schedules remain the single source of truth; this never invents data.
 */

import {
  DAY_OF_WEEK_OPTIONS,
  formatDayOfWeekLabel,
  getMondayFirstDayOrder,
} from "@/lib/admin-recurring-classes.shared";

export const PUBLIC_TIMETABLE_UNASSIGNED_VENUE_LABEL = "Venue to be confirmed";

export const PUBLIC_TIMETABLE_EMPTY_MESSAGE =
  "The class timetable is currently being updated. Please check back soon.";

/** Monday-first weekday order labels (Mon … Sun). */
export const PUBLIC_TIMETABLE_WEEKDAY_ORDER = [
  1, // Monday
  2,
  3,
  4,
  5,
  6,
  0, // Sunday last
] as const;

export interface PublicTimetableClassEntry {
  id: string;
  className: string;
  dayOfWeek: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
  /** UK 12-hour range, e.g. "6:00 pm–7:00 pm". */
  timeRangeLabel: string;
  locationKey: string;
  locationLabel: string;
}

export interface PublicTimetableDayGroup {
  dayOfWeek: number;
  dayLabel: string;
  classes: PublicTimetableClassEntry[];
}

export interface PublicTimetableVenueGroup {
  locationKey: string;
  venueName: string;
  /** Free-text location may include address; no separate address column exists. */
  venueAddress: string | null;
  days: PublicTimetableDayGroup[];
}

export interface PublicTimetableScheduleInput {
  id: string;
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string | null | undefined;
  location: string | null | undefined;
  isActive: boolean;
  classIsActive?: boolean;
}

export function normalizePublicTimetableClockTime(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** UK wall-clock label from HH:MM — "6:00 pm", "12:30 pm", "12:00 am". */
export function formatPublicTimetableUkTime(timeValue: string | null | undefined) {
  const normalized = normalizePublicTimetableClockTime(timeValue);

  if (!normalized) {
    return "—";
  }

  const [hoursRaw, minutesRaw] = normalized.split(":").map(Number);
  const hours24 = hoursRaw;
  const period = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(minutesRaw).padStart(2, "0")} ${period}`;
}

/**
 * Format start–end range. If end is missing or invalid, show start only.
 * If end is earlier than start (schema normally forbids this), still show both
 * so overnight display does not crash.
 */
export function formatPublicTimetableTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
) {
  const startLabel = formatPublicTimetableUkTime(startTime);

  if (startLabel === "—") {
    return "—";
  }

  const endNormalized = normalizePublicTimetableClockTime(endTime);

  if (!endNormalized) {
    return startLabel;
  }

  return `${startLabel}–${formatPublicTimetableUkTime(endNormalized)}`;
}

export function resolvePublicTimetableVenue(
  location: string | null | undefined,
): { locationKey: string; venueName: string; venueAddress: string | null } {
  const trimmed = location?.trim() ?? "";

  if (!trimmed) {
    return {
      locationKey: "",
      venueName: PUBLIC_TIMETABLE_UNASSIGNED_VENUE_LABEL,
      venueAddress: null,
    };
  }

  return {
    locationKey: trimmed.toLowerCase(),
    venueName: trimmed,
    venueAddress: null,
  };
}

export function isPublicTimetableScheduleVisible(
  schedule: Pick<PublicTimetableScheduleInput, "isActive" | "classIsActive">,
) {
  if (!schedule.isActive) {
    return false;
  }

  if (schedule.classIsActive === false) {
    return false;
  }

  return true;
}

function isValidDayOfWeek(dayOfWeek: number) {
  return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6;
}

function countVenueClasses(byDay: Map<number, PublicTimetableClassEntry[]>) {
  return Array.from(byDay.values()).reduce(
    (total, classes) => total + classes.length,
    0,
  );
}

/**
 * Prefer venues with the most classes first (e.g. Tiffin when it hosts the
 * majority). Unassigned always last; name is the tie-break.
 */
function compareVenuesByClassCount(
  left: { locationKey: string; classCount: number },
  right: { locationKey: string; classCount: number },
) {
  if (!left.locationKey && right.locationKey) {
    return 1;
  }

  if (left.locationKey && !right.locationKey) {
    return -1;
  }

  if (right.classCount !== left.classCount) {
    return right.classCount - left.classCount;
  }

  return left.locationKey.localeCompare(right.locationKey, "en", {
    sensitivity: "base",
  });
}

function compareClassEntries(
  left: PublicTimetableClassEntry,
  right: PublicTimetableClassEntry,
) {
  const dayCompare =
    getMondayFirstDayOrder(left.dayOfWeek) - getMondayFirstDayOrder(right.dayOfWeek);

  if (dayCompare !== 0) {
    return dayCompare;
  }

  const timeCompare = left.startTime.localeCompare(right.startTime);

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return left.className.localeCompare(right.className, "en", {
    sensitivity: "base",
  });
}

export function buildPublicTimetableClassEntry(
  schedule: PublicTimetableScheduleInput,
): PublicTimetableClassEntry | null {
  if (!isPublicTimetableScheduleVisible(schedule)) {
    return null;
  }

  if (!isValidDayOfWeek(schedule.dayOfWeek)) {
    return null;
  }

  const startTime = normalizePublicTimetableClockTime(schedule.startTime) ?? "00:00";
  const endTime = normalizePublicTimetableClockTime(schedule.endTime);
  const venue = resolvePublicTimetableVenue(schedule.location);
  const className = schedule.className?.trim() || "Class";

  return {
    id: schedule.id,
    className,
    dayOfWeek: schedule.dayOfWeek,
    dayLabel: formatDayOfWeekLabel(schedule.dayOfWeek),
    startTime,
    endTime: endTime ?? "",
    timeRangeLabel: formatPublicTimetableTimeRange(startTime, endTime),
    locationKey: venue.locationKey,
    locationLabel: venue.venueName,
  };
}

/** Group active schedules by venue, then Mon–Sun days with chronological classes. */
export function buildPublicTimetableVenueGroups(
  schedules: readonly PublicTimetableScheduleInput[],
): PublicTimetableVenueGroup[] {
  const entries = schedules
    .map((schedule) => buildPublicTimetableClassEntry(schedule))
    .filter((entry): entry is PublicTimetableClassEntry => entry !== null)
    .sort(compareClassEntries);

  const venueMap = new Map<
    string,
    {
      venueName: string;
      venueAddress: string | null;
      byDay: Map<number, PublicTimetableClassEntry[]>;
    }
  >();

  for (const entry of entries) {
    let venue = venueMap.get(entry.locationKey);

    if (!venue) {
      const resolved = resolvePublicTimetableVenue(
        entry.locationKey ? entry.locationLabel : "",
      );
      venue = {
        venueName: resolved.venueName,
        venueAddress: resolved.venueAddress,
        byDay: new Map(),
      };
      venueMap.set(entry.locationKey, venue);
    }

    const dayClasses = venue.byDay.get(entry.dayOfWeek) ?? [];
    dayClasses.push(entry);
    venue.byDay.set(entry.dayOfWeek, dayClasses);
  }

  const venueKeys = Array.from(venueMap.entries())
    .map(([locationKey, venue]) => ({
      locationKey,
      classCount: countVenueClasses(venue.byDay),
    }))
    .sort(compareVenuesByClassCount)
    .map((entry) => entry.locationKey);

  return venueKeys.map((locationKey) => {
    const venue = venueMap.get(locationKey)!;
    const days: PublicTimetableDayGroup[] = [];

    for (const dayOfWeek of PUBLIC_TIMETABLE_WEEKDAY_ORDER) {
      const classes = venue.byDay.get(dayOfWeek);

      if (!classes || classes.length === 0) {
        continue;
      }

      days.push({
        dayOfWeek,
        dayLabel:
          DAY_OF_WEEK_OPTIONS.find((option) => option.value === dayOfWeek)?.label ??
          formatDayOfWeekLabel(dayOfWeek),
        classes: [...classes].sort((left, right) => {
          const timeCompare = left.startTime.localeCompare(right.startTime);

          if (timeCompare !== 0) {
            return timeCompare;
          }

          return left.className.localeCompare(right.className, "en", {
            sensitivity: "base",
          });
        }),
      });
    }

    return {
      locationKey,
      venueName: venue.venueName,
      venueAddress: venue.venueAddress,
      days,
    };
  });
}

export function getPublicTimetableDayLabelsMondayFirst() {
  return PUBLIC_TIMETABLE_WEEKDAY_ORDER.map(
    (dayOfWeek) =>
      DAY_OF_WEEK_OPTIONS.find((option) => option.value === dayOfWeek)?.label ??
      formatDayOfWeekLabel(dayOfWeek),
  );
}
