import "server-only";

import {
  ATTENDANCE_RECORDS_BJJ_BULK_SELECT,
  buildBjjAttendanceSummary,
  isBjjAttendanceRecordWithJoinedSession,
  type BjjAttendanceRecord,
  type BjjAttendanceRecordRow,
  type BjjAttendanceSummary,
} from "@/lib/admin-bjj-attendance.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AttendanceRecordWithJoinRow = BjjAttendanceRecordRow;

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkIds<T>(ids: T[], batchSize = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

const SUPABASE_PAGE_SIZE = 1000;

const SESSION_LESS_ATTENDANCE_SELECT =
  "id, user_id, attended_on, class_session_id, source";

async function loadSessionLessAttendanceRecordRowsForClub(
  userIds: string[],
  clubId: string,
  dateRange?: { startDate: string; endDate: string },
): Promise<AttendanceRecordRow[]> {
  const supabase = getSupabaseAdminClient();
  const allRecords: AttendanceRecordRow[] = [];

  for (const userIdBatch of chunkIds(userIds)) {
    let from = 0;

    while (true) {
      let query = supabase
        .from("attendance_records")
        .select(SESSION_LESS_ATTENDANCE_SELECT)
        .in("user_id", userIdBatch)
        .eq("club_id", clubId)
        .is("class_session_id", null)
        .order("attended_on", { ascending: false })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);

      if (dateRange) {
        query = query
          .gte("attended_on", dateRange.startDate)
          .lte("attended_on", dateRange.endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to load session-less attendance records: ${error.message}`);
      }

      const page = (data ?? []) as AttendanceRecordRow[];
      allRecords.push(...page);

      if (page.length < SUPABASE_PAGE_SIZE) {
        break;
      }

      from += SUPABASE_PAGE_SIZE;
    }
  }

  return allRecords;
}

async function loadSessionLinkedBjjAttendanceRecordRowsForClub(
  userIds: string[],
  clubId: string,
  dateRange?: { startDate: string; endDate: string },
): Promise<AttendanceRecordRow[]> {
  const supabase = getSupabaseAdminClient();
  const allRecords: AttendanceRecordRow[] = [];

  for (const userIdBatch of chunkIds(userIds)) {
    let from = 0;

    while (true) {
      let query = supabase
        .from("attendance_records")
        .select(ATTENDANCE_RECORDS_BJJ_BULK_SELECT)
        .in("user_id", userIdBatch)
        .eq("club_id", clubId)
        .not("class_session_id", "is", null)
        .eq("class_sessions.classes.programme_type", "bjj")
        .order("attended_on", { ascending: false })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);

      if (dateRange) {
        query = query
          .gte("attended_on", dateRange.startDate)
          .lte("attended_on", dateRange.endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to load BJJ attendance records: ${error.message}`);
      }

      const page = (data ?? []) as AttendanceRecordRow[];
      allRecords.push(...page);

      if (page.length < SUPABASE_PAGE_SIZE) {
        break;
      }

      from += SUPABASE_PAGE_SIZE;
    }
  }

  return allRecords;
}

async function loadAllAttendanceRecordRowsForClub(
  userIds: string[],
  clubId: string,
  dateRange?: { startDate: string; endDate: string },
): Promise<AttendanceRecordRow[]> {
  const [sessionLessRecords, sessionLinkedBjjRecords] = await Promise.all([
    loadSessionLessAttendanceRecordRowsForClub(userIds, clubId, dateRange),
    loadSessionLinkedBjjAttendanceRecordRowsForClub(userIds, clubId, dateRange),
  ]);

  return [...sessionLessRecords, ...sessionLinkedBjjRecords];
}

interface AttendanceRecordRow extends AttendanceRecordWithJoinRow {
  id: string;
  user_id: string;
}

/**
 * Same attendance_records + BJJ filter as attendance-card.server.ts (all years).
 * Replaces the separate-query path that only counted session-linked rows (returned 1 for Cameron).
 */
export async function loadBjjAttendanceRecordsUsingAttendanceCardQuery(
  userId: string,
  clubId: string,
): Promise<BjjAttendanceRecord[]> {
  const records = await loadAllAttendanceRecordRowsForClub([userId], clubId);
  return filterBjjRecordsByUserIdFromJoinedRows(records).get(userId) ?? [];
}

export async function loadBjjAttendanceRecordsForYear(
  userId: string,
  clubId: string,
  year: number,
): Promise<Array<{ id: string; user_id: string; attended_on: string }>> {
  const records = await loadAllAttendanceRecordRowsForClub([userId], clubId, {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  });

  return records
    .filter((record) => isBjjAttendanceRecordWithJoinedSession(record))
    .map(({ id, user_id, attended_on }) => ({ id, user_id, attended_on }));
}

function filterBjjRecordsByUserIdFromJoinedRows(records: AttendanceRecordRow[]) {
  const recordsByUserId = new Map<string, BjjAttendanceRecord[]>();

  for (const record of records) {
    if (!isBjjAttendanceRecordWithJoinedSession(record)) {
      continue;
    }

    const userRecords = recordsByUserId.get(record.user_id) ?? [];
    userRecords.push({ attended_on: record.attended_on });
    recordsByUserId.set(record.user_id, userRecords);
  }

  return recordsByUserId;
}

export async function loadBjjAttendanceSummariesByUserId(
  userIds: string[],
  clubId: string,
  currentLevelAwardedAtByUserId: Map<string, string | null> = new Map(),
): Promise<Map<string, BjjAttendanceSummary>> {
  const summariesByUserId = new Map<string, BjjAttendanceSummary>();

  for (const userId of userIds) {
    summariesByUserId.set(
      userId,
      buildBjjAttendanceSummary([], currentLevelAwardedAtByUserId.get(userId) ?? null),
    );
  }

  if (userIds.length === 0) {
    return summariesByUserId;
  }

  const records = await loadAllAttendanceRecordRowsForClub(userIds, clubId);

  if (records.length === 0) {
    return summariesByUserId;
  }

  const recordsByUserId = filterBjjRecordsByUserIdFromJoinedRows(records);

  for (const userId of userIds) {
    const bjjRecords = recordsByUserId.get(userId) ?? [];
    summariesByUserId.set(
      userId,
      buildBjjAttendanceSummary(
        bjjRecords,
        currentLevelAwardedAtByUserId.get(userId) ?? null,
      ),
    );
  }

  return summariesByUserId;
}

/** @deprecated Use loadBjjAttendanceSummariesByUserId — returns raw rows for promotion helpers. */
export async function loadBjjAttendanceRecordsByUserId(
  userIds: string[],
  clubId: string,
): Promise<Map<string, BjjAttendanceRecord[]>> {
  const summaries = await loadBjjAttendanceSummariesByUserId(userIds, clubId);
  const recordsByUserId = new Map<string, BjjAttendanceRecord[]>();

  for (const [userId, summary] of Array.from(summaries)) {
    recordsByUserId.set(userId, summary.bjjRecords);
  }

  return recordsByUserId;
}

export async function loadBjjAttendanceSummary(
  userId: string,
  clubId: string,
  currentLevelAwardedAt: string | null = null,
): Promise<BjjAttendanceSummary> {
  const bjjRecords = await loadBjjAttendanceRecordsUsingAttendanceCardQuery(
    userId,
    clubId,
  );

  return buildBjjAttendanceSummary(bjjRecords, currentLevelAwardedAt);
}
