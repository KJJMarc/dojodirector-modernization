"use client";

import { useState, useTransition } from "react";
import {
  confirmAdminMfaEnrollmentAction,
  disableAdminMfaAction,
  startAdminMfaEnrollmentAction,
} from "@/lib/admin-mfa-security.actions";

interface AdminMfaSecurityPanelProps {
  enabled: boolean;
  revalidatePathname: string;
}

type EnrollmentDraft = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function AdminMfaSecurityPanel({
  enabled,
  revalidatePathname,
}: AdminMfaSecurityPanelProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [enrollment, setEnrollment] = useState<EnrollmentDraft | null>(null);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function startEnrollment() {
    resetMessages();
    startTransition(async () => {
      const result = await startAdminMfaEnrollmentAction();

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      if (!result.enrollment) {
        setErrorMessage("Unable to start authenticator setup.");
        return;
      }

      setEnrollment(result.enrollment);
      setCode("");
    });
  }

  function confirmEnrollment() {
    if (!enrollment) {
      return;
    }

    resetMessages();
    startTransition(async () => {
      const result = await confirmAdminMfaEnrollmentAction({
        factorId: enrollment.factorId,
        code,
        revalidatePathname,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setEnrollment(null);
      setCode("");
      setIsEnabled(true);
      setSuccessMessage("Two-factor authentication is now enabled.");
    });
  }

  function disableMfa() {
    resetMessages();
    startTransition(async () => {
      const result = await disableAdminMfaAction({
        code,
        revalidatePathname,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

          setCode("");
          setIsEnabled(false);
          setEnrollment(null);
          // MFA is mandatory for admins — send them straight back to enroll.
          window.location.assign(
            `/admin/mfa/setup?next=${encodeURIComponent(revalidatePathname)}`,
          );
    });
  }

  return (
    <section
      aria-label="Two-factor authentication"
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
    >
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">
          Two-factor authentication
        </h2>
        <p className="mt-1 text-sm text-dojo-muted">
          Admin accounts require an authenticator app. Use this page to reset
          two-factor authentication if you need to set it up again.
        </p>
      </div>

      {successMessage ? (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {isEnabled && !enrollment ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-dojo-white">
            Two-factor authentication is enabled on this account.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="admin-mfa-disable-code"
              className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
            >
              Enter a current authenticator code to disable
            </label>
            <input
              id="admin-mfa-disable-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full max-w-xs rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30"
              placeholder="000000"
            />
          </div>

          <button
            type="button"
            onClick={disableMfa}
            disabled={isPending || code.trim().length < 6}
            className="rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:opacity-60"
          >
            {isPending ? "Disabling…" : "Disable two-factor authentication"}
          </button>
        </div>
      ) : null}

      {!isEnabled && !enrollment ? (
        <button
          type="button"
          onClick={startEnrollment}
          disabled={isPending}
          className="rounded-md bg-dojo-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red/90 disabled:opacity-60"
        >
          {isPending ? "Starting…" : "Set up authenticator app"}
        </button>
      ) : null}

      {enrollment ? (
        <div className="space-y-4">
          <p className="text-sm text-dojo-muted">
            Scan this QR code with your authenticator app, or enter the secret
            manually.
          </p>

          <div className="inline-block rounded-lg border border-dojo-border bg-white p-3">
            {enrollment.qrCode.trimStart().startsWith("<svg") ? (
              <div
                className="h-44 w-44 [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase returns a data-URI SVG
              <img
                src={enrollment.qrCode}
                alt="Authenticator QR code"
                className="h-44 w-44"
              />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Manual secret
            </p>
            <code className="block break-all rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
              {enrollment.secret}
            </code>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="admin-mfa-enroll-code"
              className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
            >
              Confirm with a 6-digit code
            </label>
            <input
              id="admin-mfa-enroll-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full max-w-xs rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30"
              placeholder="000000"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={confirmEnrollment}
              disabled={isPending || code.trim().length < 6}
              className="rounded-md bg-dojo-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red/90 disabled:opacity-60"
            >
              {isPending ? "Confirming…" : "Confirm and enable"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEnrollment(null);
                setCode("");
                resetMessages();
              }}
              disabled={isPending}
              className="rounded-md border border-dojo-border px-4 py-2.5 text-sm font-semibold text-dojo-muted transition hover:text-dojo-white disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
