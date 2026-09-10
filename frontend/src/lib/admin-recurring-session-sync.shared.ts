import { resolveScheduleDateKey } from "@/lib/class-session-schedule";
import {
  addLondonCalendarDays,
  encodeLocationForExternalId,
  londonLocalDateTimeToUtcIso,
  normalizeLondonClockTime,
  utcIsoToLondonDayOfWeek,
} from "@/lib/london-datetime";

export interface RecurringSessionSyncScheduleInput {
  scheduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
}

export interface RecurringSessionSyncSourceRow {
  id: string;
  startsAt: string;
  endsAt: string;
  externalId: string | null;
}

export interface RecurringSessionSyncTarget {
  id: string;
  startsAt: string;
  endsAt: string;
  externalId: string;
  timingChanged: boolean;
}

/** Shift a London calendar date to the target weekday, moving forward within the week cycle. */
export function shiftLondonDateKeyToDayOfWeek(
  dateKey: string,
  targetDayOfWeek: number,
) {
  const noonIso = londonLocalDateTimeToUtcIso(dateKey, "12:00");
  const currentDayOfWeek = utcIsoToLondonDayOfWeek(noonIso);
  const deltaDays = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

  return addLondonCalendarDays(dateKey, deltaDays);
}

export function buildAdminRecurringSessionExternalId(input: {
  scheduleId: string;
  dateKey: string;
  startTime: string;
  location: string;
}) {
  const startTime = normalizeLondonClockTime(input.startTime);

  return `admin_recurring:${input.scheduleId}:${input.dateKey}:${startTime}:${encodeLocationForExternalId(input.location)}`;
}

/** Recompute starts_at / ends_at / external_id for one future session from the recurring template. */
export function computeSyncedRecurringSessionFields(
  session: Pick<RecurringSessionSyncSourceRow, "startsAt" | "externalId">,
  schedule: RecurringSessionSyncScheduleInput,
) {
  const currentDateKey = resolveScheduleDateKey({
    startsAt: session.startsAt,
    externalId: session.externalId,
  });
  const nextDateKey = shiftLondonDateKeyToDayOfWeek(
    currentDateKey,
    schedule.dayOfWeek,
  );
  const startTime = normalizeLondonClockTime(schedule.startTime);
  const endTime = normalizeLondonClockTime(schedule.endTime);
  const startsAt = londonLocalDateTimeToUtcIso(nextDateKey, startTime);
  const endsAt = londonLocalDateTimeToUtcIso(nextDateKey, endTime);
  const externalId = buildAdminRecurringSessionExternalId({
    scheduleId: schedule.scheduleId,
    dateKey: nextDateKey,
    startTime,
    location: schedule.location,
  });

  return {
    dateKey: nextDateKey,
    startTime,
    endTime,
    startsAt,
    endsAt,
    externalId,
  };
}

function toStartsAtKey(value: string) {
  return new Date(value).toISOString();
}

/**
 * Plan in-place updates for future sessions. Preserves session ids.
 * Skips targets that would collide with another legitimate session slot.
 */
export function planRecurringSessionSyncTargets(input: {
  sessions: readonly RecurringSessionSyncSourceRow[];
  schedule: RecurringSessionSyncScheduleInput;
  /** Occupied (club, class, starts_at) keys for sessions outside this update set. */
  occupiedStartsAtKeys: ReadonlySet<string>;
}): {
  targets: RecurringSessionSyncTarget[];
  skippedCollisionIds: string[];
} {
  const draftTargets: RecurringSessionSyncTarget[] = [];
  const skippedCollisionIds: string[] = [];
  const claimedStartsAt = new Map<string, string>();

  for (const session of input.sessions) {
    const synced = computeSyncedRecurringSessionFields(session, input.schedule);
    const startsAtKey = toStartsAtKey(synced.startsAt);
    const timingChanged =
      toStartsAtKey(session.startsAt) !== startsAtKey ||
      toStartsAtKey(session.endsAt) !== toStartsAtKey(synced.endsAt) ||
      (session.externalId ?? "") !== synced.externalId;

    const occupiedByOther = input.occupiedStartsAtKeys.has(startsAtKey);
    const claimedBySibling = claimedStartsAt.get(startsAtKey);
    const colliding =
      (occupiedByOther && toStartsAtKey(session.startsAt) !== startsAtKey) ||
      (claimedBySibling !== undefined && claimedBySibling !== session.id);

    if (colliding) {
      skippedCollisionIds.push(session.id);
      continue;
    }

    claimedStartsAt.set(startsAtKey, session.id);
    draftTargets.push({
      id: session.id,
      startsAt: synced.startsAt,
      endsAt: synced.endsAt,
      externalId: synced.externalId,
      timingChanged,
    });
  }

  return {
    targets: draftTargets,
    skippedCollisionIds,
  };
}
