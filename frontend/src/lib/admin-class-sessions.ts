import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  parseCapacityField,
  parseProgrammeType,
  parseRequiredText,
  parseSessionStatus,
  parseTimeField,
  ProgrammeType,
  SessionStatus,
} from "@/lib/admin-programme-types";
import {
  buildAdminSessionExternalId,
  formatLondonShortDate,
  londonLocalDateTimeToUtcIso,
  utcIsoToLondonDate,
  utcIsoToLondonTime,
} from "@/lib/london-datetime";
import {
  formatScheduleDayLabel,
  formatScheduleTimeRange,
  resolveSessionLocationFromRow,
} from "@/lib/class-session-schedule";
import { getAttendanceScheduleDateRange } from "@/lib/attendance-schedule";
import { formatSessionLocation, getSpacesAvailable } from "@/lib/booking";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AdminClassSessionRow,
  AdminSessionKind,
  EditableClassSession,
} from "@/lib/admin-class-sessions.shared";
import { formatSessionKindLabel } from "@/lib/admin-class-sessions.shared";

export type { AdminClassSessionRow, AdminSessionKind, EditableClassSession };
export { formatSessionKindLabel };

export interface UpdateClassSessionInput {
  sessionId: string;
  title: string;
  programmeType: ProgrammeType;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string;
  description: string | null;
  status: SessionStatus;
}

interface AdminSessionQueryRow {
  id: string;
  class_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
  recurring_schedule_id: string | null;
  classes:
    | {
        id: string;
        name: string;
        programme_type: ProgrammeType;
        description: string | null;
      }
    | {
        id: string;
        name: string;
        programme_type: ProgrammeType;
        description: string | null;
      }[]
    | null;
}

function getJoinedClass(classes: AdminSessionQueryRow["classes"]) {
  if (!classes) {
    return null;
  }

  return Array.isArray(classes) ? classes[0] ?? null : classes;
}

function getSessionKind(row: AdminSessionQueryRow): AdminSessionKind {
  if (row.recurring_schedule_id || row.source === "admin_recurring") {
    return "recurring";
  }

  if (row.source === "admin_one_off") {
    return "one_off";
  }

  return "other";
}

function mapAdminSessionRow(
  row: AdminSessionQueryRow,
  bookedCount: number,
): AdminClassSessionRow {
  const classRow = getJoinedClass(row.classes);
  const location = resolveSessionLocationFromRow(row);
  const status = row.status;
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";

  return {
    id: row.id,
    classId: row.class_id,
    className: classRow?.name ?? "Unnamed class",
    programmeType: classRow?.programme_type ?? "bjj",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location,
    capacity: row.capacity,
    bookedCount,
    spacesAvailable: getSpacesAvailable(row.capacity, bookedCount),
    status,
    isCancelled,
    isCompleted,
    sessionKind: getSessionKind(row),
    description: classRow?.description ?? null,
    dateLabel: formatLondonShortDate(row.starts_at),
    dayLabel: formatScheduleDayLabel(row.starts_at),
    timeLabel: formatScheduleTimeRange(row.starts_at, row.ends_at, row.external_id),
    locationLabel: formatSessionLocation(location),
  };
}

async function loadAdminSessionRows(
  clubId: string,
  startIso: string,
  endIso: string,
): Promise<AdminSessionQueryRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id, classes(id, name, programme_type, description)",
    )
    .eq("club_id", clubId)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load class sessions: ${error.message}`);
  }

  return (data ?? []) as AdminSessionQueryRow[];
}

async function getBookedCountsBySessionId(sessionIds: string[]) {
  const counts = new Map<string, number>();

  if (sessionIds.length === 0) {
    return counts;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("class_session_id, booking_status")
    .in("class_session_id", sessionIds);

  if (error) {
    throw new Error(`Failed to load session bookings: ${error.message}`);
  }

  for (const row of data ?? []) {
    if (row.booking_status !== "booked") {
      continue;
    }

    counts.set(
      row.class_session_id,
      (counts.get(row.class_session_id) ?? 0) + 1,
    );
  }

  return counts;
}

export async function getAdminUpcomingClassSessions(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminClassSessionRow[]> {
  const { startIso, endIso } = getAttendanceScheduleDateRange();
  const rows = await loadAdminSessionRows(clubId, startIso, endIso);
  const bookedCounts = await getBookedCountsBySessionId(rows.map((row) => row.id));

  return rows.map((row) => mapAdminSessionRow(row, bookedCounts.get(row.id) ?? 0));
}

async function getAdminSessionById(sessionId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id, classes(id, name, programme_type, description)",
    )
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  return data as AdminSessionQueryRow;
}

export async function getEditableClassSession(
  sessionId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<EditableClassSession> {
  const row = await getAdminSessionById(sessionId, clubId);
  const classRow = getJoinedClass(row.classes);
  const location = resolveSessionLocationFromRow(row) ?? "";

  return {
    id: row.id,
    classId: row.class_id,
    title: classRow?.name ?? "",
    programmeType: classRow?.programme_type ?? "bjj",
    date: utcIsoToLondonDate(row.starts_at),
    startTime: utcIsoToLondonTime(row.starts_at),
    endTime: row.ends_at ? utcIsoToLondonTime(row.ends_at) : "",
    capacity: row.capacity ?? 1,
    location,
    description: classRow?.description ?? null,
    status: parseSessionStatus(row.status ?? "scheduled"),
    sessionKind: getSessionKind(row),
    recurringScheduleId: row.recurring_schedule_id,
  };
}

export function parseUpdateClassSessionInput(formData: FormData): UpdateClassSessionInput {
  const sessionId = parseRequiredText(formData.get("sessionId"), "Session id");
  const title = parseRequiredText(formData.get("title"), "Title");
  const programmeType = parseProgrammeType(String(formData.get("programmeType") ?? ""));
  const date = parseRequiredText(formData.get("date"), "Date");
  const startTime = parseTimeField(String(formData.get("startTime") ?? ""), "Start time");
  const endTime = parseTimeField(String(formData.get("endTime") ?? ""), "End time");
  const capacity = parseCapacityField(formData.get("capacity"));
  const location = parseRequiredText(formData.get("location"), "Venue/location");
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = parseSessionStatus(String(formData.get("status") ?? ""));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  return {
    sessionId,
    title,
    programmeType,
    date,
    startTime,
    endTime,
    capacity,
    location,
    description,
    status,
  };
}

function resolveExternalIdPrefix(
  sessionKind: AdminSessionKind,
): "admin_recurring" | "admin_one_off" {
  return sessionKind === "one_off" ? "admin_one_off" : "admin_recurring";
}

export async function updateClassSession(
  input: UpdateClassSessionInput,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const existing = await getEditableClassSession(input.sessionId, clubId);
  const supabase = getSupabaseAdminClient();

  const { data: classTemplate, error: classError } = await supabase
    .from("classes")
    .select("id, name, programme_type")
    .eq("id", existing.classId)
    .maybeSingle();

  if (classError) {
    throw new Error(`Unable to load class template: ${classError.message}`);
  }

  if (!classTemplate) {
    throw new Error("Class template not found.");
  }

  if (
    classTemplate.name !== input.title &&
    existing.sessionKind === "recurring" &&
    existing.recurringScheduleId
  ) {
    throw new Error(
      "Renaming recurring sessions must be done on the recurring class template.",
    );
  }

  const startsAt = londonLocalDateTimeToUtcIso(input.date, input.startTime);
  const endsAt = londonLocalDateTimeToUtcIso(input.date, input.endTime);

  const { data: duplicate, error: duplicateError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", clubId)
    .eq("class_id", existing.classId)
    .eq("starts_at", startsAt)
    .neq("id", input.sessionId)
    .maybeSingle();

  if (duplicateError) {
    throw new Error(`Unable to check session conflicts: ${duplicateError.message}`);
  }

  if (duplicate) {
    throw new Error("Another session already exists at this date and time.");
  }

  const { error: classUpdateError } = await supabase
    .from("classes")
    .update({
      name: input.title,
      programme_type: input.programmeType,
      description: input.description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.classId);

  if (classUpdateError) {
    throw new Error(`Unable to update class details: ${classUpdateError.message}`);
  }

  const externalPrefix = resolveExternalIdPrefix(existing.sessionKind);
  const externalId =
    existing.sessionKind === "other"
      ? null
      : buildAdminSessionExternalId({
          prefix: externalPrefix,
          classId: existing.classId,
          date: input.date,
          startTime: input.startTime,
          location: input.location,
        });

  const { error: sessionUpdateError } = await supabase
    .from("class_sessions")
    .update({
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: input.capacity,
      status: input.status,
      external_id: externalId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId)
    .eq("club_id", clubId);

  if (sessionUpdateError) {
    throw new Error(`Unable to update class session: ${sessionUpdateError.message}`);
  }
}

export async function cancelClassSession(
  sessionId: string,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("class_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Unable to load class session: ${fetchError.message}`);
  }

  if (!existing) {
    throw new Error("Class session not found.");
  }

  if (existing.status === "cancelled") {
    return;
  }

  if (existing.status !== "scheduled") {
    throw new Error("Only scheduled sessions can be cancelled.");
  }

  const { error: updateError } = await supabase
    .from("class_sessions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (updateError) {
    throw new Error(`Unable to cancel class session: ${updateError.message}`);
  }
}

export async function reinstateClassSession(
  sessionId: string,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("class_sessions")
    .select("id, status, starts_at")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Unable to load class session: ${fetchError.message}`);
  }

  if (!existing) {
    throw new Error("Class session not found.");
  }

  if (existing.status === "scheduled") {
    return;
  }

  if (existing.status !== "cancelled") {
    throw new Error("Only cancelled sessions can be reinstated.");
  }

  const { error: updateError } = await supabase
    .from("class_sessions")
    .update({
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (updateError) {
    throw new Error(`Unable to reinstate class session: ${updateError.message}`);
  }
}
