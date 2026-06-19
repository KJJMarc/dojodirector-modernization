import "server-only";

import {
  CreateAdminStudentInput,
  getTodayJoinedAtDate,
  isMembershipRoleValue,
  parseMembershipStatusValue,
  normalizeStudentEmail,
} from "@/lib/admin-create-student.shared";
import type { AdminStudentSaveFailure } from "@/lib/admin-student-form.shared";
import {
  ensureProgrammeMembershipForUser,
  setProgrammeBookingAccessForUser,
  requireClubProgrammeBySlug,
} from "@/lib/admin-programmes.server";
import type { StudentPortalAccessProgrammeType } from "@/lib/admin-programmes.shared";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { findUserIdByProfileEmail } from "@/lib/admin-student-email.server";
import { getStudentFullName } from "@/lib/attendance";
import { matchLeadOnStudentJoined } from "@/lib/lead-status-tracking.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function parseRequiredText(value: string, fieldLabel: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return trimmed;
}

function parseEmail(value: string) {
  const email = normalizeStudentEmail(value);

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  return email;
}

function parseOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalDate(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Date of birth must use YYYY-MM-DD format.");
  }

  return trimmed;
}

function parseCreateAdminStudentInput(
  input: CreateAdminStudentInput,
): CreateAdminStudentInput {
  const role = input.role;
  const membershipStatus = parseMembershipStatusValue(input.membershipStatus);

  if (!isMembershipRoleValue(role)) {
    throw new Error("Please select a valid role.");
  }

  if (!membershipStatus) {
    throw new Error("Please select a valid membership status.");
  }

  return {
    firstName: parseRequiredText(input.firstName, "First name"),
    lastName: parseRequiredText(input.lastName, "Last name"),
    email: parseEmail(input.email),
    phone: parseOptionalText(input.phone) ?? undefined,
    dateOfBirth: parseOptionalDate(input.dateOfBirth) ?? undefined,
    adminNotes: parseOptionalText(input.adminNotes) ?? undefined,
    role,
    membershipStatus,
  };
}

async function findMembershipForClub(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to look up membership: ${error.message}`);
  }

  return data ?? null;
}

async function createMembership(input: {
  userId: string;
  clubId: string;
  role: CreateAdminStudentInput["role"];
  status: CreateAdminStudentInput["membershipStatus"];
}) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("memberships").insert({
    user_id: input.userId,
    club_id: input.clubId,
    role: input.role,
    status: input.status,
    joined_at: getTodayJoinedAtDate(),
  });

  if (error) {
    throw new Error(`Unable to create membership: ${error.message}`);
  }
}

async function createUser(input: CreateAdminStudentInput) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      admin_notes: input.adminNotes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create student: ${error.message}`);
  }

  return data.id as string;
}

export interface CreateAdminStudentOptions {
  /** Redirect context only; does not grant programme access. */
  programmeSlug?: string;
  /** Programme student area membership types selected on the form. */
  programmeMembershipTypes: StudentPortalAccessProgrammeType[];
  /** Portal booking access types selected on the form. */
  bookingAccessTypes: StudentPortalAccessProgrammeType[];
}

export type CreateAdminStudentResult =
  | { ok: true; userId: string; createdUser: boolean }
  | { ok: false; failure: AdminStudentSaveFailure };

export async function createAdminStudent(
  rawInput: CreateAdminStudentInput,
  clubId: string = ACTIVE_CLUB_ID,
  options: CreateAdminStudentOptions,
): Promise<CreateAdminStudentResult> {
  const input = parseCreateAdminStudentInput(rawInput);

  if (options.programmeMembershipTypes.length === 0) {
    return {
      ok: false,
      failure: {
        code: "validation",
        message: "Select at least one programme student area.",
      },
    };
  }

  if (options.bookingAccessTypes.length === 0) {
    return {
      ok: false,
      failure: {
        code: "validation",
        message: "Select at least one programme for booking access.",
      },
    };
  }

  if (options.programmeSlug) {
    await requireClubProgrammeBySlug(clubId, options.programmeSlug);
  }

  const existingUserId = await findUserIdByProfileEmail(input.email);

  if (existingUserId) {
    const existingMembership = await findMembershipForClub(
      existingUserId,
      clubId,
    );

    if (existingMembership) {
      return { ok: false, failure: { code: "already_exists_at_academy" } };
    }

    return { ok: false, failure: { code: "duplicate_email" } };
  }

  const userId = await createUser(input);

  await createMembership({
    userId,
    clubId,
    role: input.role,
    status: input.membershipStatus,
  });
  await ensureProgrammeMembershipForUser({
    clubId,
    userId,
    programmeTypes: options.programmeMembershipTypes,
    status: input.membershipStatus,
  });
  await setProgrammeBookingAccessForUser({
    clubId,
    userId,
    programmeTypes: options.bookingAccessTypes,
  });

  void matchLeadOnStudentJoined({
    academyId: clubId,
    userId,
    email: input.email,
    phone: input.phone || null,
    studentName: getStudentFullName(input.firstName, input.lastName),
  });

  return { ok: true, userId, createdUser: true };
}

export type { CreateAdminStudentInput };
