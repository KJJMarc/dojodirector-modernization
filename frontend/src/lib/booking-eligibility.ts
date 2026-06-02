import {
  assertActiveMembershipForBooking as checkActiveMembershipForBooking,
} from "@/lib/membership-access.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { StudentBookingDetails } from "@/lib/booking-form";

export type BookingEligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export async function assertActiveMembershipForBooking(
  userId: string,
  clubId: string,
): Promise<BookingEligibilityResult> {
  const result = await checkActiveMembershipForBooking(userId, clubId);

  if (result.allowed) {
    return { allowed: true };
  }

  return { allowed: false, reason: result.message };
}

export interface BookingStudentContext {
  userId: string;
  isNewUser: boolean;
}

export async function resolveBookingStudent(
  details: StudentBookingDetails,
  clubId: string,
): Promise<BookingStudentContext> {
  const { userId, isNewUser } = await findOrCreateUserByEmail(details);
  const eligibility = await assertActiveMembershipForBooking(userId, clubId);

  if (!eligibility.allowed) {
    throw new Error(eligibility.reason);
  }

  return { userId, isNewUser };
}

async function findOrCreateUserByEmail(
  details: StudentBookingDetails,
): Promise<{ userId: string; isNewUser: boolean }> {
  // Booking user lookup/creation must bypass anon RLS via service role.
  const supabase = getSupabaseAdminClient();

  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("email", details.email)
    .maybeSingle();

  if (lookupError) {
    if (
      lookupError.message.includes("permission denied") &&
      lookupError.message.includes("users")
    ) {
      throw new Error(
        "Unable to look up student: service role cannot read public.users. " +
          "Confirm SUPABASE_SERVICE_ROLE_KEY is the service_role secret from " +
          "Supabase Dashboard → Project Settings → API (not the anon/publishable key).",
      );
    }

    throw new Error(`Unable to look up student: ${lookupError.message}`);
  }

  if (existingUser) {
    return { userId: existingUser.id, isNewUser: false };
  }

  const { data: createdUser, error: createError } = await supabase
    .from("users")
    .insert({
      first_name: details.firstName,
      last_name: details.lastName,
      email: details.email,
    })
    .select("id")
    .single();

  if (createError) {
    if (
      createError.message.includes("permission denied") &&
      createError.message.includes("users")
    ) {
      throw new Error(
        "Unable to create student profile: service role cannot write public.users. " +
          "Confirm SUPABASE_SERVICE_ROLE_KEY is the service_role secret from " +
          "Supabase Dashboard → Project Settings → API (not the anon/publishable key).",
      );
    }

    throw new Error(`Unable to create student profile: ${createError.message}`);
  }

  return { userId: createdUser.id, isNewUser: true };
}
