import "server-only";

import { randomBytes } from "node:crypto";

import {
  STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
  StudentEmailAlreadyInUseError,
} from "@/lib/admin-student-email.shared";
import { resolvePortalLoginEmail } from "@/lib/student-portal-auth.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const PORTAL_AUTH_LINK_COLUMNS =
  "id, email, auth_user_id, portal_login_email, portal_auth_status, instructor_portal_login_email, instructor_portal_auth_status";

export interface PortalAuthLinkProfile {
  id: string;
  email: string | null;
  auth_user_id: string | null;
  portal_login_email: string | null;
  portal_auth_status: string | null;
  instructor_portal_login_email: string | null;
  instructor_portal_auth_status: string | null;
}

export function isPortalAuthStatusActiveOrInvited(
  status: string | null | undefined,
) {
  return status === "invited" || status === "active";
}

export function profileBlocksUnlinkingAuthUser(profile: PortalAuthLinkProfile) {
  if (!profile.auth_user_id) {
    return false;
  }

  if (isPortalAuthStatusActiveOrInvited(profile.portal_auth_status)) {
    return true;
  }

  if (isPortalAuthStatusActiveOrInvited(profile.instructor_portal_auth_status)) {
    return true;
  }

  return true;
}

export async function loadPortalAuthLinkProfile(
  userId: string,
): Promise<PortalAuthLinkProfile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(PORTAL_AUTH_LINK_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load portal auth profile: ${error.message}`);
  }

  return (data as PortalAuthLinkProfile | null) ?? null;
}

export function resolveProfilePortalLoginEmail(profile: {
  portal_login_email: string | null;
  email: string | null;
}) {
  return resolvePortalLoginEmail(profile.portal_login_email, profile.email);
}

export async function linkProfileAfterPortalPasswordSet(input: {
  userId: string;
  authUserId: string;
  loginEmail: string;
}) {
  const supabase = getSupabaseAdminClient();
  const loginEmail = input.loginEmail.trim().toLowerCase();
  const { data: existing, error: loadError } = await supabase
    .from("users")
    .select("portal_login_email")
    .eq("id", input.userId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load portal login email: ${loadError.message}`);
  }

  const update: {
    auth_user_id: string;
    portal_auth_status: "active";
    portal_login_email?: string;
  } = {
    auth_user_id: input.authUserId,
    portal_auth_status: "active",
  };

  if (!existing?.portal_login_email?.trim()) {
    update.portal_login_email = loginEmail;
  }

  const { error } = await supabase.from("users").update(update).eq("id", input.userId);

  if (error) {
    throw new Error(`Failed to link portal auth user: ${error.message}`);
  }
}

interface SupabaseErrorLike {
  message?: string;
}

function isAuthEmailAlreadyRegisteredError(error: SupabaseErrorLike | null) {
  const message = (error?.message ?? "").toLowerCase();

  return (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

export async function findAuthUserIdByEmail(loginEmail: string) {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = loginEmail.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to look up auth user by email: ${error.message}`);
    }

    const match = (data.users ?? []).find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (match?.id) {
      return match.id;
    }

    if ((data.users ?? []).length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function assertAuthUserAvailableForProfile(
  authUserId: string,
  userId: string,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .neq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify auth user link: ${error.message}`);
  }

  if (data) {
    throw new Error(
      "This login email is already linked to another member profile.",
    );
  }
}

async function findOtherUserIdByPortalLoginEmail(
  loginEmail: string,
  excludeUserId: string,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .ilike("portal_login_email", loginEmail)
    .neq("id", excludeUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify portal login email: ${error.message}`);
  }

  return data?.id ?? null;
}

/**
 * Keeps student portal Login Access email aligned with profile email after Edit Profile.
 * Updates portal_login_email and the linked Supabase auth user when one already exists.
 */
export async function syncProfileEmailWithPortalLoginAccess(input: {
  userId: string;
  profileEmail: string;
  previousProfileEmail?: string | null;
}) {
  const profileEmail = input.profileEmail.trim().toLowerCase();

  if (!profileEmail.includes("@")) {
    return;
  }

  const previousProfileEmail = input.previousProfileEmail?.trim().toLowerCase() ?? null;

  if (previousProfileEmail === profileEmail) {
    return;
  }

  const profile = await loadPortalAuthLinkProfile(input.userId);

  if (!profile) {
    return;
  }

  const portalLoginConflict = await findOtherUserIdByPortalLoginEmail(
    profileEmail,
    input.userId,
  );

  if (portalLoginConflict) {
    throw new StudentEmailAlreadyInUseError(
      STUDENT_EMAIL_ALREADY_IN_USE_ALERT.paragraphs.join(" "),
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error: profileUpdateError } = await supabase
    .from("users")
    .update({ portal_login_email: profileEmail })
    .eq("id", input.userId);

  if (profileUpdateError) {
    throw new Error(
      `Failed to sync portal login email: ${profileUpdateError.message}`,
    );
  }

  if (!profile.auth_user_id) {
    return;
  }

  const existingAuthUserId = await findAuthUserIdByEmail(profileEmail);

  if (existingAuthUserId && existingAuthUserId !== profile.auth_user_id) {
    await assertAuthUserAvailableForProfile(existingAuthUserId, input.userId);
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(
    profile.auth_user_id,
    { email: profileEmail },
  );

  if (authError) {
    throw new Error(`Failed to update linked login email: ${authError.message}`);
  }
}

/**
 * Ensures a Supabase auth user exists for first-time setup emails without setting a password.
 * The member sets their password via the recovery/setup link.
 */
export async function ensureAuthUserForPortalSetup(input: {
  loginEmail: string;
  existingAuthUserId?: string | null;
  profileUserId: string;
}) {
  const loginEmail = input.loginEmail.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();

  if (input.existingAuthUserId) {
    await assertAuthUserAvailableForProfile(
      input.existingAuthUserId,
      input.profileUserId,
    );

    return input.existingAuthUserId;
  }

  const existingByEmail = await findAuthUserIdByEmail(loginEmail);

  if (existingByEmail) {
    await assertAuthUserAvailableForProfile(existingByEmail, input.profileUserId);
    return existingByEmail;
  }

  const placeholderPassword = randomBytes(32).toString("hex");
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password: placeholderPassword,
    email_confirm: true,
  });

  if (!createError && created.user?.id) {
    return created.user.id;
  }

  if (createError && isAuthEmailAlreadyRegisteredError(createError)) {
    const authUserId = await findAuthUserIdByEmail(loginEmail);

    if (!authUserId) {
      throw new Error(
        "A login already exists for this email, but it could not be linked. Contact support.",
      );
    }

    await assertAuthUserAvailableForProfile(authUserId, input.profileUserId);
    return authUserId;
  }

  throw new Error(
    `Failed to create portal login: ${createError?.message ?? "Unknown error"}`,
  );
}

export async function ensureAuthUserForPortalLogin(input: {
  loginEmail: string;
  password: string;
  existingAuthUserId?: string | null;
  profileUserId: string;
}) {
  const loginEmail = input.loginEmail.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();

  if (input.existingAuthUserId) {
    const { error } = await supabase.auth.admin.updateUserById(
      input.existingAuthUserId,
      { password: input.password, email: loginEmail },
    );

    if (error) {
      throw new Error(`Failed to update portal password: ${error.message}`);
    }

    await assertAuthUserAvailableForProfile(
      input.existingAuthUserId,
      input.profileUserId,
    );

    return input.existingAuthUserId;
  }

  const existingByEmail = await findAuthUserIdByEmail(loginEmail);

  if (existingByEmail) {
    await assertAuthUserAvailableForProfile(existingByEmail, input.profileUserId);

    const { error } = await supabase.auth.admin.updateUserById(existingByEmail, {
      password: input.password,
      email: loginEmail,
    });

    if (error) {
      throw new Error(`Failed to update portal password: ${error.message}`);
    }

    return existingByEmail;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password: input.password,
    email_confirm: true,
  });

  if (!createError && created.user?.id) {
    return created.user.id;
  }

  if (createError && isAuthEmailAlreadyRegisteredError(createError)) {
    const authUserId = await findAuthUserIdByEmail(loginEmail);

    if (!authUserId) {
      throw new Error(
        "A login already exists for this email, but it could not be linked. Contact support.",
      );
    }

    await assertAuthUserAvailableForProfile(authUserId, input.profileUserId);

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
      password: input.password,
      email: loginEmail,
    });

    if (updateError) {
      throw new Error(`Failed to update portal password: ${updateError.message}`);
    }

    return authUserId;
  }

  throw new Error(
    `Failed to create portal login: ${createError?.message ?? "Unknown error"}`,
  );
}
