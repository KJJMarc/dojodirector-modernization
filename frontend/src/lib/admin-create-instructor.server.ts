import "server-only";

import {
  getTodayJoinedAtDate,
  normalizeStudentEmail,
} from "@/lib/admin-create-student.shared";
import {
  INSTRUCTOR_CREATE_ROLE_OPTIONS,
  isInstructorMembershipRole,
} from "@/lib/admin-instructors.shared";
import { assertSuperAdminMembershipChangeAllowed } from "@/lib/admin-super-admin.server";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CreateAdminInstructorInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: (typeof INSTRUCTOR_CREATE_ROLE_OPTIONS)[number]["value"];
  promoteExistingMember?: boolean;
}

export class InstructorAlreadyExistsError extends Error {
  constructor() {
    super("This instructor already exists.");
    this.name = "InstructorAlreadyExistsError";
  }
}

export class ExistingMemberPromotionRequiredError extends Error {
  constructor() {
    super(
      "This person already has a club membership. Check “Promote existing member to instructor” to update their role.",
    );
    this.name = "ExistingMemberPromotionRequiredError";
  }
}

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

function parseCreateAdminInstructorInput(
  input: CreateAdminInstructorInput,
): CreateAdminInstructorInput {
  const role = input.role;

  if (!INSTRUCTOR_CREATE_ROLE_OPTIONS.some((option) => option.value === role)) {
    throw new Error("Please select a valid role.");
  }

  return {
    firstName: parseRequiredText(input.firstName, "First name"),
    lastName: parseRequiredText(input.lastName, "Last name"),
    email: parseEmail(input.email),
    phone: parseOptionalText(input.phone) ?? undefined,
    role,
    promoteExistingMember: input.promoteExistingMember === true,
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
    throw new Error(`Unable to look up user: ${error.message}`);
  }

  return data?.id ?? null;
}

async function loadMembership(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to look up membership: ${error.message}`);
  }

  return data as { user_id: string; role: string; status: string | null } | null;
}

async function createUser(input: CreateAdminInstructorInput) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create instructor profile: ${error.message}`);
  }

  return data.id as string;
}

async function createMembership(userId: string, role: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("memberships").insert({
    user_id: userId,
    club_id: clubId,
    role,
    status: "active",
    joined_at: getTodayJoinedAtDate(),
  });

  if (error) {
    throw new Error(`Unable to create membership: ${error.message}`);
  }
}

async function updateUserProfile(
  userId: string,
  input: CreateAdminInstructorInput,
) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("users")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Unable to update instructor profile: ${error.message}`);
  }
}

async function promoteMembershipToInstructor(
  userId: string,
  role: string,
  clubId: string,
) {
  await assertSuperAdminMembershipChangeAllowed({
    userId,
    clubId,
    nextRole: role,
  });

  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("memberships")
    .update({
      role,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Unable to update membership role: ${error.message}`);
  }
}

export async function createAdminInstructor(
  rawInput: CreateAdminInstructorInput,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<{ userId: string; createdUser: boolean }> {
  const input = parseCreateAdminInstructorInput(rawInput);
  const existingUserId = await findUserIdByEmail(input.email);

  if (existingUserId) {
    const membership = await loadMembership(existingUserId, clubId);

    if (membership) {
      if (isInstructorMembershipRole(membership.role)) {
        throw new InstructorAlreadyExistsError();
      }

      if (!input.promoteExistingMember) {
        throw new ExistingMemberPromotionRequiredError();
      }

      await updateUserProfile(existingUserId, input);
      await promoteMembershipToInstructor(existingUserId, input.role, clubId);

      return { userId: existingUserId, createdUser: false };
    }

    await updateUserProfile(existingUserId, input);
    await createMembership(existingUserId, input.role, clubId);

    return { userId: existingUserId, createdUser: false };
  }

  const userId = await createUser(input);
  await createMembership(userId, input.role, clubId);

  return { userId, createdUser: true };
}
