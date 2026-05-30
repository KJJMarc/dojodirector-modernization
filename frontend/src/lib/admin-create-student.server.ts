import "server-only";

import {
  CreateAdminStudentInput,
  StudentAlreadyExistsError,
  getTodayJoinedAtDate,
  isMembershipRoleValue,
  isMembershipStatusValue,
  normalizeStudentEmail,
} from "@/lib/admin-create-student.shared";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
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
  const membershipStatus = input.membershipStatus;

  if (!isMembershipRoleValue(role)) {
    throw new Error("Please select a valid role.");
  }

  if (!isMembershipStatusValue(membershipStatus)) {
    throw new Error("Please select a valid membership status.");
  }

  return {
    firstName: parseRequiredText(input.firstName, "First name"),
    lastName: parseRequiredText(input.lastName, "Last name"),
    email: parseEmail(input.email),
    phone: parseOptionalText(input.phone) ?? undefined,
    dateOfBirth: parseOptionalDate(input.dateOfBirth) ?? undefined,
    notes: parseOptionalText(input.notes) ?? undefined,
    role,
    membershipStatus,
  };
}

async function findUserIdByEmail(email: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to look up student: ${error.message}`);
  }

  return data?.id ?? null;
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
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create student: ${error.message}`);
  }

  return data.id as string;
}

export async function createAdminStudent(
  rawInput: CreateAdminStudentInput,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<{ userId: string; createdUser: boolean }> {
  const input = parseCreateAdminStudentInput(rawInput);
  const existingUserId = await findUserIdByEmail(input.email);

  if (existingUserId) {
    const existingMembership = await findMembershipForClub(
      existingUserId,
      clubId,
    );

    if (existingMembership) {
      throw new StudentAlreadyExistsError();
    }

    await createMembership({
      userId: existingUserId,
      clubId,
      role: input.role,
      status: input.membershipStatus,
    });

    return { userId: existingUserId, createdUser: false };
  }

  const userId = await createUser(input);

  await createMembership({
    userId,
    clubId,
    role: input.role,
    status: input.membershipStatus,
  });

  return { userId, createdUser: true };
}

export type { CreateAdminStudentInput };
