"use server";

import { redirect } from "next/navigation";
import {
  linkAuthUserToInstructor,
  signOutInstructorPortal,
} from "@/lib/instructor-portal-auth.server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS =
  "id, first_name, last_name, email, auth_user_id, instructor_portal_auth_status, instructor_portal_invited_at, instructor_portal_login_email";

export async function signInInstructorPortalAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    throw new Error("Enter your email and password.");
  }

  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("Sign in failed. Check your email and password.");
  }

  if (data.user?.id) {
    await linkInstructorPortalUserAfterSignIn(data.user.id, email);
  }

  redirect("/instructor-portal");
}

async function linkInstructorPortalUserAfterSignIn(authUserId: string, email: string) {
  const admin = getSupabaseAdminClient();
  const normalizedEmail = email.trim();

  let { data: row } = await admin
    .from("users")
    .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!row) {
    const byPortalEmail = await admin
      .from("users")
      .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
      .ilike("instructor_portal_login_email", normalizedEmail)
      .maybeSingle();

    row = byPortalEmail.data;

    if (!row) {
      const byProfileEmail = await admin
        .from("users")
        .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
        .ilike("email", normalizedEmail)
        .maybeSingle();

      row = byProfileEmail.data;
    }
  }

  if (row && typeof row.id === "string") {
    await linkAuthUserToInstructor(row.id, authUserId);
  }
}

export async function signOutInstructorPortalAction() {
  await signOutInstructorPortal();
  redirect("/instructor-portal/login");
}
