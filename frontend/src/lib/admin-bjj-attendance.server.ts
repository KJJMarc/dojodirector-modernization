import "server-only";

import {
  ATTENDANCE_RECORDS_BJJ_BULK_SELECT,
  ATTENDANCE_RECORDS_BJJ_SELECT,
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

async function loadAllAttendanceRecordRowsForClub(
  userIds: string[],
  clubId: string,
): Promise<AttendanceRecordRow[]> {
  const supabase = getSupabaseAdminClient();
  const allRecords: AttendanceRecordRow[] = [];
  const pageSize = 1000;

  for (const userIdBatch of chunkIds(userIds)) {
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(ATTENDANCE_RECORDS_BJJ_BULK_SELECT)
        .in("user_id", userIdBatch)
        .eq("club_id", clubId)
        .order("attended_on", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Failed to load attendance records: ${error.message}`);
      }

      const page = (data ?? []) as AttendanceRecordRow[];
      allRecords.push(...page);

      if (page.length < pageSize) {
        break;
      }

      from += pageSize;
    }
  }

  return allRecords;
}

interface AttendanceRecordRow extends AttendanceRecordWithJoinRow {
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
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select(ATTENDANCE_RECORDS_BJJ_SELECT)
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("attended_on", { ascending: false });

  if (error) {
    throw new Error(`Failed to load attendance records: ${error.message}`);
  }

  return ((data ?? []) as AttendanceRecordWithJoinRow[])
    .filter((record) => isBjjAttendanceRecordWithJoinedSession(record))
    .map((record) => ({ attended_on: record.attended_on }));
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
