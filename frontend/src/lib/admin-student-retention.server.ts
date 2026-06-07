import "server-only";

import { loadLatestGradeAwardsByUserId } from "@/lib/admin-belt-promotion.server";
import { loadActiveStudentMembershipDetailRows } from "@/lib/admin-club-memberships.server";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import {
  type AdminStudentRetentionRow,
  computeStudentRetentionScore,
  sortRetentionRowsByRiskScore,
} from "@/lib/admin-student-retention.shared";
import { isActiveStudentClubMembership } from "@/lib/admin-student-membership.shared";
import { getStudentFullName } from "@/lib/attendance";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { clubAdminPath } from "@/lib/clubs.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SUPABASE_IN_BATCH_SIZE = 100;
const ATTENDANCE_PAGE_SIZE = 1000;

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface AttendanceRecordRow {
  user_id: string;
  attended_on: string;
}

interface SessionAttendeeBookingRow {
  user_id: string;
  booking_status: string | null;
  class_sessions:
    | {
        starts_at: string;
        status: string | null;
        club_id: string;
      }
    | {
        starts_at: string;
        status: string | null;
        club_id: string;
      }[]
    | null;
}

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
}

function chunkIds<T>(ids: T[], batchSize = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

function subtractDaysFromDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysBetweenDateKeys(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T12:00:00`);
  const to = new Date(`${toKey}T12:00:00`);
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function normalizeClassSession(
  session: SessionAttendeeBookingRow["class_sessions"],
) {
  if (!session) {
    return null;
  }

  return Array.isArray(session) ? (session[0] ?? null) : session;
}

async function loadAttendanceDatesByUserId(
  userIds: string[],
  clubId: string,
): Promise<Map<string, string[]>> {
  const datesByUserId = new Map<string, string[]>();

  if (userIds.length === 0) {
    return datesByUserId;
  }

  try {
    const supabase = getSupabaseAdminClient();

    for (const userIdBatch of chunkIds(userIds)) {
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("attendance_records")
          .select("user_id, attended_on")
          .eq("club_id", clubId)
          .in("user_id", userIdBatch)
          .order("attended_on", { ascending: false })
          .range(from, from + ATTENDANCE_PAGE_SIZE - 1);

        if (error) {
          console.error(
            `[retention] attendance_records unavailable: ${error.message}`,
          );
          return datesByUserId;
        }

        const page = (data ?? []) as AttendanceRecordRow[];

        for (const record of page) {
          const dateKey = normalizeToDateKey(record.attended_on);

          if (!dateKey) {
            continue;
          }

          const existing = datesByUserId.get(record.user_id) ?? [];
          existing.push(dateKey);
          datesByUserId.set(record.user_id, existing);
        }

        if (page.length < ATTENDANCE_PAGE_SIZE) {
          break;
        }

        from += ATTENDANCE_PAGE_SIZE;
      }
    }
  } catch (error) {
    console.error("[retention] failed to load attendance records", error);
  }

  for (const [userId, dates] of Array.from(datesByUserId)) {
    datesByUserId.set(userId, Array.from(new Set(dates)).sort().reverse());
  }

  return datesByUserId;
}

async function loadFutureBookingCountsByUserId(
  userIds: string[],
  clubId: string,
): Promise<Map<string, number>> {
  const countsByUserId = new Map<string, number>();

  for (const userId of userIds) {
    countsByUserId.set(userId, 0);
  }

  if (userIds.length === 0) {
    return countsByUserId;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    for (const userIdBatch of chunkIds(userIds)) {
      const { data, error } = await supabase
        .from("session_attendees")
        .select(
          `
          user_id,
          booking_status,
          class_sessions (
            starts_at,
            status,
            club_id
          )
        `,
        )
        .in("user_id", userIdBatch)
        .in("booking_status", ["booked", "waitlisted"]);

      if (error) {
        console.error(
          `[retention] session_attendees unavailable: ${error.message}`,
        );
        return countsByUserId;
      }

      for (const row of (data ?? []) as unknown as SessionAttendeeBookingRow[]) {
        const session = normalizeClassSession(row.class_sessions);

        if (!session || session.club_id !== clubId) {
          continue;
        }

        if (session.status === "cancelled" || session.starts_at < nowIso) {
          continue;
        }

        countsByUserId.set(
          row.user_id,
          (countsByUserId.get(row.user_id) ?? 0) + 1,
        );
      }
    }
  } catch (error) {
    console.error("[retention] failed to load future bookings", error);
  }

  return countsByUserId;
}

async function getBeltLevelsById(beltLevelIds: string[]) {
  if (beltLevelIds.length === 0) {
    return new Map<string, BeltLevelRow>();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count")
    .in("id", beltLevelIds);

  if (error) {
    console.error(`[retention] belt levels unavailable: ${error.message}`);
    return new Map<string, BeltLevelRow>();
  }

  return new Map(
    ((data ?? []) as BeltLevelRow[]).map((beltLevel) => [beltLevel.id, beltLevel]),
  );
}

export async function loadAdminStudentRetentionRows(
  clubId: string,
  clubSlug: string,
): Promise<AdminStudentRetentionRow[]> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgoKey = subtractDaysFromDateKey(todayKey, 30);

  const membershipRows = await loadActiveStudentMembershipDetailRows(clubId);

  if (membershipRows.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const userIds = membershipRows.map((membership) => membership.user_id);

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .in("id", userIds);

  if (usersError) {
    throw new Error(`Failed to load student profiles: ${usersError.message}`);
  }

  const userById = new Map(
    ((users ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  const [attendanceDatesByUserId, futureBookingsByUserId, latestGradeAwardByUserId] =
    await Promise.all([
      loadAttendanceDatesByUserId(userIds, clubId),
      loadFutureBookingCountsByUserId(userIds, clubId),
      loadLatestGradeAwardsByUserId(userIds, clubId).catch((error) => {
        console.error("[retention] grade awards unavailable", error);
        return new Map<string, { belt_level_id: string | null; awarded_at: string }>();
      }),
    ]);

  const beltLevelIds = Array.from(
    new Set(
      Array.from(latestGradeAwardByUserId.values())
        .map((award) => award.belt_level_id)
        .filter((beltLevelId): beltLevelId is string => Boolean(beltLevelId)),
    ),
  );

  const beltLevelById = await getBeltLevelsById(beltLevelIds);
  const rows: AdminStudentRetentionRow[] = [];

  for (const membership of membershipRows) {
    if (!isActiveStudentClubMembership(membership)) {
      continue;
    }

    const user = userById.get(membership.user_id);

    if (!user) {
      continue;
    }

    const attendanceDates = attendanceDatesByUserId.get(user.id) ?? [];
    const lastAttendanceDate = attendanceDates[0] ?? null;
    const daysSinceLastAttendance = lastAttendanceDate
      ? daysBetweenDateKeys(lastAttendanceDate, todayKey)
      : null;
    const attendanceLast30Days = attendanceDates.filter(
      (dateKey) => dateKey >= thirtyDaysAgoKey && dateKey <= todayKey,
    ).length;

    const joinedAtKey = normalizeToDateKey(membership.joined_at);
    const daysSinceJoined = joinedAtKey
      ? daysBetweenDateKeys(joinedAtKey, todayKey)
      : null;

    const latestAward = latestGradeAwardByUserId.get(user.id);
    const lastGradeDateKey = latestAward
      ? normalizeToDateKey(latestAward.awarded_at)
      : null;
    const daysSinceLastGrade = lastGradeDateKey
      ? daysBetweenDateKeys(lastGradeDateKey, todayKey)
      : null;
    const beltLevel = latestAward?.belt_level_id
      ? beltLevelById.get(latestAward.belt_level_id)
      : null;

    const scoreResult = computeStudentRetentionScore({
      daysSinceLastAttendance,
      attendanceLast30Days,
      futureBookingsCount: futureBookingsByUserId.get(user.id) ?? 0,
      membershipStatus: membership.status,
      daysSinceJoined,
      daysSinceLastGrade,
      hasGradeData: Boolean(latestAward),
    });

    rows.push({
      userId: user.id,
      fullName: getStudentFullName(user.first_name, user.last_name),
      beltLabel: beltLevel ? formatAdminBeltLabel(beltLevel) : null,
      profileHref: clubAdminPath(clubSlug, `students/${user.id}/profile`),
      lastAttendanceDate,
      daysSinceLastAttendance,
      attendanceLast30Days,
      futureBookingsCount: futureBookingsByUserId.get(user.id) ?? 0,
      score: scoreResult.score,
      level: scoreResult.level,
      reasons: scoreResult.reasons,
      suggestedActions: scoreResult.suggestedActions,
    });
  }

  return sortRetentionRowsByRiskScore(rows);
}
