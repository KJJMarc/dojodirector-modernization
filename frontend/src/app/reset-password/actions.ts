"use server";

import { redirect } from "next/navigation";
import {
  loginPathForPasswordResetContext,
  type PasswordResetLoginContext,
} from "@/lib/password-reset.shared";
import { completePortalSetupAfterPassword } from "@/lib/portal-setup.server";
import {
  isFirstTimePortalSetupSearchParam,
  loginPathForPortalSetupContext,
  parsePortalSetupLoginContext,
} from "@/lib/portal-setup.shared";
import { PORTAL_AUTH_EXPIRED_LINK_MESSAGE } from "@/lib/portal-auth-errors.shared";
import { throwPortalAuthError } from "@/lib/portal-auth-errors.server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { validatePortalPasswordInput } from "@/lib/student-portal-auth.server";

export async function updatePasswordAfterResetAction(formData: FormData) {
  try {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const context = parsePortalSetupLoginContext(
      String(formData.get("context") ?? "") || undefined,
    );
    const isFirstTimeSetup = isFirstTimePortalSetupSearchParam(
      String(formData.get("setup") ?? "") || null,
    );

    validatePortalPasswordInput(password, confirmPassword);

    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(PORTAL_AUTH_EXPIRED_LINK_MESSAGE);
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw new Error(PORTAL_AUTH_EXPIRED_LINK_MESSAGE);
    }

    if (isFirstTimeSetup) {
      const loginEmail = user.email?.trim().toLowerCase();

      if (!loginEmail) {
        throw new Error(PORTAL_AUTH_EXPIRED_LINK_MESSAGE);
      }

      await completePortalSetupAfterPassword({
        authUserId: user.id,
        loginEmail,
        context,
      });
    }

    const loginPath = isFirstTimeSetup
      ? loginPathForPortalSetupContext(context)
      : loginPathForPasswordResetContext(context);
    const separator = loginPath.includes("?") ? "&" : "?";
    const successParam = isFirstTimeSetup ? "setup=success" : "reset=success";

    redirect(`${loginPath}${separator}${successParam}`);
  } catch (error) {
    throwPortalAuthError("password-reset.update", error);
  }
}

export async function updatePasswordAfterSetupAction(formData: FormData) {
  formData.set("setup", "1");
  return updatePasswordAfterResetAction(formData);
}
