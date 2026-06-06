"use server";

import { redirect } from "next/navigation";
import { promoteInvitedPortalAccessAfterPasswordSignIn } from "@/lib/portal-auth-activation.server";
import {
  getAuthenticatedInstructorPortalProfile,
  signOutInstructorPortal,
} from "@/lib/instructor-portal-auth.server";
import {
  clearSelectedInstructorPortalClubSlug,
  loadInstructorPortalAccessibleClubs,
  userCanAccessInstructorPortalClub,
} from "@/lib/instructor-portal-club.server";
import {
  instructorPortalClubPath,
  instructorPortalEntryPath,
  instructorPortalLoginPath,
} from "@/lib/instructor-portal-routing.shared";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

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
    await promoteInvitedPortalAccessAfterPasswordSignIn({
      authUserId: data.user.id,
      email,
    });
  }

  redirect(instructorPortalEntryPath());
}

export async function signOutInstructorPortalAction() {
  await clearSelectedInstructorPortalClubSlug();
  await signOutInstructorPortal();
  redirect(instructorPortalLoginPath());
}

export async function selectInstructorPortalClubAction(clubSlug: string) {
  const profile = await getAuthenticatedInstructorPortalProfile();

  if (!profile) {
    redirect(instructorPortalLoginPath());
  }

  const normalizedSlug = clubSlug.trim().toLowerCase();

  if (!normalizedSlug) {
    throw new Error("Please choose an academy.");
  }

  const canAccess = await userCanAccessInstructorPortalClub(profile.userId, normalizedSlug);

  if (!canAccess) {
    throw new Error("You do not have instructor access to that academy.");
  }

  redirect(instructorPortalClubPath(normalizedSlug));
}

export async function switchInstructorPortalClubAction() {
  const profile = await getAuthenticatedInstructorPortalProfile();

  if (!profile) {
    redirect(instructorPortalLoginPath());
  }

  await clearSelectedInstructorPortalClubSlug();
  redirect(instructorPortalEntryPath());
}
