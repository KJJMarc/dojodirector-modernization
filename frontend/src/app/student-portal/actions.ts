"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PWA_APP_ENTRY_PATH } from "@/lib/pwa.shared";
import {
  hasAcceptedCurrentStudentAgreements,
  logStudentAgreementGate,
  recordStudentAgreementAcceptance,
} from "@/lib/student-portal-agreements.server";
import {
  resolveStudentPortalAgreementClubForUser,
  resolveStudentPortalHomePath,
} from "@/lib/student-portal-club.server";
import { promoteInvitedPortalAccessAfterPasswordSignIn } from "@/lib/portal-auth-activation.server";
import {
  PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE,
  PORTAL_AUTH_MISSING_CREDENTIALS_MESSAGE,
} from "@/lib/portal-auth-errors.shared";
import { throwPortalAuthError } from "@/lib/portal-auth-errors.server";
import {
  getAuthenticatedStudentPortalProfile,
  signOutStudentPortal,
} from "@/lib/student-portal-auth.server";
import {
  isSignatoryType,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  SIGNATORY_TYPE_PARTICIPANT,
} from "@/lib/student-portal-agreements.shared";
import { resolveMemberPortalAgreementContent } from "@/lib/club-agreement-templates.server";
import {
  studentPortalAgreementsPath,
  studentPortalEntryPath,
  studentPortalPath,
} from "@/lib/student-portal-routing.shared";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function signInStudentPortalAction(formData: FormData) {
  try {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      throw new Error(PORTAL_AUTH_MISSING_CREDENTIALS_MESSAGE);
    }

    const supabase = await createSupabaseServerAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error(PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE);
    }

    if (data.user?.id) {
      await promoteInvitedPortalAccessAfterPasswordSignIn({
        authUserId: data.user.id,
        email,
      });
    }

    redirect(studentPortalEntryPath());
  } catch (error) {
    throwPortalAuthError("student-portal.sign-in", error);
  }
}

export async function signOutStudentPortalAction(_formData?: FormData) {
  await signOutStudentPortal();
  redirect(PWA_APP_ENTRY_PATH);
}

export async function acceptStudentAgreementsAction(formData: FormData) {
  const signatoryTypeRaw = String(formData.get("signatoryType") ?? "").trim();

  if (!isSignatoryType(signatoryTypeRaw)) {
    throw new Error("Select who is signing this agreement.");
  }

  const signedFullName = String(formData.get("signedFullName") ?? "").trim();
  const participantName = String(formData.get("participantName") ?? "").trim();
  const relationshipToParticipant = String(
    formData.get("relationshipToParticipant") ?? "",
  ).trim();

  if (signatoryTypeRaw === SIGNATORY_TYPE_PARTICIPANT) {
    if (formData.get("agreeAgreement") !== "on") {
      throw new Error("You must accept the membership agreement to continue.");
    }
  } else {
    if (formData.get("guardianConfirm") !== "on") {
      throw new Error("Confirm that you are the parent or legal guardian.");
    }

    if (formData.get("consentTraining") !== "on") {
      throw new Error("Consent to the participant taking part in training.");
    }

    if (formData.get("agreeAgreement") !== "on") {
      throw new Error("You must accept the membership agreement to continue.");
    }
  }

  const profile = await getAuthenticatedStudentPortalProfile();

  if (!profile) {
    throw new Error("You must be signed in to accept the membership agreement.");
  }

  const headerStore = await headers();
  const agreementClub = await resolveStudentPortalAgreementClubForUser(profile.userId);

  if (!agreementClub) {
    throw new Error("You do not currently have access to this portal. Please contact your academy administrator.");
  }

  const agreementContent = await resolveMemberPortalAgreementContent(agreementClub.id);

  logStudentAgreementGate("acceptStudentAgreementsAction.submit", {
    authUserId: profile.authUserId,
    studentUserId: profile.userId,
    agreementType: "membership_agreement",
    templateVersion: agreementContent.version,
    templateTitle: agreementContent.title,
    isCustomTemplate: agreementContent.isCustomTemplate,
  });

  const saved = await recordStudentAgreementAcceptance({
    userId: profile.userId,
    clubId: agreementClub.id,
    signedFullName,
    signatoryType: signatoryTypeRaw,
    participantName:
      signatoryTypeRaw === SIGNATORY_TYPE_PARENT_GUARDIAN ? participantName : null,
    relationshipToParticipant:
      signatoryTypeRaw === SIGNATORY_TYPE_PARENT_GUARDIAN
        ? relationshipToParticipant
        : null,
    version: agreementContent.version,
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"),
  });

  const accepted = await hasAcceptedCurrentStudentAgreements(profile.userId, {
    logContext: "acceptStudentAgreementsAction.afterSave",
  });

  const redirectTo = accepted
    ? await resolveStudentPortalHomePath(profile.userId)
    : studentPortalAgreementsPath();

  logStudentAgreementGate("acceptStudentAgreementsAction.redirect", {
    authUserId: profile.authUserId,
    studentUserId: profile.userId,
    savedAgreementRecordId: saved.agreementRecordId,
    savedVersion: saved.version,
    acceptedAfterSave: accepted,
    redirectTo,
  });

  revalidatePath(studentPortalEntryPath());
  revalidatePath(studentPortalAgreementsPath());
  revalidatePath(studentPortalPath(agreementClub.slug, profile.userId), "layout");

  if (!accepted) {
    throw new Error(
      "Your agreement was saved but could not be verified. Please try again or contact the club.",
    );
  }

  redirect(redirectTo);
}
