import type { Metadata } from "next";
import Link from "next/link";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { PWA_DESCRIPTION, PWA_NAME } from "@/lib/pwa.shared";

export const metadata: Metadata = {
  title: `${PWA_NAME} | App`,
  description: PWA_DESCRIPTION,
};

export default function AppEntryPage() {
  return (
    <main className="portal-page-shell mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-3 py-8 sm:px-5">
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
    </main>
  );
}
