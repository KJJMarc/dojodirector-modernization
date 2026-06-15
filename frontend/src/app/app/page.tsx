import type { Metadata } from "next";
import Link from "next/link";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { APP_INSTALL_GUIDANCE } from "@/lib/home-platform-content";
import { PWA_DESCRIPTION, PWA_NAME } from "@/lib/pwa.shared";

export const metadata: Metadata = {
  title: `${PWA_NAME} | App`,
  description: PWA_DESCRIPTION,
};

export default function AppEntryPage() {
  return (
    <main className="portal-page-shell mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-3 py-8 sm:max-w-lg sm:px-5">
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <DojoDirectorWordmark className="text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl" />
        </div>
        <p className="text-sm text-dojo-muted sm:text-base">
          Sign in to your student or instructor portal.
        </p>
      </div>

      <div className="grid gap-3" aria-label="Portal sign in options">
        <Link
          href="/student-portal/login"
          className="flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-5 py-4 text-center transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
        >
          <span className="text-lg font-semibold text-dojo-white">Student Login</span>
          <span className="mt-1 text-sm text-dojo-muted">
            Book classes, view attendance and grading history.
          </span>
        </Link>

        <Link
          href="/instructor-portal/login"
          className="flex min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-surface px-5 py-4 text-center transition hover:border-dojo-red/50 hover:bg-dojo-elevated active:scale-[0.99]"
        >
          <span className="text-lg font-semibold text-dojo-white">Instructor Login</span>
          <span className="mt-1 text-sm text-dojo-muted">
            Mark attendance, manage classes and view notices.
          </span>
        </Link>
      </div>

      <section
        aria-labelledby="app-install-heading"
        className="rounded-xl border border-dojo-border bg-dojo-surface/80 px-5 py-5"
      >
        <h2
          id="app-install-heading"
          className="text-sm font-semibold uppercase tracking-wide text-dojo-red"
        >
          {APP_INSTALL_GUIDANCE.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
          {APP_INSTALL_GUIDANCE.description}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-dojo-white">
              iPhone
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-dojo-muted">
              {APP_INSTALL_GUIDANCE.iosSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-dojo-white">
              Android
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-dojo-muted">
              {APP_INSTALL_GUIDANCE.androidSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {APP_INSTALL_GUIDANCE.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-dojo-muted"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dojo-red"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
