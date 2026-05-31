import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
