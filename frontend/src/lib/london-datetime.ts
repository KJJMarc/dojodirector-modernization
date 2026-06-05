export const LONDON_TIMEZONE = "Europe/London";

function getLondonParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function londonLocalDateTimeToUtcIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = getLondonParts(new Date(guess));
    const londonYear = Number(parts.year);
    const londonMonth = Number(parts.month);
    const londonDay = Number(parts.day);
    const londonHour = Number(parts.hour);
    const londonMinute = Number(parts.minute);

    if (
      londonYear === year &&
      londonMonth === month &&
      londonDay === day &&
      londonHour === hour &&
      londonMinute === minute
    ) {
      return new Date(guess).toISOString();
    }

    const targetMinutes = hour * 60 + minute;
    const actualMinutes = londonHour * 60 + londonMinute;
    guess += (targetMinutes - actualMinutes) * 60 * 1000;
  }

  return new Date(guess).toISOString();
}

export function utcIsoToLondonDate(iso: string) {
  const parts = getLondonParts(new Date(iso));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Today's calendar date in Europe/London (YYYY-MM-DD). */
export function getLondonTodayDateKey(from = new Date()) {
  return utcIsoToLondonDate(from.toISOString());
}

/** Add calendar days to a London date key (YYYY-MM-DD). */
export function addLondonCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  const y = anchor.getUTCFullYear();
  const m = String(anchor.getUTCMonth() + 1).padStart(2, "0");
  const d = String(anchor.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function daysBetweenLondonDateKeys(startKey: string, endKey: string) {
  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endKey.split("-").map(Number);
  const startMs = Date.UTC(startYear, startMonth - 1, startDay);
  const endMs = Date.UTC(endYear, endMonth - 1, endDay);

  return Math.round((endMs - startMs) / 86_400_000);
}

/** Inclusive London calendar range as UTC instants [start, end) for timestamptz queries. */
export function getLondonDateRangeIso(options: {
  daysAhead: number;
  from?: Date;
}) {
  const todayKey = getLondonTodayDateKey(options.from);
  const endKey = addLondonCalendarDays(todayKey, options.daysAhead);

  return {
    startIso: londonLocalDateTimeToUtcIso(todayKey, "00:00"),
    endIso: londonLocalDateTimeToUtcIso(endKey, "00:00"),
    startDateKey: todayKey,
    endDateKey: endKey,
  };
}

/** London calendar today [00:00, tomorrow 00:00) as UTC instants. */
export function getLondonTodayRange(from = new Date()) {
  const todayKey = getLondonTodayDateKey(from);
  const tomorrowKey = addLondonCalendarDays(todayKey, 1);

  return {
    startIso: londonLocalDateTimeToUtcIso(todayKey, "00:00"),
    endIso: londonLocalDateTimeToUtcIso(tomorrowKey, "00:00"),
  };
}

export function formatLondonShortDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: LONDON_TIMEZONE,
  }).format(new Date(iso));
}

export function formatLondonShortDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: LONDON_TIMEZONE,
  }).format(new Date(iso));
}

export function utcIsoToLondonTime(iso: string) {
  const parts = getLondonParts(new Date(iso));
  return `${parts.hour}:${parts.minute}`;
}

const LONDON_WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Day of week in Europe/London (0 = Sunday, 6 = Saturday). */
export function utcIsoToLondonDayOfWeek(iso: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: LONDON_TIMEZONE,
    weekday: "short",
  }).format(new Date(iso));

  return LONDON_WEEKDAY_TO_DOW[weekday] ?? 0;
}

/** Normalise HH:MM or HH:MM:SS to zero-padded HH:MM for timetable comparisons. */
export function normalizeLondonClockTime(value: string) {
  const [hourPart, minutePart = "00"] = value.trim().split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value.trim().slice(0, 5);
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function encodeLocationForExternalId(location: string) {
  return location.trim().replace(/\s+/g, "_");
}

export function buildAdminSessionExternalId(options: {
  prefix: "admin_recurring" | "admin_one_off";
  classId: string;
  date: string;
  startTime: string;
  location: string;
}) {
  return `${options.prefix}:${options.classId}:${options.date}:${options.startTime}:${encodeLocationForExternalId(options.location)}`;
}
