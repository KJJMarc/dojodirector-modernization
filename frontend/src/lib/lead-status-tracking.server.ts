import "server-only";

import { appendLeadNote } from "@/lib/lead-guest-booking-match.shared";
import { preserveStudentOriginalLeadSource } from "@/lib/lead-source-analytics.server";
import { findCanonicalLeadForMatch } from "@/lib/lead-match.server";
import {
  resolveLeadStatusAfterAttendanceRegisterMark,
  shouldUpdateLeadFromAttendanceRegisterMark,
  type AttendanceRegisterLeadMark,
} from "@/lib/lead-status-tracking.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface LeadTrackingRow {
  id: string;
  full_name?: string;
  email: string;
  phone: string | null;
  lead_source: string | null;
  status: string;
  notes: string | null;
  trial_attended_at: string | null;
  joined_at: string | null;
}

function isMissingLeadsTableError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes('relation "leads" does not exist') ||
    message.includes('relation "public.leads" does not exist')
  );
}

async function findLeadForMatch(input: {
  academyId: string;
  email: string;
  phone: string | null;
  fullName?: string | null;
  leadId?: string | null;
}): Promise<LeadTrackingRow | null> {
  const lead = await findCanonicalLeadForMatch({
    academyId: input.academyId,
    email: input.email,
    phone: input.phone,
    fullName: input.fullName,
    leadId: input.leadId,
  });

  return (lead as LeadTrackingRow | null) ?? null;
}

async function updateLeadTracking(input: {
  academyId: string;
  leadId: string;
  status: string;
  noteEntry?: string;
  existingNotes?: string | null;
  trialAttendedAt?: string;
  joinedAt?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, string | null> = {
    status: input.status,
    last_activity_at: now,
    updated_at: now,
  };

  if (input.status === "trial_attended" && input.trialAttendedAt) {
    update.trial_attended_at = input.trialAttendedAt;
  }

  if (input.status === "joined" && input.joinedAt) {
    update.joined_at = input.joinedAt;
  }

  if (input.noteEntry) {
    update.notes = appendLeadNote(input.existingNotes, input.noteEntry);
  }

  const { error } = await supabase
    .from("leads")
    .update(update)
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId);

  if (error && !isMissingLeadsTableError(error)) {
    throw new Error(`Failed to update lead tracking: ${error.message}`);
  }
}

/**
 * When a student/member is created, match an existing lead and mark as joined.
 * Never throws — student creation must not depend on lead matching.
 */
export async function matchLeadOnStudentJoined(input: {
  academyId: string;
  userId: string;
  email: string;
  phone: string | null;
  studentName: string;
}): Promise<void> {
  try {
    const lead = await findLeadForMatch(input);

    if (!lead || lead.status === "joined" || lead.status === "trial_missed") {
      return;
    }

    const now = new Date().toISOString();
    const noteEntry = `[${formatTrackingTimestamp(now)}] Converted to student: ${input.studentName.trim()}`;

    await updateLeadTracking({
      academyId: input.academyId,
      leadId: lead.id,
      status: "joined",
      joinedAt: now,
      noteEntry,
      existingNotes: lead.notes,
    });

    await preserveStudentOriginalLeadSource({
      userId: input.userId,
      leadSource: lead.lead_source,
    });
  } catch (error) {
    console.error("[lead-status-tracking]", {
      kind: "student_joined",
      academyId: input.academyId,
      message: error instanceof Error ? error.message : "Lead join matching failed.",
    });
  }
}

/**
 * When attendance is marked on the register, update the matched lead status.
 * Never throws — attendance marking must not depend on lead matching.
 */
export async function matchLeadOnAttendanceRegisterMark(input: {
  academyId: string;
  attendanceStatus: AttendanceRegisterLeadMark;
  email: string;
  phone: string | null;
  fullName?: string | null;
  leadId?: string | null;
  className: string;
  sessionDateLabel: string;
  markedAtIso?: string | null;
}): Promise<void> {
  try {
    const lead = await findLeadForMatch(input);

    if (
      !lead ||
      !shouldUpdateLeadFromAttendanceRegisterMark(lead, input.attendanceStatus)
    ) {
      return;
    }

    const now = new Date().toISOString();
    const attendedAt =
      input.attendanceStatus === "present"
        ? input.markedAtIso?.trim() || now
        : now;
    const nextStatus = resolveLeadStatusAfterAttendanceRegisterMark(
      input.attendanceStatus,
    );
    const notePrefix =
      input.attendanceStatus === "present"
        ? "Trial attendance recorded"
        : "Trial missed on register";
    const noteEntry = `[${formatTrackingTimestamp(now)}] ${notePrefix}: ${input.className.trim()} — ${input.sessionDateLabel.trim()}`;

    await updateLeadTracking({
      academyId: input.academyId,
      leadId: lead.id,
      status: nextStatus,
      ...(nextStatus === "trial_attended" && !lead.trial_attended_at
        ? { trialAttendedAt: attendedAt }
        : {}),
      noteEntry,
      existingNotes: lead.notes,
    });
  } catch (error) {
    console.error("[lead-status-tracking]", {
      kind: "attendance_register",
      academyId: input.academyId,
      attendanceStatus: input.attendanceStatus,
      message: error instanceof Error ? error.message : "Lead attendance matching failed.",
    });
  }
}

/** @deprecated Use matchLeadOnAttendanceRegisterMark with attendanceStatus: "present". */
export async function matchLeadOnTrialAttendance(input: {
  academyId: string;
  email: string;
  phone: string | null;
  className: string;
  sessionDateLabel: string;
}): Promise<void> {
  await matchLeadOnAttendanceRegisterMark({
    ...input,
    attendanceStatus: "present",
  });
}

function formatTrackingTimestamp(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
