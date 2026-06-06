"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE } from "@/lib/portal-auth-errors.shared";

interface AuthRouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  loginPath?: string;
  heading?: string;
}

export default function AuthRouteError({
  error,
  reset,
  loginPath,
  heading = "Unable to load this page",
}: AuthRouteErrorProps) {
  useEffect(() => {
    console.error("[auth-route-error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <section className="mx-auto max-w-md space-y-4 px-3 py-8 sm:px-5">
      <div className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 p-4">
        <h2 className="text-lg font-semibold text-dojo-white">{heading}</h2>
        <p className="mt-2 text-sm text-dojo-muted">
          {PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
          >
            Try again
          </button>
          {loginPath ? (
            <Link
              href={loginPath}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/40"
            >
              Back to sign in
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
