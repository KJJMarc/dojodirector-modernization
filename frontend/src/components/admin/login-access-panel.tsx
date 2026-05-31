"use client";

import { useState, useTransition } from "react";
import { setProfileLoginPasswordAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import {
  ProfileDetailItem,
  ProfileSectionHeading,
  profileDetailGridClassName,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import type { ProfileLoginAccessSummary } from "@/lib/admin-student-profile.shared";

interface LoginAccessPanelProps {
  clubSlug: string;
  userId: string;
  loginAccess: ProfileLoginAccessSummary;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function LoginAccessPanel({
  clubSlug,
  userId,
  loginAccess,
}: LoginAccessPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className={profileSectionClassName}>
      <ProfileSectionHeading
        title="Login Access"
        description="This login is used for student, instructor and admin access where enabled."
      />

      <dl className={profileDetailGridClassName}>
        <ProfileDetailItem
          label="Login email"
          value={loginAccess.loginEmail ?? "—"}
        />
        <ProfileDetailItem label="Login status" value={loginAccess.loginStatusLabel} />
        <ProfileDetailItem
          label="Portal auth status"
          value={loginAccess.portalAuthStatusLabel}
        />
        <ProfileDetailItem
          label="Supabase auth linked"
          value={loginAccess.authLinkedLabel}
        />
      </dl>

      {!loginAccess.canSetPassword ? (
        <p className="text-sm leading-snug text-dojo-muted">
          Add a profile or portal login email before setting a password.
        </p>
      ) : (
        <div className="space-y-2">
          {!showForm ? (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
            >
              {loginAccess.hasAuthLogin ? "Change login password" : "Set login password"}
            </button>
          ) : (
            <form
              className={`space-y-2 ${isPending ? "pointer-events-none opacity-60" : ""}`}
              onSubmit={(event) => {
                event.preventDefault();
                setSuccessMessage(null);
                setErrorMessage(null);

                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    const result = await setProfileLoginPasswordAction(
                      clubSlug,
                      userId,
                      formData,
                    );
                    setSuccessMessage(result.message);
                    setShowForm(false);
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "Unable to update login password.",
                    );
                  }
                });
              }}
            >
              <div className="space-y-1.5">
                <label htmlFor="profile-login-password" className={labelClassName}>
                  New password
                </label>
                <input
                  id="profile-login-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-login-confirm-password" className={labelClassName}>
                  Confirm password
                </label>
                <input
                  id="profile-login-confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClassName}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save password
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setShowForm(false);
                    setErrorMessage(null);
                  }}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {successMessage ? (
            <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
              {successMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
              {errorMessage}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
