"use client";

import Link from "next/link";

interface AuthLinkConfirmLandingProps {
  confirmPath: string;
  title: string;
  description: string;
  buttonLabel: string;
  loginPath: string;
}

/**
 * One-time auth links must not hit /auth/confirm on email open — scanners prefetch
 * GET requests and consume the OTP. The user must click through here first.
 */
export function AuthLinkConfirmLanding({
  confirmPath,
  title,
  description,
  buttonLabel,
  loginPath,
}: AuthLinkConfirmLandingProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-dojo-muted">{description}</p>
      <button
        type="button"
        className="w-full rounded-md bg-dojo-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red/90"
        onClick={() => {
          window.location.assign(confirmPath);
        }}
      >
        {buttonLabel}
      </button>
      <p className="text-center text-sm text-dojo-muted">
        <Link href={loginPath} className="font-medium text-dojo-white hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
