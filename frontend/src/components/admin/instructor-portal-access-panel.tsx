"use client";

import { useState, useTransition } from "react";
import { sendInstructorPortalInviteAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";
import { InstructorPortalLoginEmailForm } from "@/components/admin/instructor-portal-login-email-form";
import { InstructorPortalSetPasswordForm } from "@/components/admin/instructor-portal-set-password-form";
import {
  formatProfileDate,
  type AdminInstructorPortalAccessSummary,
} from "@/lib/admin-student-profile.shared";

interface InstructorPortalAccessPanelProps {
  clubSlug: string;
  studentUserId: string;
  loginEmail: string | null;
  portalAccess: AdminInstructorPortalAccessSummary;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-dojo-white">{value}</dd>
    </div>
  );
}

export function InstructorPortalAccessPanel({
  clubSlug,
  studentUserId,
  loginEmail,
  portalAccess,
}: InstructorPortalAccessPanelProps) {
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          INSTRUCTOR PORTAL ACCESS
        </h3>
        <p className="mt-1 text-xs text-dojo-muted">
          Separate from student portal access. Instructors do not need a training agreement
          to sign in here.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <DetailItem
          label="Instructor portal status"
          value={portalAccess.portalStatusLabel}
        />
        <DetailItem label="Instructor portal login email" value={loginEmail ?? "—"} />
        <DetailItem
          label="Instructor portal invite sent date"
          value={formatProfileDate(portalAccess.inviteSentAt)}
        />
      </dl>

      <div className="space-y-3 border-t border-dojo-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Instructor portal login email
        </h4>
        <InstructorPortalLoginEmailForm
          clubSlug={clubSlug}
          userId={studentUserId}
          initialLoginEmail={loginEmail}
        />
      </div>

      <div className="space-y-3 border-t border-dojo-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Instructor portal invite
        </h4>
        {portalAccess.canSendInvite ? (
          <button
            type="button"
            disabled={isPending || !loginEmail}
            onClick={() => {
              setInviteMessage(null);
              setInviteError(null);

              startTransition(async () => {
                try {
                  const result = await sendInstructorPortalInviteAction(
                    clubSlug,
                    studentUserId,
                  );
                  setInviteMessage(
                    result.loginEmail
                      ? `Instructor portal invite sent to ${result.loginEmail}.`
                      : "Instructor portal invite sent.",
                  );
                } catch (error) {
                  setInviteError(
                    error instanceof Error
                      ? error.message
                      : "Unable to send instructor portal invite.",
                  );
                }
              });
            }}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send instructor portal invite"}
          </button>
        ) : (
          <p className="text-sm text-dojo-muted">
            Instructor portal access is active, or an invite has already been sent.
          </p>
        )}

        {!loginEmail ? (
          <p className="text-sm text-dojo-muted">
            Save an instructor portal login email above before sending an invite.
          </p>
        ) : null}

        {inviteMessage ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
            {inviteMessage}
          </p>
        ) : null}

        {inviteError ? (
          <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
            {inviteError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-dojo-border pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Instructor portal password
        </h4>
        <InstructorPortalSetPasswordForm
          clubSlug={clubSlug}
          userId={studentUserId}
          canSetPassword={portalAccess.canSetPassword}
        />
      </div>
    </section>
  );
}
