"use client";

import Link from "next/link";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { APP_INSTALL_GUIDANCE } from "@/lib/home-platform-content";
import { useStandaloneDisplayMode } from "@/lib/pwa-display-mode";

export function AppEntryScreen() {
  const isStandalone = useStandaloneDisplayMode();

  return (
    <main className="portal-page-shell mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-3 py-8 sm:max-w-lg sm:px-5">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <DojoDirectorWordmark className="text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl" />
        </div>
        <p className="text-base text-dojo-muted sm:text-lg">Choose your portal</p>
      </div>

      <div className="grid gap-3" aria-label="Portal sign in options">
        <Link
          href="/student-portal/login"
          className="flex min-h-[72px] items-center justify-center rounded-xl border border-dojo-border bg-dojo-surface px-5 py-4 text-center text-lg font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
        >
          Student Login
        </Link>

        <Link
          href="/instructor-portal/login"
          className="flex min-h-[72px] items-center justify-center rounded-xl border border-dojo-border bg-dojo-surface px-5 py-4 text-center text-lg font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
        >
          Instructor Login
        </Link>
      </div>

      {!isStandalone ? (
        <section
          aria-labelledby="app-install-heading"
          className="border-t border-dojo-border/60 pt-6"
        >
          <h2
            id="app-install-heading"
            className="text-xs font-semibold uppercase tracking-wide text-dojo-red"
          >
            {APP_INSTALL_GUIDANCE.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
            {APP_INSTALL_GUIDANCE.description}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-dojo-white">iPhone</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-dojo-muted">
                {APP_INSTALL_GUIDANCE.iosSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-medium text-dojo-white">Android</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-dojo-muted">
                {APP_INSTALL_GUIDANCE.androidSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
