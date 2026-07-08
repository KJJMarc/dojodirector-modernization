"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendPortalSetupEmailAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import {
  ProfileDetailItem,
  ProfileSectionHeading,
  profileDetailGridClassName,
  profileSectionClassName,
} from "@/components/admin/profile-detail-item";
import type { PortalSetupAccessSummary } from "@/lib/admin-student-profile.shared";

interface PortalSetupPanelProps {
  clubSlug: string;
  userId: string;
  portalSetup: PortalSetupAccessSummary;
}

export function PortalSetupPanel({
  clubSlug,
  userId,
  portalSetup,
}: PortalSetupPanelProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <section className={profileSectionClassName}>
      <ProfileSectionHeading
        title="Portal setup email"
        description="Sends a first-time link so the member can choose a password and sign in to the student or instructor portal."
      />

      <dl className={profileDetailGridClassName}>
        <ProfileDetailItem label="Setup status" value={portalSetup.statusLabel} />
        <ProfileDetailItem
          label="Setup email sent"
          value={portalSetup.sentAtLabel ?? "—"}
        />
      </dl>

      {portalSetup.canSendSetupEmail ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setSuccessMessage(null);
            setErrorMessage(null);

            startTransition(async () => {
              const result = await sendPortalSetupEmailAction(clubSlug, userId);

              if (result.ok) {
                setSuccessMessage(result.message);
                router.refresh();
                return;
              }

              setErrorMessage(result.error);
            });
          }}
          className="inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send portal setup email"}
        </button>
      ) : (
        <p className="text-sm leading-snug text-dojo-muted">
          {portalSetup.statusLabel === "Portal active"
            ? "Portal login is active. Use Login Access to change the password, or send a password reset from the sign-in page."
            : "Add a profile email and active membership before sending a setup email."}
        </p>
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
    </section>
  );
}
