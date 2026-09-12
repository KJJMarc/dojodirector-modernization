"use client";

import { useEffect, useState, useTransition } from "react";
import { resolveAuthActionErrorMessage } from "@/components/auth/handle-auth-action-error";
import { ADMIN_MFA_SETUP_REQUIRED_MESSAGE } from "@/lib/admin-mfa.shared";
import {
  confirmMandatoryAdminMfaEnrollmentAction,
  startMandatoryAdminMfaEnrollmentAction,
} from "./actions";

interface AdminMfaSetupFormProps {
  next: string;
}

type EnrollmentDraft = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function AdminMfaSetupForm({ next }: AdminMfaSetupFormProps) {
  const [enrollment, setEnrollment] = useState<EnrollmentDraft | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted) {
      return;
    }

    setHasStarted(true);
    startTransition(async () => {
      const result = await startMandatoryAdminMfaEnrollmentAction();

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      if (!result.enrollment) {
        setErrorMessage("Unable to start authenticator setup.");
        return;
      }

      setEnrollment(result.enrollment);
    });
  }, [hasStarted]);

  return (
    <div className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}>
      <p className="text-sm text-dojo-muted">{ADMIN_MFA_SETUP_REQUIRED_MESSAGE}</p>

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {!enrollment && !errorMessage ? (
        <p className="text-sm text-dojo-muted" role="status">
          Preparing authenticator setup…
        </p>
      ) : null}

      {enrollment ? (
        <>
          <p className="text-sm text-dojo-muted">
            Scan this QR code with your authenticator app, or enter the secret
            manually. Then enter the 6-digit code to continue.
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

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setErrorMessage(null);
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                try {
                  await confirmMandatoryAdminMfaEnrollmentAction(formData);
                } catch (error) {
                  setErrorMessage(resolveAuthActionErrorMessage(error));
                }
              });
            }}
          >
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="factorId" value={enrollment.factorId} />

            <div className="space-y-2">
              <label
                htmlFor="admin-mfa-setup-code"
                className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
              >
                Authenticator code
              </label>
              <input
                id="admin-mfa-setup-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,8}"
                maxLength={8}
                required
                autoFocus
                className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-center text-lg tracking-[0.3em] text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-dojo-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red/90 disabled:opacity-60"
            >
              {isPending ? "Confirming…" : "Enable and continue"}
            </button>
          </form>
        </>
      ) : null}

      {errorMessage && !enrollment ? (
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setHasStarted(false);
          }}
          className="rounded-md bg-dojo-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red/90"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
